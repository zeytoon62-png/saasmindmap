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
- [x] About Us popup in sidebar with dynamic text from DB + Telegram link + Financial Support button
- [x] Support Us (crypto donation) section in sidebar with wallet selector + QR code + copy address
- [x] Enhanced Feedback system: normal/urgent types, Telegram contact, sent to different emails
- [x] Admin panel at /manager with login, credential change, admin CRUD, settings, wallets, feedbacks, reports dashboard with date filter
- [x] Save with custom filename (format selector + filename input in dialog)
- [x] Share project with unique URL (backend: object storage + shared_maps table + token/password/expiry)
- [x] Share frontend: dialog with expiry/password, full URL copy, SharedView page with password prompt
- [x] Responsive panels (Color/Format) for mobile as fixed modal-like overlays
- [x] Long Press drag on mobile (500ms hold to start drag)
- [x] RTL/Parent reparent fix (correct proximity detection)
- [x] Reset Zoom = 100% centered on root
- [x] Move Up/Down buttons (reorder siblings without drag)
- [x] readOnly mode for shared view canvas (no edit/drag/add interactions)

## Progress Log
- All 8 tasks completed: i18n, RTL/LTR fix, auto-save, save/save-as, comments, hyperlinks, feedback, language switcher
- Round 2: Sidebar menu (desktop fixed, mobile hamburger), RTL tree positioned right with zoom on left, icons inside node corners, auto-save every 5min with file picker, hasUserModified prevents language-change reset after edits
- Round 3: Removed Save/Auto-save/Reset/Edit buttons, collapsible sidebar, anchored zoom (wheel + pinch) with white-screen pinch bug fixed, fixed text padding with wrapping + live box resize while typing, node-colored comment/link icons inside node corners, hyperlink opens directly with URL normalization
- Round 3 backend: feedbacks/visitor_logs/report_runs tables, /api/v1/reports feedback + visitor-log + run-weekly-report endpoints, SMTP weekly email to the configured address with one-send-per-week guard and data clearing after success
- Round 5: parent-color inheritance for new nodes, Delete/Enter/Tab node shortcuts on desktop, per-node text formatting (align, RTL/LTR, lists, bold, font size), save submenu with JSON/Markdown/JPG/PNG/SVG/PDF export, website stamp in file headers (JSON/Markdown) and at the bottom of images/PDF
- Round 4: halved node text padding, Shift+Enter multi-line editing, English default language plus Chinese and Russian, language dropdown selector, page title "Personal Mind Map", collapsible desktop sidebar with persisted state, localStorage project restore on refresh plus beforeunload unsaved warning and toolbar unsaved badge, fixed non-zooming top toolbar with preventScroll focus, fit-to-screen zoom button, redesigned color palette with spaced swatches and custom color picker
- Round 6: Enhanced /manager panel with: (1) Multilingual About Us editor (6 languages with RTL support for fa/ar), (2) Full SMTP configuration fields (host/port/user/pass/from), (3) Email recipients + batch schedule settings with manual send-batch button, (4) Email sending logs table in dashboard, (5) QR image upload for wallets via Object Storage with preview in both Manager and Toolbar Support Us modal, (6) Toolbar About Us now reads language-specific text from settings
- Round 7: 9 features/fixes: Save with filename, Share with unique URL + expiry + password + cleanup, Responsive mobile panels, Long Press drag, RTL/parent fix, Reset Zoom 100%, Up/Down reorder buttons, SharedView read-only page
- Round 8: 5 bug fixes: (1) Plus button on mobile commits edit text before adding child (preventDefault blur), (2) Zoom performance optimized with useMemo for layout calculation, (3) Long-press drag threshold increased to 10px to avoid jitter cancellation, (4) About Us removes hardcoded default text – shows nothing if not configured, (5) Financial Support link opens Support Us modal instead of Telegram
- Round 9: Standalone deployment — removed @metagptx/web-sdk, viteSourceLocator, lovable-tagger dependencies; rewrote vite.config.ts without Atoms plugins; added CSS to hide injected badge/watermark on mobile (pointer-events:none + display:none); added standalone storage proxy endpoints (upload-file, download-url) to backend; simplified config.ts and AuthCallback.tsx for independent deployment; build passes cleanly

