/**
 * Evaluvate AI — Cosmos DB Service
 *
 * All database operations go through this file.
 * Every function takes a schoolId parameter — this scopes all queries
 * to the correct school database, enforcing data isolation.
 *
 * DATABASE STRUCTURE PER SCHOOL:
 *   Database: school_{schoolId}   (e.g., school_st_josephs)
 *     Container: exams
 *     Container: students
 *     Container: answer_sheets
 *     Container: ai_scores
 *     Container: final_marks
 *     Container: rubrics
 *     Container: audit_events
 *     Container: usage_events
 */

import { CosmosClient } from "@azure/cosmos";
import type {
  Exam, Student, AnswerSheet, AiScore, FinalMarks,
  Rubric, AuditEvent, UsageEvent, QuestionMapping
} from "../types/index.js";

// ─── Client initialisation ───────────────────────────────────────────────────
let _cosmosClient: CosmosClient | null = null;

function getClient(): CosmosClient {
  if (!_cosmosClient) {
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "COSMOS_CONNECTION_STRING is not set. " +
        "Add it to backend/.env or Azure Function App Configuration."
      );
    }
    _cosmosClient = new CosmosClient(connectionString);
  }
  return _cosmosClient;
}

// ─── Helper: get a container for a specific school ────────────────────────────
// All queries are scoped to school_{schoolId} database — cross-school access is impossible.

function getContainer(schoolId: string, containerName: string) {
  const dbPrefix = process.env.COSMOS_DB_PREFIX || "school_";
  const databaseId = `${dbPrefix}${schoolId}`;
  return getClient().database(databaseId).container(containerName);
}

// ─── Exam operations ──────────────────────────────────────────────────────────

export async function getExams(schoolId: string): Promise<Exam[]> {
  const container = getContainer(schoolId, "exams");
  const { resources } = await container.items
    .query({ query: "SELECT * FROM c ORDER BY c.examDate DESC" })
    .fetchAll();
  return resources as Exam[];
}

export async function getExamById(schoolId: string, examId: string): Promise<Exam | null> {
  const container = getContainer(schoolId, "exams");
  const { resource } = await container.item(examId, examId).read<Exam>();
  return resource ?? null;
}

export async function createExam(schoolId: string, exam: Exam): Promise<Exam> {
  const container = getContainer(schoolId, "exams");
  const { resource } = await container.items.upsert<Exam>(exam);
  return resource!;
}

export async function updateExamStatus(
  schoolId: string,
  examId: string,
  status: Exam["status"]
): Promise<void> {
  const container = getContainer(schoolId, "exams");
  const { resource: existing } = await container.item(examId, examId).read<Exam>();
  if (existing) {
    await container.items.upsert({ ...existing, status });
  }
}

// ─── Student operations ───────────────────────────────────────────────────────

export async function getStudents(schoolId: string): Promise<Student[]> {
  const container = getContainer(schoolId, "students");
  const { resources } = await container.items
    .query({ query: "SELECT * FROM c ORDER BY c.name" })
    .fetchAll();
  return resources as Student[];
}

/**
 * Lookup student by registration ID.
 * Used in the upload flow: teacher types "STU-2026-0042" → we find the student record.
 */
export async function getStudentByRegistrationId(
  schoolId: string,
  registrationId: string
): Promise<Student | null> {
  const container = getContainer(schoolId, "students");
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.registrationId = @regId",
      parameters: [{ name: "@regId", value: registrationId }],
    })
    .fetchAll();
  return (resources[0] as Student) ?? null;
}

// ─── Answer Sheet operations ──────────────────────────────────────────────────

export async function createAnswerSheet(schoolId: string, sheet: AnswerSheet): Promise<AnswerSheet> {
  const container = getContainer(schoolId, "answer_sheets");
  const { resource } = await container.items.upsert<AnswerSheet>(sheet);
  return resource!;
}

export async function updateAnswerSheetStatus(
  schoolId: string,
  sheetId: string,
  status: AnswerSheet["status"],
  extra?: Partial<AnswerSheet>
): Promise<void> {
  const container = getContainer(schoolId, "answer_sheets");
  const { resource: existing } = await container.item(sheetId, sheetId).read<AnswerSheet>();
  if (existing) {
    await container.items.upsert({ ...existing, status, ...extra });
  }
}

export async function getAnswerSheetsByExam(
  schoolId: string,
  examId: string
): Promise<AnswerSheet[]> {
  const container = getContainer(schoolId, "answer_sheets");
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.examId = @examId ORDER BY c.uploadedAt DESC",
      parameters: [{ name: "@examId", value: examId }],
    })
    .fetchAll();
  return resources as AnswerSheet[];
}

/** Returns all sheets with status = "ai_scored" — the grading queue */
export async function getGradingQueue(schoolId: string): Promise<AnswerSheet[]> {
  const container = getContainer(schoolId, "answer_sheets");
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.status = 'ai_scored' ORDER BY c.scoringCompletedAt DESC",
    })
    .fetchAll();
  return resources as AnswerSheet[];
}

// ─── AI Score operations ──────────────────────────────────────────────────────

export async function saveAiScore(schoolId: string, score: AiScore): Promise<AiScore> {
  const container = getContainer(schoolId, "ai_scores");
  const { resource } = await container.items.upsert<AiScore>(score);
  return resource!;
}

export async function getAiScoresBySheet(
  schoolId: string,
  answerSheetId: string
): Promise<AiScore[]> {
  const container = getContainer(schoolId, "ai_scores");
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.answerSheetId = @sheetId",
      parameters: [{ name: "@sheetId", value: answerSheetId }],
    })
    .fetchAll();
  return resources as AiScore[];
}

// ─── Rubric operations ────────────────────────────────────────────────────────

export async function getRubricById(schoolId: string, rubricId: string): Promise<Rubric | null> {
  const container = getContainer(schoolId, "rubrics");
  const { resource } = await container.item(rubricId, rubricId).read<Rubric>();
  return resource ?? null;
}

// ─── Question Mapping operations ──────────────────────────────────────────────

export async function getQuestionMappingsByExam(
  schoolId: string,
  examId: string
): Promise<QuestionMapping[]> {
  const container = getContainer(schoolId, "exams");
  // Question mappings are stored inside the exam sections in the exam document
  // This is a denormalised approach for simplicity at POC scale
  const exam = await getExamById(schoolId, examId);
  if (!exam) return [];

  // Flatten sections → questions
  return exam.sections.flatMap((section) =>
    Array.from({ length: section.questionsCount }, (_, i) => ({
      id: `${exam.id}_${section.id}_q${i + 1}`,
      examId: exam.id,
      sectionId: section.id,
      schoolId,
      questionNumber: i + 1,
      topicTag: section.partName,
      difficultyLevel: "medium" as const,
      maxMarks: section.marksPerQuestion,
      orderIndex: i + 1,
    }))
  );
}

// ─── Audit Event operations ───────────────────────────────────────────────────

export async function writeAuditEvent(schoolId: string, event: AuditEvent): Promise<void> {
  const container = getContainer(schoolId, "audit_events");
  await container.items.create(event);
}

export async function getAuditLog(
  schoolId: string,
  filters?: { examId?: string; limit?: number }
): Promise<AuditEvent[]> {
  const container = getContainer(schoolId, "audit_events");
  let query = "SELECT * FROM c";
  const parameters: { name: string; value: string }[] = [];

  if (filters?.examId) {
    query += " WHERE c.examId = @examId";
    parameters.push({ name: "@examId", value: filters.examId });
  }

  query += " ORDER BY c.timestamp DESC";
  if (filters?.limit) {
    query += ` OFFSET 0 LIMIT ${filters.limit}`;
  }

  const { resources } = await container.items
    .query({ query, parameters })
    .fetchAll();
  return resources as AuditEvent[];
}

// ─── Usage Event operations ───────────────────────────────────────────────────

export async function writeUsageEvent(schoolId: string, event: UsageEvent): Promise<void> {
  // Non-blocking: usage tracking should never block the main scoring flow
  const container = getContainer(schoolId, "usage_events");
  await container.items.create(event).catch((err) => {
    // Log but don't throw — a usage tracking failure should not fail a scoring job
    console.error("[CosmosService] Failed to write usage event:", err);
  });
}
