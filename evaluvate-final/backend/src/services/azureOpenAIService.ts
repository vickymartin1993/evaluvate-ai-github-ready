/**
 * Evaluvate AI — Azure OpenAI Fallback Service
 *
 * This is the FALLBACK scorer — it is only called when:
 *   1. Gemini returns a confidence score below CONFIDENCE_THRESHOLD (default: 0.70)
 *   2. Gemini hits a rate limit (429)
 *   3. Gemini returns invalid JSON after one retry
 *
 * Uses GPT-4o with Structured Outputs (strict: true) which guarantees
 * 100% schema-conformant JSON — no parsing failures in production.
 *
 * If AZURE_OPENAI_API_KEY is not set (e.g., during early POC), this function
 * returns a failure result and the sheet is flagged for manual teacher review.
 */

import OpenAI, { AzureOpenAI } from "openai";
import { validateAiResponse, validateScoreConsistency, findScoreViolations, type AiResponse } from "../schemas/aiResponse.js";
import { buildScoringPrompt } from "../prompts/scoringPrompt.js";
import type { ScoringInput, ScoringResult, ScoringFailure } from "./geminiService.js";

// ─── Client initialisation ───────────────────────────────────────────────────
let _azureClient: AzureOpenAI | null = null;

function getClient(): AzureOpenAI | null {
  // Return null if Azure OpenAI is not configured — caller handles gracefully
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!apiKey || !endpoint) return null;

  if (!_azureClient) {
    _azureClient = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion: "2024-08-01-preview", // Required for Structured Outputs
    });
  }
  return _azureClient;
}

// ─── JSON Schema for Structured Outputs ──────────────────────────────────────
// GPT-4o Structured Outputs with strict: true guarantees this schema is always
// returned exactly — no extra fields, no missing fields, no type mismatches.
// This eliminates the JSON parsing failures that can occur with Gemini's
// responseMimeType: "application/json" approach.

const AI_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    criteria_scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criterion_name: { type: "string" },
          score: { type: "number" },
          max_score: { type: "number" },
          feedback_text: { type: "string" },
          ocr_uncertain: { type: "boolean" },
        },
        required: ["criterion_name", "score", "max_score", "feedback_text", "ocr_uncertain"],
        additionalProperties: false,
      },
    },
    ocr_extracted_text: { type: "string" },
    overall_confidence: { type: "number" },
    total_score: { type: "number" },
    flag_for_review: { type: "boolean" },
    flag_reason: { type: ["string", "null"] },
  },
  required: [
    "criteria_scores",
    "ocr_extracted_text",
    "overall_confidence",
    "total_score",
    "flag_for_review",
    "flag_reason",
  ],
  additionalProperties: false,
} as const;

// ─── Main fallback scoring function ──────────────────────────────────────────

/**
 * Score a single question using Azure OpenAI GPT-4o as fallback.
 * Returns ScoringResult | ScoringFailure — same interface as geminiService.
 */
export async function scoreQuestionWithAzureOpenAI(
  input: ScoringInput
): Promise<ScoringResult | ScoringFailure> {
  const client = getClient();

  // If Azure OpenAI is not configured, fail gracefully
  if (!client) {
    return {
      success: false,
      reason: "api_error",
      errorMessage:
        "Azure OpenAI is not configured (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT missing). " +
        "Sheet will be flagged for manual teacher review.",
      retryable: false,
    };
  }

  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";
  const { systemPrompt, userMessage } = buildScoringPrompt(input);

  try {
    const completion = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            {
              // GPT-4o Vision: send the answer sheet image inline
              type: "image_url",
              image_url: {
                url: `data:${input.answerImageMimeType};base64,${input.answerImageBase64}`,
                detail: "high", // "high" = better OCR accuracy, costs more tokens
              },
            },
          ],
        },
      ],
      // Structured Outputs: strict: true = guaranteed schema conformance
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "evaluvate_score",
          strict: true,
          schema: AI_RESPONSE_JSON_SCHEMA,
        },
      },
      temperature: 0,        // Deterministic
      max_tokens: 1024,
    });

    const rawText = completion.choices[0]?.message?.content ?? "";
    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;

    // Parse — with Structured Outputs this should always succeed
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return {
        success: false,
        reason: "invalid_json",
        errorMessage: `GPT-4o Structured Output returned non-JSON: ${rawText.slice(0, 200)}`,
        retryable: false, // Both models failed — flag for teacher
      };
    }

    // Validate with Zod as a safety net even though Structured Outputs guarantees schema
    const validation = validateAiResponse(parsed);
    if (!validation.success) {
      return {
        success: false,
        reason: "schema_validation",
        errorMessage: `GPT-4o response failed Zod validation: ${JSON.stringify(validation.error.flatten())}`,
        retryable: false,
      };
    }

    const aiData = validation.data;

    // Auto-correct total_score if it doesn't match sum of criteria
    if (!validateScoreConsistency(aiData)) {
      aiData.total_score = aiData.criteria_scores.reduce((s, c) => s + c.score, 0);
    }

    const violations = findScoreViolations(aiData);
    if (violations.length > 0) {
      return {
        success: false,
        reason: "score_violation",
        errorMessage: `GPT-4o gave scores exceeding max: ${JSON.stringify(violations)}`,
        retryable: false,
      };
    }

    return {
      success: true,
      data: aiData,
      inputTokens,
      outputTokens,
      modelUsed: "gemini-2.5-flash", // Overridden by caller to "gpt-4o"
    };

  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    return {
      success: false,
      reason: "api_error",
      errorMessage: `Azure OpenAI error: ${error?.message ?? "Unknown"}`,
      retryable: false,
    };
  }
}
