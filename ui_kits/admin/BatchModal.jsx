/* global React, Icon, StatusBadge, ProgressBar, TrainerAvatar, UrgencyIndicator, urgencyTier, LifecyclePipeline */
/* BatchModal — Notion-style database record modal for batch detail review. */

const ALL_TRAINING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MODAL_TIER_STYLES = {
  critical: { icon: 'alert-triangle' },
  warning: { icon: 'clock' },
  'on-track': { icon: 'check' },
  overdue: { icon: 'alert-circle' },
  unknown: { icon: 'clock' },
};

function BatchModal({ batch, onClose }) {
  const [closing, setClosing] = React.useState(false);

  const close = React.useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
    };
  }, [close]);

  const tier = urgencyTier(batch.daysToBilling);
  const urgency = MODAL_TIER_STYLES[tier] || MODAL_TIER_STYLES.unknown;
  const billingTone = tier === 'on-track' ? 'green' : tier === 'warning' ? 'amber' : 'red';
  const billingColors = {
    green: { bg: 'var(--color-green-lt)', fg: 'var(--color-green-dk)', border: 'var(--color-green-border)' },
    amber: { bg: 'var(--color-amber-lt)', fg: 'var(--color-amber-dk)', border: 'var(--color-amber-border)' },
    red: { bg: 'var(--color-red-lt)', fg: 'var(--color-red-dk)', border: 'var(--color-red-border)' },
  }[billingTone];
  const entre = batch.lifecycle.find(step => step.key === 'entre');

  return (
    <>
      <div className={`modal-backdrop${closing ? ' closing' : ''}`} onClick={close} />
      <div className="modal-overlay" onClick={close}>
        <div
          className={`modal-sheet${closing ? ' closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-modal-title"
          onClick={event => event.stopPropagation()}
        >
          <div className="modal-topbar">
            <div className="modal-breadcrumb">
              <button type="button" className="crumb" onClick={close}>Training Batch Manager</button>
              <Icon name="chevron-right" size={12} />
              <span className="current">{batch.id} · {batch.name}</span>
            </div>
            <button type="button" className="modal-close-btn" onClick={close} aria-label="Close">
              <Icon name="x" size={16} />
            </button>
          </div>

          <section className={`modal-hero ${batch.program === 'TWSP' ? 'twsp' : 'cfsp'}`}>
            <div className="modal-hero-badges">
              <StatusBadge variant={batch.program === 'TWSP' ? 'twsp' : 'cfsp'}>{batch.program}</StatusBadge>
              <StatusBadge variant={batch.ncLevel === 'NC II' ? 'nc-ii' : 'nc-i'}>{batch.ncLevel}</StatusBadge>
              <UrgencyIndicator days={batch.daysToBilling} variant="badge" />
              <span className="modal-batch-id">{batch.id}</span>
            </div>
            <h2 id="batch-modal-title" className="modal-title">{batch.name}</h2>
            <p className="modal-subtitle">{batch.qualification}</p>
          </section>

          <section className="modal-props" aria-label="Batch properties">
            <PropertyRow label="Trainer" icon="user">
              <span className="prop-trainer">
                <TrainerAvatar name={batch.trainer} size="sm" />
                {batch.trainer}
              </span>
            </PropertyRow>
            <PropertyRow label="Training Days" icon="calendar">
              <TrainingDayPills schedule={batch.trainingDaySchedule} program={batch.program} />
            </PropertyRow>
            <PropertyRow label="Program" icon="folders">
              <StatusBadge variant={batch.program === 'TWSP' ? 'twsp' : 'cfsp'}>{batch.program}</StatusBadge>
            </PropertyRow>
            <PropertyRow label="Status" icon="info-circle">
              <StatusBadge variant="ongoing" iconName="check">Training Ongoing</StatusBadge>
            </PropertyRow>
            <PropertyRow label="BSRS" icon={batch.bsrs ? 'shield-check' : 'shield-off'}>
              <StatusBadge variant={batch.bsrs ? 'approved' : 'not-approved'} iconName={batch.bsrs ? 'shield-check' : 'shield-off'}>
                {batch.bsrs ? 'APPROVED' : 'NOT APPROVED'}
              </StatusBadge>
            </PropertyRow>
            <PropertyRow label="NTP → Start" icon="calendar">
              <span className={batch.ntpLag === 0 ? 'prop-good mono' : 'mono'}>{batch.ntpLag === 0 ? 'Same-day' : `${batch.ntpLag} days`}</span>
            </PropertyRow>
            <PropertyRow label="TIP" icon="presentation"><span className="mono">{batch.tipDate}</span></PropertyRow>
            <PropertyRow label="AOU" icon="file-invoice"><span className="mono">{batch.aouDate}</span></PropertyRow>
            <PropertyRow label="Report dates" icon="file-text"><span className="mono">Report {batch.reportDate} · Billing {batch.billingDeadline}</span></PropertyRow>
          </section>

          <ModalSection title="Training Progress" icon="chart-dots">
            <div className="modal-progress-grid">
              <div>
                <div className="modal-big-percent">{batch.progressPct}%</div>
                <div className="muted">Day {batch.currentDay} of {batch.totalDays}</div>
              </div>
              <div className="progress-detail">
                <div className="progress-dates">
                  <span>{batch.trainingStart}</span>
                  <span>→</span>
                  <span>{batch.trainingEnd}</span>
                </div>
                <ProgressBar percent={batch.progressPct} />
                <div className="progress-meta">
                  <span>{Math.max(0, batch.totalDays - batch.currentDay)} training days remaining</span>
                  <span>{batch.scholars}/{batch.approvedSeats} scholars enrolled</span>
                </div>
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Lifecycle Pipeline" icon="timeline">
            <LifecyclePipeline steps={batch.lifecycle} />
          </ModalSection>

          <ModalSection title="Entrepreneurship" icon="briefcase" className="entre-section">
            <div className="entre-grid">
              <div className="entre-card primary">
                <div className="mini-label">Schedule</div>
                <div className="mono strong">{entre?.date || 'Pending'}</div>
                <div className="muted purple">3 days · immediately after training</div>
              </div>
              <div className="entre-card">
                <div className="mini-label">Duration</div>
                <div className="modal-stat">3</div>
                <div className="muted">training days</div>
              </div>
              <div className="entre-card">
                <div className="mini-label">Status</div>
                <StatusBadge
                  variant="upcoming"
                  style={{ background: 'var(--color-purple-lt)', color: 'var(--color-purple-dk)' }}
                >
                  PENDING
                </StatusBadge>
              </div>
            </div>
            <p className="entre-note">Skills to Succeed module: enterprise basics, market study, and simple business planning.</p>
          </ModalSection>

          <ModalSection title="Billing Countdown" icon="receipt">
            <div className="billing-countdown" style={{ background: billingColors.bg, color: billingColors.fg, borderColor: billingColors.border }}>
              <Icon name={urgency.icon} size={22} />
              <div>
                <div className="billing-days">{batch.daysToBilling}</div>
                <div className="mono small">days until billing deadline</div>
              </div>
              <div className="billing-date">
                <div className="mono strong">{batch.billingDeadline}</div>
                <div className="small">Submit billing statement</div>
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Scholars Breakdown" icon="users">
            <div className="scholar-grid">
              <StatBox label="Approved Seats" value={batch.approvedSeats} />
              <StatBox label="Enrolled" value={batch.scholars} tone="blue" />
              <StatBox label="Completers" value={batch.completers} tone="green" />
              <StatBox label="Dropouts" value={batch.dropouts} tone={batch.dropouts > 0 ? 'red' : 'muted'} />
            </div>
          </ModalSection>

          <ModalSection title="Remarks" icon="info-circle">
            <p className="remark-box">{batch.remark}</p>
            {batch.notes ? <p className="note-box">{batch.notes}</p> : null}
          </ModalSection>

          <div className="modal-footer">
            <span>Last updated Jun 2, 2026</span>
            <span>·</span>
            <span>Derived from Notion</span>
            <button type="button" className="btn ghost sm" onClick={close}><Icon name="x" size={12} />Close</button>
          </div>
        </div>
      </div>
    </>
  );
}

function PropertyRow({ label, icon, children }) {
  return (
    <div className="modal-prop">
      <div className="modal-prop-label"><Icon name={icon} size={13} />{label}</div>
      <div className="modal-prop-value">{children}</div>
    </div>
  );
}

function TrainingDayPills({ schedule, program }) {
  return (
    <div className="training-day-pills">
      {ALL_TRAINING_DAYS.map(day => {
        const active = schedule.includes(day);
        const weekend = day === 'Sat' || day === 'Sun';
        const cls = active ? (weekend ? 'weekend' : program.toLowerCase()) : 'inactive';
        return <span key={day} className={`training-day ${cls}`}>{day}</span>;
      })}
      <span className="training-day-count">{schedule.length}×/wk</span>
    </div>
  );
}

function ModalSection({ title, icon, className = '', children }) {
  return (
    <section className={`modal-section ${className}`}>
      <h3 className="modal-section-title"><Icon name={icon} size={13} />{title}</h3>
      {children}
    </section>
  );
}

function StatBox({ label, value, tone }) {
  const color = {
    blue: 'var(--color-blue-dk)',
    green: 'var(--color-green-dk)',
    red: 'var(--color-red-dk)',
    muted: 'var(--color-text-muted)',
  }[tone] || 'var(--color-text-primary)';
  return (
    <div className="stat-box">
      <div className="modal-stat" style={{ color }}>{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}

window.BatchModal = BatchModal;
