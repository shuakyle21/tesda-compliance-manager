'use client';

/**
 * UI COMPONENT — Switch
 *
 * Pill toggle for settings-style on/off rows. Ported from the Operations
 * modal's `toggleEl(on)` in the design handoff (TVI-CAMS.dc.html).
 */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  );
}

export default Switch;
