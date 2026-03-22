/**
 * Mock grading data for development/demo mode.
 * Used when VITE_FEATURE_REAL_SCORING=false.
 * Mirrors the shape returned by GET /api/grading/sheet/{sheetId}.
 */
import type { GradingSheetResponse } from "@/types";

export const mockGradingData: GradingSheetResponse = {
  sheet: {
    id: "as-1", examId: "exam-1", schoolId: "school_poc_001",
    studentId: "stu-1", blobPath: "school_poc_001/exam-1/stu-1/answer-sheet.pdf",
    pagesCount: 24, status: "ai_scored",
    uploadedByUserId: "teacher-1", uploadedAt: "2026-03-12T10:30:00Z",
    studentName: "Arun Patel", studentRegId: "STU-2026-0042",
  },
  exam: {
    examName: "Physics Mid-Term 2026", subjectName: "Physics",
    className: "11", sectionName: "A", totalMarks: 30,
  },
  questions: [
    {
      id: "qm-1", answerSheetId: "as-1",
      ocrText: "Newton's second law states that force equals mass times acceleration (F=ma). When a net force acts on an object, it accelerates in the direction of the force.",
      confidence: 0.93, totalScore: 8, flagForReview: false, flagReason: null, modelUsed: "gemini-2.5-flash",
      criteriaScores: [
        { criterionName: "Grammar", score: 1.2, maxScore: 1.5, feedbackText: "Clear and well-structured.", ocrUncertain: false },
        { criterionName: "Relevance", score: 3.3, maxScore: 3.5, feedbackText: "Directly addresses Newton's Second Law.", ocrUncertain: false },
        { criterionName: "Correctness", score: 3.5, maxScore: 5.0, feedbackText: "Formula correct. Vector notation absent.", ocrUncertain: false },
      ],
    },
    {
      id: "qm-2", answerSheetId: "as-1",
      ocrText: "Thermodynamics first law: energy cannot be created or destroyed. ΔU = Q - W",
      confidence: 0.71, totalScore: 5, flagForReview: false, flagReason: null, modelUsed: "gemini-2.5-flash",
      criteriaScores: [
        { criterionName: "Grammar", score: 1.0, maxScore: 1.5, feedbackText: "Acceptable but imprecise.", ocrUncertain: false },
        { criterionName: "Relevance", score: 2.0, maxScore: 3.5, feedbackText: "Conflates first law with conservation.", ocrUncertain: false },
        { criterionName: "Correctness", score: 2.0, maxScore: 5.0, feedbackText: "Sign convention ambiguous.", ocrUncertain: false },
      ],
    },
    {
      id: "qm-3", answerSheetId: "as-1",
      ocrText: "The projectile motion... [handwriting partially illegible] ...range = v²sin2θ/g",
      confidence: 0.58, totalScore: 3, flagForReview: true,
      flagReason: "Handwriting partially illegible — intermediate steps unreadable.",
      modelUsed: "gpt-4o",
      criteriaScores: [
        { criterionName: "Grammar", score: 0.5, maxScore: 1.5, feedbackText: "Cannot evaluate fully — illegible sections.", ocrUncertain: true },
        { criterionName: "Relevance", score: 1.5, maxScore: 3.5, feedbackText: "Formulas visible but working unreadable.", ocrUncertain: true },
        { criterionName: "Correctness", score: 1.0, maxScore: 5.0, feedbackText: "Range formula correct. Derivation not verifiable.", ocrUncertain: true },
      ],
    },
  ],
};
