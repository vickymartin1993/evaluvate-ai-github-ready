/**
 * UploadPage.tsx — wired version replacing prototype mock
 * See src/hooks/mutations/useUploadSheet.ts for the upload flow.
 */
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { mockExams, mockStudents, mockAnswerSheets } from "@/data/mockData";
import { Upload, Search, FileText, Clock, Loader2, CheckCircle } from "lucide-react";
import { useUploadSheet } from "@/hooks/mutations/useUploadSheet";
import { features, api, POC_SCHOOL_ID } from "@/services/api";
import type { AnswerSheet } from "@/types";

const statusStyles: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground",
  ai_scoring: "bg-warning/15 text-warning",
  ai_scored: "bg-primary/10 text-primary",
  teacher_review: "bg-warning/15 text-warning",
  finalized: "bg-success/15 text-success",
};

const statusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  ai_scoring: "AI Scoring…",
  ai_scored: "AI Scored",
  teacher_review: "Under Review",
  finalized: "Finalised",
};

const UploadPage = () => {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { mutate: uploadSheet, isPending, uploadProgress, uploadStage } = useUploadSheet();

  const publishedExams = mockExams.filter((e) => e.status !== "draft");
  const selectedExam = mockExams.find((e) => e.id === selectedExamId);

  const { data: sheetsData, isLoading: sheetsLoading } = useQuery({
    queryKey: ["answer-sheets", selectedExamId],
    enabled: !!selectedExamId && features.realUpload,
    queryFn: () => api.get<{ sheets: AnswerSheet[] }>(`/upload/sheets?schoolId=${POC_SCHOOL_ID}&examId=${selectedExamId}`),
    refetchInterval: 10_000,
    staleTime: 10_000,
  });

  const sheets: AnswerSheet[] = features.realUpload
    ? (sheetsData?.sheets ?? [])
    : (mockAnswerSheets.filter((s) => s.examId === selectedExamId) as unknown as AnswerSheet[]);

  const getStudentName = (id: string) => mockStudents.find((s) => s.id === id)?.name ?? "Unknown";
  const getStudentRegId = (id: string) => mockStudents.find((s) => s.id === id)?.registrationId ?? "—";

  const handleUpload = useCallback(() => {
    if (!selectedExamId || !registrationId || !selectedFile) return;
    uploadSheet({ examId: selectedExamId, registrationId, file: selectedFile }, {
      onSuccess: () => { setRegistrationId(""); setSelectedFile(null); },
    });
  }, [selectedExamId, registrationId, selectedFile, uploadSheet]);

  const stageLabel: Record<string, string> = {
    idle: "", "requesting-sas": "Preparing upload…",
    uploading: `Uploading… ${uploadProgress}%`, registering: "Registering…",
    "triggering-ai": "Starting AI scoring…", done: "Done",
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Answer Sheet Upload</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload multi-page answer sheets per student for published exams.
            {!features.realUpload && <span className="ml-2 text-xs bg-warning/15 text-warning px-2 py-0.5 rounded font-mono">demo mode</span>}
          </p>
        </div>

        <div className="card-elevated p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Select Exam</label>
              <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Choose an exam...</option>
                {publishedExams.map((e) => <option key={e.id} value={e.id}>{e.examName} ({e.subjectName})</option>)}
              </select>
            </div>
            {selectedExam && (<>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Class</label>
                <input value={`${selectedExam.className}-${selectedExam.sectionName}`} readOnly className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Total Marks</label>
                <input value={selectedExam.totalMarks} readOnly className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-sm font-mono cursor-not-allowed" />
              </div>
            </>)}
          </div>
        </div>

        {selectedExamId && (
          <div className="card-elevated p-6 space-y-4">
            <h2 className="text-sm font-display font-semibold text-foreground">Upload Answer Sheet</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Student Registration ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={registrationId} onChange={(e) => setRegistrationId(e.target.value)}
                    placeholder="e.g., STU-2026-0042" disabled={isPending}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Answer Sheet (PDF or image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={isPending}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="w-full text-sm disabled:opacity-50" />
              </div>
            </div>

            {isPending && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />{stageLabel[uploadStage]}</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button onClick={handleUpload} disabled={isPending || !registrationId || !selectedFile}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-30">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isPending ? "Uploading…" : "Upload & Send to AI"}
            </button>
          </div>
        )}

        {selectedExamId && (
          <div className="card-elevated overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <h2 className="text-sm font-display font-semibold text-foreground">Uploaded Sheets ({sheets.length})</h2>
              {sheetsLoading && features.realUpload && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Student","Reg. ID","Pages","Status","Uploaded"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sheets.map((sheet) => (
                  <tr key={sheet.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{sheet.studentName ?? getStudentName(sheet.studentId)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{sheet.studentRegId ?? getStudentRegId(sheet.studentId)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground text-right">{sheet.pagesCount || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${statusStyles[sheet.status] ?? ""}`}>
                        {sheet.status === "ai_scoring" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {sheet.status === "finalized" && <CheckCircle className="h-3 w-3" />}
                        {statusLabels[sheet.status] ?? sheet.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{new Date(sheet.uploadedAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
                {sheets.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />No answer sheets uploaded yet.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default UploadPage;
