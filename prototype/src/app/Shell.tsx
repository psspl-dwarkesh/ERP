import * as RDialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  ArrowLeft,
  Bell,
  ChevronsUpDown,
  CircleHelp,
  CornerDownLeft,
  LockKeyhole,
  LogOut,
  Menu as MenuIcon,
  RotateCcw,
  Search,
  UsersRound,
  Settings,
  X,
} from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { API_MODE, api, resetDemo } from "../api/client";
import { DEMO_PEOPLE, canAccess, isFullDemoUser, signOut, switchAccount, useSession, viewAs } from "../api/session";
import * as fx from "../api/fixtures";
import { ago } from "../api/format";
import { useQuery } from "../api/hooks";
import type { ModuleKey } from "../api/types";
import { Avatar, Button, Dialog, IconButton, Kbd, Menu, Popover, Status, cx, useToast } from "../ds/components";
import { http } from "../api/http";
import { describe, onRemoteChange, useLiveUpdates, useOnline } from "../api/live";
import { invalidate } from "../api/store";
import { Logo, TENANT } from "./brand";
import { DemoGuide } from "./DemoGuide";
import { MODULES, moduleDef } from "./modules";
import { href, navigate, useRoute } from "./router";

export function Shell() {
  const route = useRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const def = moduleDef(route.module);
  const Page = def.page;
  const user = useSession().user;
  const toast = useToast();
  useLiveUpdates(user?.id ?? null);
  // Someone else changed shared data: screens already refetched; say who, quietly.
  useEffect(
    () =>
      onRemoteChange((c) =>
        toast({ title: `${c.actor} ${describe(c.command)}`, body: "Your screen is up to date.", tone: "info" }),
      ),
    [toast],
  );

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
            {canAccess(user, def.key) ? <Page key={def.key} /> : <AccessDenied module={def.label} role={user?.role ?? ""} />}
          </Suspense>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <DemoGuide />
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
  const online = useOnline();
  const user = useSession().user;
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
              <span className="workspace-detail">Engineering &amp; field service · Pune HQ</span>
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
              const locked = !canAccess(user, m.key);
              return (
                <a key={m.key} href={href.module(m.key)} className={cx("nav-item", isActive && "is-active")} aria-current={isActive ? "page" : undefined}>
                  <Icon size={17} aria-hidden />
                  <span>{m.label}</span>
                  {locked ? <LockKeyhole size={13} className="nav-lock" aria-label="No access" /> : counts[m.key] ? <span className="nav-count">{counts[m.key]}</span> : null}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        {API_MODE === "remote" && (
          <div className="sidebar-note">
            <span className="sidebar-note-dot is-live" aria-hidden />
            {`${Math.max(online, 1)} ${Math.max(online, 1) === 1 ? "person" : "people"} online · shared workspace`}
          </div>
        )}
        <p className="sidebar-credit">Threadline — a Prakash Software Solutions product</p>
      </div>
    </div>
  );
}

function Topbar({ onMenu, onSearch, moduleLabel }: { onMenu: () => void; onSearch: () => void; moduleLabel: string }) {
  const toast = useToast();
  const me = api.currentUser();
  const session = useSession().user;
  const [switching, setSwitching] = useState(false);
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
            <p className="help-note">
              {API_MODE === "remote"
                ? "Records are shared with everyone signed in to this workspace, and your role decides what you can open and change."
                : "Approvals, stock issues and edits are saved only in this browser."}
            </p>
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
            { heading: `${me.email} · ${session?.role ?? me.role}` },
            { label: API_MODE === "mock" ? "View as another role…" : "Switch role…", icon: UsersRound, detail: "See the workspace as another person sees it", onSelect: () => setSwitching(true) },
            { label: "Preferences", icon: Settings, detail: "Coming soon", disabled: true, onSelect: () => {} },
            ...(API_MODE === "mock"
              ? [
                  {
                    label: "Reset workspace data",
                    icon: RotateCcw,
                    detail: "Restore every record to its starting state",
                    onSelect: () => {
                      resetDemo();
                      toast({ title: "Workspace data restored", body: "All records are back to their starting state." });
                    },
                  },
                  { separator: true as const },
                  { label: "Leave workspace", icon: LogOut, onSelect: () => navigate("/") },
                ]
              : [
                  ...(canAccess(session, "users", "admin")
                    ? [
                        {
                          label: "Reset workspace data",
                          icon: RotateCcw,
                          detail: "Restore the starting records for everyone",
                          onSelect: async () => {
                            try {
                              await http.post("/admin/reset-demo", {});
                              invalidate();
                              toast({ title: "Workspace data restored", body: "Every user now sees the starting records." });
                            } catch (e) {
                              toast({ title: "Reset refused", body: e instanceof Error ? e.message : String(e), tone: "risk" });
                            }
                          },
                        },
                      ]
                    : []),
                  { separator: true as const },
                  {
                    label: "Sign out",
                    icon: LogOut,
                    onSelect: async () => {
                      await signOut();
                      navigate("/login", { replace: true });
                    },
                  },
                ]),
          ]}
        />
      </div>
      <SwitchUserDialog open={switching} onOpenChange={setSwitching} />
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

function AccessDenied({ module, role }: { module: string; role: string }) {
  return (
    <div className="denied" role="alert">
      <span className="denied-icon">
        <LockKeyhole size={24} aria-hidden />
      </span>
      <h1 className="denied-title">{module} isn't part of your role</h1>
      <p className="denied-body">
        Your role ({role}) has no access to {module}. Access is granted per role by the system administrator in Users & Access, and every change to it is audited.
      </p>
      <Button onClick={() => navigate("/app/dashboard")}>Back to your dashboard</Button>
    </div>
  );
}

const DEMO_PASSWORD = "Threadline@2026";

/** Client demos: show the same workspace through another role's eyes in one click. */
function SwitchUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const me = useSession().user;
  const [busy, setBusy] = useState<string | null>(null);
  const roleOf = (id: string) => fx.roles.find((r) => r.id === id);
  const reach = (roleId: string) => Object.values(roleOf(roleId)?.permissions ?? {}).filter((l) => l && l !== "none").length;

  const pick = async (p: (typeof DEMO_PEOPLE)[number] | null) => {
    setBusy(p?.id ?? "full");
    try {
      if (API_MODE === "mock") viewAs(p?.id ?? null);
      else if (p) await switchAccount(p.email, DEMO_PASSWORD);
      onOpenChange(false);
      navigate("/app/dashboard");
      toast({ title: p ? `Now viewing as ${p.name}` : "Full access", body: p ? `${roleOf(p.roleId)?.name} · only what this role may see and do.` : "Every module, every action." });
    } catch (e) {
      toast({ title: "Couldn't switch", body: e instanceof Error ? e.message : String(e), tone: "risk" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={UsersRound}
      title={API_MODE === "mock" ? "View the workspace as…" : "Switch role"}
      description={API_MODE === "mock" ? "Permissions, navigation and approvals follow the role you pick. Data stays the same." : "Signs you in as that role. Each role sees only what it is allowed to."}
    >
      <ul className="switch-list">
        {API_MODE === "mock" && (
          <li>
            <button className={cx("switch-item", isFullDemoUser(me) && "is-on")} onClick={() => pick(null)} disabled={!!busy}>
              <Avatar name="Access" size="sm" />
              <span className="switch-text">
                <b>Full access</b>
                <small>Every module · for walkthroughs</small>
              </span>
              {isFullDemoUser(me) && <Status tone="accent">Current</Status>}
            </button>
          </li>
        )}
        {DEMO_PEOPLE.map((p) => {
          const current = me?.id === p.id && !isFullDemoUser(me);
          return (
            <li key={p.id}>
              <button className={cx("switch-item", current && "is-on")} onClick={() => pick(p)} disabled={!!busy || current}>
                <Avatar name={p.name} size="sm" />
                <span className="switch-text">
                  <b>{p.name}</b>
                  <small>
                    {roleOf(p.roleId)?.name} · {reach(p.roleId)} modules
                  </small>
                </span>
                {current ? <Status tone="accent">Current</Status> : busy === p.id ? <Status tone="info">Switching…</Status> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
