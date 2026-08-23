'use client';

/**
 * OVERLAY — Settings (FR-14), ported from the Operations modal's Settings
 * body in the design handoff (TVI-CAMS.dc.html, `opModal.isSettings`).
 *
 * `tenant_settings` (signatories, letterhead, partial-billing toggle) is a
 * planned table (ADR-001 §11, not yet migrated) and there is no real
 * tenant/role resolver yet (TES-34) — see the module README. The Workspace
 * section below reflects the real signed-in identity and active school
 * passed in by the caller; the Preferences toggle persists only for this
 * session (local state), matching the design's own "Save changes" which is
 * a toast, not a write.
 *
 * DELIBERATE DEVIATION from the design: the handoff also shows "Email
 * notifications" and "Weekly digest" toggles. Alerts in this system are
 * computed on read — no cron, no email (CLAUDE.md) — so both rows promise a
 * delivery mechanism that doesn't exist and never should. Dropped, the same
 * way the batch modal's stale pre-ADR-001 billing copy in the same bundle
 * gets skipped rather than ported: the ADR wins over the prototype.
 *
 * "Compact density" is left wired to nothing yet — `.density-compact` already
 * exists in design-system.css (unused) as the intended hook, but applying it
 * means lifting this flag above the Server Component layout, which is beyond
 * this port.
 */

import { useEffect, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { Switch } from '@/shared/ui/Switch';

interface SettingsModalProps {
  workspaceName: string;
  workspaceMeta: string;
  userName: string;
  userLabel: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsModal({ workspaceName, workspaceMeta, userName, userLabel, onClose, onSaved }: SettingsModalProps) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--color-blue-lt)', color: 'var(--color-blue-dk)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="settings" size={16} />
            </span>
            <div>
              <h3>Settings</h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Workspace &amp; personal preferences
              </div>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <div className="settings-section-title">Workspace</div>
            <div className="settings-rows">
              <div className="settings-row">
                <div style={{ minWidth: 0 }}>
                  <div className="settings-row-label">{workspaceName}</div>
                  <div className="settings-row-hint">{workspaceMeta}</div>
                </div>
                <span className="settings-row-control" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>active</span>
              </div>
              <div className="settings-row">
                <div style={{ minWidth: 0 }}>
                  <div className="settings-row-label">Signed in as</div>
                  <div className="settings-row-hint">{userName} · {userLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Preferences</div>
            <div className="settings-rows">
              <div className="settings-row">
                <div style={{ minWidth: 0 }}>
                  <div className="settings-row-label">Compact density</div>
                  <div className="settings-row-hint">Tighter rows and cards</div>
                </div>
                <span className="settings-row-control">
                  <Switch checked={compact} onChange={setCompact} label="Compact density" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn primary" onClick={onSaved}>Save changes</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingsModal;
