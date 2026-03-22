/**
 * Evaluvate AI — useGradingSheet Hook
 *
 * Fetches AI scores and sheet metadata for a specific answer sheet.
 * Used by GradingPage to replace the hardcoded mockQuestions array.
 *
 * When VITE_FEATURE_REAL_SCORING=false, returns mock data so the UI
 * continues to work during development without a running backend.
 */

import { useQuery } from "@tanstack/react-query";
import { api, features, POC_SCHOOL_ID } from "@/services/api";
import type { GradingSheetResponse } from "@/types";
import { mockGradingData } from "@/data/mockGradingData";

/**
 * Fetches the complete grading data for one answer sheet.
 *
 * @param sheetId  — the answer sheet ID (from URL param or grading queue)
 * @param examId   — needed by the backend to look up the sheet
 */
export function useGradingSheet(sheetId: string | undefined, examId: string | undefined) {
  const schoolId = POC_SCHOOL_ID;

  return useQuery<GradingSheetResponse>({
    queryKey: ["grading-sheet", sheetId],
    enabled: !!sheetId && !!examId,

    queryFn: async (): Promise<GradingSheetResponse> => {
      // Fall back to mock data when real scoring feature is not yet enabled
      if (!features.realScoring) {
        return mockGradingData;
      }

      return api.get<GradingSheetResponse>(
        `/grading/sheet/${sheetId}?schoolId=${schoolId}&examId=${examId}`
      );
    },

    // Grading data does not change on its own — only when teacher submits an override.
    // Cache for 5 minutes; invalidated by useSubmitOverride on success.
    staleTime: 5 * 60 * 1000,

    // Show stale data while refetching (better UX than spinner on every focus)
    placeholderData: (prev) => prev,
  });
}

// ─── useGradingQueue hook (for the queue list in UploadPage / sidebar badge) ─

export function useGradingQueue() {
  const schoolId = POC_SCHOOL_ID;

  return useQuery({
    queryKey: ["grading-queue", schoolId],

    queryFn: async () => {
      if (!features.realScoring) {
        // Return a stable mock queue count for the sidebar badge
        return { queue: [], total: 3 };
      }
      return api.get<{ queue: unknown[]; total: number }>(
        `/grading/queue?schoolId=${schoolId}`
      );
    },

    // Refresh queue count every 30 seconds in case AI finishes scoring
    refetchInterval: 30_000,
    staleTime: 30_000,
  });
}
