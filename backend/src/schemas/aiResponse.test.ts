/**
 * Tests for AI response validation logic.
 * These run in CI without any API keys — all AI calls are mocked.
 *
 * Run: npm run test (from backend/)
 */

import { describe, it, expect } from "vitest";
import {
  validateAiResponse,
  validateScoreConsistency,
  findScoreViolations,
} from "../src/schemas/aiResponse";

const validResponse = {
  criteria_scores: [
    { criterion_name: "Grammar", score: 1.2, max_score: 1.5, feedback_text: "Clear writing.", ocr_uncertain: false },
    { criterion_name: "Relevance", score: 3.0, max_score: 3.5, feedback_text: "On topic.", ocr_uncertain: false },
    { criterion_name: "Correctness", score: 4.0, max_score: 5.0, feedback_text: "Formula correct.", ocr_uncertain: false },
  ],
  ocr_extracted_text: "Newton's second law F=ma...",
  overall_confidence: 0.87,
  total_score: 8.2,
  flag_for_review: false,
  flag_reason: null,
};

describe("validateAiResponse", () => {
  it("accepts a fully valid response", () => {
    const result = validateAiResponse(validResponse);
    expect(result.success).toBe(true);
  });

  it("rejects missing criteria_scores", () => {
    const { criteria_scores, ...without } = validResponse;
    expect(validateAiResponse(without).success).toBe(false);
  });

  it("rejects empty criteria_scores array", () => {
    const result = validateAiResponse({ ...validResponse, criteria_scores: [] });
    expect(result.success).toBe(false);
  });

  it("rejects confidence above 1.0", () => {
    const result = validateAiResponse({ ...validResponse, overall_confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects negative score", () => {
    const bad = {
      ...validResponse,
      criteria_scores: [{ criterion_name: "Grammar", score: -1, max_score: 1.5, feedback_text: "x", ocr_uncertain: false }],
    };
    expect(validateAiResponse(bad).success).toBe(false);
  });

  it("accepts decimal scores", () => {
    const result = validateAiResponse({ ...validResponse, total_score: 8.2 });
    expect(result.success).toBe(true);
  });

  it("accepts flag_for_review true with a reason", () => {
    const flagged = { ...validResponse, flag_for_review: true, flag_reason: "Handwriting unclear" };
    expect(validateAiResponse(flagged).success).toBe(true);
  });
});

describe("validateScoreConsistency", () => {
  it("returns true when total matches sum of criteria", () => {
    const { data } = validateAiResponse(validResponse) as { success: true; data: any };
    expect(validateScoreConsistency(data)).toBe(true);
  });

  it("returns false when total is wrong by more than 0.1", () => {
    const { data } = validateAiResponse({ ...validResponse, total_score: 5.0 }) as { success: true; data: any };
    expect(validateScoreConsistency(data)).toBe(false);
  });

  it("returns true within floating point tolerance of 0.1", () => {
    const { data } = validateAiResponse({ ...validResponse, total_score: 8.25 }) as { success: true; data: any };
    // 8.2 vs 8.25 — within 0.1 tolerance
    expect(validateScoreConsistency(data)).toBe(true);
  });
});

describe("findScoreViolations", () => {
  it("returns empty array when no violations", () => {
    const { data } = validateAiResponse(validResponse) as { success: true; data: any };
    expect(findScoreViolations(data)).toHaveLength(0);
  });

  it("detects score exceeding max_score", () => {
    const over = {
      ...validResponse,
      criteria_scores: [
        { criterion_name: "Grammar", score: 2.5, max_score: 1.5, feedback_text: "x", ocr_uncertain: false },
      ],
      total_score: 2.5,
    };
    const { data } = validateAiResponse(over) as { success: true; data: any };
    const violations = findScoreViolations(data);
    expect(violations).toHaveLength(1);
    expect(violations[0].criterion).toBe("Grammar");
  });
});
