import { AppLayout } from "@/components/AppLayout";
import { Shield } from "lucide-react";

const auditEntries = [
  { id: 1, timestamp: "2026-03-14 09:42:18", user: "Dr. T. Kumar", action: "Score Override", target: "STU-0042 / Q4", oldValue: "3", newValue: "6", reason: "OCR misread — student derivation is correct upon manual review" },
  { id: 2, timestamp: "2026-03-14 09:38:05", user: "System (GPT-4o)", action: "Auto-Grade", target: "STU-0042 / Q3", oldValue: "—", newValue: "3", reason: "Low confidence (0.58) — flagged for review" },
  { id: 3, timestamp: "2026-03-14 09:35:22", user: "System (GPT-4o)", action: "Auto-Grade", target: "STU-0042 / Q2", oldValue: "—", newValue: "5", reason: "Partial credit — rubric alignment: 5/8" },
  { id: 4, timestamp: "2026-03-14 09:34:10", user: "System (GPT-4o)", action: "Auto-Grade", target: "STU-0042 / Q1", oldValue: "—", newValue: "8", reason: "High confidence (0.93) — full rubric match" },
  { id: 5, timestamp: "2026-03-14 09:30:00", user: "System (OCR)", action: "Batch Upload", target: "Physics Mid-Term", oldValue: "—", newValue: "42 scripts", reason: "Batch processing initiated" },
  { id: 6, timestamp: "2026-03-13 16:20:45", user: "Dr. T. Kumar", action: "Exam Created", target: "Physics Mid-Term 2026", oldValue: "—", newValue: "—", reason: "20 questions, 100 marks total" },
];

const AuditPage = () => {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Audit Trail</h1>
            <p className="text-sm text-muted-foreground mt-1">Complete history of all score changes and system operations.</p>
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Timestamp</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Target</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Old → New</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{entry.timestamp}</td>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{entry.user}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      entry.action === "Score Override"
                        ? "bg-warning/15 text-warning"
                        : entry.action.startsWith("Auto")
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-foreground">{entry.target}</td>
                  <td className="px-4 py-3 text-xs font-mono text-center text-foreground">
                    {entry.oldValue} → {entry.newValue}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{entry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default AuditPage;
