/**
 * Used only inside client components (no 'use client' entry, so its callback prop is fine).
 *
 * The "choose an NTP PDF" step shared by the RQM code editor and the Add new
 * batch modal: a visually hidden file input, a button that opens it, and a
 * one-line note saying what happens to the file. The note is a prop because the
 * two flows differ: the editor only reads the file, the modal also stores it.
 */

import { useRef } from 'react';

const HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export function PdfPickButton({
  id,
  label,
  note,
  reading,
  disabled,
  onFile,
  small,
}: {
  id: string;
  /** Button text. */
  label: string;
  /** What happens to the file, e.g. "Read on this device. The file is not uploaded." */
  note: string;
  reading: boolean;
  disabled?: boolean;
  onFile: (file: File | undefined) => void;
  small?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <input
        ref={fileRef}
        id={`${id}-pdf`}
        type="file"
        accept="application/pdf,.pdf"
        tabIndex={-1}
        style={HIDDEN}
        disabled={disabled || reading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          onFile(file);
        }}
      />
      <label htmlFor={`${id}-pdf`} style={HIDDEN}>Notice to Proceed PDF</label>
      <button
        type="button"
        className={`btn${reading ? ' loading' : ''}`}
        style={small ? { height: 28, fontSize: 12 } : undefined}
        disabled={disabled || reading}
        aria-busy={reading}
        onClick={() => fileRef.current?.click()}
      >
        {label}
      </button>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{note}</span>
      <span role="status" aria-live="polite" style={reading ? { fontSize: 12 } : HIDDEN}>{reading ? 'Reading the PDF…' : ''}</span>
    </div>
  );
}
