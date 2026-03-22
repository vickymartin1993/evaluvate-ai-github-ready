/**
 * Evaluvate AI — Gemini Service
 *
 * All Gemini 2.5 Flash API calls go through this file.
 * This is the PRIMARY AI scorer for the platform.
 *
 * Gemini is called with multimodal input: the answer sheet image + rubric + prompt.
 * It reads the handwriting directly — there is no separate OCR step.
 *
 * If Gemini fails (rate limit, timeout, bad JSON), the caller (triggerScoring.ts)
 * escalates to the Azure OpenAI fallback in azureOpenAIService.ts.
 */

import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { validateAiResponse, validateScoreConsistency, findScoreViolations, type AiResponse } from "../schemas/aiResponse.js";
import type { Rubric, QuestionMapping } from "../types/index.js";
import { buildScoringPrompt } from "../prompts/scoringPrompt.js";

// ─── Client initialisation ───────────────────────────────────────────────────
// Lazily initialised so tests can mock before the module loads
let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. " +
        "Add it to backend/.env (local) or Azure Function App Configuration (production)."
      );
    }
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoringInput {
  question: QuestionMapping;
  rubric: Rubric;
  answerKeyText: string;       // Text extracted from teacher's answer key PDF
  answerImageBase64: string;   // Base64-encoded image of the answer page
  answerImageMimeType: "image/jpeg" | "image/png" | "image/webp";
  examName: string;
  className: string;
  subjectName: string;
}

export interface ScoringResult {
  success: true;
  data: AiResponse;
  inputTokens: number;
  outputTokens: number;
  modelUsed: "gemini-2.5-flash";
}

export interface ScoringFailure {
  success: false;
  reason: "rate_limit" | "invalid_json" | "schema_validation" | "score_violation" | "api_error";
  errorMessage: string;
  retryable: boolean;  // true = caller should try the fallback model
}

// ─── Main scoring function ────────────────────────────────────────────────────

/**
 * Score a single question from a student's answer sheet using Gemini 2.5 Flash.
 *
 * Returns a ScoringResult on success or ScoringFailure if anything goes wrong.
 * The caller (triggerScoring.ts) decides whether to escalate to GPT-4o fallback.
 */
export async function scoreQuestionWithGemini(
  input: ScoringInput
): Promise<ScoringResult | ScoringFailure> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Build the prompt from rubric and question data
  const { systemPrompt, userMessage } = buildScoringPrompt(input);

  // Construct the multimodal message: text prompt + image
  const imagePart: Part = {
    inlineData: {
      data: input.answerImageBase64,
      mimeType: input.answerImageMimeType,
    },
  };

  let rawText = "";

  try {
    const genAI = getClient();
    const geminiModel = genAI.getGenerativeModel({
      model,
      // System instruction tells Gemini its role and rules before the user message
      systemInstruction: systemPrompt,
      generationConfig: {
        // Force JSON output — critical so we always get parseable text
        responseMimeType: "application/json",
        // Temperature 0 = deterministic, consistent scoring
        // Increase to 0.1–0.2 only if scores feel too rigid
        temperature: 0,
        maxOutputTokens: 1024,
      },
    });

    const result = await geminiModel.generateContent([userMessage, imagePart]);
    const response = result.response;
    rawText = response.text();

    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

    // ── Parse JSON ──────────────────────────────────────────
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("[Gemini] Failed to parse JSON response:", rawText.slice(0, 500));
      return {
        success: false,
        reason: "invalid_json",
        errorMessage: `Gemini returned non-JSON text: ${rawText.slice(0, 200)}`,
        retryable: true,
      };
    }

    // ── Validate against Zod schema ─────────────────────────
    const validation = validateAiResponse(parsed);
    if (!validation.success) {
      console.error("[Gemini] Schema validation failed:", validation.error.flatten());
      return {
        success: false,
        reason: "schema_validation",
        errorMessage: `AI response did not match expected schema: ${JSON.stringify(validation.error.flatten())}`,
        retryable: true,
      };
    }

    const aiData = validation.data;

    // ── Cross-check score consistency ───────────────────────
    if (!validateScoreConsistency(aiData)) {
      console.warn("[Gemini] total_score does not match sum of criteria scores — correcting.");
      // Auto-correct rather than fail: recalculate the total
      aiData.total_score = aiData.criteria_scores.reduce((s, c) => s + c.score, 0);
    }

    // ── Check no criterion exceeds its max ──────────────────
    const violations = findScoreViolations(aiData);
    if (violations.length > 0) {
      console.error("[Gemini] Score violations found:", violations);
      return {
        success: false,
        reason: "score_violation",
        errorMessage: `AI gave scores exceeding max: ${JSON.stringify(violations)}`,
        retryable: true,
      };
    }

    return {
      success: true,
      data: aiData,
      inputTokens,
      outputTokens,
      modelUsed: "gemini-2.5-flash",
    };

  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };

    // ── Handle rate limiting (429) ──────────────────────────
    if (error?.status === 429) {
      console.warn("[Gemini] Rate limit hit (429) — caller should use fallback.");
      return {
        success: false,
        reason: "rate_limit",
        errorMessage: "Gemini free tier rate limit reached. Retry after 60 seconds or use fallback.",
        retryable: true,
      };
    }

    // ── All other API errors ────────────────────────────────
    console.error("[Gemini] API error:", error?.message ?? err);
    return {
      success: false,
      reason: "api_error",
      errorMessage: `Gemini API error: ${error?.message ?? "Unknown error"}`,
      retryable: true,
    };
  }
}
