import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { mockRubrics, type Rubric } from "@/data/mockData";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminRubricsPage = () => {
  const { toast } = useToast();
  const [rubrics, setRubrics] = useState<Rubric[]>(mockRubrics);
  const [editingId, setEditingId] = useState<string | null>(null);

  const deleteRubric = (id: string) => {
    setRubrics(rubrics.filter(r => r.id !== id));
    toast({ title: "Rubric deleted" });
  };

  const toggleDefault = (id: string) => {
    setRubrics(rubrics.map(r => r.id === id ? { ...r, isSchoolDefault: !r.isSchoolDefault } : r));
    toast({ title: "Default status updated" });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Rubric Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage rubric templates used across all exams.</p>
          </div>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Create Template
          </button>
        </div>

        <div className="space-y-4">
          {rubrics.map(rubric => (
            <div key={rubric.id} className="card-elevated overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-display font-semibold text-foreground">{rubric.name}</span>
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">{rubric.classBand}</span>
                  {rubric.isSchoolDefault && (
                    <span className="flex items-center gap-1 text-xs text-warning font-medium">
                      <Star className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleDefault(rubric.id)}
                    className="text-xs text-muted-foreground hover:text-warning transition-colors">
                    <Star className={`h-4 w-4 ${rubric.isSchoolDefault ? "text-warning fill-warning" : ""}`} />
                  </button>
                  <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteRubric(rubric.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-3">{rubric.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Grammar:</span>
                    <span className="font-mono ml-1">{rubric.defaultGrammarWeight}%</span>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Relevance:</span>
                    <span className="font-mono ml-1">{rubric.defaultRelevanceWeight}%</span>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Correctness:</span>
                    <span className="font-mono ml-1">{rubric.defaultCorrectnessWeight}%</span>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-2">Criterion</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-2">Max Marks</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-2">Weight</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-2 pl-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rubric.criteria.map(c => (
                      <tr key={c.id}>
                        <td className="py-2 text-sm text-foreground">{c.criterionName}</td>
                        <td className="py-2 text-sm font-mono text-foreground text-right">{c.maxMarks}</td>
                        <td className="py-2 text-sm font-mono text-foreground text-right">{c.weightPercentage}%</td>
                        <td className="py-2 text-xs text-muted-foreground pl-4">{c.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminRubricsPage;
