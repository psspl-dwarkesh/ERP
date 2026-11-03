---
name: ABC ERP
description: Engineering job traveller identity for a connected operating portal.
colors:
  ink: "#172320"
  mineral-paper: "#E6ECE6"
  copper: "#F07946"
  copper-deep: "#C9542B"
  record: "#FFFDF7"
  rule: "#D9D8CF"
  secondary-ink: "#526258"
  muted: "#5D6C64"
  quiet-ink: "#43564A"
  paper-edge: "#DFE6DD"
  ink-soft: "#4A5B52"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(76px, 10.5vw, 156px)"
    fontWeight: 600
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "42px"
    fontWeight: 600
    lineHeight: 1
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  identifier:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
rounded:
  square: "0px"
legibility:
  minimum-font-size: "11px"
  body-contrast: "4.5:1"
  large-text-contrast: "3:1"
  numerals: "tabular-nums on record values, dates, totals and identifiers"
motion:
  settle: "0.34s cubic-bezier(0.16, 1, 0.3, 1)"
  stamp: "0.42s cubic-bezier(0.16, 1, 0.3, 1)"
  draw: "0.85s cubic-bezier(0.16, 1, 0.3, 1)"
  reduced-motion: "no transform or draw animation; instant state change"
spacing:
  tight: "8px"
  standard: "16px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.copper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "10px 16px"
  record-surface:
    backgroundColor: "{colors.record}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
---

## Overview

The visual north star is an engineering job traveller: one job moves through order, project, materials, assembly, quality and service. The entry page makes those handoffs visible. Operating pages use dense, legible records and clear actions, with the route identity carried through the navigation and headings.

## Colors

Ink anchors the entry cover and navigation. Mineral paper is the portal canvas; off-white holds record content. Copper marks the current stop and primary action. Secondary ink is used for supporting text, while thin rules structure lists and tables. Status colors retain their semantic meaning inside operating views.

Supporting text uses one ladder measured against its composited background, not one inherited gray: quiet ink for small or dense copy on paper, secondary ink for standard supporting text, muted for the lightest tone that still clears 4.5:1. Copper-deep is the text-safe copper; bright copper stays on fills and marks where it sits on ink. Browser surfaces belong to the palette too: selection, scrollbars, caret, placeholder, native control accent, focus ring and the page `theme-color` are themed from these tokens, and the favicon is the brand monogram.

## Typography

Barlow Condensed gives the entry headline and page titles an industrial silhouette. IBM Plex Sans carries labels, instructions and data. IBM Plex Mono distinguishes record IDs, stage numbers and small technical metadata. Nothing renders below an 11 px floor, including identifier and eyebrow text; if a label cannot survive that size it is removed rather than shrunk. Because Barlow Condensed is a webfont, it must stay in the single Google Fonts import in `product.css`: a declared family that is never imported silently falls back and flattens the whole identity.

## Layout

The entry is short: cover, interactive route and three linked operational examples. The portal uses a persistent desktop sidebar, compact top bar and content width capped near 1570px. On narrow screens, navigation becomes a menu and tables scroll inside their own containers. Keep the decision or exception before decorative summary metrics.

## Elevation & Depth

Use surface contrast and 1px rules for hierarchy. Most primary surfaces are flat. Focus and active states should read clearly without large ambient shadows.

## Shapes

Major surfaces, buttons and navigation use square geometry. The skewed three-bar brand mark is the recurring expressive shape. Circles belong to data marks and legend dots only, never to interface chrome: a person's initials, a handoff marker and a demo indicator are squares, because a round avatar is the most interchangeable shape a product can borrow. The operational test is size rather than markup: a mark no wider than 8 px in both dimensions is data and may stay round, anything larger is chrome and is square. Because a class selector outranks an element selector, an override list that squares `span` does not square a `span` with its own class, so new controls need the class-qualified rule.

## Motion

Motion marks a handoff, not decoration. Selecting a stop on the entry route settles the active record with a short rise and resolves the record ID's letter-spacing, so the change reads as a record being stamped rather than a block being swapped; a scale plate above the summary tracks the same stop. The route rule draws left to once on load. All of it runs only under `prefers-reduced-motion: no-preference`, uses the shared settle curve, and stays under half a second.

## Components

Primary buttons are copper with ink text. Secondary buttons use off-white surfaces and ruled borders. Record cards, dispatch rows and tables expose a clear title or ID, state, owner or next action. The dashboard opens with three actionable handoffs. The entry route changes its active record and provides a direct module link. Every heading stands on its own: no eyebrow labels, section numbers or category kickers that repeat what the heading already says. A line above a heading carries an identifier or a period instead (PRJ-0264, BOM-042 · REV C, NOVEMBER 2026 · DRAFT RUN), because that is data the heading does not hold. A loading state uses the destination's own geometry, so a panel being fetched still reads as that panel; spinners and skeleton blobs do not belong here.

## Do's and Don'ts

- Do lead with real linked examples: SO-0196, PRJ-0264, BOM-042, WO-0187 and AST-0042.
- Do show held stock and approval states honestly; route links are demonstrations based on fixture data.
- Do give hover, focus and reduced-motion states equal care.
- Do measure the rendered result rather than the declared CSS: a font family declared but never imported, or a color inherited from a rejected concept, still ships.
- Don't leave untamed browser defaults (blue selection, cobalt focus rings, stock scrollbars, a mismatched `theme-color`) inside an ink and copper surface.
- Don't fill the page with interchangeable metric cards or ornamental gradients.
- Don't claim a workflow is automated when the prototype only simulates it locally.
