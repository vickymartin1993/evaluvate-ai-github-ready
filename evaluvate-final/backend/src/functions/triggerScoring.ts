/**
 * Evaluvate AI — Trigger Scoring Function
 *
 * HTTP Trigger: POST /api/scoring/trigger
 *
 * POC NOTE: This is an HTTP trigger for easier local testing.
 * In Sprint 3, this will be converted to a Blob Trigger so scoring
 * fires automatically when a PDF is uploaded (no manual API call needed).
 * See: docs/BUILD_PLAN.md Sprint 3, task 3.5
 *
 * WHAT THIS FUNCTION DOES:
 *   1. Receives: { schoolId, examId, answerSheetId }
 *   2. Fetches exam metadata and rubric from Cosmos DB
 *   3. Reads the answer sheet page images from Blob Storage
 *   4. For each question/page:
 *      a. Sends image + rubric + answer key to Gemini 2.5 Flash
 *      b. If Gemini fails or confidence < threshold → calls GPT-4o fallback
 *      c. If both fail → marks question for manual teacher review
 *      d. Saves AiScore to Cosmos DB
 *      e. Logs usage event (cost tracking)
 *   5. Updates AnswerSheet status to "ai_scored"
 *   6. Logs audit event
 *
 * INPUTS (JSON body):
 *   schoolId:       string  — scopes all DB queries to this school
 *   examId:         string  — which exam this sheet belongs to
 *   answerSheetId:  string  — which specific sheet to score
 *
 * OUTPUTS:
 *   200: { success: true, questionsScored: number, fallbacksUsed: number }
 *   400: { error: "Missing required fields" }
 *   404: { error: "AnswerSheet or Exam not found" }
 *   500: { error: "Scoring failed", details: string }
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import * as cosmosService from "../services/cosmosService.js";
import * as blobService from "../services/blobService.js";
import * as auditService from "../services/auditService.js";
import { scoreQuestionWithGemini } from "../services/geminiService.js";
import { scoreQuestionWithAzureOpenAI } from "../services/azureOpenAIService.js";
import type { AiScore, AnswerSheet, QuestionMapping, Rubric } from "../types/index.js";

// ─── Function registration ────────────────────────────────────────────────────

app.http("triggerScoring", {
  methods: ["POST"],
  authLevel: "function", // Requires a function key in the x-functions-key header
  route: "scoring/trigger",
  handler: triggerScoringHandler,
});

// ─── Handler ──────────────────────────────────────────────────────────────────

async function triggerScoringHandler(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {

  ctx.log("[triggerScoring] Handler invoked");

  // ── Parse and validate input ─────────────────────────────
  let body: { schoolId?: string; examId?: string; answerSheetId?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
  }

  const { schoolId, examId, answerSheetId } = body;
  if (!schoolId || !examId || !answerSheetId) {
    return {
      status: 400,
      jsonBody: { error: "Missing required fields: schoolId, examId, answerSheetId" },
    };
  }

  const confidenceThreshold = parseFloat(process.env.CONFIDENCE_THRESHOLD || "0.70");

  try {
    // ── Fetch exam and answer sheet from Cosmos DB ────────
    ctx.log(`[triggerScoring] Fetching exam ${examId} and sheet ${answerSheetId}`);

    const [exam, sheet] = await Promise.all([
      cosmosService.getExamById(schoolId, examId),
      // AnswerSheet is embedded in the answer_sheets container
      cosmosService.getAnswerSheetsByExam(schoolId, examId).then(
        (sheets) => sheets.find((s) => s.id === answerSheetId) ?? null
      ),
    ]);

    if (!exam) return { status: 404, jsonBody: { error: `Exam ${examId} not found` } };
    if (!sheet) return { status: 404, jsonBody: { error: `Answer sheet ${answerSheetId} not found` } };
    if (sheet.status === "ai_scored" || sheet.status === "finalized") {
      return { status: 409, jsonBody: { error: "Sheet has already been scored" } };
    }

    // ── Mark as scoring in progress ───────────────────────
    await cosmosService.updateAnswerSheetStatus(schoolId, answerSheetId, "ai_scoring", {
      scoringStartedAt: new Date().toISOString(),
    });
    await auditService.logAiScoringStarted({ schoolId, examId, answerSheetId });

    // ── Fetch question mappings and rubric ────────────────
    const questionMappings = await cosmosService.getQuestionMappingsByExam(schoolId, examId);
    if (questionMappings.length === 0) {
      ctx.log(`[triggerScoring] No question mappings for exam ${examId} — cannot score`);
      await cosmosService.updateAnswerSheetStatus(schoolId, answerSheetId, "uploaded");
      return { status: 422, jsonBody: { error: "No question mappings found for this exam" } };
    }

    // ── Fetch answer key text ────────────────────────────
    const answerKeyText = await blobService.getAnswerKeyText(examId, schoolId);

    // ── Score each question ────────────────────────────────
    let questionsScored = 0;
    let fallbacksUsed = 0;
    let anyFallback = false;

    for (const question of questionMappings) {
      ctx.log(`[triggerScoring] Scoring Q${question.questionNumber} (${question.id})`);

      // Determine which page image to use for this question
      // POC: one page per question (assumes one question per page)
      // TODO Sprint 3: Implement proper page-to-question mapping
      const pageIndex = question.orderIndex - 1;
      const pageImagePath = `${schoolId}/${examId}/${sheet.id}/page_${pageIndex}.jpg`;

      let pageBase64: string;
      let pageMimeType: "image/jpeg" = "image/jpeg";

      try {
        const pageData = await blobService.getAnswerSheetPageAsBase64(pageImagePath);
        pageBase64 = pageData.base64;
        pageMimeType = pageData.mimeType;
      } catch (err) {
        ctx.log(`[triggerScoring] Could not load page image for Q${question.questionNumber}:`, err);
        // Save a "could not read" score and continue with other questions
        await saveUnreadableScore(schoolId, answerSheetId, question, ctx);
        continue;
      }

      // Fetch the rubric for this question's section
      const section = exam.sections.find((s) => s.id === question.sectionId);
      if (!section) {
        ctx.log(`[triggerScoring] No section found for question ${question.id} — skipping`);
        continue;
      }

      const rubric = await cosmosService.getRubricById(schoolId, section.rubricId);
      if (!rubric) {
        ctx.log(`[triggerScoring] No rubric found: ${section.rubricId} — skipping`);
        continue;
      }

      const scoringInput = {
        question,
        rubric,
        answerKeyText,
        answerImageBase64: pageBase64,
        answerImageMimeType: pageMimeType,
        examName: exam.examName,
        className: `${exam.className}-${exam.sectionName}`,
        subjectName: exam.subjectName,
      };

      // ── PRIMARY: Try Gemini 2.5 Flash ─────────────────
      let result = await scoreQuestionWithGemini(scoringInput);

      let modelUsed: "gemini-2.5-flash" | "gpt-4o" = "gemini-2.5-flash";
      let usedFallback = false;

      // ── Log Gemini usage (success or failure) ──────────
      if (result.success) {
        await auditService.logUsageEvent({
          schoolId, examId, answerSheetId,
          questionId: question.id,
          model: "gemini-2.5-flash",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          wasSuccessful: true,
          wasFallback: false,
        });
      } else {
        await auditService.logUsageEvent({
          schoolId, examId, answerSheetId,
          questionId: question.id,
          model: "gemini-2.5-flash",
          inputTokens: 0,
          outputTokens: 0,
          wasSuccessful: false,
          wasFallback: false,
        });
      }

      // ── FALLBACK: Use GPT-4o if Gemini failed or low confidence ──
      const shouldFallback =
        !result.success ||
        (result.success && result.data.overall_confidence < confidenceThreshold);

      if (shouldFallback) {
        const reason = !result.success
          ? result.reason
          : `Low confidence: ${result.data.overall_confidence.toFixed(2)} < ${confidenceThreshold}`;

        ctx.log(
          `[triggerScoring] Falling back to GPT-4o for Q${question.questionNumber}: ${reason}`
        );

        const fallbackResult = await scoreQuestionWithAzureOpenAI(scoringInput);
        fallbacksUsed++;
        usedFallback = true;
        anyFallback = true;

        await auditService.logUsageEvent({
          schoolId, examId, answerSheetId,
          questionId: question.id,
          model: "gpt-4o",
          inputTokens: fallbackResult.success ? fallbackResult.inputTokens : 0,
          outputTokens: fallbackResult.success ? fallbackResult.outputTokens : 0,
          wasSuccessful: fallbackResult.success,
          wasFallback: true,
        });

        if (fallbackResult.success) {
          result = fallbackResult;
          modelUsed = "gpt-4o";
        }
        // If fallback also failed, result is still the Gemini failure
        // The score saved below will have flag_for_review: true
      }

      // ── Save the score to Cosmos DB ────────────────────
      if (result.success) {
        const aiScore: AiScore = {
          id: uuidv4(),
          answerSheetId,
          questionMappingId: question.id,
          schoolId,
          criteriaScores: result.data.criteria_scores.map((c) => ({
            criterionName: c.criterion_name,
            score: c.score,
            maxScore: c.max_score,
            feedbackText: c.feedback_text,
            ocrUncertain: c.ocr_uncertain,
          })),
          ocrExtractedText: result.data.ocr_extracted_text,
          overallConfidence: result.data.overall_confidence,
          totalScore: result.data.total_score,
          flagForReview: result.data.flag_for_review || (usedFallback && !result.success),
          flagReason: result.data.flag_reason,
          modelUsed,
          scoredAt: new Date().toISOString(),
        };

        await cosmosService.saveAiScore(schoolId, aiScore);
        questionsScored++;
      } else {
        // Both models failed — save a flagged placeholder so teacher sees it
        ctx.log(`[triggerScoring] Both models failed for Q${question.questionNumber} — flagging for review`);
        await saveUnreadableScore(schoolId, answerSheetId, question, ctx);
      }
    }

    // ── Update sheet status to ai_scored ──────────────────
    await cosmosService.updateAnswerSheetStatus(schoolId, answerSheetId, "ai_scored", {
      scoringCompletedAt: new Date().toISOString(),
      modelUsed: anyFallback ? "gpt-4o" : "gemini-2.5-flash",
      fallbackUsed: anyFallback,
    });

    await auditService.logAiScoringCompleted({
      schoolId, examId, answerSheetId,
      modelUsed: anyFallback ? "gpt-4o" : "gemini-2.5-flash",
      fallbackUsed: anyFallback,
    });

    ctx.log(
      `[triggerScoring] Complete. Questions scored: ${questionsScored}, Fallbacks: ${fallbacksUsed}`
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        questionsScored,
        fallbacksUsed,
        message: `Scoring complete. Sheet is ready for teacher review.`,
      },
    };

  } catch (err: unknown) {
    const error = err as Error;
    ctx.log("[triggerScoring] Unhandled error:", error.message, error.stack);

    // Mark sheet as uploaded again so teacher can retry
    await cosmosService
      .updateAnswerSheetStatus(schoolId, answerSheetId, "uploaded")
      .catch(() => {}); // Don't throw if this also fails

    await auditService.logAiScoringFailed({
      schoolId, examId, answerSheetId,
      reason: error.message,
    });

    return {
      status: 500,
      jsonBody: {
        error: "Scoring pipeline failed",
        details: error.message,
        message: "Sheet status reset to 'uploaded'. Retry or review manually.",
      },
    };
  }
}

// ─── Helper: save a flagged score for unreadable pages ───────────────────────

async function saveUnreadableScore(
  schoolId: string,
  answerSheetId: string,
  question: QuestionMapping,
  ctx: InvocationContext
): Promise<void> {
  const score: AiScore = {
    id: uuidv4(),
    answerSheetId,
    questionMappingId: question.id,
    schoolId,
    criteriaScores: [],
    ocrExtractedText: "",
    overallConfidence: 0,
    totalScore: 0,
    flagForReview: true,
    flagReason: "Could not load page image or both AI models failed. Manual review required.",
    modelUsed: "gemini-2.5-flash",
    scoredAt: new Date().toISOString(),
  };

  await cosmosService.saveAiScore(schoolId, score).catch((err) => {
    ctx.log(`[triggerScoring] Failed to save unreadable score for ${question.id}:`, err);
  });
}
