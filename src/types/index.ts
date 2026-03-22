/**
 * Evaluvate AI — Frontend TypeScript Types
 *
 * These must stay in sync with backend/src/types/index.ts.
 * When you change a type in the backend, update this file too.
 *
 * These types are used by:
 *   - React Query hooks (src/hooks/)
 *   - API service (src/services/api.ts)
 *   - Page components (src/pages/)
 */

export type AnswerSheetStatus =
  | "uploaded"
  | "ai_scoring"
  | "ai_scored"
  | "teacher_review"
  | "finalized";

export interface RubricCriterion {
  id: string;
  rubricId: string;
  criterionName: string;
  maxMarks: number;
  weightPercentage: number;
  description: string;
}

export interface Rubric {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  classBand: string;
  defaultGrammarWeight: number;
  defaultRelevanceWeight: number;
  defaultCorrectnessWeight: number;
  isSchoolDefault: boolean;
  criteria: RubricCriterion[];
}

export interface ExamSection {
  id: string;
  examId: string;
  partName: string;
  description: string;
  questionsCount: number;
  marksPerQuestion: number;
  totalSectionMarks: number;
  rubricId: string;
}

export interface Exam {
  id: string;
  schoolId: string;
  subjectName: string;
  examName: string;
  examType: "Quarterly" | "Midterm" | "Final" | "UnitTest";
  academicYear: string;
  className: string;
  sectionName: string;
  examDate: string;
  totalMarks: number;
  status: "draft" | "published" | "grading" | "completed" | "archived";
  answerKeyPath?: string;
  createdByTeacherId: string;
  sections: ExamSection[];
  scriptsCount: number;
  gradedCount: number;
  avgScore: number;
  avgConfidence: number;
}

export interface Student {
  id: string;
  schoolId: string;
  registrationId: string;
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
  blobPath: string;
  pagesCount: number;
  status: AnswerSheetStatus;
  uploadedByUserId: string;
  uploadedAt: string;
  scoringStartedAt?: string;
  scoringCompletedAt?: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
  // Enriched by API (joined from students table)
  studentName?: string;
  studentRegId?: string;
}

export interface AiCriterionScore {
  criterionName: string;
  score: number;
  maxScore: number;
  feedbackText: string;
  ocrUncertain: boolean;
}

export interface GradingQuestion {
  id: string;
  answerSheetId: string;
  ocrText: string;
  confidence: number;
  totalScore: number;
  flagForReview: boolean;
  flagReason: string | null;
  modelUsed: string;
  criteriaScores: AiCriterionScore[];
}

export interface GradingSheetResponse {
  sheet: AnswerSheet;
  exam: {
    examName: string;
    subjectName: string;
    className: string;
    sectionName: string;
    totalMarks: number;
  } | null;
  questions: GradingQuestion[];
}

export interface SasUploadResponse {
  sasUrl: string;
  blobPath: string;
  sheetId: string;
  studentId: string;
  studentName: string;
  expiresInMinutes: number;
}
