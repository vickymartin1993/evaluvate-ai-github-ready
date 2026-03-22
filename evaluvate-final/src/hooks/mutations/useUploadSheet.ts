/**
 * Evaluvate AI — useUploadSheet Hook
 *
 * Manages the complete answer sheet upload flow:
 *   1. Calls /api/upload/sas → gets a short-lived Azure Blob SAS URL
 *   2. Uploads the PDF directly to Azure Blob Storage (no file bytes through API)
 *   3. Calls /api/upload/register → creates AnswerSheet record in Cosmos DB
 *   4. Calls /api/scoring/trigger → starts AI scoring pipeline
 *
 * Usage in UploadPage:
 *   const { mutate: uploadSheet, isPending, progress } = useUploadSheet();
 *   uploadSheet({ examId, registrationId, file });
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, features, POC_SCHOOL_ID } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { SasUploadResponse } from "@/types";
import { useState } from "react";

interface UploadParams {
  examId: string;
  registrationId: string;
  file: File;
}

interface UploadResult {
  sheetId: string;
  studentName: string;
  status: "uploaded";
}

export function useUploadSheet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload progress 0–100 (shown in UploadPage progress bar)
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "requesting-sas" | "uploading" | "registering" | "triggering-ai" | "done"
  >("idle");

  const mutation = useMutation<UploadResult, Error, UploadParams>({
    mutationFn: async ({ examId, registrationId, file }: UploadParams) => {
      // If real upload feature is disabled, simulate the flow with a delay
      if (!features.realUpload) {
        return simulateUpload(registrationId, setUploadProgress, setUploadStage);
      }

      const schoolId = POC_SCHOOL_ID; // TODO Sprint 4: from auth JWT

      // ── Step 1: Get SAS URL from backend ──────────────
      setUploadStage("requesting-sas");
      setUploadProgress(5);

      const sasResponse = await api.post<SasUploadResponse>("/upload/sas", {
        schoolId,
        examId,
        registrationId,
        fileName: file.name,
      });

      // ── Step 2: Upload PDF directly to Azure Blob ─────
      // This PUT request goes to Azure Storage directly — not through our backend.
      // This keeps function memory usage low (no large files in our API layer).
      setUploadStage("uploading");
      setUploadProgress(10);

      await uploadWithProgress(sasResponse.sasUrl, file, (pct) => {
        // Map upload progress to 10–80% of overall progress
        setUploadProgress(10 + Math.floor(pct * 0.7));
      });

      setUploadProgress(80);

      // ── Step 3: Register the upload in Cosmos DB ──────
      setUploadStage("registering");

      // Count pages for informational display
      // In a real implementation you'd use pdf.js to count pages
      // For POC, we use the file size as a rough page estimate
      const roughPageCount = Math.max(1, Math.floor(file.size / 50_000));

      await api.post("/upload/register", {
        sheetId: sasResponse.sheetId,
        schoolId,
        examId,
        studentId: sasResponse.studentId,
        blobPath: sasResponse.blobPath,
        pagesCount: roughPageCount,
        uploadedByUserId: "teacher-poc", // TODO Sprint 4: from auth JWT
      });

      setUploadProgress(90);

      // ── Step 4: Trigger AI scoring ────────────────────
      setUploadStage("triggering-ai");

      await api.post("/scoring/trigger", {
        schoolId,
        examId,
        answerSheetId: sasResponse.sheetId,
      });

      setUploadProgress(100);
      setUploadStage("done");

      return {
        sheetId: sasResponse.sheetId,
        studentName: sasResponse.studentName,
        status: "uploaded" as const,
      };
    },

    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: `Answer sheet for ${data.studentName} uploaded and sent for AI scoring.`,
      });
      // Refresh the answer sheets list so the new sheet appears in the table
      queryClient.invalidateQueries({ queryKey: ["answer-sheets"] });
      // Reset progress
      setUploadProgress(0);
      setUploadStage("idle");
    },

    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
      setUploadStage("idle");
    },
  });

  return {
    ...mutation,
    uploadProgress,
    uploadStage,
  };
}

// ─── Direct-to-Blob upload with progress tracking ─────────────────────────────

async function uploadWithProgress(
  sasUrl: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            `Blob upload failed: ${xhr.status} ${xhr.statusText}. ` +
            "The SAS URL may have expired. Please try again."
          )
        );
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during file upload. Check your connection."))
    );

    xhr.addEventListener("abort", () =>
      reject(new Error("File upload was cancelled."))
    );

    // PUT the file directly to Azure Blob Storage using the SAS URL
    xhr.open("PUT", sasUrl);
    xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
    xhr.send(file);
  });
}

// ─── Simulation for when VITE_FEATURE_REAL_UPLOAD=false ──────────────────────

async function simulateUpload(
  registrationId: string,
  setProgress: (n: number) => void,
  setStage: (s: "idle" | "requesting-sas" | "uploading" | "registering" | "triggering-ai" | "done") => void
): Promise<UploadResult> {
  setStage("requesting-sas");
  setProgress(10);
  await sleep(400);

  setStage("uploading");
  for (let i = 10; i <= 80; i += 10) {
    setProgress(i);
    await sleep(150);
  }

  setStage("registering");
  setProgress(85);
  await sleep(300);

  setStage("triggering-ai");
  setProgress(95);
  await sleep(500);

  setProgress(100);
  setStage("done");

  return {
    sheetId: `sim-${Date.now()}`,
    studentName: `Student (${registrationId})`,
    status: "uploaded",
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
