import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import {
  FileText,
  ClipboardCheck,
  Users,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

const recentExams = [
  { id: 1, name: "Physics Mid-Term 2026", subject: "Physics", date: "Mar 12, 2026", scripts: 42, graded: 38, status: "grading" as const },
  { id: 2, name: "Chemistry Final", subject: "Chemistry", date: "Mar 10, 2026", scripts: 55, graded: 55, status: "completed" as const },
  { id: 3, name: "Mathematics Quiz 3", subject: "Mathematics", date: "Mar 8, 2026", scripts: 36, graded: 36, status: "completed" as const },
];

const flaggedItems = [
  { id: 1, student: "A. Patel", exam: "Physics Mid-Term", question: 4, confidence: 0.52, reason: "OCR confidence below threshold" },
  { id: 2, student: "R. Singh", exam: "Physics Mid-Term", question: 7, confidence: 0.61, reason: "Ambiguous handwriting detected" },
  { id: 3, student: "M. Chen", exam: "Physics Mid-Term", question: 12, confidence: 0.58, reason: "Multiple crossing-out detected" },
];

const statusColors = {
  grading: "bg-warning/15 text-warning",
  completed: "bg-success/15 text-success",
  draft: "bg-muted text-muted-foreground",
};

const Index = () => {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Precision Grading, Auditable Intelligence.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Exams"
            value={3}
            change="+1 this week"
            changeType="neutral"
            icon={<FileText className="h-5 w-5" />}
          />
          <StatCard
            label="Scripts Graded"
            value={129}
            change="+38 today"
            changeType="positive"
            icon={<ClipboardCheck className="h-5 w-5" />}
          />
          <StatCard
            label="Students"
            value={133}
            change="3 sections"
            changeType="neutral"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Flagged Reviews"
            value={3}
            change="Requires attention"
            changeType="negative"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Exams */}
          <div className="lg:col-span-2 card-elevated">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-display font-semibold text-foreground">Recent Exams</h2>
              <Link to="/exams" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentExams.map((exam) => (
                <div key={exam.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exam.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{exam.subject} · {exam.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-grade text-foreground">
                      {exam.graded}/{exam.scripts}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[exam.status]}`}>
                      {exam.status === "grading" ? "In Progress" : "Completed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flagged for Review */}
          <div className="card-elevated">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Flagged for Review
              </h2>
            </div>
            <div className="divide-y divide-border">
              {flaggedItems.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.student}</p>
                      <p className="text-xs text-muted-foreground">Q{item.question} · {item.exam}</p>
                    </div>
                    <ConfidenceBadge score={item.confidence} />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Processing Status */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-display font-semibold text-foreground">Batch Processing</h2>
            <span className="text-xs text-muted-foreground font-mono">Physics Mid-Term 2026</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: "90%" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Batch processing 90% complete. 4 scripts require manual review due to low OCR confidence (&lt;0.72).
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
