import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { mockRubrics, type Rubric } from "@/data/mockData";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Upload, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface SectionRow {
  partName: string;
  description: string;
  questionsCount: number;
  marksPerQuestion: number;
  rubricId: string;
}

interface InlineRubricCriterion {
  criterionName: string;
  maxMarks: number;
  description: string;
}

const examTypes = ["Quarterly", "Midterm", "Final", "UnitTest"] as const;

const CreateExamPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1
  const [subjectName, setSubjectName] = useState("");
  const [examName, setExamName] = useState("");
  const [examType, setExamType] = useState<string>("Midterm");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [className, setClassName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [examDate, setExamDate] = useState("");

  // Step 2
  const [sections, setSections] = useState<SectionRow[]>([
    { partName: "Part 1", description: "1 mark questions", questionsCount: 10, marksPerQuestion: 1, rubricId: "" },
  ]);

  // Step 3
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [newRubricMode, setNewRubricMode] = useState<Record<number, boolean>>({});
  const [inlineRubrics, setInlineRubrics] = useState<Record<number, { name: string; description: string; classBand: string; criteria: InlineRubricCriterion[] }>>({});

  const totalMarks = sections.reduce((sum, s) => sum + s.questionsCount * s.marksPerQuestion, 0);

  const addSection = () => {
    setSections([...sections, {
      partName: `Part ${sections.length + 1}`,
      description: "",
      questionsCount: 1,
      marksPerQuestion: 1,
      rubricId: "",
    }]);
  };

  const removeSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const updateSection = (idx: number, field: keyof SectionRow, value: string | number) => {
    setSections(sections.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handlePublish = () => {
    toast({
      title: "Exam Published",
      description: `${examName} has been created with ${sections.length} sections and ${totalMarks} total marks.`,
    });
    navigate("/exams");
  };

  const canProceedStep1 = subjectName && examName && className && sectionName && examDate;
  const canProceedStep2 = sections.length > 0 && sections.every(s => s.questionsCount > 0 && s.marksPerQuestion > 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/exams" className="p-2 rounded-lg border border-input hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Create Exam</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Step {step} of 3</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step ? "bg-primary text-primary-foreground" : s < step ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-success" : "bg-muted"}`} />}
            </div>
          ))}
          <span className="ml-3 text-sm text-muted-foreground">
            {step === 1 ? "Basic Details" : step === 2 ? "Sections & Weightage" : "Rubrics & Answer Key"}
          </span>
        </div>

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="card-elevated p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Basic Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject Name</label>
                <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g., Physics"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Exam Name</label>
                <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g., Physics Mid-Term 2026"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Exam Type</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {examTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Academic Year</label>
                <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2025-2026"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Class</label>
                <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g., 11"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Section</label>
                <input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g., A"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Exam Date</label>
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Total Marks</label>
                <input value={totalMarks} readOnly
                  className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-sm font-mono text-muted-foreground cursor-not-allowed" />
                <p className="text-xs text-muted-foreground mt-1">Auto-computed from sections</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Sections */}
        {step === 2 && (
          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">Sections & Weightage</h2>
              <button onClick={addSection} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                <Plus className="h-4 w-4" /> Add Section
              </button>
            </div>

            <div className="space-y-3">
              {sections.map((section, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{section.partName}</span>
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(idx)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Part Name</label>
                      <input value={section.partName} onChange={(e) => updateSection(idx, "partName", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Description</label>
                      <input value={section.description} onChange={(e) => updateSection(idx, "description", e.target.value)}
                        placeholder="e.g., 1 mark questions"
                        className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Questions</label>
                      <input type="number" min={1} value={section.questionsCount}
                        onChange={(e) => updateSection(idx, "questionsCount", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Marks/Question</label>
                      <input type="number" min={1} value={section.marksPerQuestion}
                        onChange={(e) => updateSection(idx, "marksPerQuestion", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Section Total: </span>
                    <span className="text-sm font-mono font-semibold text-foreground">{section.questionsCount * section.marksPerQuestion} marks</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-sm font-display font-semibold text-foreground">Total Exam Marks</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono font-bold text-foreground">{totalMarks}</span>
                {totalMarks !== 50 && totalMarks !== 100 && totalMarks !== 150 && (
                  <span className="flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="h-3 w-3" /> Unusual total
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Rubrics & Answer Key */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-foreground">Rubric Assignment</h2>
              <p className="text-sm text-muted-foreground">Assign a rubric template to each section, or create a new one inline.</p>

              {sections.map((section, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{section.partName} — {section.description}</span>
                    <span className="text-xs font-mono text-muted-foreground">{section.marksPerQuestion} marks/q</span>
                  </div>

                  {!newRubricMode[idx] ? (
                    <div className="space-y-2">
                      <select
                        value={section.rubricId}
                        onChange={(e) => updateSection(idx, "rubricId", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select a rubric...</option>
                        {mockRubrics.map((r) => (
                          <option key={r.id} value={r.id}>{r.name} ({r.classBand})</option>
                        ))}
                      </select>
                      <button onClick={() => setNewRubricMode({ ...newRubricMode, [idx]: true })}
                        className="text-xs text-primary hover:underline">
                        + Create new rubric inline
                      </button>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <input placeholder="Rubric name" value={inlineRubrics[idx]?.name || ""}
                          onChange={(e) => setInlineRubrics({ ...inlineRubrics, [idx]: { ...inlineRubrics[idx], name: e.target.value, description: inlineRubrics[idx]?.description || "", classBand: inlineRubrics[idx]?.classBand || "", criteria: inlineRubrics[idx]?.criteria || [] } })}
                          className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        <input placeholder="Class band (e.g. 11–12)" value={inlineRubrics[idx]?.classBand || ""}
                          onChange={(e) => setInlineRubrics({ ...inlineRubrics, [idx]: { ...inlineRubrics[idx], classBand: e.target.value, name: inlineRubrics[idx]?.name || "", description: inlineRubrics[idx]?.description || "", criteria: inlineRubrics[idx]?.criteria || [] } })}
                          className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        <input placeholder="Description" value={inlineRubrics[idx]?.description || ""}
                          onChange={(e) => setInlineRubrics({ ...inlineRubrics, [idx]: { ...inlineRubrics[idx], description: e.target.value, name: inlineRubrics[idx]?.name || "", classBand: inlineRubrics[idx]?.classBand || "", criteria: inlineRubrics[idx]?.criteria || [] } })}
                          className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <p className="text-xs text-muted-foreground">Criteria (sum of max marks should = {section.marksPerQuestion})</p>
                      {(inlineRubrics[idx]?.criteria || []).map((c, ci) => (
                        <div key={ci} className="grid grid-cols-3 gap-2">
                          <input placeholder="Criterion name" value={c.criterionName}
                            onChange={(e) => {
                              const updated = [...(inlineRubrics[idx]?.criteria || [])];
                              updated[ci] = { ...updated[ci], criterionName: e.target.value };
                              setInlineRubrics({ ...inlineRubrics, [idx]: { ...inlineRubrics[idx], criteria: updated } });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                          <input type="number" placeholder="Max marks" value={c.maxMarks}
                            onChange={(e) => {
                              const updated = [...(inlineRubrics[idx]?.criteria || [])];
                              updated[ci] = { ...updated[ci], maxMarks: parseInt(e.target.value) || 0 };
                              setInlineRubrics({ ...inlineRubrics, [idx]: { ...inlineRubrics[idx], criteria: updated } });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                          <input placeholder="Description" value={c.description}
                            onChange={(e) => {
                              const updated = [...(inlineRubrics[idx]?.criteria || [])];
                              updated[ci] = { ...updated[ci], description: e.target.value };
                              setInlineRubrics({ ...inlineRubrics, [idx]: { ...inlineRubrics[idx], criteria: updated } });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                      ))}
                      <button onClick={() => {
                        const current = inlineRubrics[idx] || { name: "", description: "", classBand: "", criteria: [] };
                        setInlineRubrics({ ...inlineRubrics, [idx]: { ...current, criteria: [...current.criteria, { criterionName: "", maxMarks: 0, description: "" }] } });
                      }} className="text-xs text-primary hover:underline">+ Add criterion</button>
                      <button onClick={() => setNewRubricMode({ ...newRubricMode, [idx]: false })}
                        className="text-xs text-muted-foreground hover:underline ml-4">Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Answer Key Upload */}
            <div className="card-elevated p-6 space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Answer Key (Optional)</h2>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drag & drop answer key PDF, or click to browse</p>
                <input type="file" accept=".pdf,.jpg,.png" onChange={(e) => setAnswerKeyFile(e.target.files?.[0] || null)}
                  className="text-sm" />
                {answerKeyFile && (
                  <p className="text-xs text-success mt-2">✓ {answerKeyFile.name} selected</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-30"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors"
            >
              <Check className="h-4 w-4" /> Publish Exam
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateExamPage;
