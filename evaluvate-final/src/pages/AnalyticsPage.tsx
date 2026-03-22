import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { mockExams, mockFinalMarks, mockStudents } from "@/data/mockData";
import { BarChart3, TrendingUp, Users, Award } from "lucide-react";

const AnalyticsPage = () => {
  const completedExams = mockExams.filter(e => e.status === "completed" || e.status === "grading");
  const allMarks = mockFinalMarks;
  const avgScore = allMarks.length > 0
    ? allMarks.reduce((sum, m) => sum + (m.totalMarksObtained / m.totalMarksMax) * 100, 0) / allMarks.length
    : 0;
  const passCount = allMarks.filter(m => (m.totalMarksObtained / m.totalMarksMax) * 100 >= 40).length;
  const passRate = allMarks.length > 0 ? (passCount / allMarks.length) * 100 : 0;

  // Grade distribution
  const gradeDist: Record<string, number> = {};
  allMarks.forEach(m => {
    const g = m.grade || "N/A";
    gradeDist[g] = (gradeDist[g] || 0) + 1;
  });

  // Per-exam stats
  const examStats = completedExams.map(exam => {
    const marks = allMarks.filter(m => m.examId === exam.id);
    const avg = marks.length > 0 ? marks.reduce((s, m) => s + (m.totalMarksObtained / m.totalMarksMax) * 100, 0) / marks.length : 0;
    const pass = marks.filter(m => (m.totalMarksObtained / m.totalMarksMax) * 100 >= 40).length;
    return { exam, marks, avg, passRate: marks.length > 0 ? (pass / marks.length) * 100 : 0 };
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Teacher Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance overview across your exams and students.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Exams" value={completedExams.length} change="Active & completed" changeType="neutral" icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard label="Avg Score" value={`${avgScore.toFixed(1)}%`} change="Across all exams" changeType="neutral" icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard label="Pass Rate" value={`${passRate.toFixed(0)}%`} change={`${passCount}/${allMarks.length} students`} changeType={passRate >= 70 ? "positive" : "negative"} icon={<Award className="h-5 w-5" />} />
          <StatCard label="Students Evaluated" value={new Set(allMarks.map(m => m.studentId)).size} change={`${mockStudents.length} total`} changeType="neutral" icon={<Users className="h-5 w-5" />} />
        </div>

        {/* Grade Distribution */}
        <div className="card-elevated p-6">
          <h2 className="text-sm font-display font-semibold text-foreground mb-4">Grade Distribution</h2>
          <div className="flex items-end gap-3 h-40">
            {Object.entries(gradeDist).sort().map(([grade, count]) => {
              const maxCount = Math.max(...Object.values(gradeDist));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={grade} className="flex flex-col items-center flex-1">
                  <span className="text-xs font-mono text-muted-foreground mb-1">{count}</span>
                  <div className="w-full bg-primary/80 rounded-t-md transition-all" style={{ height: `${height}%` }} />
                  <span className="text-xs font-mono font-medium text-foreground mt-2">{grade}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-Exam Breakdown */}
        <div className="card-elevated overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-display font-semibold text-foreground">Per-Exam Breakdown</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Exam</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Subject</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Students</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Avg %</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Pass Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {examStats.map(({ exam, marks, avg, passRate: pr }) => (
                <tr key={exam.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{exam.examName}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{exam.subjectName}</td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground text-right">{marks.length}</td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground text-right">{avg.toFixed(1)}%</td>
                  <td className={`px-4 py-3 text-sm font-mono text-right ${pr >= 70 ? "text-success" : "text-destructive"}`}>{pr.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalyticsPage;
