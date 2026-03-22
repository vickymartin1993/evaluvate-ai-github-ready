import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Users,
  BarChart3,
  Shield,
  Settings,
  ChevronLeft,
  GraduationCap,
  Upload,
  Search,
  BookOpen,
  TrendingUp,
  Layers,
  Sliders,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Teacher",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Exams", icon: FileText, path: "/exams" },
      { label: "Upload Sheets", icon: Upload, path: "/upload" },
      { label: "Grading", icon: ClipboardCheck, path: "/grading", badge: "3" },
      { label: "Review Scores", icon: Search, path: "/review" },
      { label: "Students", icon: Users, path: "/students" },
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    title: "Student",
    items: [
      { label: "My Exams", icon: BookOpen, path: "/student/exams" },
      { label: "My Performance", icon: TrendingUp, path: "/student/performance" },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Rubric Templates", icon: Layers, path: "/admin/rubrics" },
      { label: "Grading Policy", icon: Sliders, path: "/admin/grading-policy" },
      { label: "Audit Trail", icon: Shield, path: "/audit" },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <GraduationCap className="h-6 w-6 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <span className="font-display font-bold text-base tracking-tight text-sidebar-primary-foreground">
            Evaluvate
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-sidebar-accent transition-colors"
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="bg-warning text-warning-foreground text-xs font-mono px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
              TK
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                Dr. T. Kumar
              </p>
              <p className="text-xs text-sidebar-foreground/50">Teacher</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
