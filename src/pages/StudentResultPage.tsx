import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { mockExams, mockFinalMarks, mockQuestionMappings, mockAiScores, mockStudents } from "@/data/mockData";
import { ArrowLeft, Award, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

const CURRENT_STUDENT_ID = "stu-1";

const StudentResultPage = () => {
  const { examId } = useParams<{ examId: string }>();

  const exam = mockExams.find(e => e.id === examId);
  const myMark = mockFinalMarks.find(f => f.examId === examId && f.studentId === CURRENT_STUDENT_ID);
  const student = mockStudents.find(s => s.id === CURRENT_STUDENT_ID);
  const questions = mockQuestionMappings.filter(q => q.examId === examId);

  // Class stats
  const classMarks = mockFinalMarks.filter(f => f.examId === examId);
  const classAvg = classMarks.length > 0 ? classMarks.reduce((s, m) => s + (m.totalMarksObtained / m.totalMarksMax) * 100, 0) / classMarks.length : 0;
  const myPct = myMark ? (myMark.totalMarksObtained / myMark.totalMarksMax) * 100 : 0;
  const rank = classMarks.filter(m => m.totalMarksObtained > (myMark?.totalMarksObtained || 0)).length + 1;
  const percentile = classMarks.length > 0 ? ((classMarks.length - rank) / classMarks.length) * 100 : 0;

  if (!exam || !myMark) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">Result not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/student/exams" className="p-2 rounded-lg border border-input hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{exam.examName}</h1>
            <p className="text-sm text-muted-foreground">{exam.subjectName} · {exam.examDate}</p>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card-elevated p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Your Score</p>
            <p className="text-3xl font-mono font-bold text-foreground">{myMark.totalMarksObtained}<span className="text-lg text-muted-foreground">/{myMark.totalMarksMax}</span></p>
            {myMark.grade && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{myMark.grade}</span>}
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Percentage</p>
            <p className="text-3xl font-mono font-bold text-foreground">{myPct.toFixed(1)}%</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Class Average</p>
            <p className="text-3xl font-mono font-bold text-foreground">{classAvg.toFixed(1)}%</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Percentile</p>
            <p className="text-3xl font-mono font-bold text-foreground">{percentile.toFixed(0)}<span className="text-lg text-muted-foreground">th</span></p>
          </div>
        </div>

        {/* Section-wise Breakdown */}
        <div className="card-elevated p-6">
          <h2 className="text-sm font-display font-semibold text-foreground mb-4">Section-wise Breakdown</h2>
          <div className="space-y-3">
            {exam.sections.map(section => {
              const sectionQuestions = questions.filter(q => q.sectionId === section.id);
              const sectionScores = sectionQuestions.flatMap(q =>
                mockAiScores.filter(s => s.questionMappingId === q.id && s.answerSheetId === "as-1")
              );
              const obtained = sectionScores.reduce((s, sc) => s + sc.score, 0);
              const pct = section.totalSectionMarks > 0 ? (obtained / section.totalSectionMarks) * 100 : 0;
              return (
                <div key={section.id} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-foreground">{section.partName}</div>
                  <div className="flex-1">
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${pct >= 60 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-mono text-foreground w-24 text-right">{obtained}/{section.totalSectionMarks}</span>
                  <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question-wise Details */}
        <div className="card-elevated overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-display font-semibold text-foreground">Question-wise Details</h2>
          </div>
          <div className="divide-y divide-border">
            {questions.map(q => {
              const qScores = mockAiScores.filter(s => s.questionMappingId === q.id && s.answerSheetId === "as-1");
              const section = exam.sections.find(s => s.id === q.sectionId);
              const total = qScores.reduce((s, sc) => s + sc.score, 0);
              return (
                <div key={q.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">Q{q.questionNumber}</span>
                      <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">{q.topicTag}</span>
                      <span className="text-xs text-muted-foreground">{section?.partName}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-foreground">{total}/{q.maxMarks}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {qScores.map(sc => (
                      <div key={sc.id} className="bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">{sc.criterionName}</span>
                          <span className="text-xs font-mono text-foreground">{sc.score}/{sc.maxScore}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{sc.aiFeedbackText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {questions.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Detailed question breakdown not available.</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentResultPage;
