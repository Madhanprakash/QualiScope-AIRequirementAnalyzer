import React, { useEffect, useState } from "react";
import { API_URL, KEY_STORAGE, api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { PageHeading } from "../components/common";

export default function SettingsPage() {
  const { notify, refreshPacks } = useApp();
  const [key, setKey] = useState(() => { try { return localStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; } });
  const [health, setHealth] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");

  const check = async () => {
    setErr("");
    try { setHealth(await api.health()); setMe(await api.me()); } catch (e) { setHealth(null); setMe(null); setErr(errorMessage(e)); }
  };
  useEffect(() => { check(); }, []);

  function save() {
    try { key ? localStorage.setItem(KEY_STORAGE, key) : localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
    notify("API key saved in this browser."); check(); refreshPacks();
  }

  return <>
    <PageHeading kicker="SETTINGS" title="Workspace" accent="settings" subtitle="Connection and access configuration." />
    <section className="panel pad">
      <h3>Backend connection</h3>
      <p className="muted">API URL: <code>{API_URL}</code> (set <code>VITE_API_URL</code> to change)</p>
      {err && <div className="error-banner" role="alert">{err}</div>}
      {health && <ul className="gaps"><li><b>Status:</b> {health.status}</li><li><b>AI configured:</b> {health.ai_configured ? `yes (${health.model})` : "no — set ANTHROPIC_API_KEY on the server"}</li><li><b>Authentication:</b> {health.auth_enabled ? "enabled" : "disabled (development)"}</li>{me && <li><b>Signed in as:</b> {me.name} ({me.role})</li>}</ul>}
      <button className="secondary-button" onClick={check}>Re-check connection</button>
    </section>
    <section className="panel pad">
      <h3>Access key</h3><p className="muted">Required only when the server has API_KEYS configured. Stored in this browser only.</p>
      <label className="fld" htmlFor="apikey"><span>API KEY</span><input id="apikey" type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" /></label>
      <button className="primary-button" onClick={save}>Save key</button>
    </section>
  </>;
}
