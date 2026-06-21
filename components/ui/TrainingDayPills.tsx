/**
 * UI COMPONENT — TrainingDayPills (ported from components/TrainingDayPills.jsx)
 * Mon→Sun chips for a batch's weekly schedule, colored by program / weekend.
 */

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function TrainingDayPills({ schedule = [], program }: { schedule?: string[]; program: string }) {
  const isTwsp = program === 'TWSP';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {ALL_DAYS.map((day) => {
        const isActive = schedule.includes(day);
        const isWeekend = day === 'Sat' || day === 'Sun';
        let bg: string, fg: string, border: string;
        if (!isActive) {
          bg = 'var(--color-surface-alt)'; fg = 'var(--color-text-disabled)'; border = 'var(--color-border-faint)';
        } else if (isWeekend) {
          bg = 'var(--color-amber-lt)'; fg = 'var(--color-amber-dk)'; border = 'var(--color-amber-border)';
        } else if (isTwsp) {
          bg = 'var(--color-blue-lt)'; fg = 'var(--color-blue-dk)'; border = 'var(--color-blue-border)';
        } else {
          bg = 'var(--color-teal-lt)'; fg = 'var(--color-teal-dk)'; border = 'var(--color-teal-border)';
        }
        return (
          <span key={day} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 22, borderRadius: 'var(--radius-md)',
            border: `1px solid ${border}`, background: bg,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            fontWeight: isActive ? 600 : 400, color: fg, letterSpacing: '0.03em',
            opacity: isActive ? 1 : 0.45,
          }}>
            {day}
          </span>
        );
      })}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 4 }}>
        {schedule.length}×/wk
      </span>
    </div>
  );
}

export default TrainingDayPills;
