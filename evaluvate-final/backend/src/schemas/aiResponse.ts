/**
 * Evaluvate AI — AI Response Zod Schema
 *
 * This schema validates every JSON response from Gemini or GPT-4o
 * BEFORE anything is saved to Cosmos DB. If validation fails, the
 * scoring is retried or escalated to the fallback model.
 *
 * IMPORTANT: Field names here must exactly match what is in the AI prompt
 * (backend/src/prompts/scoringPrompt.ts). If you rename a field, update both.
 */

import { z } from "zod";

// ─── Per-criterion score block ────────────────────────────────────────────────
const criterionScoreSchema = z.object({
  // Must match one of the rubric criterion names passed in the prompt
  criterion_name: z.string().min(1),

  // Score must be a non-negative number — decimal allowed (e.g., 1.5)
  score: z.number().min(0),

  // The max_score was provided in the prompt — AI echoes it back for verification
  // We cross-check this against the rubric data before saving
  max_score: z.number().min(0),

  // Plain English explanation of why this score was given
  feedback_text: z.string().min(1),

  // true if the handwriting was too unclear to score this criterion confidently
  ocr_uncertain: z.boolean(),
});

// ─── Full AI response schema ──────────────────────────────────────────────────
export const aiResponseSchema = z.object({
  // One block per rubric criterion (e.g., Grammar, Relevance, Correctness)
  criteria_scores: z
    .array(criterionScoreSchema)
    .min(1, "AI must return at least one criterion score"),

  // The raw text Gemini extracted from the handwriting — stored for audit/debugging
  ocr_extracted_text: z.string(),

  // 0.0 (no confidence) to 1.0 (fully confident)
  // Below CONFIDENCE_THRESHOLD → triggers GPT-4o fallback
  overall_confidence: z.number().min(0).max(1),

  // Sum of criteria_scores[].score — we validate this matches the sum ourselves
  total_score: z.number().min(0),

  // true = teacher must review this question before finalizing
  // Set by AI when: handwriting illegible, answer is borderline, dual-model disagrees
  flag_for_review: z.boolean(),

  // Explanation of why flagged — required when flag_for_review is true
  flag_reason: z.string().nullable(),
});

// TypeScript type inferred from the schema — use this in service functions
export type AiResponse = z.infer<typeof aiResponseSchema>;

// ─── Validation helper ────────────────────────────────────────────────────────

/**
 * Validates raw AI output against the schema.
 * Returns { success: true, data } or { success: false, error }
 *
 * Usage:
 *   const result = validateAiResponse(rawJsonFromGemini);
 *   if (!result.success) {
 *     // Log and trigger fallback
 *   }
 */
export function validateAiResponse(raw: unknown): z.SafeParseReturnType<unknown, AiResponse> {
  return aiResponseSchema.safeParse(raw);
}

/**
 * Cross-checks that the total_score reported by the AI matches the sum of
 * criteria_scores. A mismatch suggests the AI hallucinated the total.
 * Tolerance: ±0.1 marks (to allow for floating point differences).
 */
export function validateScoreConsistency(response: AiResponse): boolean {
  const calculatedTotal = response.criteria_scores.reduce(
    (sum, c) => sum + c.score,
    0
  );
  const tolerance = 0.1;
  return Math.abs(calculatedTotal - response.total_score) <= tolerance;
}

/**
 * Cross-checks that each criterion's score does not exceed its max_score.
 * Returns any violations found.
 */
export function findScoreViolations(
  response: AiResponse
): { criterion: string; score: number; maxScore: number }[] {
  return response.criteria_scores
    .filter((c) => c.score > c.max_score + 0.01) // tiny tolerance for floats
    .map((c) => ({
      criterion: c.criterion_name,
      score: c.score,
      maxScore: c.max_score,
    }));
}
