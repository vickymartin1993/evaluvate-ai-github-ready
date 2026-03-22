import { AppLayout } from "@/components/AppLayout";
import { mockExams, mockFinalMarks } from "@/data/mockData";
import { Link } from "react-router-dom";
import { FileText, Eye } from "lucide-react";

// Simulating logged-in student = stu-1 (Arun Patel)
const CURRENT_STUDENT_ID = "stu-1";

const StudentMyExamsPage = () => {
  const myMarks = mockFinalMarks.filter(m => m.studentId === CURRENT_STUDENT_ID);
  const myExamIds = new Set(myMarks.map(m => m.examId));

  // All exams the student could have taken (same class)
  const relevantExams = mockExams.filter(e => e.className === "11");

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Exams</h1>
          <p className="text-sm text-muted-foreground mt-1">View your exam results and detailed feedback.</p>
        </div>

        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Exam</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Subject</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Score</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {relevantExams.map(exam => {
                const mark = myMarks.find(m => m.examId === exam.id);
                const hasResult = !!mark;
                const pct = mark ? ((mark.totalMarksObtained / mark.totalMarksMax) * 100).toFixed(1) : null;
                return (
                  <tr key={exam.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{exam.examName}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{exam.subjectName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{exam.examType}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{exam.examDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        hasResult ? "bg-success/15 text-success" :
                        exam.status === "draft" ? "bg-muted text-muted-foreground" :
                        "bg-warning/15 text-warning"
                      }`}>
                        {hasResult ? "Results Available" : exam.status === "draft" ? "Upcoming" : "In Progress"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {mark ? (
                        <div>
                          <span className="text-sm font-mono font-bold text-foreground">{mark.totalMarksObtained}/{mark.totalMarksMax}</span>
                          <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasResult && (
                        <Link to={`/student/results/${exam.id}`} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline justify-center">
                          <Eye className="h-3 w-3" /> View Result
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentMyExamsPage;
