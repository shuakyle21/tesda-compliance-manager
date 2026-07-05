# modules/shell — App Chrome (no FR)

Domain-aware application shell: composition chrome, not a PRD feature domain. Lives as a module (not `shared/`) because Sidebar/Topbar do tenant switching and MetricsRow renders batch metrics — `shared/` must never import module or data context.

## Contents
- `ui/Sidebar.tsx`, `ui/Topbar.tsx` — navigation + tenant switcher
- `ui/MetricsRow.tsx` — dashboard metrics strip
- `ui/MobileHeader.tsx`, `ui/AuthHeader.tsx`, `ui/NavDrawerProvider.tsx`
