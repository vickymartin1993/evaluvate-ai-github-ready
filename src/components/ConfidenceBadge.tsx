import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number;
  className?: string;
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  const level = score >= 0.85 ? "high" : score >= 0.7 ? "medium" : "low";
  const labels = { high: "High", medium: "Medium", low: "Low" };
  const colors = {
    high: "bg-success/15 text-success border-success/20",
    medium: "bg-warning/15 text-warning border-warning/20",
    low: "bg-destructive/15 text-destructive border-destructive/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium border",
        colors[level],
        level === "low" && "confidence-pulse",
        className
      )}
    >
      {(score * 100).toFixed(0)}% · {labels[level]}
    </span>
  );
}
