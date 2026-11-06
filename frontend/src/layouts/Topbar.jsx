import React, { useEffect, useRef, useState } from "react";
import { Command, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings } from "lucide-react";
import { api } from "../services/api";
import { useApp } from "../hooks/useApp";
import { navItem } from "../utils/navigation";
import { ThemeMenu } from "../components/ThemePicker";
import { Avatar, IconButton, Kbd, MenuItem, MenuSeparator, Popover, cx, useDismiss } from "../components/ui";

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");

function UserMenu({ go, onOpenPalette }) {
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  useDismiss(wrapRef, open, () => setOpen(false), triggerRef);
  useEffect(() => { api.me().then(setMe).catch(() => setMe(null)); }, []);

  const name = me?.name || "QA user";
  return (
    <div className="popover-anchor" ref={wrapRef}>
      <button ref={triggerRef} type="button" className="user-button" aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Avatar name={name} size="sm" />
      </button>
      <Popover open={open} align="end" aria-label="Account">
        <div className="user-menu__header" role="presentation">
          <Avatar name={name} />
          <div>
            <div className="user-menu__name">{name}</div>
            <div className="user-menu__role">{me?.role || "Not signed in"}</div>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem icon={Settings} onClick={() => { setOpen(false); go("settings"); }}>Settings</MenuItem>
        <MenuItem icon={Command} onClick={() => { setOpen(false); onOpenPalette(); }}>Command menu</MenuItem>
      </Popover>
    </div>
  );
}

/** Sticky, translucent top bar: navigation toggles, breadcrumb, search, active pack, theme and account. */
export default function Topbar({ route, go, collapsed, onToggleCollapsed, navOpen, onOpenNav, onOpenPalette, menuButtonRef }) {
  const { pack, project } = useApp();
  const current = navItem(route);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <IconButton
          ref={menuButtonRef}
          className="menu-toggle"
          icon={Menu}
          label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          onClick={onOpenNav}
        />
        <IconButton
          className="collapse-toggle"
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          onClick={onToggleCollapsed}
        />
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <ol>
            <li className="breadcrumbs__project">{project ? project.name : "No project"}</li>
            <li aria-current="page">{current?.label}</li>
          </ol>
        </nav>
      </div>

      <div className="topbar__right">
        <button
          type="button"
          className="search-trigger"
          aria-label="Search and quick actions"
          aria-haspopup="dialog"
          aria-keyshortcuts={IS_MAC ? "Meta+K" : "Control+K"}
          onClick={onOpenPalette}
        >
          <Search size={15} aria-hidden="true" />
          <span className="search-trigger__label">Search or jump to…</span>
          <Kbd>{IS_MAC ? "⌘" : "Ctrl"} K</Kbd>
        </button>
        {pack && (
          <button type="button" className="pack-pill" onClick={() => go("testpack")} title="Open the active test pack">
            <span className={cx("pack-pill__dot", pack.status === "approved" && "pack-pill__dot--approved")} aria-hidden="true" />
            <span className="pack-pill__id">{pack.requirement_id || "Pack"}</span>
            <span>v{pack.version} · {pack.status.charAt(0).toUpperCase() + pack.status.slice(1)}</span>
          </button>
        )}
        <ThemeMenu />
        <UserMenu go={go} onOpenPalette={onOpenPalette} />
      </div>
    </header>
  );
}
