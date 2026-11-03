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

## Typography

Barlow Condensed gives the entry headline and page titles an industrial silhouette. IBM Plex Sans carries labels, instructions and data. IBM Plex Mono distinguishes record IDs, stage numbers and small technical metadata. Body text should remain readable at its actual rendered size; avoid tiny decorative labels.

## Layout

The entry is short: cover, interactive route and three linked operational examples. The portal uses a persistent desktop sidebar, compact top bar and content width capped near 1570px. On narrow screens, navigation becomes a menu and tables scroll inside their own containers. Keep the decision or exception before decorative summary metrics.

## Elevation & Depth

Use surface contrast and 1px rules for hierarchy. Most primary surfaces are flat. Focus and active states should read clearly without large ambient shadows.

## Shapes

Major surfaces, buttons and navigation use square geometry. The skewed three-bar brand mark is the recurring expressive shape. Rounded badges and chart marks may remain where they convey state or data.

## Components

Primary buttons are copper with ink text. Secondary buttons use off-white surfaces and ruled borders. Record cards, dispatch rows and tables expose a clear title or ID, state, owner or next action. The dashboard opens with three actionable handoffs. The entry route changes its active record and provides a direct module link.

## Do's and Don'ts

- Do lead with real linked examples: SO-0196, PRJ-0264, BOM-042, WO-0187 and AST-0042.
- Do show held stock and approval states honestly; route links are demonstrations based on fixture data.
- Do give hover, focus and reduced-motion states equal care.
- Don't fill the page with interchangeable metric cards or ornamental gradients.
- Don't claim a workflow is automated when the prototype only simulates it locally.
