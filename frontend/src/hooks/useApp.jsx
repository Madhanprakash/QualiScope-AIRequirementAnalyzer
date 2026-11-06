import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../services/api";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const PACK_KEY = "qs_pack_id";
const PROJECT_KEY = "qs_project_id";
const safeGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* ignore */ } };

export function AppProvider({ children }) {
  const [pack, setPackState] = useState(null);
  const [packs, setPacks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(() => safeGet(PROJECT_KEY) || "");
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const toastSeq = useRef(0);

  const notify = useCallback((message, kind = "ok") => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), kind === "error" ? 6000 : 3800);
  }, []);

  const dismissToast = useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);

  const setPack = useCallback(p => { setPackState(p); safeSet(PACK_KEY, p?.id || ""); }, []);

  const refreshPacks = useCallback(async () => {
    if (!projectId) { setPacks([]); return; }
    try { setPacks(await api.listPacks(projectId)); } catch { /* shown on pages that need it */ }
  }, [projectId]);

  const refreshProjects = useCallback(async () => {
    try {
      const list = await api.listProjects();
      setProjects(list);
      setProjectId(cur => {
        const next = list.some(p => p.id === cur) ? cur : (list[0]?.id || "");
        safeSet(PROJECT_KEY, next);
        return next;
      });
    } catch { /* API unreachable: pages show their own error */ }
    finally { setProjectsLoaded(true); }
  }, []);

  const selectProject = useCallback(id => {
    setProjectId(id); safeSet(PROJECT_KEY, id);
    setPackState(null); safeSet(PACK_KEY, "");
  }, []);

  const saveProject = useCallback(async (id, body) => {
    const saved = id ? await api.updateProject(id, body) : await api.createProject(body);
    await refreshProjects();
    if (!id) selectProject(saved.id);
    notify(id ? "Project updated." : `Project "${saved.name}" created.`);
    return saved;
  }, [notify, refreshProjects, selectProject]);

  const removeProject = useCallback(async (id, force) => {
    await api.deleteProject(id, force);
    if (id === projectId) { setPackState(null); safeSet(PACK_KEY, ""); }
    await refreshProjects();
    notify("Project deleted.");
  }, [notify, projectId, refreshProjects]);

  const openPack = useCallback(async id => {
    try { setPack(await api.getPack(id)); } catch (e) { notify(errorMessage(e), "error"); setPack(null); }
  }, [notify, setPack]);

  useEffect(() => { refreshProjects(); }, [refreshProjects]);

  useEffect(() => { refreshPacks(); }, [refreshPacks]);

  // Restore the last open pack once, and only if it belongs to the active project.
  // packLoading lets pages show a placeholder instead of "No test pack selected" meanwhile.
  const restored = useRef(false);
  const [packLoading, setPackLoading] = useState(() => Boolean(safeGet(PACK_KEY)));
  useEffect(() => {
    if (!projectsLoaded || restored.current) return;
    restored.current = true;
    const id = safeGet(PACK_KEY);
    if (!id) { setPackLoading(false); return; }
    api.getPack(id).then(p => {
      if (!p.project_id || p.project_id === projectId) setPack(p); else safeSet(PACK_KEY, "");
    }).catch(() => safeSet(PACK_KEY, "")).finally(() => setPackLoading(false));
  }, [projectsLoaded, projectId, setPack]);

  /** Run an API call that returns an updated pack. */
  const mutate = useCallback(async (fn, successMsg) => {
    setBusy(true);
    try {
      const updated = await fn();
      if (updated?.data) setPack(updated);
      refreshPacks(); refreshProjects();
      if (successMsg) notify(successMsg);
      return updated;
    } catch (e) {
      notify(errorMessage(e), "error");
      return null;
    } finally { setBusy(false); }
  }, [notify, refreshPacks, refreshProjects, setPack]);

  return <Ctx.Provider value={{ pack, setPack, packLoading, packs, refreshPacks, projects, project: projects.find(p => p.id === projectId) || null, projectId, projectsLoaded, selectProject, saveProject, removeProject, refreshProjects, openPack, busy, setBusy, toast, notify, dismissToast, mutate }}>{children}</Ctx.Provider>;
}
