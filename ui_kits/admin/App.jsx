/* global React, BATCHES, ACTIVITY,
   Icon, StatusBadge, ProgressBar, MetricCard, BatchCard,
   LifecyclePipeline, UrgencyIndicator, TrainerAvatar,
   DocumentLinkRow, InfoCallout, TabBar, EmptyState, Toast,
   HBar, VBar, StackedBar, ChartLegend, BATCH_COLOR
*/

const { useState, useEffect, useMemo } = React;

function App() {
  const [tab, setTab] = useState('cards');
  const [query, setQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    let xs = BATCHES;
    if (programFilter !== 'all') xs = xs.filter(b => b.program === programFilter);
    if (query) {
      const q = query.toLowerCase();
      xs = xs.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.qualification.toLowerCase().includes(q) ||
        b.trainer.toLowerCase().includes(q)
      );
    }
    // Sort by daysToBilling ascending (most urgent first)
    return [...xs].sort((a, b) => a.daysToBilling - b.daysToBilling);
  }, [query, programFilter]);

  const totalScholars = BATCHES.reduce((s, b) => s + b.scholars, 0);
  const avgProgress  = Math.round(BATCHES.reduce((s, b) => s + b.progressPct, 0) / BATCHES.length);
  const earliest = [...BATCHES].sort((a, b) => a.daysToBilling - b.daysToBilling)[0];

  return (
    <div className="shell">
      <Topbar onResync={() => setToast({ title: 'Re-synced', message: '3 batches refreshed from Notion.' })} />

      <div className="page-head">
        <h1>Training Batch Manager</h1>
        <span className="subline">2026 cycle · 3 batches · {totalScholars} scholars</span>
      </div>

      <div className="metrics">
        <MetricCard
          label="TOTAL BATCHES"
          value={BATCHES.length}
          sub="All training ongoing"
          iconName="folders"
        />
        <MetricCard
          label="TOTAL SCHOLARS"
          value={totalScholars}
          sub={BATCHES.map(b => b.scholars).join(' · ') + ' per batch'}
          iconName="users"
        />
        <MetricCard
          label="AVG PROGRESS"
          value={`${avgProgress}%`}
          sub="On plan for Q2"
          iconName="chart-dots"
          variant={avgProgress < 60 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="EARLIEST BILLING"
          value={earliest.billingDeadline.replace(/, \d+$/, '')}
          sub={`${earliest.daysToBilling} days remaining · ${earliest.id}`}
          iconName="receipt"
          variant={earliest.daysToBilling <= 6 ? 'critical' : 'warning'}
        />
        <MetricCard
          label="NC ISSUED"
          value="0"
          sub="Pending — training ongoing"
          iconName="certificate"
        />
      </div>

      <TabBar
        tabs={[
          { key: 'cards',     label: 'Batch Cards', icon: 'folders' },
          { key: 'table',     label: 'Table View',  icon: 'file-text' },
          { key: 'analytics', label: 'Analytics',   icon: 'chart-bar' },
          { key: 'activity',  label: 'Activity Log',icon: 'timeline' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 18 }}>
        <FiltersRow
          query={query} onQuery={setQuery}
          program={programFilter} onProgram={setProgramFilter}
          tab={tab}
        />

        {tab === 'cards'     && <CardsView batches={filtered} />}
        {tab === 'table'     && <TableView batches={filtered} />}
        {tab === 'analytics' && <AnalyticsView batches={BATCHES} />}
        {tab === 'activity'  && <ActivityView />}
      </div>

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

/* ===== Topbar ===== */
function Topbar({ onResync }) {
  return (
    <div className="topbar">
      <img src="../../assets/logo.svg" height="32" alt="Training Compliance System" />
      <div className="right">
        <span><span className="synced-dot"></span>Last synced 4 min ago</span>
        <button className="btn ghost" onClick={onResync}>
          <Icon name="refresh" size={14} />
          Re-sync
        </button>
        <button className="btn ghost" aria-label="Settings"><Icon name="settings" size={16} /></button>
        <button className="btn ghost" aria-label="Help"><Icon name="help" size={16} /></button>
      </div>
    </div>
  );
}

/* ===== Filters row ===== */
function FiltersRow({ query, onQuery, program, onProgram, tab }) {
  if (tab === 'activity' || tab === 'analytics') {
    return (
      <div className="filters" style={{ justifyContent: 'flex-end' }}>
        <button className="btn secondary"><Icon name="download" size={14} />Export</button>
      </div>
    );
  }
  return (
    <div className="filters">
      <div className="input-wrap">
        <Icon name="search" size={14} className="icn" />
        <input
          className="input search"
          placeholder="Search batches, trainers, qualifications…"
          value={query}
          onChange={e => onQuery(e.target.value)}
        />
      </div>
      <Pill label="All programs" active={program === 'all'}  onClick={() => onProgram('all')} />
      <Pill label="TWSP"          active={program === 'TWSP'} onClick={() => onProgram('TWSP')} />
      <Pill label="CFSP"          active={program === 'CFSP'} onClick={() => onProgram('CFSP')} />
      <div style={{ flex: 1 }} />
      <button className="btn secondary"><Icon name="filter" size={14} />More filters</button>
      <button className="btn secondary"><Icon name="download" size={14} />Export</button>
    </div>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32, padding: '0 12px',
        border: '1px solid ' + (active ? 'var(--color-blue)' : 'var(--color-border)'),
        background: active ? 'var(--color-blue-lt)' : 'var(--color-surface)',
        color: active ? 'var(--color-blue-dk)' : 'var(--color-text-secondary)',
        borderRadius: 'var(--radius-lg)',
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

/* ===== View: Batch Cards ===== */
function CardsView({ batches }) {
  if (!batches.length) {
    return <EmptyState heading="No batches found" sub="Try adjusting your filters or search term." />;
  }
  return (
    <div className="batch-stack">
      <InfoCallout variant="info">
        3 batches synced from Notion at 14:02. BAT-1 enters critical billing window in 3 days.
      </InfoCallout>
      {batches.map(b => <BatchCard key={b.id} batch={b} />)}
    </div>
  );
}

/* ===== View: Table ===== */
function TableView({ batches }) {
  if (!batches.length) {
    return <EmptyState heading="No batches found" sub="Try adjusting your filters or search term." />;
  }
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
        }}>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
          }}>Training Batches</h2>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--color-text-muted)',
          }}>{batches.length} {batches.length === 1 ? 'batch' : 'batches'}</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>2026 cycle</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 56 }} />
          <col />
          <col style={{ width: 80 }} />
          <col style={{ width: 130 }} />
          <col style={{ width: 56 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 70 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 116 }} />
        </colgroup>
        <thead>
          <tr style={{ background: 'var(--color-surface-alt)' }}>
            <Th>ID</Th>
            <Th>Batch · qualification</Th>
            <Th>Program</Th>
            <Th>Trainer</Th>
            <Th align="right">Sch.</Th>
            <Th>Progress</Th>
            <Th>Billing</Th>
            <Th>BSRS</Th>
            <Th>Status</Th>
            <Th align="right">Download</Th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b, i) => <TableRow key={b.id} batch={b} odd={i % 2 === 0} />)}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align }) {
  return (
    <th style={{
      textAlign: align || 'left',
      padding: '0 12px', height: 36,
      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
      color: 'var(--color-text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.04em',
      borderBottom: '1px solid var(--color-border)',
      whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

function TableRow({ batch, odd }) {
  const cellStyle = {
    padding: '0 12px', height: 40,
    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-primary)',
    borderBottom: '0.5px solid var(--color-border-faint)',
    background: odd ? 'var(--color-surface)' : 'var(--color-surface-alt)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  };
  return (
    <tr>
      <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{batch.id}</td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 500 }}>{batch.name.replace(/ · Batch \d+$/, '')}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{batch.qualification}</div>
      </td>
      <td style={cellStyle}>
        <StatusBadge variant={batch.program === 'TWSP' ? 'twsp' : 'cfsp'}>{batch.program}</StatusBadge>
      </td>
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <TrainerAvatar name={batch.trainer} size="sm" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{batch.trainer.split(' ').slice(-1)[0]}</span>
        </div>
      </td>
      <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>{batch.scholars}</td>
      <td style={cellStyle}><ProgressBar percent={batch.progressPct} variant="mini" /></td>
      <td style={cellStyle}><UrgencyIndicator days={batch.daysToBilling} variant="badge" /></td>
      <td style={cellStyle}>
        <StatusBadge variant={batch.bsrs ? 'approved' : 'not-approved'}>{batch.bsrs ? 'YES' : 'NO'}</StatusBadge>
      </td>
      <td style={cellStyle}>
        <StatusBadge variant="ongoing">ONGOING</StatusBadge>
      </td>
      <td style={{ ...cellStyle, textAlign: 'right', paddingRight: 12 }}>
        <DownloadBatchButton batch={batch} />
      </td>
    </tr>
  );
}

function DownloadBatchButton({ batch }) {
  const [state, setState] = React.useState('idle'); // idle | downloading | done
  const onClick = (e) => {
    e.stopPropagation();
    if (state !== 'idle') return;
    setState('downloading');
    window.setTimeout(() => {
      setState('done');
      window.setTimeout(() => setState('idle'), 1400);
    }, 700);
  };
  const label =
    state === 'downloading' ? 'Preparing…' :
    state === 'done'        ? 'Ready'       :
    'Download';
  const icon =
    state === 'downloading' ? 'refresh' :
    state === 'done'        ? 'check'   :
    'download';
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Download batch dossier for ${batch.id}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 26, padding: '0 10px 0 8px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        background: state === 'done' ? 'var(--color-green-lt)' : 'var(--color-surface)',
        color: state === 'done' ? 'var(--color-green-dk)' : 'var(--color-text-primary)',
        borderColor: state === 'done' ? 'var(--color-green-border)' : 'var(--color-border)',
        fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500,
        letterSpacing: '0.01em',
        cursor: state === 'idle' ? 'pointer' : 'default',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => { if (state === 'idle') e.currentTarget.style.background = 'var(--color-surface-alt)'; }}
      onMouseLeave={(e) => { if (state === 'idle') e.currentTarget.style.background = 'var(--color-surface)'; }}
    >
      <Icon name={icon} size={13} style={state === 'downloading' ? { animation: 'spin 800ms linear infinite' } : null} />
      <span>{label}</span>
    </button>
  );
}

/* ===== View: Analytics ===== */
function AnalyticsView({ batches }) {
  const progressRows = batches
    .slice()
    .sort((a, b) => b.progressPct - a.progressPct)
    .map((b, i) => ({ label: b.id, value: b.progressPct, colorKey: BATCH_COLOR[i % BATCH_COLOR.length] }));

  const daysRows = batches.map((b, i) => ({
    label: b.id,
    elapsed: b.currentDay,
    remaining: b.totalDays - b.currentDay,
    colorKey: BATCH_COLOR[batches.indexOf(b) % BATCH_COLOR.length],
  }));

  const ntpRows = batches.map(b => ({
    label: b.id,
    value: b.ntpLag,
    colorKey: b.ntpLag === 0 ? 'green' : b.ntpLag <= 7 ? 'amber' : 'red',
  }));

  const scholarRows = batches.map((b, i) => ({
    label: b.id,
    value: b.scholars,
    colorKey: BATCH_COLOR[i % BATCH_COLOR.length],
  }));
  const avgSch = scholarRows.reduce((s, r) => s + r.value, 0) / scholarRows.length;

  return (
    <div className="analytics-grid">
      <div className="surface chart-card">
        <div className="chart-head"><div className="chart-title">Training progress by batch</div><div className="chart-sub">% complete · descending</div></div>
        <HBar rows={progressRows} max={100} />
      </div>
      <div className="surface chart-card">
        <div className="chart-head"><div className="chart-title">Days elapsed vs remaining</div><div className="chart-sub">solid = elapsed · light = remaining</div></div>
        <ChartLegend items={progressRows.map(r => ({ label: r.label, colorKey: r.colorKey }))} />
        <StackedBar rows={daysRows} max={50} />
      </div>
      <div className="surface chart-card">
        <div className="chart-head"><div className="chart-title">NTP → Training start lag</div><div className="chart-sub">15-day rule reference</div></div>
        <VBar rows={ntpRows} max={15} unit="d" referenceLine={15} />
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
          BAT-2 started same day as NTP receipt.
        </div>
      </div>
      <div className="surface chart-card">
        <div className="chart-head"><div className="chart-title">Enrolled scholars by batch</div><div className="chart-sub">avg {avgSch.toFixed(1)} per batch</div></div>
        <VBar rows={scholarRows} max={20} referenceLine={avgSch} />
      </div>
    </div>
  );
}

/* ===== View: Activity Log ===== */
function ActivityView() {
  return (
    <div className="surface" style={{ padding: '8px 18px' }}>
      <div className="activity">
        {ACTIVITY.map(a => (
          <div key={a.id} className="activity-item">
            <span className={`activity-dot ${a.tone}`} />
            <div className="activity-body">
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: '19px' }}>
                <span className="who">{a.who}</span> — {a.text}
              </div>
              <div className="meta">{a.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.App = App;
