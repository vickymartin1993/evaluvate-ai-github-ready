import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { mockExams, mockStudents, mockQuestionMappings, mockAiScores, mockFinalMarks } from "@/data/mockData";
import { Check, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ReviewScoresPage = () => {
  const { toast } = useToast();
  const [selectedExamId, setSelectedExamId] = useState("exam-1");
  const [selectedStudentId, setSelectedStudentId] = useState("stu-1");

  const exam = mockExams.find(e => e.id === selectedExamId);
  const student = mockStudents.find(s => s.id === selectedStudentId);
  const questions = mockQuestionMappings.filter(q => q.examId === selectedExamId);
  const finalMark = mockFinalMarks.find(f => f.examId === selectedExamId && f.studentId === selectedStudentId);

  // Group AI scores by question
  const [scores, setScores] = useState(mockAiScores);

  const getScoresForQuestion = (qmId: string) =>
    scores.filter(s => s.questionMappingId === qmId && s.answerSheetId === "as-1");

  const questionTotal = (qmId: string) =>
    getScoresForQuestion(qmId).reduce((sum, s) => sum + s.score, 0);

  const examTotal = questions.reduce((sum, q) => sum + questionTotal(q.id), 0);

  const updateScore = (scoreId: string, newVal: number) => {
    setScores(scores.map(s => s.id === scoreId ? { ...s, score: Math.min(newVal, s.maxScore) } : s));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Review Scores</h1>
          <p className="text-sm text-muted-foreground mt-1">Review AI-generated scores and apply overrides per criterion.</p>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Exam</label>
              <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {mockExams.filter(e => e.status !== "draft").map(e => (
                  <option key={e.id} value={e.id}>{e.examName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Student</label>
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {mockStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.registrationId})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        {exam && student && (
          <div className="card-elevated p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{student.name} — {exam.examName}</p>
              <p className="text-xs text-muted-foreground">{exam.subjectName} · Class {exam.className}-{exam.sectionName}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-foreground">{examTotal} <span className="text-base text-muted-foreground">/ {exam.totalMarks}</span></p>
              {finalMark?.grade && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{finalMark.grade}</span>}
            </div>
          </div>
        )}

        {/* Question-wise Scores */}
        <div className="space-y-4">
          {questions.map(q => {
            const qScores = getScoresForQuestion(q.id);
            const section = exam?.sections.find(s => s.id === q.sectionId);
            return (
              <div key={q.id} className="card-elevated overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-display font-semibold text-foreground">Q{q.questionNumber}</span>
                    <span className="text-xs text-muted-foreground">{section?.partName}</span>
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">{q.topicTag}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      q.difficultyLevel === "hard" ? "bg-destructive/10 text-destructive" :
                      q.difficultyLevel === "medium" ? "bg-warning/10 text-warning" :
                      "bg-success/10 text-success"
                    }`}>{q.difficultyLevel}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-foreground">{questionTotal(q.id)} / {q.maxMarks}</span>
                </div>
                <div className="divide-y divide-border">
                  {qScores.map(sc => (
                    <div key={sc.id} className="flex items-center gap-4 px-4 py-3">
                      <span className="text-xs font-medium text-muted-foreground w-24">{sc.criterionName}</span>
                      <input type="number" min={0} max={sc.maxScore} value={sc.score}
                        onChange={(e) => updateScore(sc.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center font-mono font-bold bg-background border border-input rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="text-xs text-muted-foreground font-mono">/ {sc.maxScore}</span>
                      <span className="text-xs text-muted-foreground flex-1">{sc.aiFeedbackText}</span>
                    </div>
                  ))}
                  {qScores.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">No AI scores available for this question.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => toast({ title: "Scores saved", description: "All overrides have been persisted." })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
            <Save className="h-4 w-4" /> Save Changes
          </button>
          <button onClick={() => toast({ title: "Results finalized", description: "Scores are now visible to the student." })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors">
            <Check className="h-4 w-4" /> Finalize Results
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReviewScoresPage;
