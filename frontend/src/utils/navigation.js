import { FileDown, LayoutDashboard, ListChecks, PlayCircle, Settings, ShieldAlert, Sparkles, Target } from "lucide-react";

/** Every routed page, in sidebar order. `section` groups the sidebar. */
export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { id: "analyzer", label: "Requirement Analyzer", icon: Sparkles, section: "Workspace" },
  { id: "testpack", label: "AI Test Pack", icon: ListChecks, section: "Workspace" },
  { id: "risks", label: "Risk Analysis", icon: ShieldAlert, section: "Workspace" },
  { id: "traceability", label: "Traceability Matrix", icon: Target, section: "Workspace" },
  { id: "execution", label: "Test Execution", icon: PlayCircle, section: "Delivery" },
  { id: "reports", label: "Reports & Export", icon: FileDown, section: "Delivery" },
  { id: "settings", label: "Settings", icon: Settings, section: "System" }
];

export const NAV_SECTIONS = ["Overview", "Workspace", "Delivery"];

export const navItem = id => NAV.find(n => n.id === id);
