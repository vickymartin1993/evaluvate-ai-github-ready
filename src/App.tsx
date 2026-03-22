import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ExamsPage from "./pages/ExamsPage.tsx";
import CreateExamPage from "./pages/CreateExamPage.tsx";
import GradingPage from "./pages/GradingPage.tsx";
import StudentsPage from "./pages/StudentsPage.tsx";
import AuditPage from "./pages/AuditPage.tsx";
import UploadPage from "./pages/UploadPage.tsx";
import ReviewScoresPage from "./pages/ReviewScoresPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import StudentMyExamsPage from "./pages/StudentMyExamsPage.tsx";
import StudentResultPage from "./pages/StudentResultPage.tsx";
import StudentPerformancePage from "./pages/StudentPerformancePage.tsx";
import AdminRubricsPage from "./pages/AdminRubricsPage.tsx";
import AdminGradingPolicyPage from "./pages/AdminGradingPolicyPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Teacher */}
          <Route path="/" element={<Index />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/exams/create" element={<CreateExamPage />} />
          {/* Grading route: examId and sheetId give the page its context */}
          {/* Legacy /grading still works for demo/mock mode */}
          <Route path="/grading" element={<GradingPage />} />
          <Route path="/grading/:examId/:sheetId" element={<GradingPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/review" element={<ReviewScoresPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          {/* Student */}
          <Route path="/student/exams" element={<StudentMyExamsPage />} />
          <Route path="/student/results/:examId" element={<StudentResultPage />} />
          <Route path="/student/performance" element={<StudentPerformancePage />} />
          {/* Admin */}
          <Route path="/admin/rubrics" element={<AdminRubricsPage />} />
          <Route path="/admin/grading-policy" element={<AdminGradingPolicyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
