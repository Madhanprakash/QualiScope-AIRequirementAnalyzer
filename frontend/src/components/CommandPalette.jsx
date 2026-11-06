import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, FolderKanban, PanelLeft, Palette, Plus, Search } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { useTheme } from "../hooks/useTheme";
import { NAV } from "../utils/navigation";
import { Kbd, useFocusTrap, useScrollLock } from "./ui";

/** Keeps commands in their original order (so groups stay together) and drops non-matches. */
function filterCommands(commands, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return commands;
  return commands.filter(c => {
    const haystack = `${c.label} ${c.group} ${c.keywords || ""}`.toLowerCase();
    return terms.every(t => haystack.includes(t));
  });
}

function groupCommands(list) {
  const groups = [];
  list.forEach((command, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === command.group) last.items.push({ command, index });
    else groups.push({ name: command.group, items: [{ command, index }] });
  });
  return groups;
}

/** Ctrl/⌘ K quick switcher for pages, test packs, projects, actions and themes. */
export default function CommandPalette({ open, onClose, go, onNewProject, onToggleSidebar }) {
  const { projects, project, selectProject, packs, openPack } = useApp();
  const { themes, theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  useFocusTrap(panelRef, open, { onEscape: onClose, initialFocus: inputRef });
  useScrollLock(open);

  useEffect(() => { if (open) { setQuery(""); setActive(0); } }, [open]);

  const commands = useMemo(() => [
    ...NAV.map(n => ({ id: `nav-${n.id}`, group: "Go to", label: n.label, icon: n.icon, run: () => go(n.id) })),
    ...packs.slice(0, 6).map(p => ({
      id: `pack-${p.id}`, group: "Recent test packs", label: `${p.requirement_id || "Pack"} · ${p.title}`,
      hint: `v${p.version} · ${p.status}`, icon: FileText, keywords: "test pack open",
      run: async () => { await openPack(p.id); go("testpack"); }
    })),
    ...projects.map(p => ({
      id: `project-${p.id}`, group: "Switch project", label: p.name, icon: FolderKanban, keywords: `project ${p.code}`,
      hint: p.id === project?.id ? "Current" : `${p.pack_count} packs`, run: () => selectProject(p.id)
    })),
    { id: "action-new-project", group: "Actions", label: "Create new project", icon: Plus, keywords: "add project", run: onNewProject },
    { id: "action-sidebar", group: "Actions", label: "Toggle sidebar", icon: PanelLeft, keywords: "collapse expand navigation", run: onToggleSidebar },
    ...themes.map(t => ({
      id: `theme-${t.id}`, group: "Theme", label: `${t.label} theme`, icon: Palette, keywords: `appearance colour color ${t.mode}`,
      hint: t.id === theme ? "Active" : t.description, run: () => setTheme(t.id)
    }))
  ], [go, packs, openPack, projects, project, selectProject, onNewProject, onToggleSidebar, themes, theme, setTheme]);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groups = useMemo(() => groupCommands(results), [results]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = command => { onClose(); command.run(); };
  const onKeyDown = e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(results.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[active]) run(results[active]); }
  };
  const activeId = results[active] ? `cmdk-${results[active].id}` : undefined;

  return createPortal(
    <div className="cmdk">
      <div className="modal__backdrop" aria-hidden="true" onClick={onClose} />
      <div ref={panelRef} className="cmdk__panel" role="dialog" aria-modal="true" aria-label="Command menu">
        <div className="cmdk__search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmdk__input"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-label="Search commands"
            placeholder="Search pages, test packs, projects, themes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id="cmdk-list" ref={listRef} className="cmdk__list" role="listbox" aria-label="Results">
          {results.length === 0 && <li className="cmdk__empty" role="presentation">No results for “{query}”</li>}
          {groups.map(group => (
            <li key={group.name} role="presentation">
              <div className="cmdk__group" id={`cmdk-group-${group.name.replace(/\s+/g, "-")}`}>{group.name}</div>
              <ul role="group" className="cmdk__group-list" aria-labelledby={`cmdk-group-${group.name.replace(/\s+/g, "-")}`}>
                {group.items.map(({ command, index }) => {
                  const Icon = command.icon;
                  return (
                    <li
                      key={command.id}
                      id={`cmdk-${command.id}`}
                      role="option"
                      aria-selected={index === active}
                      data-index={index}
                      className="cmdk__item"
                      onMouseMove={() => index !== active && setActive(index)}
                      onClick={() => run(command)}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span className="cmdk__label">{command.label}</span>
                      {command.hint && <span className="cmdk__hint">{command.hint}</span>}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        <div className="cmdk__footer" aria-hidden="true">
          <span><Kbd>↑</Kbd><Kbd>↓</Kbd> Navigate</span>
          <span><Kbd>Enter</Kbd> Open</span>
          <span><Kbd>Esc</Kbd> Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
