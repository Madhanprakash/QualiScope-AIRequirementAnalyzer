import React, { useRef, useState } from "react";
import { ChevronsUpDown, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { Alert, Button, Field, IconButton, Input, MenuItem, MenuLabel, MenuSeparator, Modal, Popover, Textarea, useDismiss } from "./ui";

const EMPTY = { name: "", code: "", description: "" };
const initials = text => (text || "").split(/[\s_-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "P";
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Create / edit / delete a project. `initial` is null for a new project. */
export function ProjectDialog({ initial, onClose }) {
  const { projects, saveProject, removeProject } = useApp();
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(initial ? { name: initial.name, code: initial.code, description: initial.description } : EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const firstRun = projects.length === 0 && !editing;

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Project name is required.");
    setBusy(true);
    setError("");
    try {
      await saveProject(initial?.id, form);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    setError("");
    try {
      await removeProject(initial.id, initial.pack_count > 0);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={submit}
      size="sm"
      onClose={onClose}
      title={editing ? "Edit project" : firstRun ? "Create your first project" : "Create a project"}
      description={firstRun
        ? "Projects keep requirements, test packs, risks and reports separate. Start with one for the product you are testing."
        : "Requirements, test packs, risks and reports are kept separately for each project."}
      footer={
        <>
          {editing && (
            <Button variant="danger-soft" icon={Trash2} onClick={remove} disabled={busy} className="mr-auto">
              {confirmDelete ? "Confirm delete" : "Delete"}
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>{editing ? "Save changes" : "Create project"}</Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Project name">
          <Input autoFocus value={form.name} maxLength={200} onChange={e => set("name", e.target.value)} placeholder="e.g. iGreen" />
        </Field>
        <Field label="Project code" hint="Optional short code shown next to the name, e.g. IG.">
          <Input value={form.code} maxLength={30} onChange={e => set("code", e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea rows={3} value={form.description} maxLength={2000} onChange={e => set("description", e.target.value)} />
        </Field>
        {confirmDelete && (
          <Alert tone="danger" title="Delete this project?">
            {initial.pack_count
              ? `This permanently deletes "${initial.name}" and its ${plural(initial.pack_count, "test pack")}.`
              : `This permanently deletes "${initial.name}".`}
          </Alert>
        )}
        {error && <Alert tone="danger" role="alert">{error}</Alert>}
      </div>
    </Modal>
  );
}

/** Sidebar control that shows the active project and switches between projects. */
export function ProjectSwitcher({ onNew, onEdit }) {
  const { projects, project, selectProject } = useApp();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  useDismiss(wrapRef, open, () => setOpen(false), triggerRef);

  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  return (
    <div className="project-switcher" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="project-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Project: ${project ? project.name : "none selected"}`}
        data-tooltip={project ? project.name : "Select a project"}
        onClick={() => setOpen(o => !o)}
      >
        <span className="project-avatar" aria-hidden="true">
          {project ? initials(project.code || project.name) : <FolderKanban size={15} />}
        </span>
        <span className="project-trigger__text">
          <span className="project-trigger__name">{project ? project.name : "No project"}</span>
          <span className="project-trigger__meta">{project ? plural(project.pack_count, "test pack") : "Create a project to begin"}</span>
        </span>
        <ChevronsUpDown size={15} className="project-trigger__chevron" aria-hidden="true" />
      </button>

      <Popover open={open} align="start" className="project-menu" aria-label="Projects">
        <MenuLabel>Projects</MenuLabel>
        <div className="project-menu__list">
          {projects.map(p => (
            <div key={p.id} className="project-option">
              <MenuItem checked={project?.id === p.id} className="grow" onClick={() => { selectProject(p.id); close(); }}>
                <span className="project-avatar project-avatar--sm" aria-hidden="true">{initials(p.code || p.name)}</span>
                <span className="truncate">{p.name}</span>
                <span className="project-option__meta">{p.pack_count}</span>
              </MenuItem>
              <IconButton icon={Pencil} size="sm" role="menuitem" tabIndex={-1} label={`Edit ${p.name}`} onClick={() => { setOpen(false); onEdit(p); }} />
            </div>
          ))}
        </div>
        {projects.length > 0 && <MenuSeparator />}
        <MenuItem icon={Plus} onClick={() => { setOpen(false); onNew(); }}>New project</MenuItem>
      </Popover>
    </div>
  );
}
