import * as RDialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  ArrowLeft,
  Bell,
  ChevronsUpDown,
  CircleHelp,
  CornerDownLeft,
  LogOut,
  Menu as MenuIcon,
  RotateCcw,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { api, resetDemo } from "../api/client";
import { ago } from "../api/format";
import { useQuery } from "../api/hooks";
import type { ModuleKey } from "../api/types";
import { Avatar, Button, IconButton, Kbd, Menu, Popover, cx, useToast } from "../ds/components";
import { Logo, TENANT } from "./brand";
import { MODULES, moduleDef } from "./modules";
import { href, navigate, useRoute } from "./router";

export function Shell() {
  const route = useRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const def = moduleDef(route.module);
  const Page = def.page;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setNavOpen(false), [route.module, route.recordId]);
  useEffect(() => {
    document.title = `${def.label} · Threadline`;
  }, [def.label]);

  return (
    <div className="shell">
      <aside className={cx("sidebar", navOpen && "is-open")} aria-label="Modules">
        <Sidebar active={route.module} onClose={() => setNavOpen(false)} />
      </aside>
      {navOpen && <div className="sidebar-scrim" onClick={() => setNavOpen(false)} aria-hidden />}
      <div className="shell-main">
        <Topbar onMenu={() => setNavOpen(true)} onSearch={() => setPaletteOpen(true)} moduleLabel={def.label} />
        <main className="content" id="main">
          <Suspense fallback={<PageLoading />}>
            <Page key={def.key} />
          </Suspense>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function PageLoading() {
  return (
    <div className="page-loading" aria-busy="true" aria-label="Loading module">
      <span className="pl-crumb" />
      <span className="pl-title" />
      <span className="pl-desc" />
      <div className="pl-grid">
        <span />
        <span />
        <span />
        <span />
      </div>
      <span className="pl-block" />
    </div>
  );
}

function Sidebar({ active, onClose }: { active: ModuleKey; onClose: () => void }) {
  const { data: approvals } = useQuery(api.approvals);
  const { data: tickets } = useQuery(api.tickets);
  const counts: Partial<Record<ModuleKey, number>> = {
    dashboard: approvals?.filter((a) => a.status === "Pending").length,
    assets: tickets?.filter((t) => t.status !== "Resolved" && t.status !== "Closed").length,
  };
  const groups = [...new Set(MODULES.map((m) => m.group))];
  return (
    <div className="sidebar-inner">
      <div className="sidebar-top">
        <a href="#/" className="sidebar-brand" aria-label="Threadline — product tour">
          <Logo inverse />
        </a>
        <button className="sidebar-close icon-btn icon-btn-inverse icon-btn-sm" aria-label="Close menu" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <Menu
        align="start"
        trigger={
          <button className="workspace-switch">
            <span className="workspace-badge">ABC</span>
            <span className="workspace-text">
              <span className="workspace-name">{TENANT}</span>
              <span className="workspace-detail">Demo workspace · Pune HQ</span>
            </span>
            <ChevronsUpDown size={14} aria-hidden />
          </button>
        }
        items={[
          { heading: "Workspaces" },
          { label: TENANT, detail: "Single legal entity · 7 verticals", onSelect: () => {} },
          { separator: true },
          { label: "Back to product tour", icon: ArrowLeft, onSelect: () => navigate("/") },
        ]}
      />
      <nav className="nav">
        {groups.map((g) => (
          <div key={g} className="nav-group">
            <div className="nav-group-label">{g}</div>
            {MODULES.filter((m) => m.group === g).map((m) => {
              const Icon = m.icon;
              const isActive = active === m.key;
              return (
                <a key={m.key} href={href.module(m.key)} className={cx("nav-item", isActive && "is-active")} aria-current={isActive ? "page" : undefined}>
                  <Icon size={17} aria-hidden />
                  <span>{m.label}</span>
                  {counts[m.key] ? <span className="nav-count">{counts[m.key]}</span> : null}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-note">
          <span className="sidebar-note-dot" aria-hidden />
          Demo data · changes stay in this browser
        </div>
      </div>
    </div>
  );
}

function Topbar({ onMenu, onSearch, moduleLabel }: { onMenu: () => void; onSearch: () => void; moduleLabel: string }) {
  const toast = useToast();
  const me = api.currentUser();
  return (
    <header className="topbar">
      <button className="icon-btn icon-btn-ghost topbar-menu" aria-label="Open menu" onClick={onMenu}>
        <MenuIcon size={18} />
      </button>
      <span className="topbar-module">{moduleLabel}</span>
      <button className="topbar-search" onClick={onSearch}>
        <Search size={16} aria-hidden />
        <span>Search records, people, actions…</span>
        <span className="topbar-search-keys">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="topbar-actions">
        <Notifications />
        <Popover
          width={320}
          trigger={
            <span>
              <IconButton icon={CircleHelp} label="Help & shortcuts" />
            </span>
          }
        >
          <div className="help-panel">
            <p className="help-title">Shortcuts</p>
            <dl className="help-keys">
              <div><dt>Search anything</dt><dd><Kbd>Ctrl</Kbd><Kbd>K</Kbd></dd></div>
              <div><dt>Close panel or dialog</dt><dd><Kbd>Esc</Kbd></dd></div>
              <div><dt>Open focused row</dt><dd><Kbd>Enter</Kbd></dd></div>
            </dl>
            <p className="help-note">This is a demonstration workspace with illustrative records. Approvals, stock issues and edits are simulated and saved only in this browser.</p>
          </div>
        </Popover>
        <Menu
          trigger={
            <button className="user-chip" aria-label="Account menu">
              <Avatar name={me.name} size="sm" />
              <span className="user-chip-text">
                <span className="user-chip-name">{me.name}</span>
                <span className="user-chip-role">{me.role}</span>
              </span>
            </button>
          }
          items={[
            { heading: me.email },
            { label: "Preferences", icon: Settings, onSelect: () => toast({ title: "Preferences", body: "Personal settings arrive with the backend phase.", tone: "info" }) },
            {
              label: "Reset demo data",
              icon: RotateCcw,
              detail: "Restore every record to its starting state",
              onSelect: () => {
                resetDemo();
                toast({ title: "Demo data restored", body: "All records are back to their starting state." });
              },
            },
            { separator: true },
            { label: "Leave workspace", icon: LogOut, onSelect: () => navigate("/") },
          ]}
        />
      </div>
    </header>
  );
}

function Notifications() {
  const { data } = useQuery(api.notifications);
  const unread = data?.filter((n) => !n.read).length ?? 0;
  return (
    <Popover
      width={380}
      trigger={
        <span>
          <IconButton icon={Bell} label="Notifications" badge={unread} />
        </span>
      }
    >
      <div className="notif-head">
        <p className="notif-title">Notifications</p>
        {unread > 0 && (
          <Button size="sm" variant="ghost" onClick={() => api.markNotificationsRead()}>
            Mark all read
          </Button>
        )}
      </div>
      <ul className="notif-list">
        {data?.map((n) => (
          <li key={n.id}>
            <a href={href.record(n.reference)} className={cx("notif-item", !n.read && "is-unread")}>
              <span className={cx("notif-dot", `tone-${n.tone}`)} aria-hidden />
              <span className="notif-body">
                <span className="notif-item-title">{n.title}</span>
                <span className="notif-item-text">{n.body}</span>
                <span className="notif-item-meta">
                  <span className="mono">{n.reference}</span> · {ago(n.at)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Popover>
  );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const { data: hits } = useQuery(() => api.search(q), [q]);
  const go = (to: string) => {
    onOpenChange(false);
    setQ("");
    navigate(to);
  };
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="overlay" />
        <RDialog.Content className="palette" aria-describedby={undefined}>
          <RDialog.Title className="sr-only">Search</RDialog.Title>
          <Command label="Search" shouldFilter={false} loop>
            <div className="palette-input">
              <Search size={18} aria-hidden />
              <Command.Input value={q} onValueChange={setQ} placeholder="Search PRJ-0264, a customer, an item, a person…" autoFocus />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="palette-list">
              {q && hits && hits.length === 0 && <Command.Empty className="palette-empty">No records match “{q}”.</Command.Empty>}
              {q && hits && hits.length > 0 && (
                <Command.Group heading="Records" className="palette-group">
                  {hits.map((h) => (
                    <Command.Item key={h.id} value={h.id} onSelect={() => go(href.record(h.id).slice(1))} className="palette-item">
                      <span className="palette-item-icon">{(() => { const I = moduleDef(h.module).icon; return <I size={16} aria-hidden />; })()}</span>
                      <span className="palette-item-text">
                        <span className="palette-item-title">
                          <span className="mono palette-id">{h.id}</span> {h.title}
                        </span>
                        <span className="palette-item-sub">{h.subtitle}</span>
                      </span>
                      <CornerDownLeft size={14} aria-hidden className="palette-enter" />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {!q && (
                <>
                  <Command.Group heading="Jump to" className="palette-group">
                    {[
                      ["PRJ-0264", "Process automation upgrade", "projects"],
                      ["SR-0148", "P1 breakdown — Northstar Pharma", "assets"],
                      ["WO-0187", "Line 03 panel work order", "inventory"],
                      ["RFQ-0041", "Compare 3 supplier quotes", "purchase"],
                    ].map(([id, t, m]) => (
                      <Command.Item key={id} value={id} onSelect={() => go(href.record(id).slice(1))} className="palette-item">
                        <span className="palette-item-icon">{(() => { const I = moduleDef(m as ModuleKey).icon; return <I size={16} aria-hidden />; })()}</span>
                        <span className="palette-item-text">
                          <span className="palette-item-title">
                            <span className="mono palette-id">{id}</span> {t}
                          </span>
                        </span>
                        <CornerDownLeft size={14} aria-hidden className="palette-enter" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Modules" className="palette-group">
                    {MODULES.map((m) => (
                      <Command.Item key={m.key} value={m.key} onSelect={() => go(href.module(m.key).slice(1))} className="palette-item">
                        <span className="palette-item-icon">
                          <m.icon size={16} aria-hidden />
                        </span>
                        <span className="palette-item-text">
                          <span className="palette-item-title">{m.label}</span>
                          <span className="palette-item-sub">{m.description}</span>
                        </span>
                        <CornerDownLeft size={14} aria-hidden className="palette-enter" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function ModuleFrame({ children }: { children: ReactNode }) {
  return <div className="module">{children}</div>;
}
