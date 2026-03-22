// ==========================================
// Evaluvate — Shared Mock Data Store
// ==========================================

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

export interface RubricCriterion {
  id: string;
  rubricId: string;
  criterionName: string;
  maxMarks: number;
  weightPercentage: number;
  description: string;
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
  status: "draft" | "published" | "archived" | "grading" | "completed";
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
  registrationId: string;
  name: string;
  className: string;
  sectionName: string;
  email: string;
}

export interface AnswerSheet {
  id: string;
  examId: string;
  studentId: string;
  storagePath: string;
  pagesCount: number;
  status: "uploaded" | "ocr_in_progress" | "ai_scored" | "teacher_review" | "finalized";
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface QuestionMapping {
  id: string;
  examId: string;
  sectionId: string;
  questionNumber: number;
  topicTag: string;
  difficultyLevel: "easy" | "medium" | "hard";
  maxMarks: number;
  orderIndex: number;
}

export interface AiScore {
  id: string;
  answerSheetId: string;
  questionMappingId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  aiFeedbackText: string;
}

export interface FinalMarks {
  id: string;
  examId: string;
  studentId: string;
  totalMarksObtained: number;
  totalMarksMax: number;
  grade?: string;
  finalizedByTeacherId?: string;
  finalizedAt?: string;
}

export interface GradingPolicy {
  passPercentage: number;
  distinctionThreshold: number;
  classBandMultipliers: {
    classBand: string;
    grammarFactor: number;
    relevanceFactor: number;
    correctnessFactor: number;
  }[];
}

// ==========================================
// Mock Rubrics
// ==========================================
export const mockRubrics: Rubric[] = [
  {
    id: "rub-1",
    schoolId: "school-1",
    name: "Standard Science Rubric",
    description: "Default rubric for science subjects (Class 9–10)",
    classBand: "9–10",
    defaultGrammarWeight: 15,
    defaultRelevanceWeight: 35,
    defaultCorrectnessWeight: 50,
    isSchoolDefault: true,
    criteria: [
      { id: "rc-1", rubricId: "rub-1", criterionName: "Grammar", maxMarks: 1, weightPercentage: 15, description: "Clarity of language and sentence structure" },
      { id: "rc-2", rubricId: "rub-1", criterionName: "Relevance", maxMarks: 2, weightPercentage: 35, description: "Answer addresses the question directly" },
      { id: "rc-3", rubricId: "rub-1", criterionName: "Correctness", maxMarks: 2, weightPercentage: 50, description: "Factual accuracy and completeness" },
    ],
  },
  {
    id: "rub-2",
    schoolId: "school-1",
    name: "Senior Science Rubric",
    description: "Rubric for senior science with stricter evaluation (Class 11–12)",
    classBand: "11–12",
    defaultGrammarWeight: 10,
    defaultRelevanceWeight: 30,
    defaultCorrectnessWeight: 60,
    isSchoolDefault: false,
    criteria: [
      { id: "rc-4", rubricId: "rub-2", criterionName: "Grammar", maxMarks: 1, weightPercentage: 10, description: "Language precision" },
      { id: "rc-5", rubricId: "rub-2", criterionName: "Relevance", maxMarks: 3, weightPercentage: 30, description: "Direct relevance to question" },
      { id: "rc-6", rubricId: "rub-2", criterionName: "Correctness", maxMarks: 6, weightPercentage: 60, description: "Scientific accuracy and derivation" },
    ],
  },
  {
    id: "rub-3",
    schoolId: "school-1",
    name: "English Essay Rubric",
    description: "Rubric for English essay evaluations (Class 9–10)",
    classBand: "9–10",
    defaultGrammarWeight: 40,
    defaultRelevanceWeight: 30,
    defaultCorrectnessWeight: 30,
    isSchoolDefault: false,
    criteria: [
      { id: "rc-7", rubricId: "rub-3", criterionName: "Grammar", maxMarks: 4, weightPercentage: 40, description: "Grammar, punctuation, sentence structure" },
      { id: "rc-8", rubricId: "rub-3", criterionName: "Relevance", maxMarks: 3, weightPercentage: 30, description: "Topic adherence and coherence" },
      { id: "rc-9", rubricId: "rub-3", criterionName: "Presentation", maxMarks: 3, weightPercentage: 30, description: "Organization and formatting" },
    ],
  },
];

// ==========================================
// Mock Students
// ==========================================
export const mockStudents: Student[] = [
  { id: "stu-1", registrationId: "STU-2026-0042", name: "Arun Patel", className: "11", sectionName: "A", email: "arun@school.com" },
  { id: "stu-2", registrationId: "STU-2026-0015", name: "Riya Singh", className: "11", sectionName: "A", email: "riya@school.com" },
  { id: "stu-3", registrationId: "STU-2026-0088", name: "Ming Chen", className: "11", sectionName: "B", email: "ming@school.com" },
  { id: "stu-4", registrationId: "STU-2026-0031", name: "Sara Ahmed", className: "11", sectionName: "A", email: "sara@school.com" },
  { id: "stu-5", registrationId: "STU-2026-0056", name: "James Wilson", className: "11", sectionName: "B", email: "james@school.com" },
  { id: "stu-6", registrationId: "STU-2026-0072", name: "Priya Sharma", className: "11", sectionName: "A", email: "priya@school.com" },
];

// ==========================================
// Mock Exams (with sections)
// ==========================================
export const mockExams: Exam[] = [
  {
    id: "exam-1",
    schoolId: "school-1",
    subjectName: "Physics",
    examName: "Physics Mid-Term 2026",
    examType: "Midterm",
    academicYear: "2025-2026",
    className: "11",
    sectionName: "A",
    examDate: "2026-03-12",
    totalMarks: 100,
    status: "grading",
    createdByTeacherId: "teacher-1",
    scriptsCount: 42,
    gradedCount: 38,
    avgScore: 72.4,
    avgConfidence: 0.87,
    sections: [
      { id: "sec-1", examId: "exam-1", partName: "Part 1", description: "1 mark questions", questionsCount: 10, marksPerQuestion: 1, totalSectionMarks: 10, rubricId: "rub-2" },
      { id: "sec-2", examId: "exam-1", partName: "Part 2", description: "2 mark questions", questionsCount: 10, marksPerQuestion: 2, totalSectionMarks: 20, rubricId: "rub-2" },
      { id: "sec-3", examId: "exam-1", partName: "Part 3", description: "5 mark questions", questionsCount: 6, marksPerQuestion: 5, totalSectionMarks: 30, rubricId: "rub-2" },
      { id: "sec-4", examId: "exam-1", partName: "Part 4", description: "10 mark questions", questionsCount: 4, marksPerQuestion: 10, totalSectionMarks: 40, rubricId: "rub-2" },
    ],
  },
  {
    id: "exam-2",
    schoolId: "school-1",
    subjectName: "Chemistry",
    examName: "Chemistry Final",
    examType: "Final",
    academicYear: "2025-2026",
    className: "11",
    sectionName: "A",
    examDate: "2026-03-10",
    totalMarks: 150,
    status: "completed",
    createdByTeacherId: "teacher-1",
    scriptsCount: 55,
    gradedCount: 55,
    avgScore: 68.1,
    avgConfidence: 0.91,
    sections: [
      { id: "sec-5", examId: "exam-2", partName: "Part 1", description: "1 mark questions", questionsCount: 20, marksPerQuestion: 1, totalSectionMarks: 20, rubricId: "rub-2" },
      { id: "sec-6", examId: "exam-2", partName: "Part 2", description: "3 mark questions", questionsCount: 10, marksPerQuestion: 3, totalSectionMarks: 30, rubricId: "rub-2" },
      { id: "sec-7", examId: "exam-2", partName: "Part 3", description: "5 mark questions", questionsCount: 10, marksPerQuestion: 5, totalSectionMarks: 50, rubricId: "rub-2" },
      { id: "sec-8", examId: "exam-2", partName: "Part 4", description: "10 mark questions", questionsCount: 5, marksPerQuestion: 10, totalSectionMarks: 50, rubricId: "rub-2" },
    ],
  },
  {
    id: "exam-3",
    schoolId: "school-1",
    subjectName: "Mathematics",
    examName: "Mathematics Quiz 3",
    examType: "UnitTest",
    academicYear: "2025-2026",
    className: "11",
    sectionName: "A",
    examDate: "2026-03-08",
    totalMarks: 50,
    status: "completed",
    createdByTeacherId: "teacher-1",
    scriptsCount: 36,
    gradedCount: 36,
    avgScore: 38.2,
    avgConfidence: 0.94,
    sections: [
      { id: "sec-9", examId: "exam-3", partName: "Part 1", description: "1 mark questions", questionsCount: 10, marksPerQuestion: 1, totalSectionMarks: 10, rubricId: "rub-2" },
      { id: "sec-10", examId: "exam-3", partName: "Part 2", description: "5 mark questions", questionsCount: 8, marksPerQuestion: 5, totalSectionMarks: 40, rubricId: "rub-2" },
    ],
  },
  {
    id: "exam-4",
    schoolId: "school-1",
    subjectName: "Biology",
    examName: "Biology Unit Test",
    examType: "UnitTest",
    academicYear: "2025-2026",
    className: "11",
    sectionName: "B",
    examDate: "2026-03-05",
    totalMarks: 75,
    status: "completed",
    createdByTeacherId: "teacher-1",
    scriptsCount: 44,
    gradedCount: 44,
    avgScore: 55.8,
    avgConfidence: 0.89,
    sections: [
      { id: "sec-11", examId: "exam-4", partName: "Part 1", description: "1 mark questions", questionsCount: 15, marksPerQuestion: 1, totalSectionMarks: 15, rubricId: "rub-2" },
      { id: "sec-12", examId: "exam-4", partName: "Part 2", description: "5 mark questions", questionsCount: 12, marksPerQuestion: 5, totalSectionMarks: 60, rubricId: "rub-2" },
    ],
  },
  {
    id: "exam-5",
    schoolId: "school-1",
    subjectName: "English",
    examName: "English Essay Eval",
    examType: "Quarterly",
    academicYear: "2025-2026",
    className: "11",
    sectionName: "A",
    examDate: "2026-03-20",
    totalMarks: 40,
    status: "draft",
    createdByTeacherId: "teacher-1",
    scriptsCount: 0,
    gradedCount: 0,
    avgScore: 0,
    avgConfidence: 0,
    sections: [],
  },
];

// ==========================================
// Mock Question Mappings (for exam-1)
// ==========================================
export const mockQuestionMappings: QuestionMapping[] = [
  { id: "qm-1", examId: "exam-1", sectionId: "sec-3", questionNumber: 1, topicTag: "Newton's Laws", difficultyLevel: "medium", maxMarks: 5, orderIndex: 1 },
  { id: "qm-2", examId: "exam-1", sectionId: "sec-3", questionNumber: 2, topicTag: "Thermodynamics", difficultyLevel: "hard", maxMarks: 5, orderIndex: 2 },
  { id: "qm-3", examId: "exam-1", sectionId: "sec-3", questionNumber: 3, topicTag: "Projectile Motion", difficultyLevel: "hard", maxMarks: 5, orderIndex: 3 },
  { id: "qm-4", examId: "exam-1", sectionId: "sec-4", questionNumber: 4, topicTag: "Electromagnetic Induction", difficultyLevel: "hard", maxMarks: 10, orderIndex: 4 },
  { id: "qm-5", examId: "exam-1", sectionId: "sec-4", questionNumber: 5, topicTag: "Optics", difficultyLevel: "medium", maxMarks: 10, orderIndex: 5 },
];

// ==========================================
// Mock Answer Sheets
// ==========================================
export const mockAnswerSheets: AnswerSheet[] = [
  { id: "as-1", examId: "exam-1", studentId: "stu-1", storagePath: "/uploads/exam-1/stu-1.pdf", pagesCount: 24, status: "finalized", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-12T10:30:00" },
  { id: "as-2", examId: "exam-1", studentId: "stu-2", storagePath: "/uploads/exam-1/stu-2.pdf", pagesCount: 22, status: "ai_scored", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-12T10:35:00" },
  { id: "as-3", examId: "exam-1", studentId: "stu-4", storagePath: "/uploads/exam-1/stu-4.pdf", pagesCount: 26, status: "uploaded", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-12T10:40:00" },
  { id: "as-4", examId: "exam-2", studentId: "stu-1", storagePath: "/uploads/exam-2/stu-1.pdf", pagesCount: 30, status: "finalized", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-10T09:00:00" },
  { id: "as-5", examId: "exam-2", studentId: "stu-2", storagePath: "/uploads/exam-2/stu-2.pdf", pagesCount: 28, status: "finalized", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-10T09:05:00" },
  { id: "as-6", examId: "exam-3", studentId: "stu-1", storagePath: "/uploads/exam-3/stu-1.pdf", pagesCount: 12, status: "finalized", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-08T11:00:00" },
  { id: "as-7", examId: "exam-4", studentId: "stu-3", storagePath: "/uploads/exam-4/stu-3.pdf", pagesCount: 18, status: "finalized", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-05T10:00:00" },
  { id: "as-8", examId: "exam-4", studentId: "stu-5", storagePath: "/uploads/exam-4/stu-5.pdf", pagesCount: 20, status: "finalized", uploadedByUserId: "teacher-1", uploadedAt: "2026-03-05T10:05:00" },
];

// ==========================================
// Mock AI Scores (for as-1, exam-1)
// ==========================================
export const mockAiScores: AiScore[] = [
  // Q1 - Newton's Laws (5 marks)
  { id: "ais-1", answerSheetId: "as-1", questionMappingId: "qm-1", criterionName: "Grammar", score: 1, maxScore: 1, aiFeedbackText: "Clear and well-structured." },
  { id: "ais-2", answerSheetId: "as-1", questionMappingId: "qm-1", criterionName: "Relevance", score: 2, maxScore: 2, aiFeedbackText: "Directly addresses Newton's Second Law." },
  { id: "ais-3", answerSheetId: "as-1", questionMappingId: "qm-1", criterionName: "Correctness", score: 1, maxScore: 2, aiFeedbackText: "Missing vector notation." },
  // Q2 - Thermodynamics (5 marks)
  { id: "ais-4", answerSheetId: "as-1", questionMappingId: "qm-2", criterionName: "Grammar", score: 1, maxScore: 1, aiFeedbackText: "Good." },
  { id: "ais-5", answerSheetId: "as-1", questionMappingId: "qm-2", criterionName: "Relevance", score: 1, maxScore: 2, aiFeedbackText: "Conflates conservation of energy with first law." },
  { id: "ais-6", answerSheetId: "as-1", questionMappingId: "qm-2", criterionName: "Correctness", score: 1, maxScore: 2, aiFeedbackText: "Sign convention ambiguous." },
  // Q3 - Projectile Motion (5 marks)
  { id: "ais-7", answerSheetId: "as-1", questionMappingId: "qm-3", criterionName: "Grammar", score: 0, maxScore: 1, aiFeedbackText: "Illegible handwriting." },
  { id: "ais-8", answerSheetId: "as-1", questionMappingId: "qm-3", criterionName: "Relevance", score: 1, maxScore: 2, aiFeedbackText: "Partially relevant." },
  { id: "ais-9", answerSheetId: "as-1", questionMappingId: "qm-3", criterionName: "Correctness", score: 1, maxScore: 2, aiFeedbackText: "Formulas correct but working missing." },
  // Q4 - EM Induction (10 marks)
  { id: "ais-10", answerSheetId: "as-1", questionMappingId: "qm-4", criterionName: "Grammar", score: 1, maxScore: 1, aiFeedbackText: "Well written." },
  { id: "ais-11", answerSheetId: "as-1", questionMappingId: "qm-4", criterionName: "Relevance", score: 3, maxScore: 3, aiFeedbackText: "Comprehensive coverage." },
  { id: "ais-12", answerSheetId: "as-1", questionMappingId: "qm-4", criterionName: "Correctness", score: 5, maxScore: 6, aiFeedbackText: "Minor error in Lenz's law application." },
  // Q5 - Optics (10 marks)
  { id: "ais-13", answerSheetId: "as-1", questionMappingId: "qm-5", criterionName: "Grammar", score: 1, maxScore: 1, aiFeedbackText: "Clear." },
  { id: "ais-14", answerSheetId: "as-1", questionMappingId: "qm-5", criterionName: "Relevance", score: 2, maxScore: 3, aiFeedbackText: "Missed diffraction section." },
  { id: "ais-15", answerSheetId: "as-1", questionMappingId: "qm-5", criterionName: "Correctness", score: 4, maxScore: 6, aiFeedbackText: "Snell's law correct, but lens equation incomplete." },
];

// ==========================================
// Mock Final Marks
// ==========================================
export const mockFinalMarks: FinalMarks[] = [
  { id: "fm-1", examId: "exam-1", studentId: "stu-1", totalMarksObtained: 78, totalMarksMax: 100, grade: "B+", finalizedByTeacherId: "teacher-1", finalizedAt: "2026-03-14T10:00:00" },
  { id: "fm-2", examId: "exam-1", studentId: "stu-2", totalMarksObtained: 85, totalMarksMax: 100, grade: "A", finalizedByTeacherId: "teacher-1", finalizedAt: "2026-03-14T10:05:00" },
  { id: "fm-3", examId: "exam-2", studentId: "stu-1", totalMarksObtained: 102, totalMarksMax: 150, grade: "B", finalizedByTeacherId: "teacher-1", finalizedAt: "2026-03-12T14:00:00" },
  { id: "fm-4", examId: "exam-2", studentId: "stu-2", totalMarksObtained: 128, totalMarksMax: 150, grade: "A+", finalizedByTeacherId: "teacher-1", finalizedAt: "2026-03-12T14:05:00" },
  { id: "fm-5", examId: "exam-3", studentId: "stu-1", totalMarksObtained: 42, totalMarksMax: 50, grade: "A", finalizedByTeacherId: "teacher-1", finalizedAt: "2026-03-10T11:00:00" },
  { id: "fm-6", examId: "exam-4", studentId: "stu-3", totalMarksObtained: 48, totalMarksMax: 75, grade: "B-", finalizedByTeacherId: "teacher-1", finalizedAt: "2026-03-07T12:00:00" },
  { id: "fm-7", examId: "exam-4", studentId: "stu-5", totalMarksObtained: 52, totalMarksMax: 75, grade: "B", finalizedByTeacherId: "teacher-1", finalizedAt: "2026-03-07T12:05:00" },
];

// ==========================================
// Mock Grading Policy
// ==========================================
export const mockGradingPolicy: GradingPolicy = {
  passPercentage: 40,
  distinctionThreshold: 85,
  classBandMultipliers: [
    { classBand: "6–8", grammarFactor: 0.8, relevanceFactor: 1.0, correctnessFactor: 1.0 },
    { classBand: "9–10", grammarFactor: 0.9, relevanceFactor: 1.0, correctnessFactor: 1.0 },
    { classBand: "11–12", grammarFactor: 1.0, relevanceFactor: 1.0, correctnessFactor: 1.0 },
  ],
};

// Helper: get grade from percentage
export function getGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "B-";
  if (pct >= 40) return "C";
  return "F";
}

// Helper: deterministic pseudo-random score for AI simulation
export function deterministicScore(seed: number, max: number): number {
  const hash = ((seed * 2654435761) >>> 0) % (max + 1);
  return Math.min(hash, max);
}
