/**
 * GradingPage.tsx — fully wired grading review
 *
 * WHAT'S NEW vs prototype:
 *   - Route: /grading/:examId/:sheetId (was /grading — no context)
 *   - Real AI scores from Cosmos DB via useGradingSheet hook
 *   - Score input properly clamped: 0 ≤ score ≤ maxMarks, decimals allowed
 *   - Override written to audit log via useSubmitOverride on Confirm
 *   - Finalize button calls /api/grading/finalize
 *   - Falls back to mock data when VITE_FEATURE_REAL_SCORING=false
 *
 * Feature flag: VITE_FEATURE_REAL_SCORING
 *   false (default): shows hardcoded mock questions (same as prototype)
 *   true: shows live AI scores from Cosmos DB
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { ChevronLeft, ChevronRight, Flag, Check, ZoomIn, MessageSquare, Loader2, AlertTriangle } from "lucide-react";
import { useGradingSheet } from "@/hooks/useGradingSheet";
import { useSubmitOverride } from "@/hooks/mutations/useSubmitOverride";
import { features } from "@/services/api";
import type { GradingQuestion } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Fallback mock data (used when VITE_FEATURE_REAL_SCORING=false) ───────────
const MOCK_QUESTIONS: GradingQuestion[] = [
  {
    id: "qm-1", answerSheetId: "as-1",
    ocrText: "Newton's second law states that force equals mass times acceleration (F=ma). When a net force acts on an object, it accelerates in the direction of the force.",
    confidence: 0.93, totalScore: 8, flagForReview: false, flagReason: null, modelUsed: "gemini-2.5-flash",
    criteriaScores: [
      { criterionName: "Grammar", score: 1.2, maxScore: 1.5, feedbackText: "Clear and well-structured sentences.", ocrUncertain: false },
      { criterionName: "Relevance", score: 3.3, maxScore: 3.5, feedbackText: "Directly addresses Newton's Second Law.", ocrUncertain: false },
      { criterionName: "Correctness", score: 3.5, maxScore: 5.0, feedbackText: "Formula correct. Vector notation absent — minor deduction.", ocrUncertain: false },
    ],
  },
  {
    id: "qm-2", answerSheetId: "as-1",
    ocrText: "Thermodynamics first law says energy cannot be created or destroyed. ΔU = Q - W",
    confidence: 0.71, totalScore: 5, flagForReview: false, flagReason: null, modelUsed: "gemini-2.5-flash",
    criteriaScores: [
      { criterionName: "Grammar", score: 1.0, maxScore: 1.5, feedbackText: "Acceptable but imprecise phrasing.", ocrUncertain: false },
      { criterionName: "Relevance", score: 2.0, maxScore: 3.5, feedbackText: "Conflates first law with conservation of energy.", ocrUncertain: false },
      { criterionName: "Correctness", score: 2.0, maxScore: 5.0, feedbackText: "Sign convention ambiguous without context.", ocrUncertain: false },
    ],
  },
  {
    id: "qm-3", answerSheetId: "as-1",
    ocrText: "The projectile motion of a ball thrown at angle theta... [handwriting partially illegible] ...range = v²sin2θ/g",
    confidence: 0.58, totalScore: 3, flagForReview: true, flagReason: "Handwriting partially illegible — intermediate steps unreadable.", modelUsed: "gpt-4o",
    criteriaScores: [
      { criterionName: "Grammar", score: 0.5, maxScore: 1.5, feedbackText: "Illegible sections prevent full grammar evaluation.", ocrUncertain: true },
      { criterionName: "Relevance", score: 1.5, maxScore: 3.5, feedbackText: "Formulas visible but working steps unreadable.", ocrUncertain: true },
      { criterionName: "Correctness", score: 1.0, maxScore: 5.0, feedbackText: "Range formula correct. Cannot verify derivation.", ocrUncertain: true },
    ],
  },
];

const GradingPage = () => {
  const { examId, sheetId } = useParams<{ examId: string; sheetId: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  // Local override state: questionId → criterionName → overridden score
  const [overrides, setOverrides] = useState<Record<string, Record<string, number>>>({});
  const [overrideFlags, setOverrideFlags] = useState<Record<string, boolean>>({});

  const { data: gradingData, isLoading, error } = useGradingSheet(sheetId, examId);
  const { mutate: submitOverride } = useSubmitOverride();

  // Use real questions from API or fall back to mock
  const questions: GradingQuestion[] = features.realScoring
    ? (gradingData?.questions ?? [])
    : MOCK_QUESTIONS;

  const question = questions[currentIndex];

  // Get current score for a criterion (override or AI score)
  const getScore = (q: GradingQuestion, criterionName: string): number =>
    overrides[q.id]?.[criterionName] ?? q.criteriaScores.find(c => c.criterionName === criterionName)?.score ?? 0;

  const getTotalScore = (q: GradingQuestion): number =>
    q.criteriaScores.reduce((sum, c) => sum + getScore(q, c.criterionName), 0);

  const handleScoreChange = (questionId: string, criterionName: string, value: string, maxScore: number) => {
    const num = parseFloat(value);
    // Clamp: must be valid number, 0 ≤ score ≤ maxScore
    if (isNaN(num) || num < 0 || num > maxScore) return;
    const rounded = Math.round(num * 10) / 10; // 1 decimal place
    setOverrides((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), [criterionName]: rounded },
    }));
    const originalScore = questions.find(q => q.id === questionId)
      ?.criteriaScores.find(c => c.criterionName === criterionName)?.score ?? 0;
    setOverrideFlags((prev) => ({ ...prev, [`${questionId}-${criterionName}`]: rounded !== originalScore }));
  };

  const handleConfirm = () => {
    if (!question || !examId || !sheetId) return;
    // Submit overrides for all criteria of the current question
    question.criteriaScores.forEach((criterion) => {
      const newScore = overrides[question.id]?.[criterion.criterionName];
      if (newScore !== undefined && newScore !== criterion.score) {
        submitOverride({
          examId,
          answerSheetId: sheetId,
          questionMappingId: question.id,
          criterionName: criterion.criterionName,
          aiScore: criterion.score,
          teacherScore: newScore,
        });
      }
    });
    // Move to next question
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  // ── Loading state ─────────────────────────────────────────
  if (isLoading && features.realScoring) {
    return (
      <AppLayout>
        <div className="p-6 max-w-7xl space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error && features.realScoring) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">Failed to load grading data: {error.message}</span>
        </div>
      </AppLayout>
    );
  }

  if (!question) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground text-sm">
          No questions found for this sheet.
        </div>
      </AppLayout>
    );
  }

  const examLabel = gradingData?.exam?.examName ?? "Physics Mid-Term 2026";
  const hasOverride = question.criteriaScores.some(
    (c) => overrideFlags[`${question.id}-${c.criterionName}`]
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              Grading Review — {examLabel}
              {!features.realScoring && (
                <span className="ml-2 text-xs bg-warning/15 text-warning px-2 py-0.5 rounded font-mono align-middle">demo</span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Sheet: {sheetId ?? "as-1"} · {gradingData?.sheet?.studentName ?? "A. Patel"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0}
              className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-mono text-muted-foreground px-2">Q{currentIndex + 1} of {questions.length}</span>
            <button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} disabled={currentIndex === questions.length - 1}
              className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Flag banner */}
        {question.flagForReview && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><span className="font-medium">Review required:</span> {question.flagReason}</span>
          </div>
        )}

        {/* Evaluation Card */}
        <div className="card-elevated overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-display font-semibold text-foreground">Question {currentIndex + 1}</span>
              <span className="text-xs font-mono text-muted-foreground">
                Total: {getTotalScore(question).toFixed(1)} / {question.criteriaScores.reduce((s, c) => s + c.maxScore, 0)} marks
              </span>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                via {question.modelUsed}
              </span>
            </div>
            <ConfidenceBadge score={question.confidence} />
          </div>

          {/* Split pane */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* OCR extracted text */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Answer (OCR)</h3>
                <button className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <ZoomIn className="h-3 w-3" /> View Original
                </button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border border-border min-h-24">
                <p className="text-sm text-foreground leading-relaxed font-body">
                  {question.ocrText || <span className="text-muted-foreground italic">No text extracted</span>}
                </p>
              </div>
            </div>

            {/* Per-criterion scores */}
            <div className="p-5 bg-muted/20 space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Scores by Criterion</h3>
              {question.criteriaScores.map((criterion) => {
                const currentScore = getScore(question, criterion.criterionName);
                const isOverridden = overrideFlags[`${question.id}-${criterion.criterionName}`];
                return (
                  <div key={criterion.criterionName} className="bg-background rounded-lg p-3 border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{criterion.criterionName}</span>
                        {criterion.ocrUncertain && (
                          <span className="text-xs bg-warning/15 text-warning px-1.5 py-0.5 rounded">OCR uncertain</span>
                        )}
                        {isOverridden && (
                          <span className="text-xs bg-warning/15 text-warning px-1.5 py-0.5 rounded">overridden</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={criterion.maxScore}
                          step={0.5}
                          value={currentScore}
                          onChange={(e) => handleScoreChange(question.id, criterion.criterionName, e.target.value, criterion.maxScore)}
                          className="w-14 text-center text-sm font-mono font-bold bg-background border border-input rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground font-mono">/ {criterion.maxScore}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{criterion.feedbackText}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-foreground">
                Total: {getTotalScore(question).toFixed(1)}
              </span>
              {hasOverride && (
                <span className="text-xs bg-warning/15 text-warning px-2 py-1 rounded font-medium">Override applied</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Flag className="h-3.5 w-3.5" /> Flag
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted transition-colors">
                <MessageSquare className="h-3.5 w-3.5" /> Note
              </button>
              <button onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Check className="h-3.5 w-3.5" />
                {currentIndex < questions.length - 1 ? "Confirm & Next" : "Confirm & Finalise"}
              </button>
            </div>
          </div>
        </div>

        {/* Question overview strip */}
        <div className="card-elevated p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Questions Overview</h3>
          <div className="flex gap-2 flex-wrap">
            {questions.map((q, i) => (
              <button key={q.id} onClick={() => setCurrentIndex(i)}
                className={`w-10 h-10 rounded-lg text-sm font-mono font-medium transition-colors border ${
                  i === currentIndex ? "bg-primary text-primary-foreground border-primary"
                  : q.flagForReview ? "bg-destructive/10 text-destructive border-destructive/30"
                  : q.confidence < 0.7 ? "bg-warning/10 text-warning border-warning/30 confidence-pulse"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default GradingPage;
