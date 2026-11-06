import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../hooks/useApp";
import { navItem } from "../utils/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "../components/CommandPalette";
import { ProjectDialog } from "../components/ProjectSwitcher";
import { ToastViewport } from "../components/ui";

export { NAV } from "../utils/navigation";

const COLLAPSE_KEY = "qs_sidebar_collapsed";
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; } };

/** Application shell: sidebar, top bar, page content, command palette, project dialog and toasts. */
export default function AppLayout({ route, go, children }) {
  const { toast, dismissToast, projects, projectsLoaded } = useApp();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [projectDialog, setProjectDialog] = useState(null); // null | {} (new) | project (edit)
  const firstRunHandled = useRef(false);
  const menuButtonRef = useRef(null);
  const current = navItem(route);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch { /* storage unavailable */ }
      return !c;
    });
  }, []);
  const openNewProject = useCallback(() => setProjectDialog({}), []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => { document.title = current ? `${current.label} · QualiScope` : "QualiScope"; }, [current]);

  // On navigation: close the drawer, scroll to the top and move focus to the new page
  // so keyboard and screen-reader users start at its content (skipped on first load).
  const firstRoute = useRef(true);
  useEffect(() => {
    setNavOpen(false);
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0 });
    if (firstRoute.current) { firstRoute.current = false; return; }
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [route]);

  // First run: nothing exists yet, so ask for a project straight away.
  useEffect(() => {
    if (projectsLoaded && projects.length === 0 && !firstRunHandled.current) {
      firstRunHandled.current = true;
      setProjectDialog({});
    }
  }, [projectsLoaded, projects.length]);

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app" data-collapsed={collapsed ? "true" : "false"} data-nav-open={navOpen ? "true" : "false"}>
      <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById("main-content")?.focus(); }}>
        Skip to content
      </a>

      <Sidebar
        route={route}
        open={navOpen}
        onClose={closeNav}
        onNavigate={() => setNavOpen(false)}
        onNewProject={openNewProject}
        onEditProject={setProjectDialog}
      />
      {navOpen && <div className="sidebar-scrim" aria-hidden="true" onClick={closeNav} />}

      <div className="main">
        <Topbar
          route={route}
          go={go}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          navOpen={navOpen}
          onOpenNav={() => setNavOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          menuButtonRef={menuButtonRef}
        />
        <main id="main-content" key={route} className="content" tabIndex={-1}>
          {children}
          <footer className="app-footer">
            <span>QualiScope · AI Requirement Analyzer</span>
            <span>AI-generated drafts require BA/PO and QA validation</span>
          </footer>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        go={go}
        onNewProject={openNewProject}
        onToggleSidebar={toggleCollapsed}
      />
      {projectDialog && <ProjectDialog initial={projectDialog.id ? projectDialog : null} onClose={() => setProjectDialog(null)} />}
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
