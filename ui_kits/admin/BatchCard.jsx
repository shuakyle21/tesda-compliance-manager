/* global React, Icon, StatusBadge, ProgressBar, LifecyclePipeline, TrainerAvatar, UrgencyIndicator, urgencyTier */
/* BatchCard — the primary data display component. */

function BatchCard({ batch, onClick }) {
  const tier = urgencyTier(batch.daysToBilling);
  const tierBorderColor = {
    critical: 'var(--color-red)',
    warning:  'var(--color-amber)',
    'on-track': 'var(--color-green)',
    overdue:  'var(--color-red)',
  }[tier] || 'var(--color-border-strong)';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 150ms var(--ease-standard), background 150ms var(--ease-standard)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.background = 'var(--color-surface-raised)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.background = 'var(--color-surface)';
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge variant={batch.program === 'TWSP' ? 'twsp' : 'cfsp'}>{batch.program}</StatusBadge>
          <StatusBadge variant={batch.ncLevel === 'NC II' ? 'nc-ii' : 'nc-i'}>{batch.ncLevel}</StatusBadge>
          <UrgencyIndicator days={batch.daysToBilling} variant="badge" />
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
            {batch.id}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginTop: 8 }}>
          {batch.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          {batch.qualification}
        </div>
      </div>

      {/* Body */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20,
        padding: '12px 16px 14px',
        borderTop: '1px solid var(--color-border-faint)',
      }}>
        <Col>
          <Field label="Trainer">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrainerAvatar name={batch.trainer} size="sm" />
              <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{batch.trainer}</span>
            </div>
          </Field>
          <Field label="Scholars" style={{ marginTop: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>
              {batch.scholars}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 6 }}>enrolled · {batch.trainingDays}</span>
          </Field>
          <Field label="TIP" style={{ marginTop: 10 }}>
            <StatusBadge variant="completed" iconName="check">
              {batch.tipDate}
            </StatusBadge>
          </Field>
        </Col>

        <Col borderLeft>
          <Field label="Training window">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>
              {batch.trainingStart} → {batch.trainingEnd}
            </span>
          </Field>
          <Field label={`Day ${batch.currentDay} of ${batch.totalDays}`} style={{ marginTop: 10 }}>
            <ProgressBar
              percent={batch.progressPct}
            />
          </Field>
        </Col>

        <Col borderLeft>
          <Field label="NTP → Start lag">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: batch.ntpLag === 0 ? 'var(--color-green-dk)' : 'var(--color-text-primary)' }}>
              {batch.ntpLag === 0 ? 'Same-day' : `${batch.ntpLag} days`}
            </span>
          </Field>
          <Field label="Billing deadline" style={{ marginTop: 10 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
              color: tier === 'critical' || tier === 'overdue' ? 'var(--color-red-dk)' :
                     tier === 'warning'  ? 'var(--color-amber-dk)' :
                     'var(--color-text-primary)',
            }}>
              {batch.billingDeadline}
            </span>
          </Field>
          <Field label="BSRS" style={{ marginTop: 10 }}>
            <StatusBadge variant={batch.bsrs ? 'approved' : 'not-approved'} iconName={batch.bsrs ? 'shield-check' : 'shield-off'}>
              {batch.bsrs ? 'APPROVED' : 'NOT APPROVED'}
            </StatusBadge>
          </Field>
        </Col>
      </div>

      {/* Lifecycle pipeline */}
      <div style={{
        padding: '14px 16px 16px',
        borderTop: '1px solid var(--color-border-faint)',
        background: 'var(--color-surface-raised)',
      }}>
        <LifecyclePipeline steps={batch.lifecycle} />
      </div>

      {/* Auto remark */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--color-surface-alt)',
        borderTop: '1px solid var(--color-border-faint)',
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        fontStyle: 'italic',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon name="info-circle" size={13} style={{ color: 'var(--color-text-muted)', fontStyle: 'normal' }} />
        {batch.remark}
      </div>
    </div>
  );
}

function Col({ children, borderLeft }) {
  return (
    <div style={{
      paddingLeft: borderLeft ? 16 : 0,
      borderLeft: borderLeft ? '1px solid var(--color-border-faint)' : 'none',
    }}>{children}</div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 10, color: 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
        fontWeight: 500, marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{children}</div>
    </div>
  );
}

window.BatchCard = BatchCard;
