import React, { useEffect, useState } from "react";
import { KeyRound, Palette, RefreshCw, Server, Settings } from "lucide-react";
import { API_URL, KEY_STORAGE, api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { ThemeOptions } from "../components/ThemePicker";
import { Alert, Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Skeleton } from "../components/ui";
import "./SettingsPage.css";

/** Rows shown as placeholders until the first health check answers. */
const PENDING_ROWS = ["Status", "AI model", "Authentication"];

export default function SettingsPage() {
  const { notify, refreshPacks } = useApp();
  const [key, setKey] = useState(() => { try { return localStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; } });
  const [health, setHealth] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState(true);

  const check = async () => {
    setErr("");
    setChecking(true);
    try { setHealth(await api.health()); setMe(await api.me()); } catch (e) { setHealth(null); setMe(null); setErr(errorMessage(e)); }
    finally { setChecking(false); }
  };
  useEffect(() => { check(); }, []);

  function save() {
    try { key ? localStorage.setItem(KEY_STORAGE, key) : localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
    notify("API key saved in this browser."); check(); refreshPacks();
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><Settings size={14} aria-hidden="true" /> Settings</>}
        title="Workspace settings"
        description="Connection, access and appearance for this browser."
      />

      <div className="settings__sections stack-lg">
        <Card className="settings__section">
          <CardHeader icon={Palette} title="Appearance" description="Choose a theme. Your choice is saved in this browser." />
          <div className="settings__themes">
            <ThemeOptions />
          </div>
        </Card>

        <Card className="settings__section">
          <CardHeader icon={Server} title="Backend connection" description="Where this browser sends requests, and what the server reports." />
          <div className="stack">
            <dl className="dl settings__dl" aria-busy={checking || undefined}>
              <dt>API URL</dt>
              <dd>
                <code>{API_URL}</code>
                <p className="settings__note text-xs muted">Set <code>VITE_API_URL</code> to change it.</p>
              </dd>
              {health ? (
                <>
                  <dt>Status</dt>
                  <dd>
                    {health.status === "ok"
                      ? <Badge tone="success" dot>Connected</Badge>
                      : <Badge tone="warning" dot>{health.status}</Badge>}
                  </dd>
                  <dt>AI model</dt>
                  <dd className="row wrap">
                    {health.ai_configured ? (
                      <><Badge tone="success" dot>Configured</Badge><span className="mono text-xs">{health.model}</span></>
                    ) : (
                      <><Badge tone="danger" dot>Not configured</Badge><span className="muted">Set <code>ANTHROPIC_API_KEY</code> on the server.</span></>
                    )}
                  </dd>
                  <dt>Authentication</dt>
                  <dd className="row wrap">
                    {health.auth_enabled ? (
                      <Badge tone="success" dot>Enabled</Badge>
                    ) : (
                      <><Badge tone="warning" dot>Disabled</Badge><span className="muted">Development mode</span></>
                    )}
                  </dd>
                  {me && (
                    <>
                      <dt>Signed in as</dt>
                      <dd className="row wrap">
                        <Avatar name={me.name || ""} size="sm" />
                        <span>{me.name}</span>
                        <Badge className="settings__role">{me.role}</Badge>
                      </dd>
                    </>
                  )}
                </>
              ) : checking && PENDING_ROWS.map(label => (
                <React.Fragment key={label}>
                  <dt>{label}</dt>
                  <dd><Skeleton className="settings__skeleton" width={128} height={22} radius="var(--radius-full)" /></dd>
                </React.Fragment>
              ))}
            </dl>
            {err && <Alert tone="danger" role="alert" title="Connection check failed">{err}</Alert>}
            <div>
              <Button icon={RefreshCw} loading={checking} onClick={check}>Re-check connection</Button>
            </div>
          </div>
        </Card>

        <Card className="settings__section">
          <CardHeader icon={KeyRound} title="Access key" description={<>Sent as the <code>X-API-Key</code> header with every request.</>} />
          <div className="stack">
            <Field label="API key" hint="Required only when the server has API_KEYS configured. Stored in this browser only.">
              <Input id="apikey" className="settings__key" type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" placeholder="Paste your API key" />
            </Field>
            <div>
              <Button variant="primary" onClick={save}>Save key</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
