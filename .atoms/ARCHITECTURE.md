---
last_updated: 2026-08-10T03:01:36Z
---

# Architecture Design

## System Overview
Mind-map editor with i18n support (FA, AR, EN, ES), auto-save, comments/hyperlinks on nodes, and RTL/LTR-aware drag reparenting.

## Tech Stack
React + TypeScript + Vite + Tailwind CSS + Shadcn/UI + Lucide icons

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| i18n | Multi-language support | src/i18n/translations.ts, src/i18n/useTranslation.ts |
| Types | Mind map data model | src/types/mindmap.ts |
| State | Mind map operations & history | src/hooks/useMindMap.ts |
| Canvas | SVG rendering, pan/zoom, drag | src/components/MindMapCanvas.tsx |
| Toolbar | Actions, save, language, auto-save | src/components/Toolbar.tsx |
| Page | Composition & shortcuts | src/pages/Index.tsx |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| i18n approach | Custom hook with context | Lightweight, no extra deps |
| Auto-save | File System Access API with fallback to download | Modern browsers support showSaveFilePicker |
| RTL detection | Based on current language direction | AR/FA are RTL, EN/ES are LTR |

## File Tree Plan
```
src/
  i18n/
    translations.ts    - All translation strings
    useTranslation.ts  - Translation hook + context provider
  types/
    mindmap.ts         - Updated with comment/hyperlink fields
  hooks/
    useMindMap.ts      - Updated with comment/hyperlink operations
  components/
    MindMapCanvas.tsx  - RTL/LTR proximity fix + comment/link icons
    Toolbar.tsx        - Language switcher, auto-save, save/save-as, comment/link editing
  pages/
    Index.tsx          - Wire everything together
```

## Implementation Guide
1. Create i18n system first (translations + hook)
2. Update types with comment/hyperlink
3. Fix canvas RTL/LTR proximity
4. Update toolbar with all new features
5. Wire in Index.tsx

