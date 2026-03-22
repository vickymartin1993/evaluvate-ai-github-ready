/**
 * Evaluvate AI — useSubmitOverride Hook
 *
 * Saves a teacher's score override to the backend audit log.
 * Called by GradingPage when a teacher changes a score and clicks Confirm.
 *
 * The override is written to the audit_events collection immediately.
 * The AiScore document itself is kept immutable (it's the permanent record
 * of what the AI said). Only FinalMarks reflects the teacher's decision.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, features, POC_SCHOOL_ID } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface OverrideParams {
  examId: string;
  answerSheetId: string;
  questionMappingId: string;
  criterionName?: string;
  aiScore: number;
  teacherScore: number;
  reason?: string;
}

export function useSubmitOverride() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schoolId = POC_SCHOOL_ID;

  return useMutation({
    mutationFn: async (params: OverrideParams) => {
      // In non-real mode, simulate the API call
      if (!features.realScoring) {
        await new Promise((r) => setTimeout(r, 200));
        return { success: true };
      }

      return api.post("/grading/override", {
        schoolId,
        teacherId: "teacher-poc", // TODO Sprint 4: from auth JWT
        ...params,
      });
    },

    onSuccess: (_, variables) => {
      // Refresh the audit log so the override appears immediately
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });

      // Only show toast if it was a meaningful change
      if (variables.aiScore !== variables.teacherScore) {
        toast({
          title: "Override saved",
          description: `Score changed from ${variables.aiScore} to ${variables.teacherScore}.`,
        });
      }
    },

    onError: (error: Error) => {
      toast({
        title: "Override failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
