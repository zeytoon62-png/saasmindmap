---
last_updated: 2026-08-10T03:01:36Z
---

# Requirements & Progress

## Requirements Overview

## User Stories

## Task Breakdown
- [x] Create i18n system with FA, AR, EN, ES languages
- [x] Update mindmap types to include comment and hyperlink fields
- [x] Fix RTL/LTR proximity detection for drag-reparent
- [x] Implement language switcher with default map reset on language change
- [x] Add auto-save toggle with file handle management
- [x] Split save into Save and Save As buttons
- [x] Add comment/hyperlink editing UI in toolbar for selected node
- [x] Show comment/hyperlink icons on nodes that have them
- [x] New nodes inherit the parent node color by default
- [x] Desktop keyboard shortcuts: Delete removes node, Enter adds child, Tab inserts previous sibling
- [x] Text format toolbar: align left/center/right, RTL/LTR, numbered/bulleted lists, bold, font size
- [x] Save submenu with JSON, Markdown, JPG, PNG, SVG, PDF formats
- [x] www.pmindmap.com in JSON/Markdown headers and at the bottom of image/PDF exports

## Progress Log
- All 8 tasks completed: i18n, RTL/LTR fix, auto-save, save/save-as, comments, hyperlinks, feedback, language switcher
- Round 2: Sidebar menu (desktop fixed, mobile hamburger), RTL tree positioned right with zoom on left, icons inside node corners, auto-save every 5min with file picker, hasUserModified prevents language-change reset after edits
- Round 3: Removed Save/Auto-save/Reset/Edit buttons, collapsible sidebar, anchored zoom (wheel + pinch) with white-screen pinch bug fixed, fixed text padding with wrapping + live box resize while typing, node-colored comment/link icons inside node corners, hyperlink opens directly with URL normalization
- Round 3 backend: feedbacks/visitor_logs/report_runs tables, /api/v1/reports feedback + visitor-log + run-weekly-report endpoints, SMTP weekly email to the configured address with one-send-per-week guard and data clearing after success
- Round 5: parent-color inheritance for new nodes, Delete/Enter/Tab node shortcuts on desktop, per-node text formatting (align, RTL/LTR, lists, bold, font size), save submenu with JSON/Markdown/JPG/PNG/SVG/PDF export, website stamp in file headers (JSON/Markdown) and at the bottom of images/PDF
- Round 4: halved node text padding, Shift+Enter multi-line editing, English default language plus Chinese and Russian, language dropdown selector, page title "Personal Mind Map", collapsible desktop sidebar with persisted state, localStorage project restore on refresh plus beforeunload unsaved warning and toolbar unsaved badge, fixed non-zooming top toolbar with preventScroll focus, fit-to-screen zoom button, redesigned color palette with spaced swatches and custom color picker

