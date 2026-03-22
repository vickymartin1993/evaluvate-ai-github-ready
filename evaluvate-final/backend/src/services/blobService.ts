/**
 * Evaluvate AI — Blob Storage Service
 *
 * Handles all Azure Blob Storage operations:
 *   - Generating SAS upload URLs (browser uploads directly to Blob — no file through API)
 *   - Reading answer sheet pages as base64 images for Gemini
 *   - Reading answer key text for inclusion in the scoring prompt
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

// ─── Client initialisation ───────────────────────────────────────────────────
let _blobServiceClient: BlobServiceClient | null = null;

function getClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "AZURE_STORAGE_CONNECTION_STRING is not set. " +
        "Add it to backend/.env or Azure Function App Configuration."
      );
    }
    _blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return _blobServiceClient;
}

const ANSWER_SHEETS_CONTAINER = process.env.AZURE_STORAGE_ANSWER_SHEETS_CONTAINER || "answer-sheets";
const ANSWER_KEYS_CONTAINER = process.env.AZURE_STORAGE_ANSWER_KEYS_CONTAINER || "answer-keys";
const SAS_EXPIRY_MINUTES = parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY_MINUTES || "15");

// ─── SAS Token Generation ─────────────────────────────────────────────────────

/**
 * Generates a short-lived SAS URL for direct browser → Blob upload.
 * The browser uses this URL to upload the PDF directly — the file bytes
 * never pass through the Azure Function, keeping memory usage low.
 *
 * The SAS URL expires after AZURE_STORAGE_SAS_EXPIRY_MINUTES (default: 15 min).
 * After expiry, a new SAS URL must be requested.
 */
export async function generateUploadSasUrl(params: {
  schoolId: string;
  examId: string;
  studentId: string;
  fileName: string; // e.g., "answer-sheet.pdf"
}): Promise<{ sasUrl: string; blobPath: string }> {
  const { schoolId, examId, studentId, fileName } = params;

  // Blob path: answer-sheets/{schoolId}/{examId}/{studentId}/{fileName}
  // This structure ensures school data is never mixed up (schoolId is always in path)
  const blobPath = `${schoolId}/${examId}/${studentId}/${fileName}`;

  const client = getClient();
  const containerClient = client.getContainerClient(ANSWER_SHEETS_CONTAINER);

  // Ensure the container exists (idempotent — safe to call every time)
  await containerClient.createIfNotExists();

  const blobClient = containerClient.getBlobClient(blobPath);

  // SAS permissions: write only (browser can upload but not read other blobs)
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + SAS_EXPIRY_MINUTES);

  const sasUrl = await blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("w"), // write only
    expiresOn,
    contentType: "application/pdf",
  });

  return { sasUrl, blobPath };
}

// ─── Reading Answer Sheet Pages ───────────────────────────────────────────────

/**
 * Downloads a PDF page (stored as JPEG) from Blob Storage and returns it
 * as a base64 string suitable for inclusion in a Gemini multimodal request.
 *
 * Note: Pages are stored as individual JPEG images by the scoring pipeline
 * after the PDF is split in triggerScoring.ts.
 */
export async function getAnswerSheetPageAsBase64(blobPath: string): Promise<{
  base64: string;
  mimeType: "image/jpeg";
}> {
  const client = getClient();
  const containerClient = client.getContainerClient(ANSWER_SHEETS_CONTAINER);
  const blobClient = containerClient.getBlobClient(blobPath);

  const downloadResponse = await blobClient.download();
  if (!downloadResponse.readableStreamBody) {
    throw new Error(`Could not download blob at path: ${blobPath}`);
  }

  // Stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
  }
  const buffer = Buffer.concat(chunks);
  const base64 = buffer.toString("base64");

  return { base64, mimeType: "image/jpeg" };
}

/**
 * Uploads a page image buffer (JPEG) to Blob Storage.
 * Called by triggerScoring.ts when converting PDF pages to images.
 */
export async function uploadPageImage(
  blobPath: string,
  imageBuffer: Buffer
): Promise<void> {
  const client = getClient();
  const containerClient = client.getContainerClient(ANSWER_SHEETS_CONTAINER);
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
  await blockBlobClient.upload(imageBuffer, imageBuffer.length, {
    blobHTTPHeaders: { blobContentType: "image/jpeg" },
  });
}

// ─── Reading Answer Key ───────────────────────────────────────────────────────

/**
 * Downloads the teacher's answer key text from Blob Storage.
 * Returns an empty string if no answer key has been uploaded for this exam.
 */
export async function getAnswerKeyText(examId: string, schoolId: string): Promise<string> {
  const blobPath = `${schoolId}/${examId}/answer-key.txt`;

  try {
    const client = getClient();
    const containerClient = client.getContainerClient(ANSWER_KEYS_CONTAINER);
    const blobClient = containerClient.getBlobClient(blobPath);

    const exists = await blobClient.exists();
    if (!exists) {
      console.warn(`[BlobService] No answer key found for exam ${examId} — scoring without key.`);
      return "";
    }

    const downloadResponse = await blobClient.download();
    if (!downloadResponse.readableStreamBody) return "";

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
    }
    return Buffer.concat(chunks).toString("utf-8");

  } catch (err) {
    // Non-fatal: scoring can proceed without answer key (with reduced accuracy)
    console.warn(`[BlobService] Could not load answer key for exam ${examId}:`, err);
    return "";
  }
}
