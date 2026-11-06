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

export const SOURCE_TYPES = ["Epic", "Feature", "Story", "Task"];
export const PRIORITIES = ["Critical", "High", "Medium", "Low"];
export const STATUSES = ["Not Run", "Pass", "Fail", "Blocked"];
export const PRIORITY_LEVELS = ["", "Critical", "High", "Medium", "Low"];

export const EMPTY_REQ = {
  source_type: "Story", requirement_id: "", title: "", description: "", parent: "", data_flow_diagram: "",
  acceptance_criteria: "", business_validation: "", boundary_validation: "", integration_points: "", api_spec: ""
};

