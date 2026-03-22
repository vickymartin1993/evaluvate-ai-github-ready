/**
 * Evaluvate AI — Audit Service
 *
 * Centralises all audit and usage event writing.
 * Every significant action in the system produces an audit record:
 *   - Sheet uploaded
 *   - AI scoring started / completed / failed
 *   - Teacher score override
 *   - Sheet finalised
 *   - Exam created / published
 *
 * Every AI API call produces a usage record (for cost tracking and future billing).
 *
 * IMPORTANT: Audit writes are fire-and-forget — they must never block or
 * fail the main operation. If audit writing fails, log the error and continue.
 */

import { v4 as uuidv4 } from "uuid";
import * as cosmosService from "./cosmosService.js";
import type { AuditEvent, AuditEventType, UsageEvent } from "../types/index.js";

// ─── Cost calculation helpers ─────────────────────────────────────────────────

// Pricing as of 2025 — update if Google or Azure change their pricing.
// These are used only for the usage_events cost estimates; billing is not automated.
const GEMINI_FLASH_COST_PER_1M_INPUT_TOKENS_USD = 0.075;
const GEMINI_FLASH_COST_PER_1M_OUTPUT_TOKENS_USD = 0.30;
const GPT4O_COST_PER_1M_INPUT_TOKENS_USD = 5.0;
const GPT4O_COST_PER_1M_OUTPUT_TOKENS_USD = 15.0;

function calculateCostUsd(
  model: "gemini-2.5-flash" | "gpt-4o",
  inputTokens: number,
  outputTokens: number
): number {
  if (model === "gemini-2.5-flash") {
    return (
      (inputTokens / 1_000_000) * GEMINI_FLASH_COST_PER_1M_INPUT_TOKENS_USD +
      (outputTokens / 1_000_000) * GEMINI_FLASH_COST_PER_1M_OUTPUT_TOKENS_USD
    );
  }
  return (
    (inputTokens / 1_000_000) * GPT4O_COST_PER_1M_INPUT_TOKENS_USD +
    (outputTokens / 1_000_000) * GPT4O_COST_PER_1M_OUTPUT_TOKENS_USD
  );
}

// ─── Audit event writers ──────────────────────────────────────────────────────

/**
 * Generic audit event writer. Prefer the specific helpers below
 * (logSheetUploaded, logAiScoringCompleted, etc.) for consistency.
 */
export async function logAuditEvent(
  schoolId: string,
  event: Omit<AuditEvent, "id" | "timestamp">
): Promise<void> {
  const fullEvent: AuditEvent = {
    ...event,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };

  // Non-blocking: never let audit failure crash the main flow
  await cosmosService.writeAuditEvent(schoolId, fullEvent).catch((err) => {
    console.error("[AuditService] Failed to write audit event:", err, fullEvent);
  });
}

/** Written when a teacher uploads an answer sheet PDF */
export async function logSheetUploaded(params: {
  schoolId: string;
  examId: string;
  answerSheetId: string;
  uploadedByUserId: string;
  studentId: string;
}): Promise<void> {
  await logAuditEvent(params.schoolId, {
    schoolId: params.schoolId,
    examId: params.examId,
    answerSheetId: params.answerSheetId,
    userId: params.uploadedByUserId,
    eventType: "sheet_uploaded",
    newValue: params.studentId,
  });
}

/** Written when the Blob Trigger fires and AI scoring begins */
export async function logAiScoringStarted(params: {
  schoolId: string;
  examId: string;
  answerSheetId: string;
}): Promise<void> {
  await logAuditEvent(params.schoolId, {
    schoolId: params.schoolId,
    examId: params.examId,
    answerSheetId: params.answerSheetId,
    userId: "system",
    eventType: "ai_scoring_started",
  });
}

/** Written when all questions in a sheet are successfully scored */
export async function logAiScoringCompleted(params: {
  schoolId: string;
  examId: string;
  answerSheetId: string;
  modelUsed: "gemini-2.5-flash" | "gpt-4o";
  fallbackUsed: boolean;
}): Promise<void> {
  await logAuditEvent(params.schoolId, {
    schoolId: params.schoolId,
    examId: params.examId,
    answerSheetId: params.answerSheetId,
    userId: "system",
    eventType: "ai_scoring_completed",
    newValue: params.modelUsed,
    reason: params.fallbackUsed ? "GPT-4o fallback was used for one or more questions" : undefined,
  });
}

/** Written when AI scoring fails after all retries */
export async function logAiScoringFailed(params: {
  schoolId: string;
  examId: string;
  answerSheetId: string;
  reason: string;
}): Promise<void> {
  await logAuditEvent(params.schoolId, {
    schoolId: params.schoolId,
    examId: params.examId,
    answerSheetId: params.answerSheetId,
    userId: "system",
    eventType: "ai_scoring_failed",
    reason: params.reason,
  });
}

/**
 * Written when a teacher changes an AI-assigned score.
 * This is the most important audit event — it tracks every human override.
 */
export async function logScoreOverride(params: {
  schoolId: string;
  examId: string;
  answerSheetId: string;
  questionId: string;
  teacherId: string;
  aiScore: number;
  teacherScore: number;
  reason?: string;
}): Promise<void> {
  await logAuditEvent(params.schoolId, {
    schoolId: params.schoolId,
    examId: params.examId,
    answerSheetId: params.answerSheetId,
    questionId: params.questionId,
    userId: params.teacherId,
    eventType: "score_override",
    oldValue: String(params.aiScore),
    newValue: String(params.teacherScore),
    reason: params.reason,
  });
}

/** Written when a teacher clicks Finalise for a sheet */
export async function logSheetFinalised(params: {
  schoolId: string;
  examId: string;
  answerSheetId: string;
  teacherId: string;
  totalMarks: number;
  maxMarks: number;
}): Promise<void> {
  await logAuditEvent(params.schoolId, {
    schoolId: params.schoolId,
    examId: params.examId,
    answerSheetId: params.answerSheetId,
    userId: params.teacherId,
    eventType: "sheet_finalized",
    newValue: `${params.totalMarks}/${params.maxMarks}`,
  });
}

// ─── Usage event writer ───────────────────────────────────────────────────────

/**
 * Written after every AI API call (success or failure).
 * Tracks token counts and estimated cost per school for future billing.
 * Never throws — usage tracking must not block scoring.
 */
export async function logUsageEvent(params: {
  schoolId: string;
  examId: string;
  answerSheetId: string;
  questionId?: string;
  model: "gemini-2.5-flash" | "gpt-4o";
  inputTokens: number;
  outputTokens: number;
  wasSuccessful: boolean;
  wasFallback: boolean;
}): Promise<void> {
  const usdToInr = parseFloat(process.env.USD_TO_INR_RATE || "83.5");
  const costUsd = calculateCostUsd(params.model, params.inputTokens, params.outputTokens);

  const event: UsageEvent = {
    id: uuidv4(),
    schoolId: params.schoolId,
    examId: params.examId,
    answerSheetId: params.answerSheetId,
    questionId: params.questionId,
    eventType: params.wasFallback ? "fallback_scoring" : "ai_scoring",
    modelUsed: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    estimatedCostUsd: parseFloat(costUsd.toFixed(6)),
    estimatedCostInr: parseFloat((costUsd * usdToInr).toFixed(4)),
    timestamp: new Date().toISOString(),
    wasSuccessful: params.wasSuccessful,
    wasFallback: params.wasFallback,
  };

  await cosmosService.writeUsageEvent(params.schoolId, event);
}
