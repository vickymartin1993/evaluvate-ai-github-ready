/**
 * Evaluvate AI — Upload SAS Token Function
 *
 * HTTP Trigger: POST /api/upload/sas
 *
 * Generates a short-lived SAS URL so the browser can upload a PDF directly
 * to Azure Blob Storage without the file passing through this function.
 *
 * This keeps Azure Function memory usage low — a 30-page answer sheet PDF
 * can be 10–20MB. Processing that through a function on every upload would
 * require expensive Premium tier memory. Direct-to-Blob avoids this entirely.
 *
 * FLOW:
 *   1. Teacher selects a file in the UI
 *   2. UI calls POST /api/upload/sas → gets back { sasUrl, blobPath, sheetId }
 *   3. UI uploads the PDF directly to sasUrl using fetch with PUT method
 *   4. UI calls POST /api/upload/register with the sheetId
 *   5. Register function creates the AnswerSheet record in Cosmos DB
 *   6. (Sprint 3: Blob Trigger fires automatically → scoring begins)
 *   7. (POC: UI calls POST /api/scoring/trigger manually)
 *
 * REQUEST BODY:
 *   schoolId:       string
 *   examId:         string
 *   registrationId: string  — student's registration ID (e.g., "STU-2026-0042")
 *   fileName:       string  — original file name (for display only, not for storage)
 *
 * RESPONSE:
 *   sasUrl:   string  — the Azure Blob SAS URL to PUT the file to
 *   blobPath: string  — the path in Blob Storage (stored in AnswerSheet record)
 *   sheetId:  string  — pre-generated ID for the AnswerSheet record
 *   studentId: string — resolved student ID (looked up from registrationId)
 *   studentName: string
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import * as cosmosService from "../services/cosmosService.js";
import * as blobService from "../services/blobService.js";

app.http("uploadSasToken", {
  methods: ["POST"],
  authLevel: "function",
  route: "upload/sas",
  handler: uploadSasTokenHandler,
});

async function uploadSasTokenHandler(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  ctx.log("[uploadSasToken] Handler invoked");

  let body: {
    schoolId?: string;
    examId?: string;
    registrationId?: string;
    fileName?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
  }

  const { schoolId, examId, registrationId, fileName } = body;

  if (!schoolId || !examId || !registrationId || !fileName) {
    return {
      status: 400,
      jsonBody: {
        error: "Missing required fields: schoolId, examId, registrationId, fileName",
      },
    };
  }

  // ── Validate file type ───────────────────────────────────
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (!allowedExtensions.includes(ext)) {
    return {
      status: 400,
      jsonBody: {
        error: `Invalid file type: ${ext}. Allowed: ${allowedExtensions.join(", ")}`,
      },
    };
  }

  // ── Look up student by registration ID ──────────────────
  const student = await cosmosService.getStudentByRegistrationId(schoolId, registrationId);
  if (!student) {
    return {
      status: 404,
      jsonBody: {
        error: `No student found with registration ID: ${registrationId}`,
        hint: "Check the registration ID and ensure the student is enrolled in this school.",
      },
    };
  }

  // ── Verify exam exists and is published ────────────────
  const exam = await cosmosService.getExamById(schoolId, examId);
  if (!exam) {
    return { status: 404, jsonBody: { error: `Exam ${examId} not found` } };
  }
  if (exam.status === "draft") {
    return {
      status: 409,
      jsonBody: { error: "Cannot upload sheets for a draft exam. Publish the exam first." },
    };
  }

  // ── Generate sheet ID and SAS URL ──────────────────────
  const sheetId = uuidv4();
  const storedFileName = `answer-sheet${ext}`; // Normalise filename in storage

  const { sasUrl, blobPath } = await blobService.generateUploadSasUrl({
    schoolId,
    examId,
    studentId: student.id,
    fileName: storedFileName,
  });

  ctx.log(
    `[uploadSasToken] SAS generated for student ${student.id} (${registrationId}), ` +
    `exam ${examId}, sheetId ${sheetId}`
  );

  return {
    status: 200,
    jsonBody: {
      sasUrl,
      blobPath,
      sheetId,
      studentId: student.id,
      studentName: student.name,
      expiresInMinutes: parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY_MINUTES || "15"),
    },
  };
}
