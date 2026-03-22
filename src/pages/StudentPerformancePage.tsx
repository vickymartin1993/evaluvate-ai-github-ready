import { AppLayout } from "@/components/AppLayout";
import { mockExams, mockFinalMarks, mockAiScores, mockQuestionMappings } from "@/data/mockData";
import { TrendingUp, AlertTriangle, CheckCircle, BookOpen } from "lucide-react";

const CURRENT_STUDENT_ID = "stu-1";

const StudentPerformancePage = () => {
  const myMarks = mockFinalMarks.filter(m => m.studentId === CURRENT_STUDENT_ID);

  // Per-subject aggregation
  const subjectMap = new Map<string, { scores: number[]; exams: string[] }>();
  myMarks.forEach(m => {
    const exam = mockExams.find(e => e.id === m.examId);
    if (!exam) return;
    const existing = subjectMap.get(exam.subjectName) || { scores: [], exams: [] };
    existing.scores.push((m.totalMarksObtained / m.totalMarksMax) * 100);
    existing.exams.push(exam.examName);
    subjectMap.set(exam.subjectName, existing);
  });

  const subjects = Array.from(subjectMap.entries()).map(([name, data]) => ({
    name,
    avg: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
    scores: data.scores,
    exams: data.exams,
  }));

  // Weak topics analysis
  const myQuestionScores = mockAiScores.filter(s => s.answerSheetId === "as-1");
  const topicScores = new Map<string, { total: number; max: number; count: number }>();
  myQuestionScores.forEach(s => {
    const qm = mockQuestionMappings.find(q => q.id === s.questionMappingId);
    if (!qm) return;
    const existing = topicScores.get(qm.topicTag) || { total: 0, max: 0, count: 0 };
    existing.total += s.score;
    existing.max += s.maxScore;
    existing.count++;
    topicScores.set(qm.topicTag, existing);
  });

  const topics = Array.from(topicScores.entries()).map(([name, data]) => ({
    name,
    pct: data.max > 0 ? (data.total / data.max) * 100 : 0,
    weak: data.max > 0 ? (data.total / data.max) * 100 < 60 : false,
  }));

  const weakTopics = topics.filter(t => t.weak);

  // Check if grammar is consistently low
  const grammarScores = myQuestionScores.filter(s => s.criterionName === "Grammar");
  const grammarAvg = grammarScores.length > 0
    ? grammarScores.reduce((s, sc) => s + (sc.score / sc.maxScore) * 100, 0) / grammarScores.length
    : 100;
  const grammarWeak = grammarAvg < 60;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">Year-wise trends, weak areas, and self-improvement plan.</p>
        </div>

        {/* Subject Averages */}
        <div className="card-elevated p-6">
          <h2 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Subject Averages (2025-2026)
          </h2>
          <div className="space-y-3">
            {subjects.map(sub => (
              <div key={sub.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{sub.name}</span>
                  <span className="text-sm font-mono font-semibold text-foreground">{sub.avg.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${sub.avg >= 70 ? "bg-success" : sub.avg >= 50 ? "bg-warning" : "bg-destructive"}`}
                    style={{ width: `${sub.avg}%` }} />
                </div>
                {/* Mini trend */}
                <div className="flex items-center gap-2">
                  {sub.scores.map((sc, i) => (
                    <span key={i} className="text-xs font-mono text-muted-foreground">
                      {sub.exams[i].split(" ").slice(0, 2).join(" ")}: {sc.toFixed(0)}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-sm text-muted-foreground">No exam results available yet.</p>
            )}
          </div>
        </div>

        {/* Topic Analysis */}
        <div className="card-elevated p-6">
          <h2 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Topic-wise Analysis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map(t => (
              <div key={t.name} className={`rounded-lg p-3 border ${t.weak ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    {t.weak ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle className="h-3.5 w-3.5 text-success" />}
                    {t.name}
                  </span>
                  <span className={`text-sm font-mono font-semibold ${t.weak ? "text-destructive" : "text-success"}`}>{t.pct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${t.weak ? "bg-destructive" : "bg-success"}`}
                    style={{ width: `${Math.min(t.pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Self-Improvement Plan */}
        <div className="card-elevated p-6">
          <h2 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            🎯 AI-Generated Self-Improvement Plan
          </h2>
          {weakTopics.length === 0 && !grammarWeak ? (
            <div className="bg-success/10 rounded-lg p-4">
              <p className="text-sm text-success font-medium">🎉 Great job! No weak areas detected. Keep up the good work!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakTopics.map(t => (
                <div key={t.name} className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
                  <input type="checkbox" className="mt-0.5 rounded border-input" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Improve in {t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You scored {t.pct.toFixed(0)}% in this topic. Revise the theory and practice 10 questions this week focusing on correctness and understanding.
                    </p>
                  </div>
                </div>
              ))}
              {grammarWeak && (
                <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
                  <input type="checkbox" className="mt-0.5 rounded border-input" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Focus on Grammar</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your grammar scores are consistently low ({grammarAvg.toFixed(0)}% average). Focus on improving sentence structure, tenses, and clarity in written answers.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
                <input type="checkbox" className="mt-0.5 rounded border-input" />
                <div>
                  <p className="text-sm font-medium text-foreground">Review past mistakes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Go through AI feedback on each question where you lost marks. Understanding the rationale will help avoid similar mistakes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentPerformancePage;
