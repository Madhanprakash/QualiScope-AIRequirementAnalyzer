import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, errorMessage, http } from "../services/api";
import { AppProvider } from "../hooks/useApp";
import AnalyzerPage, { validateRequirement } from "../pages/AnalyzerPage";
import TestPackPage, { filterCases } from "../pages/TestPackPage";
import TraceabilityPage from "../pages/TraceabilityPage";

const mkCase = (id, category, scenario, priority = "High", extra = {}) => ({
  id, category, scenario, priority, status: "Not Run", test_type: category, module: "Delivery", preconditions: "", steps: ["Open", "Save"],
  test_data: "", expected_result: "Saved", actual_result: "", remarks: "", covers: ["FR-001"], is_assumption: false, assumption_note: "",
  origin: "ai", edited: false, approved: false, requirement_id: "US-1", ...extra
});

const PACK = {
  id: "p1", requirement_id: "US-1", title: "Edit date", status: "draft", version: 1,
  test_case_count: 3, risk_count: 0, question_count: 0, created_at: "", updated_at: "",
  data: {
    requirement: {}, analysis: {}, warnings: [], risks: [], questions: [],
    test_cases: [mkCase("TC-POS-001", "positive", "Admin saves valid date"), mkCase("TC-NEG-001", "negative", "Non-admin blocked", "Critical"), mkCase("TC-BND-001", "boundary", "Leap day", "Low", { is_assumption: true, assumption_note: "limit TBC" })]
  }
};

function renderWithPack(ui, pack = PACK) {
  vi.spyOn(api, "listProjects").mockResolvedValue([{ id: "proj1", name: "iGreen", code: "IG", description: "", pack_count: 0, created_at: "", updated_at: "" }]);
  vi.spyOn(api, "listPacks").mockResolvedValue([]);
  vi.spyOn(api, "getPack").mockResolvedValue(pack);
  localStorage.setItem("qs_pack_id", pack.id);
  return render(<AppProvider>{ui}</AppProvider>);
}

beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("form validation", () => {
  it("rejects too-short input", () => {
    expect(validateRequirement({ title: "", description: "short", acceptance_criteria: "" })).toMatch(/at least 10/);
    expect(validateRequirement({ title: "", description: "A long enough requirement", acceptance_criteria: "" })).toBe("");
  });

  it("shows an error and does not call the API for empty input", async () => {
    const gen = vi.spyOn(api, "generate");
    renderWithPack(<AnalyzerPage go={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /generate ai test pack/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 10 characters/);
    expect(gen).not.toHaveBeenCalled();
  });

  it("submits a requirement, shows loading and navigates on success", async () => {
    let resolve;
    vi.spyOn(api, "generate").mockReturnValue(new Promise(r => { resolve = r; }));
    const go = vi.fn();
    renderWithPack(<AnalyzerPage go={go} />);
    await userEvent.type(screen.getByLabelText(/item desc/i), "As an Admin I want to edit the delivery date");
    await userEvent.click(screen.getByRole("button", { name: /generate ai test pack/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/generating/i);
    resolve(PACK);
    await waitFor(() => expect(go).toHaveBeenCalledWith("testpack"));
    expect(api.generate.mock.calls[0][0].description).toMatch(/Admin I want/);
  });

  it("shows backend errors from analyze", async () => {
    vi.spyOn(api, "analyze").mockRejectedValue({ response: { status: 503, data: { detail: "ANTHROPIC_API_KEY is not configured on the server." } } });
    renderWithPack(<AnalyzerPage go={() => {}} />);
    await userEvent.type(screen.getByLabelText(/item desc/i), "As an Admin I want to edit the delivery date");
    await userEvent.click(screen.getByRole("button", { name: /analyze requirement/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ANTHROPIC_API_KEY/);
  });

  it("offers only Excel template download and upload", () => {
    renderWithPack(<AnalyzerPage go={() => {}} />);
    expect(screen.getByRole("button", { name: /download excel template/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload excel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load sample|paste|upload document|clear/i })).toBeNull();
  });
});

describe("test pack page", () => {
  it("filters by search, category and priority", () => {
    const cases = PACK.data.test_cases;
    expect(filterCases(cases, { category: "all", search: "leap", priority: "" })).toHaveLength(1);
    expect(filterCases(cases, { category: "negative", search: "", priority: "" })).toHaveLength(1);
    expect(filterCases(cases, { category: "all", search: "", priority: "Critical" })[0].id).toBe("TC-NEG-001");
  });

  it("renders cases and filters through the UI", async () => {
    renderWithPack(<TestPackPage go={() => {}} />);
    expect(await screen.findByText("Admin saves valid date")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/search test cases/i), "non-admin");
    expect(screen.queryByText("Admin saves valid date")).not.toBeInTheDocument();
    expect(screen.getByText("Non-admin blocked")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/filter by priority/i), "Low");
    expect(screen.getByText(/no test cases match/i)).toBeInTheDocument();
  });

  it("flags assumptions and expands details", async () => {
    renderWithPack(<TestPackPage go={() => {}} />);
    const row = await screen.findByTestId("row-TC-BND-001");
    expect(within(row).getByText("ASSUMPTION")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Toggle TC-BND-001"));
    expect(screen.getByText(/limit TBC/)).toBeInTheDocument();
  });

  it("edits a test case via the API", async () => {
    const patch = vi.spyOn(api, "patchCase").mockResolvedValue(PACK);
    renderWithPack(<TestPackPage go={() => {}} />);
    await userEvent.click(await screen.findByLabelText("Edit TC-POS-001"));
    const scenario = screen.getByLabelText("Scenario");
    await userEvent.clear(scenario);
    await userEvent.type(scenario, "Updated scenario");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toBe("TC-POS-001");
    expect(patch.mock.calls[0][2].scenario).toBe("Updated scenario");
  });

  it("validates the editor before saving", async () => {
    const patch = vi.spyOn(api, "patchCase");
    renderWithPack(<TestPackPage go={() => {}} />);
    await userEvent.click(await screen.findByLabelText("Edit TC-POS-001"));
    await userEvent.clear(screen.getByLabelText("Expected result"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/expected result is required/i);
    expect(patch).not.toHaveBeenCalled();
  });

  it("disables editing on approved packs", async () => {
    renderWithPack(<TestPackPage go={() => {}} />, { ...PACK, status: "approved" });
    expect(await screen.findByLabelText("Edit TC-POS-001")).toBeDisabled();
  });
});

describe("traceability page", () => {
  it("renders matrix and gaps from the API", async () => {
    vi.spyOn(api, "traceability").mockResolvedValue({
      rows: [{ requirement_id: "FR-001", type: "Functional requirement", requirement: "Edit date", test_case_ids: ["TC-POS-001"], coverage: "Mapped", status: "Mapped" },
             { requirement_id: "BR-002", type: "Business rule", requirement: "No edit after invoice", test_case_ids: [], coverage: "None", status: "Not covered" }],
      unmapped_test_cases: [], gaps: { uncovered_requirements: [], uncovered_acceptance_criteria: [], uncovered_business_rules: ["BR-002"], regression_gaps: [] },
      summary: { total_items: 2, mapped: 1, validated: 0, mapped_coverage_pct: 50, validated_coverage_pct: 0 }
    });
    renderWithPack(<TraceabilityPage go={() => {}} />);
    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Not covered")).toBeInTheDocument();
    expect(screen.getByText(/Uncovered business rules:/).parentElement).toHaveTextContent("BR-002");
  });
});

describe("api service", () => {
  it("sends the stored API key and base path", async () => {
    localStorage.setItem("qs_api_key", "secret-key");
    let seen;
    await http.get("/api/health", { adapter: async cfg => { seen = cfg; return { data: { status: "ok" }, status: 200, statusText: "OK", headers: {}, config: cfg }; } });
    expect(seen.headers["X-API-Key"]).toBe("secret-key");
  });

  it("maps errors to readable messages", () => {
    expect(errorMessage({})).toMatch(/Cannot reach/);
    expect(errorMessage({ response: { status: 422, data: { errors: [{ field: "body.title", message: "bad" }] } } })).toMatch(/bad/);
    expect(errorMessage({ response: { status: 500, data: {} } })).toMatch(/500/);
  });
});
