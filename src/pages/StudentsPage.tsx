import { AppLayout } from "@/components/AppLayout";

const students = [
  { id: "STU-2026-0042", name: "Arun Patel", section: "11-A", exams: 4, avgScore: 78.2, trend: "+3.1%" },
  { id: "STU-2026-0015", name: "Riya Singh", section: "11-A", exams: 4, avgScore: 85.6, trend: "+1.8%" },
  { id: "STU-2026-0088", name: "Ming Chen", section: "11-B", exams: 3, avgScore: 62.4, trend: "-2.4%" },
  { id: "STU-2026-0031", name: "Sara Ahmed", section: "11-A", exams: 4, avgScore: 91.0, trend: "+0.5%" },
  { id: "STU-2026-0056", name: "James Wilson", section: "11-B", exams: 3, avgScore: 70.8, trend: "+4.2%" },
  { id: "STU-2026-0072", name: "Priya Sharma", section: "11-A", exams: 4, avgScore: 74.1, trend: "-1.0%" },
];

const StudentsPage = () => {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">Student performance overview across all exams.</p>
        </div>

        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Student ID</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Section</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Exams</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Avg Score</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{s.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{s.section}</td>
                  <td className="px-4 py-3 text-sm text-grade text-foreground text-right">{s.exams}</td>
                  <td className="px-4 py-3 text-sm text-grade text-foreground text-right">{s.avgScore.toFixed(1)}%</td>
                  <td className={`px-4 py-3 text-sm text-grade text-right ${s.trend.startsWith("+") ? "text-success" : "text-destructive"}`}>
                    {s.trend}
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

export default StudentsPage;
