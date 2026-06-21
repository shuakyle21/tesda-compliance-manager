'use client';

/**
 * UI COMPONENT — Toast (ported from components/Misc.jsx)
 * Bottom-right status toast. Client Component (dismiss handler).
 */

import { Icon } from './Icon';

export interface ToastData {
  title: string;
  message?: string;
}

export function Toast({ title, message, onDismiss }: ToastData & { onDismiss: () => void }) {
  return (
    <div className="toast" role="status">
      <Icon name="check" size={16} />
      <div style={{ flex: 1 }}>
        <div className="ttl">{title}</div>
        {message && <div className="msg">{message}</div>}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export default Toast;
