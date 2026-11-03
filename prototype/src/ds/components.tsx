/**
 * Threadline component library. Radix supplies behaviour (focus, keyboard, a11y);
 * every pixel of styling is ours, in components.css. Nothing renders a browser-stock control.
 */
import * as RCheckbox from "@radix-ui/react-checkbox";
import * as RDialog from "@radix-ui/react-dialog";
import * as RMenu from "@radix-ui/react-dropdown-menu";
import * as RPopover from "@radix-ui/react-popover";
import * as RRadio from "@radix-ui/react-radio-group";
import * as RSelect from "@radix-ui/react-select";
import * as RSwitch from "@radix-ui/react-switch";
import * as RTabs from "@radix-ui/react-tabs";
import * as RTooltip from "@radix-ui/react-tooltip";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  OctagonAlert,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import type { Tone } from "../api/types";
import { href } from "../app/router";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

/* ================================================================== Buttons */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "link";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, loading, block, className, children, disabled, ...rest },
  ref,
) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <button
      ref={ref}
      className={cx("btn", `btn-${variant}`, `btn-${size}`, block && "btn-block", loading && "is-loading", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 size={iconSize} className="spin" aria-hidden /> : Icon ? <Icon size={iconSize} aria-hidden /> : null}
      {children && <span>{children}</span>}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden />}
    </button>
  );
});

export function ButtonLink({
  to,
  variant = "secondary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  children,
  className,
  ...rest
}: { to: string; variant?: ButtonVariant; size?: ButtonSize; icon?: LucideIcon; iconRight?: LucideIcon; children?: ReactNode } & HTMLAttributes<HTMLAnchorElement>) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <a href={to} className={cx("btn", `btn-${variant}`, `btn-${size}`, className)} {...rest}>
      {Icon && <Icon size={iconSize} aria-hidden />}
      {children && <span>{children}</span>}
      {IconRight && <IconRight size={iconSize} aria-hidden />}
    </a>
  );
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  { icon: LucideIcon; label: string; variant?: "ghost" | "secondary" | "inverse"; size?: "sm" | "md"; badge?: number } & ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton({ icon: Icon, label, variant = "ghost", size = "md", badge, className, ...rest }, ref) {
  return (
    <Tooltip content={label}>
      <button ref={ref} aria-label={label} className={cx("icon-btn", `icon-btn-${variant}`, `icon-btn-${size}`, className)} {...rest}>
        <Icon size={size === "sm" ? 15 : 18} aria-hidden />
        {badge ? <span className="icon-btn-badge">{badge > 9 ? "9+" : badge}</span> : null}
      </button>
    </Tooltip>
  );
});

/* ================================================================== Status */
const TONE_BY_STATUS: Record<string, Tone> = {
  // positive
  "On track": "ok", Done: "ok", Approved: "ok", Available: "ok", Passed: "ok", Pass: "ok", Posted: "ok", Received: "ok", Active: "ok", "In service": "ok", Won: "ok", Accepted: "ok", Resolved: "ok", Closed: "neutral", Paid: "ok", Locked: "neutral", Delivered: "ok", Released: "ok", Full: "ok", Awarded: "ok",
  // attention
  "At risk": "risk", Late: "risk", Blocked: "risk", Rejected: "risk", "Out of stock": "risk", Overdue: "risk", Failed: "risk", P1: "risk", Mismatch: "risk", Lost: "risk", Expired: "risk", Deviation: "risk", "Under repair": "risk",
  "QC hold": "warn", "Low stock": "warn", "Awaiting approval": "warn", Pending: "warn", "Part received": "warn", "Calibration due": "warn", Due: "warn", Warning: "warn", "Renewal due": "warn", P2: "warn", "On hold": "warn", "In approval": "warn", "Pending review": "warn", "Notice period": "warn", Partial: "warn", "In transit": "info", "Ready for review": "warn", "Collecting inputs": "info",
  // in motion
  "In progress": "accent", "In review": "info", "In fulfilment": "accent", Assigned: "accent", "En route": "accent", "On site": "accent", Evaluating: "info", Issued: "info", Sent: "info", "Sent to accounting": "info", Scheduled: "info", Deployed: "accent", Negotiation: "accent", Proposal: "info", Qualified: "info", Planning: "neutral", Upcoming: "neutral", Waiting: "neutral", Draft: "neutral", New: "info", Lead: "neutral", Open: "info", Confirmed: "accent", Converted: "ok", "On leave": "neutral", Reserved: "info", P3: "neutral", P4: "neutral", "Not started": "neutral", Idle: "neutral", Retired: "neutral", Superseded: "neutral",
};

export function toneFor(status: string): Tone {
  return TONE_BY_STATUS[status] ?? "neutral";
}

export function Status({ children, tone, size = "md", dot = true }: { children: string; tone?: Tone; size?: "sm" | "md"; dot?: boolean }) {
  const t = tone ?? toneFor(children);
  return (
    <span className={cx("status", `tone-${t}`, `status-${size}`)}>
      {dot && <i aria-hidden />}
      {children}
    </span>
  );
}

export function Tag({ children, tone = "neutral", icon: Icon }: { children: ReactNode; tone?: Tone; icon?: LucideIcon }) {
  return (
    <span className={cx("tag", `tone-${tone}`)}>
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  );
}

/** A record id that always links to its record. */
export function RecordLink({ id, children, quiet }: { id: string; children?: ReactNode; quiet?: boolean }) {
  return (
    <a className={cx("record-link", quiet && "is-quiet")} href={href.record(id)} onClick={(e) => e.stopPropagation()}>
      <span className="mono">{id}</span>
      {children && <span className="record-link-label">{children}</span>}
    </a>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/* ================================================================== Avatar */
const AVATAR_TONES = ["teal", "slate", "amber", "violet", "green", "blue"];
export function Avatar({ name, size = "md" }: { name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className={cx("avatar", `avatar-${size}`, `avatar-${tone}`)} aria-hidden>
      {initials}
    </span>
  );
}

export function Person({ name, detail, size = "sm" }: { name: string; detail?: string; size?: "xs" | "sm" | "md" }) {
  return (
    <span className="person">
      <Avatar name={name} size={size} />
      <span className="person-text">
        <span className="person-name">{name}</span>
        {detail && <span className="person-detail">{detail}</span>}
      </span>
    </span>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  return (
    <span className="avatar-stack" aria-label={names.join(", ")}>
      {names.slice(0, max).map((n) => (
        <Avatar key={n} name={n} size="xs" />
      ))}
      {names.length > max && <span className="avatar avatar-xs avatar-more">+{names.length - max}</span>}
    </span>
  );
}

/* ================================================================== Surfaces */
export function Card({
  children,
  className,
  padded = true,
  interactive,
  tone,
  ...rest
}: { padded?: boolean; interactive?: boolean; tone?: "default" | "inverse" | "subtle" | "accent" } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("card", padded && "card-padded", interactive && "card-interactive", tone && `card-${tone}`, className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, icon: Icon, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: LucideIcon; eyebrow?: ReactNode }) {
  return (
    <div className="card-header">
      {Icon && (
        <span className="card-header-icon">
          <Icon size={16} aria-hidden />
        </span>
      )}
      <div className="card-header-text">
        {eyebrow && <div className="card-eyebrow">{eyebrow}</div>}
        <h3 className="card-title">{title}</h3>
        {description && <p className="card-description">{description}</p>}
      </div>
      {actions && <div className="card-header-actions">{actions}</div>}
    </div>
  );
}

export function Section({ title, description, actions, children, id }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <div>
          <h2 className="section-title">{title}</h2>
          {description && <p className="section-description">{description}</p>}
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  foot,
  delta,
  tone,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  delta?: { value: string; direction: "up" | "down"; good?: boolean };
  tone?: Tone;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={cx("stat", onClick && "stat-interactive", tone && `stat-tone-${tone}`)} onClick={onClick}>
      <div className="stat-label">
        {Icon && <Icon size={14} aria-hidden />}
        {label}
      </div>
      <div className="stat-value t-num">{value}</div>
      {(foot || delta) && (
        <div className="stat-foot">
          {delta && (
            <span className={cx("stat-delta", delta.good === false ? "is-bad" : delta.good ? "is-good" : "")}>
              {delta.direction === "up" ? "▲" : "▼"} {delta.value}
            </span>
          )}
          {foot}
        </div>
      )}
    </Tag>
  );
}

export function Progress({ value, tone = "accent", size = "md", label }: { value: number; tone?: Tone; size?: "sm" | "md"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cx("progress", `progress-${size}`, `tone-${tone}`)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

/** Stacked segments for quantity breakdowns (available / reserved / hold / on order). */
export function Meter({ segments, total }: { segments: { value: number; tone: Tone; label: string }[]; total?: number }) {
  const sum = total ?? segments.reduce((a, s) => a + s.value, 0);
  return (
    <div className="meter" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
      {segments.map((s) =>
        s.value > 0 ? <span key={s.label} className={`tone-${s.tone}`} style={{ width: `${(s.value / Math.max(sum, 1)) * 100}%` }} /> : null,
      )}
    </div>
  );
}

export function KeyValues({ items, columns = 1 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cx("kv", `kv-cols-${columns}`)}>
      {items.map((i) => (
        <div key={i.label} className="kv-row">
          <dt>{i.label}</dt>
          <dd>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ icon: Icon = Search, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={20} aria-hidden />
      </span>
      <p className="empty-title">{title}</p>
      {children && <p className="empty-body">{children}</p>}
      {action}
    </div>
  );
}

export function Callout({ tone = "info", title, children, action, icon }: { tone?: Tone; title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  const Icon = icon ?? (tone === "risk" ? OctagonAlert : tone === "warn" ? AlertTriangle : tone === "ok" ? CheckCircle2 : Info);
  return (
    <div className={cx("callout", `tone-${tone}`)} role={tone === "risk" ? "alert" : undefined}>
      <Icon size={18} aria-hidden className="callout-icon" />
      <div className="callout-body">
        <p className="callout-title">{title}</p>
        {children && <div className="callout-text">{children}</div>}
      </div>
      {action && <div className="callout-action">{action}</div>}
    </div>
  );
}

/** Placeholder lines shaped like the content that will arrive. */
export function LoadingRows({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="loading-rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="loading-row">
          {Array.from({ length: columns }).map((__, c) => (
            <span key={c} style={{ width: `${c === 0 ? 34 : 14 + ((r + c) % 3) * 6}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ================================================================== Page chrome */
export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  meta,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  meta?: ReactNode;
  id?: string;
}) {
  return (
    <header className="page-header">
      {crumbs && (
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.label}>
              {c.to ? <a href={c.to}>{c.label}</a> : <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>}
              {i < crumbs.length - 1 && <span className="crumb-sep">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="page-header-row">
        <div className="page-header-text">
          {id && <div className="page-id mono">{id}</div>}
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description">{description}</p>}
          {meta && <div className="page-meta">{meta}</div>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}

/* ================================================================== Tabs */
export function Tabs({
  value,
  onChange,
  items,
  children,
  variant = "underline",
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; count?: number; icon?: LucideIcon }[];
  children?: ReactNode;
  variant?: "underline" | "pill";
}) {
  return (
    <RTabs.Root value={value} onValueChange={onChange} className="tabs-root">
      <RTabs.List className={cx("tabs", `tabs-${variant}`)} aria-label="Views">
        {items.map(({ value: v, label, count, icon: Icon }) => (
          <RTabs.Trigger key={v} value={v} className="tab">
            {Icon && <Icon size={15} aria-hidden />}
            {label}
            {count !== undefined && <span className="tab-count">{count}</span>}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon }[]; label: string; size?: "sm" | "md" }) {
  return (
    <RRadio.Root className={cx("segmented", `segmented-${size}`)} value={value} onValueChange={(v) => onChange(v as T)} aria-label={label} orientation="horizontal">
      {options.map(({ value: v, label: l, icon: Icon }) => (
        <RRadio.Item key={v} value={v} className="segment">
          {Icon && <Icon size={14} aria-hidden />}
          {l}
        </RRadio.Item>
      ))}
    </RRadio.Root>
  );
}

/* ================================================================== Forms */
export function Field({ label, hint, error, children, htmlFor, required, optional }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; required?: boolean; optional?: boolean }) {
  return (
    <div className={cx("field", error && "has-error")}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="field-required" aria-hidden> *</span>}
        {optional && <span className="field-optional"> Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          <OctagonAlert size={13} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon; suffix?: ReactNode; invalid?: boolean }>(function Input(
  { icon: Icon, suffix, invalid, className, ...rest },
  ref,
) {
  return (
    <span className={cx("input", invalid && "is-invalid", className)}>
      {Icon && <Icon size={16} aria-hidden className="input-icon" />}
      <input ref={ref} aria-invalid={invalid || undefined} {...rest} />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </span>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} className={cx("textarea", invalid && "is-invalid", className)} aria-invalid={invalid || undefined} {...rest} />;
});

export function SearchField({ value, onChange, placeholder = "Search", label = "Search", width }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; width?: number }) {
  return (
    <span className="input search-field" style={width ? { width } : undefined}>
      <Search size={16} aria-hidden className="input-icon" />
      <input type="search" value={value} placeholder={placeholder} aria-label={label} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="input-clear" aria-label="Clear search" onClick={() => onChange("")}>
          <X size={14} />
        </button>
      )}
    </span>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder = "Select",
  icon: Icon,
  size = "md",
  id,
  invalid,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string; detail?: string }[];
  label: string;
  placeholder?: string;
  icon?: LucideIcon;
  size?: "sm" | "md";
  id?: string;
  invalid?: boolean;
}) {
  return (
    <RSelect.Root value={value || undefined} onValueChange={(v) => onChange(v as T)}>
      <RSelect.Trigger id={id} className={cx("select-trigger", `select-${size}`, invalid && "is-invalid")} aria-label={label}>
        {Icon && <Icon size={15} aria-hidden className="select-lead" />}
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon className="select-chevron">
          <ChevronDown size={15} aria-hidden />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content className="popover select-content" position="popper" sideOffset={6} align="start">
          <RSelect.Viewport className="select-viewport">
            {options.map((o) => (
              <RSelect.Item key={o.value} value={o.value} className="menu-item select-item">
                <span className="select-item-text">
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                  {o.detail && <span className="menu-item-detail">{o.detail}</span>}
                </span>
                <RSelect.ItemIndicator className="select-check">
                  <Check size={15} aria-hidden />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

export function Checkbox({ checked, onChange, label, description, id }: { checked: boolean | "indeterminate"; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; id?: string }) {
  const auto = useId();
  const cid = id ?? auto;
  const box = (
    <RCheckbox.Root id={cid} className="checkbox" checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label={typeof label === "string" ? undefined : "Select"}>
      <RCheckbox.Indicator className="checkbox-indicator">
        {checked === "indeterminate" ? <span className="checkbox-dash" /> : <Check size={12} strokeWidth={3} aria-hidden />}
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
  if (!label) return box;
  return (
    <div className="check-row">
      {box}
      <label htmlFor={cid} className="check-label">
        <span>{label}</span>
        {description && <span className="check-description">{description}</span>}
      </label>
    </div>
  );
}

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <div className="switch-row">
      <RSwitch.Root id={sid} className="switch" checked={checked} onCheckedChange={onChange}>
        <RSwitch.Thumb className="switch-thumb" />
      </RSwitch.Root>
      <label htmlFor={sid}>{label}</label>
    </div>
  );
}

export function RadioCards<T extends string>({ value, onChange, options, label, columns = 3 }: { value: T | ""; onChange: (v: T) => void; options: { value: T; title: ReactNode; detail?: ReactNode; aside?: ReactNode }[]; label: string; columns?: number }) {
  return (
    <RRadio.Root className="radio-cards" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${columns > 2 ? 200 : 260}px, 1fr))` }} value={value || undefined} onValueChange={(v) => onChange(v as T)} aria-label={label}>
      {options.map((o) => (
        <RRadio.Item key={o.value} value={o.value} className="radio-card">
          <span className="radio-card-dot" aria-hidden />
          <span className="radio-card-body">
            <span className="radio-card-title">{o.title}</span>
            {o.detail && <span className="radio-card-detail">{o.detail}</span>}
          </span>
          {o.aside && <span className="radio-card-aside">{o.aside}</span>}
        </RRadio.Item>
      ))}
    </RRadio.Root>
  );
}

/* ================================================================== Overlays */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </RTooltip.Provider>
  );
}

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content side={side} sideOffset={6} className="tooltip">
          {content}
          <RTooltip.Arrow className="tooltip-arrow" width={10} height={5} />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

export function Popover({ trigger, children, align = "end", width = 360 }: { trigger: ReactNode; children: ReactNode; align?: "start" | "center" | "end"; width?: number }) {
  return (
    <RPopover.Root>
      <RPopover.Trigger asChild>{trigger}</RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content className="popover popover-panel" align={align} sideOffset={8} style={{ width }}>
          {children}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  icon: Icon,
  tone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="overlay" />
        <RDialog.Content className={cx("dialog", `dialog-${size}`)} aria-describedby={description ? undefined : undefined}>
          <div className="dialog-header">
            {Icon && (
              <span className={cx("dialog-icon", tone && `tone-${tone}`)}>
                <Icon size={18} aria-hidden />
              </span>
            )}
            <div className="dialog-heading">
              <RDialog.Title className="dialog-title">{title}</RDialog.Title>
              {description ? <RDialog.Description className="dialog-description">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</RDialog.Description>}
            </div>
            <RDialog.Close asChild>
              <button className="icon-btn icon-btn-ghost icon-btn-sm dialog-close" aria-label="Close">
                <X size={16} />
              </button>
            </RDialog.Close>
          </div>
          {children && <div className="dialog-body">{children}</div>}
          {footer && <div className="dialog-footer">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function Drawer({
  open,
  onOpenChange,
  title,
  subtitle,
  id,
  status,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  id?: string;
  status?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="overlay overlay-drawer" />
        <RDialog.Content className="drawer" style={{ width: `min(${width}px, 100vw)` }}>
          <div className="drawer-header">
            <div className="drawer-heading">
              {(id || status) && (
                <div className="drawer-meta">
                  {id && <span className="mono drawer-id">{id}</span>}
                  {status}
                </div>
              )}
              <RDialog.Title className="drawer-title">{title}</RDialog.Title>
              {subtitle ? <RDialog.Description className="drawer-subtitle">{subtitle}</RDialog.Description> : <RDialog.Description className="sr-only">Record details</RDialog.Description>}
            </div>
            <RDialog.Close asChild>
              <button className="icon-btn icon-btn-ghost icon-btn-md" aria-label="Close panel">
                <X size={18} />
              </button>
            </RDialog.Close>
          </div>
          <div className="drawer-body">{children}</div>
          {footer && <div className="drawer-footer">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export type MenuItem =
  | { label: string; icon?: LucideIcon; onSelect: () => void; tone?: "risk"; shortcut?: string; detail?: string; disabled?: boolean }
  | { separator: true }
  | { heading: string };

export function Menu({ trigger, items, align = "end" }: { trigger: ReactNode; items: MenuItem[]; align?: "start" | "end" }) {
  return (
    <RMenu.Root>
      <RMenu.Trigger asChild>{trigger}</RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content className="popover menu" align={align} sideOffset={6}>
          {items.map((item, i) => {
            if ("separator" in item) return <RMenu.Separator key={i} className="menu-separator" />;
            if ("heading" in item)
              return (
                <RMenu.Label key={i} className="menu-heading">
                  {item.heading}
                </RMenu.Label>
              );
            const Icon = item.icon;
            return (
              <RMenu.Item key={i} className={cx("menu-item", item.tone === "risk" && "is-risk")} onSelect={item.onSelect} disabled={item.disabled}>
                {Icon && <Icon size={15} aria-hidden className="menu-item-icon" />}
                <span className="menu-item-text">
                  {item.label}
                  {item.detail && <span className="menu-item-detail">{item.detail}</span>}
                </span>
                {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
              </RMenu.Item>
            );
          })}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}

/* ================================================================== Toasts */
type ToastItem = { id: number; title: string; body?: string; tone: Tone; action?: { label: string; onClick: () => void } };
const ToastCtx = createContext<(t: Omit<ToastItem, "id" | "tone"> & { tone?: Tone }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id" | "tone"> & { tone?: Tone }) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { tone: "ok", ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 5200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="region" aria-live="polite" aria-label="Notifications">
        {items.map((t) => {
          const Icon = t.tone === "risk" ? OctagonAlert : t.tone === "warn" ? AlertTriangle : t.tone === "ok" ? CheckCircle2 : Info;
          return (
            <div key={t.id} className={cx("toast", `tone-${t.tone}`)}>
              <Icon size={18} aria-hidden className="toast-icon" />
              <div className="toast-body">
                <p className="toast-title">{t.title}</p>
                {t.body && <p className="toast-text">{t.body}</p>}
              </div>
              {t.action && (
                <button className="toast-action" onClick={t.action.onClick}>
                  {t.action.label}
                </button>
              )}
              <button className="toast-close" aria-label="Dismiss" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ================================================================== Steps & timeline */
export function Stepper({ steps, onSelect, active }: { steps: { key: string; label: string; status: "Done" | "Active" | "Waiting" | "Blocked"; detail?: string }[]; onSelect?: (key: string) => void; active?: string }) {
  return (
    <ol className="stepper">
      {steps.map((s, i) => {
        const Comp = onSelect ? "button" : "div";
        return (
          <li key={s.key} className={cx("step", `step-${s.status.toLowerCase()}`, active === s.key && "is-selected")}>
            <Comp className="step-inner" onClick={onSelect ? () => onSelect(s.key) : undefined}>
              <span className="step-marker" aria-hidden>
                {s.status === "Done" ? <Check size={13} strokeWidth={3} /> : s.status === "Blocked" ? <X size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className="step-text">
                <span className="step-label">{s.label}</span>
                {s.detail && <span className="step-detail">{s.detail}</span>}
              </span>
            </Comp>
          </li>
        );
      })}
    </ol>
  );
}

export function Timeline({ items }: { items: { id: string; title: ReactNode; meta?: ReactNode; tone?: Tone; body?: ReactNode }[] }) {
  return (
    <ol className="timeline">
      {items.map((i) => (
        <li key={i.id} className={cx("timeline-item", `tone-${i.tone ?? "neutral"}`)}>
          <span className="timeline-dot" aria-hidden />
          <div className="timeline-content">
            <div className="timeline-title">{i.title}</div>
            {i.meta && <div className="timeline-meta">{i.meta}</div>}
            {i.body && <div className="timeline-body">{i.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ================================================================== Data table */
export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sort?: (row: T) => number | string;
  align?: "left" | "right" | "center";
  width?: number | string;
  hideable?: boolean;
  /** Column drops out below this viewport width class */
  priority?: 1 | 2 | 3;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  selectable,
  selected,
  onSelectedChange,
  empty,
  dense,
  loading,
  activeId,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  empty?: ReactNode;
  dense?: boolean;
  loading?: boolean;
  activeId?: string;
  caption?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? r : -r;
    });
  }, [rows, columns, sort]);

  const sel = new Set(selected ?? []);
  const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const someChecked = rows.some((r) => sel.has(r.id));

  if (loading) return <LoadingRows rows={6} columns={Math.min(columns.length, 5)} />;

  return (
    <div className={cx("table-wrap", dense && "is-dense")}>
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {selectable && (
              <th className="table-check">
                <Checkbox checked={allChecked ? true : someChecked ? "indeterminate" : false} onChange={(v) => onSelectedChange?.(v ? rows.map((r) => r.id) : [])} />
              </th>
            )}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th key={c.key} style={{ width: c.width, textAlign: c.align }} className={cx(c.priority && `p-${c.priority}`)} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                  {c.sort ? (
                    <button
                      className={cx("th-sort", active && "is-active")}
                      onClick={() => setSort((s) => (s?.key !== c.key ? { key: c.key, dir: "asc" } : s.dir === "asc" ? { key: c.key, dir: "desc" } : null))}
                    >
                      {c.header}
                      <span className="th-arrow" aria-hidden>
                        {active ? (sort!.dir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="table-empty">
                {empty ?? <EmptyState title="Nothing matches" >Try a different search or clear the filters.</EmptyState>}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={row.id}
                className={cx(onRowClick && "is-clickable", sel.has(row.id) && "is-selected", activeId === row.id && "is-active")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter") onRowClick(row);
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
              >
                {selectable && (
                  <td className="table-check" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={sel.has(row.id)}
                      onChange={(v) => {
                        const next = new Set(sel);
                        if (v) next.add(row.id);
                        else next.delete(row.id);
                        onSelectedChange?.([...next]);
                      }}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align }} className={cx(c.priority && `p-${c.priority}`)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Toolbar row above a table: search, filters, actions. */
export function Toolbar({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className="toolbar">
      <div className="toolbar-start">{children}</div>
      {end && <div className="toolbar-end">{end}</div>}
    </div>
  );
}

/** Filter chips: a compact single-select alternative to a dropdown. */
export function FilterChips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={cx("chip", value === o.value && "is-on")} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="chip-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** CSV download for any rows — no browser dialog, just a file. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
