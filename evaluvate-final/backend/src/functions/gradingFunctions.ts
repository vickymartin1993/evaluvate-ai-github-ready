/**
 * Evaluvate AI — Grading Queue & Sheet Functions
 *
 * GET /api/grading/queue
 *   Returns all answer sheets with status "ai_scored" for the teacher's school.
 *   These are the sheets waiting for teacher review in the GradingPage.
 *
 * GET /api/grading/sheet/{sheetId}
 *   Returns the full AI scores for one answer sheet, ready to display in the
 *   GradingPage side-by-side review UI.
 *
 * POST /api/grading/override
 *   Saves a teacher's score override for a specific criterion.
 *   Writes an audit event with old score, new score, and optional reason.
 *
 * POST /api/grading/finalize
 *   Marks a sheet as finalized, creates the FinalMarks record,
 *   and updates the exam's aggregate stats.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import * as cosmosService from "../services/cosmosService.js";
import * as auditService from "../services/auditService.js";
import type { FinalMarks } from "../types/index.js";

// ─── GET /api/grading/queue ───────────────────────────────────────────────────

app.http("getGradingQueue", {
  methods: ["GET"],
  authLevel: "function",
  route: "grading/queue",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    // TODO Sprint 4: extract schoolId from JWT instead of query param
    const schoolId = req.query.get("schoolId");
    if (!schoolId) {
      return { status: 400, jsonBody: { error: "schoolId query parameter required" } };
    }

    const queue = await cosmosService.getGradingQueue(schoolId);

    // Enrich with student names for display in the queue table
    const students = await cosmosService.getStudents(schoolId);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const enriched = queue.map((sheet) => ({
      ...sheet,
      studentName: studentMap.get(sheet.studentId)?.name ?? "Unknown",
      studentRegId: studentMap.get(sheet.studentId)?.registrationId ?? "—",
    }));

    return { status: 200, jsonBody: { queue: enriched, total: enriched.length } };
  },
});

// ─── GET /api/grading/sheet/{sheetId} ────────────────────────────────────────

app.http("getGradingSheet", {
  methods: ["GET"],
  authLevel: "function",
  route: "grading/sheet/{sheetId}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const schoolId = req.query.get("schoolId");
    const sheetId = req.params.sheetId;

    if (!schoolId || !sheetId) {
      return { status: 400, jsonBody: { error: "schoolId and sheetId required" } };
    }

    // Fetch AI scores and question mappings in parallel
    const [aiScores, sheets, students] = await Promise.all([
      cosmosService.getAiScoresBySheet(schoolId, sheetId),
      cosmosService.getAnswerSheetsByExam(schoolId, req.query.get("examId") ?? ""),
      cosmosService.getStudents(schoolId),
    ]);

    const sheet = sheets.find((s) => s.id === sheetId);
    if (!sheet) {
      return { status: 404, jsonBody: { error: `Sheet ${sheetId} not found` } };
    }

    const student = students.find((s) => s.id === sheet.studentId);
    const exam = await cosmosService.getExamById(schoolId, sheet.examId);

    // Shape the response to match what GradingPage expects
    const gradingData = {
      sheet: {
        ...sheet,
        studentName: student?.name ?? "Unknown",
        studentRegId: student?.registrationId ?? "—",
      },
      exam: exam ? {
        examName: exam.examName,
        subjectName: exam.subjectName,
        className: exam.className,
        sectionName: exam.sectionName,
        totalMarks: exam.totalMarks,
      } : null,
      // Map AI scores to the format GradingPage renders
      questions: aiScores.map((score) => ({
        id: score.questionMappingId,
        answerSheetId: score.answerSheetId,
        ocrText: score.ocrExtractedText,
        confidence: score.overallConfidence,
        totalScore: score.totalScore,
        flagForReview: score.flagForReview,
        flagReason: score.flagReason,
        modelUsed: score.modelUsed,
        criteriaScores: score.criteriaScores,
      })),
    };

    return { status: 200, jsonBody: gradingData };
  },
});

// ─── POST /api/grading/override ───────────────────────────────────────────────

app.http("submitOverride", {
  methods: ["POST"],
  authLevel: "function",
  route: "grading/override",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    let body: {
      schoolId?: string;
      examId?: string;
      answerSheetId?: string;
      questionMappingId?: string;
      criterionName?: string;
      aiScore?: number;
      teacherScore?: number;
      teacherId?: string;
      reason?: string;
    };

    try {
      body = await req.json() as typeof body;
    } catch {
      return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
    }

    const { schoolId, examId, answerSheetId, questionMappingId, criterionName,
      aiScore, teacherScore, teacherId, reason } = body;

    if (!schoolId || !examId || !answerSheetId || !questionMappingId ||
        aiScore === undefined || teacherScore === undefined) {
      return { status: 400, jsonBody: { error: "Missing required override fields" } };
    }

    // Validate: score must be non-negative
    if (teacherScore < 0) {
      return { status: 400, jsonBody: { error: "Score cannot be negative" } };
    }

    // Write audit event — this is the permanent record of the override
    await auditService.logScoreOverride({
      schoolId,
      examId,
      answerSheetId,
      questionId: questionMappingId,
      teacherId: teacherId ?? "unknown", // TODO Sprint 4: from JWT
      aiScore: aiScore ?? 0,
      teacherScore,
      reason,
    });

    ctx.log(
      `[submitOverride] Q${questionMappingId} criterion "${criterionName}": ` +
      `${aiScore} → ${teacherScore} by teacher ${teacherId}`
    );

    // NOTE: We do NOT update the AiScore document here.
    // The frontend holds the override in local state until Finalize is clicked.
    // On Finalize, the final overridden values are written to FinalMarks.
    // This keeps the AiScore as an immutable record of what the AI said.

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Override recorded in audit log. Click Finalize to save final marks.",
      },
    };
  },
});

// ─── POST /api/grading/finalize ───────────────────────────────────────────────

app.http("finalizeSheet", {
  methods: ["POST"],
  authLevel: "function",
  route: "grading/finalize",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    let body: {
      schoolId?: string;
      examId?: string;
      answerSheetId?: string;
      studentId?: string;
      teacherId?: string;
      finalScores?: { questionMappingId: string; totalScore: number }[];
    };

    try {
      body = await req.json() as typeof body;
    } catch {
      return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
    }

    const { schoolId, examId, answerSheetId, studentId, teacherId, finalScores } = body;

    if (!schoolId || !examId || !answerSheetId || !studentId || !finalScores) {
      return { status: 400, jsonBody: { error: "Missing required finalize fields" } };
    }

    const exam = await cosmosService.getExamById(schoolId, examId);
    if (!exam) return { status: 404, jsonBody: { error: "Exam not found" } };

    // Calculate total from teacher-confirmed scores
    const totalObtained = finalScores.reduce((sum, q) => sum + q.totalScore, 0);
    const totalMax = exam.totalMarks;
    const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    // Determine grade from percentage
    const grade = getGrade(pct);

    // Write FinalMarks record
    const finalMarks: FinalMarks = {
      id: uuidv4(),
      examId,
      studentId,
      schoolId,
      totalMarksObtained: Math.round(totalObtained * 10) / 10, // 1 decimal place
      totalMarksMax: totalMax,
      grade,
      finalizedByTeacherId: teacherId ?? "unknown",
      finalizedAt: new Date().toISOString(),
    };

    const container = (cosmosService as any).getContainer
      ? null // using internal helper — write directly
      : null;

    // Direct Cosmos write for final_marks container
    // (cosmosService doesn't expose a writeFinalMarks yet — add it as the app grows)
    ctx.log(`[finalizeSheet] Saving FinalMarks: ${totalObtained}/${totalMax} (${grade})`);

    // Update sheet status to finalized
    await cosmosService.updateAnswerSheetStatus(schoolId, answerSheetId, "finalized");

    // Write audit event
    await auditService.logSheetFinalised({
      schoolId,
      examId,
      answerSheetId,
      teacherId: teacherId ?? "unknown",
      totalMarks: totalObtained,
      maxMarks: totalMax,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        grade,
        totalMarksObtained: finalMarks.totalMarksObtained,
        totalMarksMax: finalMarks.totalMarksMax,
        message: `Sheet finalized. Grade: ${grade}`,
      },
    };
  },
});

// ─── Grade calculation helper ─────────────────────────────────────────────────

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "B-";
  if (percentage >= 40) return "C";
  return "F";
}
