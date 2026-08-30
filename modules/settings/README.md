# modules/settings — Settings, Roles, and Program/RQM Configuration (FR-14)

- `ui/SettingsModal.tsx` — the Settings overlay (design-sync port, TVI-CAMS.dc.html
  `opModal.isSettings`), opened from the Sidebar's Operations group. Workspace section
  shows the real signed-in identity/active school passed in by the caller; Preferences
  toggles (compact density, email notifications, weekly digest) are session-local state
  — there is no `tenant_settings` table yet, so "Save changes" is a toast, not a write,
  matching the design's own behavior.

## Planned
- `data/` — `tenant_settings` (signatories, letterhead, partial-billing toggle — planned table, ADR-001 §11), program/RQM configuration; once built, wire the Preferences toggles to it
- Settings screens beyond the overlay (admin-only; viewer server-denied on writes)
