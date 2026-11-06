import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { AppProvider } from "../hooks/useApp";
import { ThemeProvider } from "../hooks/useTheme";
import { THEMES, applyTheme, savedTheme } from "../utils/themes";
import CommandPalette from "../components/CommandPalette";
import { ProjectDialog } from "../components/ProjectSwitcher";
import { ThemeOptions } from "../components/ThemePicker";
import { PriorityBadge, StatusBadge } from "../components/common";
import { Field, FilterChips, Input, Modal } from "../components/ui";

const PROJECT = { id: "p1", name: "iGreen", code: "IG", description: "", pack_count: 2, created_at: "", updated_at: "" };

function mockApi(projects = [PROJECT]) {
  vi.spyOn(api, "listProjects").mockResolvedValue(projects);
  vi.spyOn(api, "listPacks").mockResolvedValue([]);
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("themes", () => {
  it("offers exactly five themes and applies one through data-theme", () => {
    expect(THEMES.map(t => t.id)).toEqual(["porcelain", "midnight", "navy", "graphite", "evergreen"]);
    const listener = vi.fn();
    window.addEventListener("qs:themechange", listener);
    applyTheme("graphite");
    window.removeEventListener("qs:themechange", listener);
    expect(document.documentElement.dataset.theme).toBe("graphite");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores saved themes that no longer exist", () => {
    localStorage.setItem("qs_theme", "ocean-coral");
    expect(["porcelain", "midnight"]).toContain(savedTheme());
  });

  it("lets the user pick a theme card and remembers the choice", async () => {
    render(<ThemeProvider><ThemeOptions /></ThemeProvider>);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    await userEvent.click(screen.getByRole("radio", { name: /evergreen/i }));
    expect(screen.getByRole("radio", { name: /evergreen/i })).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("qs_theme")).toBe("evergreen");
    expect(document.documentElement.dataset.theme).toBe("evergreen");
  });
});

describe("UI kit", () => {
  it("Modal is a labelled dialog that closes on Escape and returns focus", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open dialog</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Edit project">
            <Field label="Name"><Input /></Field>
          </Modal>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    await userEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Edit project" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("Field links its label and error message to the control", () => {
    render(<Field label="API key" hint="Stored in this browser" error="Key is required"><Input /></Field>);
    const input = screen.getByLabelText("API key");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy)).toHaveTextContent("Key is required");
    expect(screen.queryByText("Stored in this browser")).not.toBeInTheDocument();
  });

  it("FilterChips exposes the selected filter as a pressed toggle", async () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        label="Filter by severity"
        items={[{ id: "all", label: "All", count: 3 }, { id: "high", label: "High", count: 1 }]}
        value="all"
        onChange={onChange}
      />
    );
    expect(screen.getByRole("group", { name: "Filter by severity" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^High/ })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: /^High/ }));
    expect(onChange).toHaveBeenCalledWith("high");
  });

  it("maps statuses and priorities to toned badges", () => {
    render(<><StatusBadge value="Not covered" /><StatusBadge value="Pass" /><PriorityBadge value="Critical" /></>);
    expect(screen.getByText("Not covered")).toHaveClass("badge--danger");
    expect(screen.getByText("Pass")).toHaveClass("badge--success");
    expect(screen.getByText("Critical")).toHaveClass("priority--critical");
  });
});

describe("command palette", () => {
  const renderPalette = props => render(
    <ThemeProvider>
      <AppProvider>
        <CommandPalette open onClose={() => {}} go={() => {}} onNewProject={() => {}} onToggleSidebar={() => {}} {...props} />
      </AppProvider>
    </ThemeProvider>
  );

  it("filters commands and runs the highlighted one with Enter", async () => {
    mockApi();
    const go = vi.fn();
    const onClose = vi.fn();
    renderPalette({ go, onClose });
    const input = screen.getByRole("combobox", { name: "Search commands" });
    expect(input).toHaveFocus();
    await userEvent.type(input, "trace");
    const [first] = screen.getAllByRole("option");
    expect(first).toHaveTextContent("Traceability Matrix");
    expect(first).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalled();
    expect(go).toHaveBeenCalledWith("traceability");
  });

  it("offers project switching and all five themes", async () => {
    mockApi();
    renderPalette();
    expect(await screen.findByRole("option", { name: /iGreen/ })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: /^\w+ theme/ })).toHaveLength(5);
  });
});

describe("project dialog", () => {
  it("requires a project name before calling the API", async () => {
    mockApi([]);
    const create = vi.spyOn(api, "createProject");
    render(<AppProvider><ProjectDialog initial={null} onClose={() => {}} /></AppProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Project name is required.");
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a project and selects it", async () => {
    mockApi([]);
    const created = { ...PROJECT, id: "p2", name: "Payments" };
    vi.spyOn(api, "createProject").mockResolvedValue(created);
    const onClose = vi.fn();
    render(<AppProvider><ProjectDialog initial={null} onClose={onClose} /></AppProvider>);
    await userEvent.type(screen.getByLabelText("Project name"), "Payments");
    api.listProjects.mockResolvedValue([created]);
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(api.createProject).toHaveBeenCalledWith({ name: "Payments", code: "", description: "" });
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem("qs_project_id")).toBe("p2");
  });
});
