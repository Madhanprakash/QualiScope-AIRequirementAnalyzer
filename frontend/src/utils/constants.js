import { Check, Database, Gauge, ListChecks, Plug, RefreshCw, Users, X } from "lucide-react";

export const CATEGORIES = [
  { id: "functional", label: "Functional", icon: ListChecks },
  { id: "positive", label: "Positive", icon: Check },
  { id: "negative", label: "Negative", icon: X },
  { id: "boundary", label: "Boundary", icon: Gauge },
  { id: "role", label: "Role & Permission", icon: Users },
  { id: "integration", label: "Integration", icon: Plug },
  { id: "data", label: "Data Combination", icon: Database },
  { id: "regression", label: "Regression", icon: RefreshCw }
];

export const SOURCE_TYPES = ["Requirement", "User Story", "Change Request", "Functional Requirement", "Acceptance Criteria"];
export const PRIORITIES = ["Critical", "High", "Medium", "Low"];
export const STATUSES = ["Not Run", "Pass", "Fail", "Blocked"];
export const PRIORITY_LEVELS = ["", "Critical", "High", "Medium", "Low"];

export const EMPTY_REQ = {
  source_type: "User Story", requirement_id: "", title: "", description: "", business_objective: "",
  acceptance_criteria: "", impacted_module: "", business_priority: "", additional_context: ""
};

export const SEVERITY_COLORS = { Critical: "#ff7777", High: "#e78b81", Medium: "#e6b45f", Low: "#72c69b" };
