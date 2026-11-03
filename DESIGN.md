---
name: Threadline
description: One connected ERP for engineering, panel-manufacturing and field-service firms.
colors:
  slate-900: "#13222B"   # dark: sidebar, hero, controls band, tooltips, toasts
  slate-950: "#0C1820"   # deepest dark: showcase hero and final CTA
  mist: "#F3F6F8"        # light 1: app page background
  white: "#FFFFFF"       # light 2: cards, dialogs, drawers, tables
  teal-500: "#0B7A85"    # accent: primary actions, active states, links
  teal-glow: "#45C4CD"   # accent on dark surfaces only
typography:
  sans: "Archivo Variable (self-hosted; wdth 88 for display, 100 for text)"
  mono: "IBM Plex Mono (record IDs only)"
---

# Threadline design system

Version 1.0, 4 November 2026. This replaces the v0.3 "route sheet" concept (ink, mineral paper and copper), which was rejected as generic. The source of truth is code: [tokens.css](prototype/src/ds/tokens.css), [base.css](prototype/src/ds/base.css), [components.tsx](prototype/src/ds/components.tsx) and [components.css](prototype/src/ds/components.css). This page explains the decisions behind them.

## Idea

The product's promise is that a job never breaks into separate systems: enquiry, quotation, order, project, BOM, purchase, assembly, installed asset and service all sit on one record chain. The visual signature is the **thread**: a teal line passing through record nodes. It appears in the logo, the dashboard's record chain, the showcase hero and the interactive job route.

## Colour

One dark, two lights, one accent.

| Role | Token | Use |
| --- | --- | --- |
| Dark | `--slate-900` / `--slate-950` | Sidebar, showcase hero, controls band, tooltips, toasts, record cards on light pages |
| Light 1 | `--bg-page` (mist `#F3F6F8`) | App canvas between surfaces |
| Light 2 | `--bg-surface` (white) | Cards, tables, dialogs, drawers, popovers |
| Accent | `--accent` (petrol teal `#0B7A85`) | Primary buttons, active nav, links, selected state, focus ring |

Petrol teal was chosen over SaaS blue because it reads as instrumentation and process engineering, suits the pharma and chemical customers in the scope, and stays clear of every status hue. Status colours (green ok, amber warn, red risk, blue info) are reserved for meaning and never decorate. Components consume **semantic** tokens (`--fg-muted`, `--line-default`, `--accent-soft`), not the ramps.

## Type

- **Archivo Variable**, self-hosted through `@fontsource-variable/archivo` (no Google Fonts request). Headlines use the width axis at 88 for an engineered, semi-condensed silhouette; UI text runs at 100.
- **IBM Plex Mono** only for record IDs (PRJ-0264, WO-0187), so identifiers are scannable everywhere.
- UI body 14 px, dense tables 13–14 px, floor 11.5 px (mono IDs and axis labels only).

## Shape, depth, motion

- Radius 5–7 px on controls, 10 px on cards, 14–20 px on dialogs and showcase panels. Avatars are rounded squares; circles are reserved for status dots, step markers and data marks.
- Borders carry hierarchy at rest. Shadows appear only on things that float: popovers, dialogs, drawers, toasts.
- Motion marks a change of state: drawers slide, dialogs settle, checkboxes pop, the work-order step pulses, the thread pulse travels to the selected stop. Durations are 120, 200, 320 and 560 ms on shared easing curves. Everything honours `prefers-reduced-motion`.

## No browser defaults

Every control is ours. Radix supplies behaviour (focus traps, keyboard, ARIA); the styling is custom. That covers select, checkbox, switch, radio cards, tabs, segmented control, tooltip, popover, menu, dialog, drawer, toast and command palette (cmdk). Selection, caret, scrollbars, autofill, search-cancel and number spinners are themed or removed in `base.css`. No `alert`, `confirm`, `title=` tooltips or native `<select>`.

## Components

Buttons (primary, secondary, ghost, danger, inverse, link), IconButton with tooltip, Status (tone derived from the status text), Tag, RecordLink, Avatar and Person, Card and CardHeader, Stat and stat-strip, Progress, Meter, KeyValues, EmptyState, Callout, LoadingRows, PageHeader, Tabs, Segmented, Field, Input, Textarea, SearchField, Select, Checkbox, Switch, RadioCards, Tooltip, Popover, Dialog, Drawer, Menu, Toast, Stepper, Timeline, DataTable, Toolbar and FilterChips.

Domain patterns in [patterns.tsx](prototype/src/app/patterns.tsx): RecordThread, HealthDots (schedule, cost, material), SlaClock, StockMeter (free, reserved, held, on order) and ApprovalDialog (evidence, decision, reason, audit note).

## Rules

- Lead with the decision or exception, then the list. No walls of interchangeable KPI cards.
- Every record ID is a link to its record.
- Money is shown in Indian units (₹48.50 L, ₹1.42 Cr); dates as 18 Nov 2026.
- Simulated actions say what they did; the demo never claims a live integration.
- Loading placeholders take the shape of the content that is coming.
