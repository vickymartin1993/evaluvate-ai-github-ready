/**
 * Evaluvate AI — Shared TypeScript Types
 *
 * These interfaces are the single source of truth for all data shapes
 * used across the backend. The frontend mirrors these in src/types/index.ts.
 *
 * When you add or change a field here:
 *   1. Update the frontend src/types/index.ts to match
 *   2. Update the Zod schema in schemas/aiResponse.ts if it affects AI output
 *   3. Update Cosmos DB queries in services/cosmosService.ts if needed
 */

// ─── Answer Sheet Status Flow ─────────────────────────────────────────────────
// uploaded → ai_scoring → ai_scored → teacher_review → finalized
// The UI uses these exact string values for status badges and routing.
export type AnswerSheetStatus =
  | "uploaded"       // PDF is in Blob Storage, not yet processed
  | "ai_scoring"     // Gemini is currently processing (show spinner in UI)
  | "ai_scored"      // AI scores saved to Cosmos, ready for teacher review
  | "teacher_review" // Teacher has opened the sheet but not yet finalised
  | "finalized";     // Teacher confirmed all scores — FinalMarks record created

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface RubricCriterion {
  id: string;
  rubricId: string;
  criterionName: string;   // e.g., "Grammar", "Relevance", "Correctness"
  maxMarks: number;        // Absolute max — calculated from weightPercentage × question maxMarks
  weightPercentage: number; // e.g., 15 for Grammar, 35 for Relevance, 50 for Correctness
  description: string;     // Grading guidance shown in AI prompt
}

export interface Rubric {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  classBand: string;              // e.g., "9-10", "11-12"
  defaultGrammarWeight: number;
  defaultRelevanceWeight: number;
  defaultCorrectnessWeight: number;
  isSchoolDefault: boolean;
  criteria: RubricCriterion[];
}

export interface ExamSection {
  id: string;
  examId: string;
  partName: string;           // e.g., "Part A", "Section 1"
  description: string;        // e.g., "1 mark questions"
  questionsCount: number;
  marksPerQuestion: number;
  totalSectionMarks: number;  // questionsCount × marksPerQuestion
  rubricId: string;           // Which rubric applies to this section
}

export interface Exam {
  id: string;
  schoolId: string;
  subjectName: string;
  examName: string;
  examType: "Quarterly" | "Midterm" | "Final" | "UnitTest";
  academicYear: string;       // e.g., "2025-2026"
  className: string;          // e.g., "11"
  sectionName: string;        // e.g., "A"
  examDate: string;           // ISO 8601 date string
  totalMarks: number;
  status: "draft" | "published" | "grading" | "completed" | "archived";
  answerKeyPath?: string;     // Blob Storage path to teacher's answer key PDF
  createdByTeacherId: string;
  sections: ExamSection[];
  // Denormalised stats — updated after each sheet is finalised
  scriptsCount: number;
  gradedCount: number;
  avgScore: number;
  avgConfidence: number;
}

export interface Student {
  id: string;
  schoolId: string;
  registrationId: string;   // e.g., "STU-2026-0042" — used for upload lookup
  name: string;
  className: string;
  sectionName: string;
  email: string;
}

export interface AnswerSheet {
  id: string;
  examId: string;
  schoolId: string;
  studentId: string;
  blobPath: string;          // Azure Blob Storage path: answer-sheets/{schoolId}/{examId}/{studentId}.pdf
  pagesCount: number;
  status: AnswerSheetStatus;
  uploadedByUserId: string;
  uploadedAt: string;        // ISO 8601
  scoringStartedAt?: string;
  scoringCompletedAt?: string;
  modelUsed?: "gemini-2.5-flash" | "gpt-4o";   // Which AI model scored this sheet
  fallbackUsed?: boolean;    // true if GPT-4o was called for any question
}

export interface QuestionMapping {
  id: string;
  examId: string;
  sectionId: string;
  schoolId: string;
  questionNumber: number;
  questionText?: string;     // Optional: teacher can add the question text for AI context
  topicTag: string;
  difficultyLevel: "easy" | "medium" | "hard";
  maxMarks: number;
  orderIndex: number;
}

// ─── AI Scoring Output ────────────────────────────────────────────────────────

export interface AiCriterionScore {
  criterionName: string;    // Must match RubricCriterion.criterionName exactly
  score: number;            // 0 to maxScore (can be decimal)
  maxScore: number;         // Echoed from rubric for UI display
  feedbackText: string;     // Gemini's explanation of this score
  ocrUncertain: boolean;    // true if handwriting was unclear for this criterion
}

export interface AiScore {
  id: string;
  answerSheetId: string;
  questionMappingId: string;
  schoolId: string;
  criteriaScores: AiCriterionScore[];
  ocrExtractedText: string;    // What Gemini read from the handwriting
  overallConfidence: number;   // 0.0 to 1.0 — drives ConfidenceBadge in UI
  totalScore: number;          // Sum of criteriaScores[].score
  flagForReview: boolean;      // true = teacher MUST review (cannot skip)
  flagReason: string | null;
  modelUsed: "gemini-2.5-flash" | "gpt-4o";
  scoredAt: string;            // ISO 8601
}

export interface FinalMarks {
  id: string;
  examId: string;
  studentId: string;
  schoolId: string;
  totalMarksObtained: number;
  totalMarksMax: number;
  grade?: string;              // Calculated from GradingPolicy
  finalizedByTeacherId: string;
  finalizedAt: string;         // ISO 8601
}

// ─── Audit & Usage ────────────────────────────────────────────────────────────

export type AuditEventType =
  | "sheet_uploaded"
  | "ai_scoring_started"
  | "ai_scoring_completed"
  | "ai_scoring_failed"
  | "score_override"           // Teacher changed an AI score
  | "sheet_finalized"
  | "exam_created"
  | "exam_published";

export interface AuditEvent {
  id: string;
  schoolId: string;
  examId?: string;
  answerSheetId?: string;
  questionId?: string;
  userId: string;              // Who triggered the event (or "system" for AI events)
  eventType: AuditEventType;
  oldValue?: string;           // For score_override: the AI's score
  newValue?: string;           // For score_override: the teacher's score
  reason?: string;             // Optional teacher note on why they overrode
  timestamp: string;           // ISO 8601
}

export interface UsageEvent {
  id: string;
  schoolId: string;
  examId: string;
  answerSheetId: string;
  questionId?: string;
  eventType: "ai_scoring" | "fallback_scoring" | "blob_read" | "blob_write";
  modelUsed: "gemini-2.5-flash" | "gpt-4o" | "none";
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  estimatedCostInr: number;    // USD × USD_TO_INR_RATE env var
  timestamp: string;
  wasSuccessful: boolean;
  wasFallback: boolean;
}
