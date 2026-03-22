/**
 * Evaluvate AI — Register Upload Function
 *
 * HTTP Trigger: POST /api/upload/register
 *
 * Called by the frontend AFTER the PDF has been uploaded directly to Blob Storage.
 * Creates the AnswerSheet record in Cosmos DB and writes the audit event.
 *
 * This is step 4 in the upload flow:
 *   1. UI calls /api/upload/sas → gets SAS URL and sheetId
 *   2. UI uploads file directly to Azure Blob Storage using the SAS URL
 *   3. UI calls /api/upload/register with the sheetId
 *   4. THIS FUNCTION: creates AnswerSheet in Cosmos, writes audit event
 *   5. UI calls /api/scoring/trigger (POC) or Blob Trigger fires (Sprint 3)
 *
 * REQUEST BODY:
 *   sheetId:    string  — the ID returned by /api/upload/sas
 *   schoolId:   string
 *   examId:     string
 *   studentId:  string  — returned by /api/upload/sas
 *   blobPath:   string  — returned by /api/upload/sas
 *   pagesCount: number  — number of pages in the uploaded PDF (from frontend PDF parser)
 *   uploadedByUserId: string  — teacher's user ID (from auth token in Sprint 4)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as cosmosService from "../services/cosmosService.js";
import * as auditService from "../services/auditService.js";
import type { AnswerSheet } from "../types/index.js";

app.http("registerUpload", {
  methods: ["POST"],
  authLevel: "function",
  route: "upload/register",
  handler: registerUploadHandler,
});

async function registerUploadHandler(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  ctx.log("[registerUpload] Handler invoked");

  let body: {
    sheetId?: string;
    schoolId?: string;
    examId?: string;
    studentId?: string;
    blobPath?: string;
    pagesCount?: number;
    uploadedByUserId?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
  }

  const { sheetId, schoolId, examId, studentId, blobPath, pagesCount, uploadedByUserId } = body;

  if (!sheetId || !schoolId || !examId || !studentId || !blobPath) {
    return {
      status: 400,
      jsonBody: {
        error: "Missing required fields: sheetId, schoolId, examId, studentId, blobPath",
      },
    };
  }

  // ── Create AnswerSheet record in Cosmos DB ─────────────
  const sheet: AnswerSheet = {
    id: sheetId,
    examId,
    schoolId,
    studentId,
    blobPath,
    pagesCount: pagesCount ?? 0,
    status: "uploaded",
    uploadedByUserId: uploadedByUserId ?? "unknown", // TODO Sprint 4: get from JWT
    uploadedAt: new Date().toISOString(),
  };

  await cosmosService.createAnswerSheet(schoolId, sheet);

  // ── Write audit event ──────────────────────────────────
  await auditService.logSheetUploaded({
    schoolId,
    examId,
    answerSheetId: sheetId,
    uploadedByUserId: uploadedByUserId ?? "unknown",
    studentId,
  });

  ctx.log(
    `[registerUpload] AnswerSheet ${sheetId} registered for student ${studentId}, exam ${examId}`
  );

  return {
    status: 201,
    jsonBody: {
      success: true,
      sheetId,
      status: "uploaded",
      message: "Answer sheet registered. Call /api/scoring/trigger to begin AI scoring.",
    },
  };
}
