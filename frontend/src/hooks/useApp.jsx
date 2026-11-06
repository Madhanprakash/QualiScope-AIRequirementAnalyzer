import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../services/api";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const PACK_KEY = "qs_pack_id";
const safeGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* ignore */ } };

export function AppProvider({ children }) {
  const [pack, setPackState] = useState(null);
  const [packs, setPacks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const notify = useCallback((message, kind = "ok") => {
    setToast({ message, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const setPack = useCallback(p => { setPackState(p); safeSet(PACK_KEY, p?.id || ""); }, []);

  const refreshPacks = useCallback(async () => {
    try { setPacks(await api.listPacks()); } catch { /* shown on pages that need it */ }
  }, []);

  const openPack = useCallback(async id => {
    try { setPack(await api.getPack(id)); } catch (e) { notify(errorMessage(e), "error"); setPack(null); }
  }, [notify, setPack]);

  useEffect(() => {
    refreshPacks();
    const id = safeGet(PACK_KEY);
    if (id) openPack(id);
  }, [refreshPacks, openPack]);

  /** Run an API call that returns an updated pack. */
  const mutate = useCallback(async (fn, successMsg) => {
    setBusy(true);
    try {
      const updated = await fn();
      if (updated?.data) setPack(updated);
      refreshPacks();
      if (successMsg) notify(successMsg);
      return updated;
    } catch (e) {
      notify(errorMessage(e), "error");
      return null;
    } finally { setBusy(false); }
  }, [notify, refreshPacks, setPack]);

  return <Ctx.Provider value={{ pack, setPack, packs, refreshPacks, openPack, busy, setBusy, toast, notify, mutate }}>{children}</Ctx.Provider>;
}
