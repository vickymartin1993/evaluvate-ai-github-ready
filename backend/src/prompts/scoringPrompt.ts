/**
 * Evaluvate AI — Scoring Prompt Builder
 *
 * Builds the Gemini/GPT-4o prompt dynamically from:
 *   - The question (from Cosmos DB: QuestionMapping)
 *   - The rubric (from Cosmos DB: Rubric + RubricCriterion)
 *   - The answer key (from Blob Storage, teacher-uploaded)
 *   - Exam context (name, class, subject)
 *
 * READ THIS before modifying:
 *   backend/src/prompts/README.md
 *
 * The JSON schema in this prompt must stay in sync with:
 *   backend/src/schemas/aiResponse.ts
 */

import type { Rubric, QuestionMapping } from "../types/index.js";
import type { ScoringInput } from "../services/geminiService.js";

// ─── Prompt output type ───────────────────────────────────────────────────────
export interface ScoringPrompt {
  systemPrompt: string;
  userMessage: string;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Builds the complete prompt for scoring one question.
 * Called by geminiService.ts and azureOpenAIService.ts.
 */
export function buildScoringPrompt(input: ScoringInput): ScoringPrompt {
  const { question, rubric, answerKeyText, examName, className, subjectName } = input;

  // Calculate per-criterion max marks from rubric weights × question max marks
  const criteriaWithMaxScores = rubric.criteria.map((criterion) => ({
    name: criterion.criterionName,
    description: criterion.description,
    maxScore: parseFloat(
      ((criterion.weightPercentage / 100) * question.maxMarks).toFixed(2)
    ),
  }));

  // Build the rubric table rows for the prompt
  const rubricTable = criteriaWithMaxScores
    .map(
      (c) =>
        `| ${c.name.padEnd(15)} | ${c.description.padEnd(50)} | ${String(c.maxScore).padEnd(9)} |`
    )
    .join("\n");

  // Build the expected JSON schema block showing field names and types
  const criteriaSchemaExample = criteriaWithMaxScores
    .map((c) => `      {
        "criterion_name": "${c.name}",
        "score": <number, 0 to ${c.maxScore}>,
        "max_score": ${c.maxScore},
        "feedback_text": "<explain the score in 1-2 sentences citing the rubric>",
        "ocr_uncertain": <true if handwriting was unclear for this criterion>
      }`)
    .join(",\n");

  // ── SYSTEM PROMPT ─────────────────────────────────────────
  // This is sent as the "system" role — sets the AI's persona and hard rules.
  const systemPrompt = `You are an expert academic examiner for Indian school board examinations.
Your task is to score a student's handwritten answer against the rubric provided.

RULES YOU MUST FOLLOW (no exceptions):
1. Return ONLY valid JSON matching the exact schema shown. No preamble, no explanation outside JSON.
2. Each score must be between 0 and the max_score for that criterion. Decimals allowed.
3. Do NOT invent or guess content for sections you cannot read. Note illegibility instead.
4. If handwriting is unclear for any criterion, set "ocr_uncertain": true for that criterion.
5. If you cannot read enough of the answer to score fairly, set "flag_for_review": true.
6. feedback_text must explain WHY the score was given, referencing the rubric criterion.
7. The total_score must equal the sum of all criteria scores.`;

  // ── USER MESSAGE ──────────────────────────────────────────
  // This is sent as the "user" role — contains exam context, question, rubric, answer key,
  // and the image of the student's handwritten answer.
  const userMessage = `EXAM: ${examName}
SUBJECT: ${subjectName} | CLASS: ${className}
QUESTION NUMBER: ${question.questionNumber}
TOPIC: ${question.topicTag}
MAX MARKS FOR THIS QUESTION: ${question.maxMarks}

QUESTION TEXT:
${question.questionText || "(Question text not provided — score based on rubric and answer key only)"}

RUBRIC (how to award marks for this question):
| Criterion       | Grading Guidance                                           | Max Score |
|-----------------|-----------------------------------------------------------|-----------|
${rubricTable}

REFERENCE ANSWER (teacher's answer key — use as ground truth for Correctness scoring):
${answerKeyText || "(No answer key provided — score based on rubric criteria only)"}

STUDENT'S HANDWRITTEN ANSWER:
[The image attached to this message contains the student's handwritten answer. Read it carefully.]

RESPOND WITH THIS EXACT JSON SCHEMA — no other text:
{
  "criteria_scores": [
${criteriaSchemaExample}
  ],
  "ocr_extracted_text": "<paste the text you read from the handwriting here>",
  "overall_confidence": <0.0 to 1.0, how confident you are in your reading and scoring>,
  "total_score": <sum of all criteria scores>,
  "flag_for_review": <true if teacher must review, false otherwise>,
  "flag_reason": "<reason if flag_for_review is true, otherwise null>"
}`;

  return { systemPrompt, userMessage };
}
