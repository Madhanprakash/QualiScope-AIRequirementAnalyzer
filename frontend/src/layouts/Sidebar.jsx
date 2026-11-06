import React, { useRef } from "react";
import { Activity, Lightbulb, X } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { NAV, NAV_SECTIONS, navItem } from "../utils/navigation";
import { ProjectSwitcher } from "../components/ProjectSwitcher";
import { IconButton, useFocusTrap } from "../components/ui";

function NavLink({ item, active, badge, badgeLabel, onNavigate }) {
  const Icon = item.icon;
  return (
    <a
      href={`#/${item.id}`}
      className="nav-link"
      aria-current={active ? "page" : undefined}
      data-tooltip={item.label}
      onClick={onNavigate}
    >
      <Icon size={18} aria-hidden="true" />
      <span className="nav-link__label">{item.label}</span>
      {badge ? (
        <>
          <span className="nav-link__badge" aria-hidden="true">{badge}</span>
          <span className="sr-only">({badgeLabel})</span>
        </>
      ) : null}
    </a>
  );
}

/**
 * App navigation. On desktop it is a sticky column (optionally collapsed to an
 * icon rail); below 1024px it is an off-canvas drawer controlled by `open`.
 */
export default function Sidebar({ route, open, onClose, onNavigate, onNewProject, onEditProject }) {
  const { pack } = useApp();
  const asideRef = useRef(null);
  useFocusTrap(asideRef, open, { onEscape: onClose });

  const badges = {
    testpack: pack?.test_case_count ? { n: pack.test_case_count, label: `${pack.test_case_count} test cases` } : null,
    risks: pack?.risk_count ? { n: pack.risk_count, label: `${pack.risk_count} risks` } : null
  };

  return (
    <aside ref={asideRef} id="app-sidebar" className="sidebar" aria-label="Sidebar">
      <div className="sidebar__header">
        <a className="brand" href="#/dashboard" aria-label="QualiScope dashboard" onClick={onNavigate}>
          <span className="brand__mark"><Activity size={18} aria-hidden="true" /></span>
          <span className="brand__text">
            <span className="brand__name">QualiScope</span>
            <span className="brand__tag">Quality intelligence</span>
          </span>
        </a>
        <IconButton className="sidebar__close" icon={X} label="Close navigation" onClick={onClose} />
      </div>

      <div className="sidebar__body">
        <ProjectSwitcher onNew={onNewProject} onEdit={onEditProject} />
        <nav aria-label="Main" className="stack">
          {NAV_SECTIONS.map(section => (
            <div key={section} className="nav-section">
              <div className="nav-section__label">{section}</div>
              {NAV.filter(n => n.section === section).map(item => (
                <NavLink
                  key={item.id}
                  item={item}
                  active={route === item.id}
                  badge={badges[item.id]?.n}
                  badgeLabel={badges[item.id]?.label}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="sidebar__footer">
        <div className="tip-card">
          <div className="tip-card__title"><Lightbulb size={15} aria-hidden="true" />Quality starts with clarity</div>
          <p className="tip-card__body">Review open questions before accepting generated test coverage.</p>
        </div>
        <NavLink item={navItem("settings")} active={route === "settings"} onNavigate={onNavigate} />
      </div>
    </aside>
  );
}
