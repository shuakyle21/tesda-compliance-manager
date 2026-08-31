'use client';

interface EmploymentSummaryTilesProps {
  empTotals: { certified: number; employed: number; awaiting: number; unemployed: number };
  empRate: number;
}

export function EmploymentSummaryTiles({ empTotals, empRate }: EmploymentSummaryTilesProps) {
  return (
    <div className="emp-summary">
      <div className="emp-stat">
        <div className="emp-stat-label">Certified (eligible)</div>
        <div className="emp-stat-val">{empTotals.certified}</div>
      </div>
      <div className="emp-stat" style={{ background: 'var(--color-green-lt)', borderColor: 'var(--color-green)' }}>
        <div className="emp-stat-label" style={{ color: 'var(--color-green-dk)' }}>
          Employed
        </div>
        <div className="emp-stat-val" style={{ color: 'var(--color-green-dk)' }}>
          {empTotals.employed}
        </div>
      </div>
      <div className="emp-stat" style={{ background: 'var(--color-blue-lt)', borderColor: 'var(--color-blue)' }}>
        <div className="emp-stat-label" style={{ color: 'var(--color-blue-dk)' }}>
          Employment rate
        </div>
        <div className="emp-stat-val" style={{ color: 'var(--color-blue-dk)' }}>
          {empRate}%
        </div>
      </div>
      <div className="emp-stat" style={{ background: 'var(--color-amber-lt)', borderColor: 'var(--color-amber-border)' }}>
        <div className="emp-stat-label" style={{ color: 'var(--color-amber-dk)' }}>
          Awaiting follow-up
        </div>
        <div className="emp-stat-val" style={{ color: 'var(--color-amber-dk)' }}>
          {empTotals.awaiting}
        </div>
      </div>
      <div className="emp-stat" style={{ background: 'var(--color-red-lt)', borderColor: 'var(--color-red-border)' }}>
        <div className="emp-stat-label" style={{ color: 'var(--color-red-dk)' }}>
          Unemployed
        </div>
        <div className="emp-stat-val" style={{ color: 'var(--color-red-dk)' }}>
          {empTotals.unemployed}
        </div>
      </div>
    </div>
  );
}

export default EmploymentSummaryTiles;
