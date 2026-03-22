import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { mockGradingPolicy } from "@/data/mockData";
import { Save, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminGradingPolicyPage = () => {
  const { toast } = useToast();
  const [policy, setPolicy] = useState(mockGradingPolicy);

  const updateMultiplier = (idx: number, field: string, value: number) => {
    setPolicy({
      ...policy,
      classBandMultipliers: policy.classBandMultipliers.map((m, i) =>
        i === idx ? { ...m, [field]: value } : m
      ),
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Grading Policy</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure global grading thresholds and class-band multipliers.</p>
          </div>
        </div>

        {/* Global Settings */}
        <div className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Global Thresholds</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pass Percentage (%)</label>
              <input type="number" min={0} max={100} value={policy.passPercentage}
                onChange={(e) => setPolicy({ ...policy, passPercentage: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Distinction Threshold (%)</label>
              <input type="number" min={0} max={100} value={policy.distinctionThreshold}
                onChange={(e) => setPolicy({ ...policy, distinctionThreshold: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </div>

        {/* Class Band Multipliers */}
        <div className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Class-Band Multipliers</h2>
          <p className="text-xs text-muted-foreground">Adjust scoring factors per class band (e.g., relax grammar for younger students).</p>

          <div className="space-y-3">
            {policy.classBandMultipliers.map((m, idx) => (
              <div key={m.classBand} className="border border-border rounded-lg p-4">
                <span className="text-sm font-medium text-foreground mb-2 block">Class {m.classBand}</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Grammar Factor</label>
                    <input type="number" step={0.1} min={0} max={2} value={m.grammarFactor}
                      onChange={(e) => updateMultiplier(idx, "grammarFactor", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Relevance Factor</label>
                    <input type="number" step={0.1} min={0} max={2} value={m.relevanceFactor}
                      onChange={(e) => updateMultiplier(idx, "relevanceFactor", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Correctness Factor</label>
                    <input type="number" step={0.1} min={0} max={2} value={m.correctnessFactor}
                      onChange={(e) => updateMultiplier(idx, "correctnessFactor", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => toast({ title: "Policy saved", description: "Grading policy has been updated." })}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Save className="h-4 w-4" /> Save Policy
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminGradingPolicyPage;
