import { AppLayout } from "@/components/AppLayout";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Link } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";

const exams = [
  { id: 1, name: "Physics Mid-Term 2026", subject: "Physics", date: "Mar 12, 2026", totalMarks: 100, scripts: 42, graded: 38, avgScore: 72.4, status: "grading" as const, avgConfidence: 0.87 },
  { id: 2, name: "Chemistry Final", subject: "Chemistry", date: "Mar 10, 2026", totalMarks: 150, scripts: 55, graded: 55, avgScore: 68.1, status: "completed" as const, avgConfidence: 0.91 },
  { id: 3, name: "Mathematics Quiz 3", subject: "Mathematics", date: "Mar 8, 2026", totalMarks: 50, scripts: 36, graded: 36, avgScore: 38.2, status: "completed" as const, avgConfidence: 0.94 },
  { id: 4, name: "Biology Unit Test", subject: "Biology", date: "Mar 5, 2026", totalMarks: 75, scripts: 44, graded: 44, avgScore: 55.8, status: "completed" as const, avgConfidence: 0.89 },
  { id: 5, name: "English Essay Eval", subject: "English", date: "Mar 1, 2026", totalMarks: 40, scripts: 0, graded: 0, avgScore: 0, status: "draft" as const, avgConfidence: 0 },
];

const statusStyles = {
  grading: "bg-warning/15 text-warning",
  completed: "bg-success/15 text-success",
  draft: "bg-muted text-muted-foreground",
};

const statusLabels = {
  grading: "In Progress",
  completed: "Completed",
  draft: "Draft",
};

const ExamsPage = () => {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Exams</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage exams, rubrics, and answer sheet uploads.</p>
          </div>
          <Link to="/exams/create" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Create Exam
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search exams..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Exam</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Subject</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Marks</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Progress</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Avg Score</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Confidence</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <Link to={`/grading`} className="text-sm font-medium text-foreground hover:text-primary">
                      {exam.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{exam.date}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{exam.subject}</td>
                  <td className="px-4 py-3 text-sm text-grade text-foreground text-right">{exam.totalMarks}</td>
                  <td className="px-4 py-3 text-sm text-grade text-foreground text-right">
                    {exam.graded}/{exam.scripts}
                  </td>
                  <td className="px-4 py-3 text-sm text-grade text-foreground text-right">
                    {exam.avgScore > 0 ? `${exam.avgScore.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {exam.avgConfidence > 0 ? (
                      <ConfidenceBadge score={exam.avgConfidence} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyles[exam.status]}`}>
                      {statusLabels[exam.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default ExamsPage;
