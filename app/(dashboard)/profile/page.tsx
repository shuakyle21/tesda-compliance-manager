/**
 * My Account — signed-in user's profile, school access, and security surface.
 *
 * Design reference: claude.ai/design project 87e4718b,
 * components/ProfileView.jsx — identity header + 4 PCard columns +
 * full-width permissions grid.
 *
 * Server Component: reads Clerk user via getCurrentUser().
 * Client island: SignOutButton (needs useClerk().signOut()).
 *
 * Figma: Auth · Profile (node 741:2515, Screens page).
 */
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/modules/auth/data/auth';
import { Icon } from '@/shared/ui/Icon';
import { SignOutButton } from '@/modules/auth/ui/SignOutButton';
import { getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import type { IconName } from '@/shared/ui/Icon';
import type { Tenant, UserRole } from '@/shared/types';

// ── Role display maps (mirrored from ProfileView.jsx) ───────────────────────

const ROLE_COLOR: Record<UserRole, string> = {
  owner: 'var(--color-purple)',
  admin: 'var(--color-blue)',
  coordinator: 'var(--color-teal)',
  trainer: 'var(--color-amber)',
  viewer: 'var(--color-text-muted)',
};

const ROLE_BLURB: Record<UserRole, string> = {
  owner: 'Platform owner. Super-admin access across all tenants and system configuration.',
  admin: 'School proprietor. Full control of one school — members, documents, lifecycle and billing.',
  coordinator: 'Read/write access to batches, documents, and billing across the schools you are a member of.',
  trainer: 'Trainer. Manages attendance and documents for an assigned class only.',
  viewer: 'Auditor. View-only access for compliance review across schools.',
};

const ROLE_CAPS: Record<UserRole, string[]> = {
  owner: ['Full platform access', 'Manage all tenants', 'System configuration'],
  admin: [
    'View all batches & documents',
    'Update lifecycle & dates',
    'Verify documents',
    'Manage members & roles',
    'Configure alert rules',
    'Import / export CSV',
  ],
  coordinator: [
    'View all batches & documents',
    'Update lifecycle & dates',
    'Attach & verify documents',
    'Import / export CSV',
    'Access across all of your schools',
  ],
  trainer: [
    'View own class',
    'Mark daily attendance',
    'Attach class documents',
  ],
  viewer: ['View batches & documents (audit only)'],
};

// ── Derived view model ───────────────────────────────────────────────────────

type ClerkProfileUser = Awaited<ReturnType<typeof getCurrentUser>>;

// The role shown is `profiles.role` — the role RLS enforces — never Clerk
// metadata, which is identity only and used to disagree with it (audit I5).
// No profile row yet → least-privileged viewer.
function deriveRole(dbRole: UserRole | null): UserRole {
  return dbRole && dbRole in ROLE_BLURB ? dbRole : 'viewer';
}

function deriveIdentity(clerkUser: NonNullable<ClerkProfileUser>) {
  const firstName = clerkUser.firstName ?? '';
  const lastName = clerkUser.lastName ?? '';
  const name = clerkUser.fullName ?? ([firstName, lastName].filter(Boolean).join(' ') || 'Unknown');
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const initials = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || name[0]?.toUpperCase() || '?';
  return { name, email, initials, userId: clerkUser.id };
}

function deriveActivityLabels(clerkUser: NonNullable<ClerkProfileUser>) {
  const memberSince = clerkUser.createdAt
    ? new Date(clerkUser.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    : 'January 2026';

  const lastActiveTime = clerkUser.lastSignInAt
    ? new Date(clerkUser.lastSignInAt).toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila',
      }) + ' PHT'
    : '14:02 PHT';

  return { memberSince, lastActiveTime };
}

function deriveHasGoogle(clerkUser: NonNullable<ClerkProfileUser>): boolean {
  return clerkUser.externalAccounts?.some((a) => a.provider === 'google') ?? false;
}

/** Pure Clerk-user → display-value translation, kept out of the JSX. */
function deriveProfileView(clerkUser: NonNullable<ClerkProfileUser>, dbRole: UserRole | null) {
  const role = deriveRole(dbRole);
  return {
    role,
    roleColor: ROLE_COLOR[role],
    roleBlurb: ROLE_BLURB[role],
    roleCaps: ROLE_CAPS[role],
    ...deriveIdentity(clerkUser),
    ...deriveActivityLabels(clerkUser),
    hasGoogle: deriveHasGoogle(clerkUser),
  };
}

/**
 * School access — the schools this user is a member of, read live from their
 * `profile_tenant_memberships` rows (RLS-scoped). An empty list is honest, not
 * a fallback: it means the membership rows do not exist yet, so we say so
 * rather than listing anything.
 */
function SchoolAccessCard({
  tenants,
  activeTenantId,
}: {
  tenants: Tenant[];
  activeTenantId: string | null;
}) {
  if (tenants.length === 0) {
    return (
      <PCard icon="folders" title="School access">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0' }}>
          <Icon name="folders" size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 1 }} />
          <span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-text-primary)' }}>
              No school access on record
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 3, lineHeight: 1.5 }}>
              Your schools appear here once your organization completes tenant setup and an
              administrator enrolls you.
            </span>
          </span>
        </div>
      </PCard>
    );
  }

  return (
    <PCard icon="folders" title={`School access · ${tenants.length}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tenants.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px',
            background: t.id === activeTenantId ? 'var(--color-surface-alt)' : 'transparent',
            border: '1px solid var(--color-border-faint)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span className={`org-mark${i > 0 ? ' alt' : ''}`} style={{ width: 26, height: 26, fontSize: 9.5 }}>
              {t.code.slice(0, 3)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {t.name}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
                {t.region} · {t.type}
              </span>
            </span>
            {t.id === activeTenantId && (
              <StatusChip tone="blue" icon="check">Active</StatusChip>
            )}
          </div>
        ))}
      </div>
      {tenants.length > 1 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12, fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
          <Icon name="shield-check" size={13} />
          Access across {tenants.length} schools
        </div>
      )}
    </PCard>
  );
}

function ConnectedAccountsCard({ hasGoogle, email }: { hasGoogle: boolean; email: string }) {
  return (
    <PCard icon="external-link" title="Connected accounts">
      <SecRow
        icon="external-link"
        title="Google"
        desc={hasGoogle ? email : 'Sign in with Google is not linked'}
        status={hasGoogle ? 'Connected' : 'Not connected'}
        // Not linking Google is a choice, not a warning: neutral, not amber.
        statusTone={hasGoogle ? 'green' : 'neutral'}
        last
      />

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-faint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Icon name="timeline" size={13} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}>
            Active sessions
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 9999, background: 'var(--color-green)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ flex: 1 }}>This device · Chrome on macOS</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
            Quezon City · now
          </span>
        </div>
      </div>
    </PCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const clerkUser = await getCurrentUser();
  if (!clerkUser) redirect('/sign-in');

  // Live school memberships and role for this user. Anything other than `ok`
  // (no profile row yet, query failure, or no Supabase env) leaves the list
  // empty, which SchoolAccessCard renders as an honest "not on record" state —
  // never a substituted catalog.
  const profileSnapshot = await getProfileSnapshot(clerkUser.id);
  const tenants: Tenant[] = profileSnapshot.status === 'ok' ? profileSnapshot.profile.tenants : [];
  const activeTenantId = profileSnapshot.status === 'ok' ? profileSnapshot.profile.defaultTenantId : null;

  const {
    role,
    roleColor,
    roleBlurb,
    roleCaps,
    name,
    email,
    initials,
    userId,
    memberSince,
    lastActiveTime,
    hasGoogle,
  } = deriveProfileView(clerkUser, profileSnapshot.status === 'ok' ? profileSnapshot.profile.role : null);

  return (
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Identity header ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 20,
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <span
          className="user-avatar"
          style={{ background: roleColor, width: 64, height: 64, fontSize: 22, flexShrink: 0 }}
          aria-hidden="true"
        >
          {initials}
        </span>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}>
              {name}
            </h1>
            <span className={`role-tag ${role}`} style={{ fontSize: 11 }}>{role}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, overflowWrap: 'anywhere' }}>
            {email}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>
            {roleBlurb}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <ManagedByClerk />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn secondary" disabled aria-disabled="true">
              <Icon name="settings" size={14} />Edit profile
            </button>
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* ── Two-column card grid ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

        {/* Account details */}
        <PCard icon="user" title="Account details"
          action={
            <button type="button" className="btn ghost sm" disabled aria-disabled="true">
              <Icon name="external-link" size={12} />Manage
            </button>
          }
        >
          <PRow label="Full name">{name}</PRow>
          <PRow label="Email">
            {/* Wraps: a long address used to push "verified" out of the card. */}
            <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 8px' }}>
              <span style={{ overflowWrap: 'anywhere' }}>{email}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--color-green-dk)', fontSize: 11.5 }}>
                <Icon name="check" size={12} />Verified
              </span>
            </span>
          </PRow>
          <PRow label="Role">
            <span className={`role-tag ${role}`} style={{ fontSize: 10.5 }}>{role.toUpperCase()}</span>
          </PRow>
          <PRow label="User ID">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>
              {userId}
            </span>
          </PRow>
          <PRow label="Member since">{memberSince}</PRow>
          <PRow label="Last active" last>
            Today · {lastActiveTime}
          </PRow>
        </PCard>

        {/* School access */}
        <SchoolAccessCard tenants={tenants} activeTenantId={activeTenantId} />

        {/* Security & sign-in */}
        <PCard icon="shield-check" title="Security & sign-in" action={<ManagedByClerk />}>
          <SecRow
            icon="settings"
            title="Password"
            desc="Last changed 12 weeks ago"
            status="Set"
            statusTone="green"
            action={<button type="button" className="btn ghost sm" disabled aria-disabled="true" style={{ marginLeft: 8 }}>Change</button>}
          />
          <SecRow
            icon="shield-check"
            title="Two-step verification"
            desc="Authenticator app · TOTP"
            status="On"
            statusTone="green"
            action={<button type="button" className="btn ghost sm" disabled aria-disabled="true" style={{ marginLeft: 8 }}>Manage</button>}
          />
          <SecRow
            icon="user"
            title="Passkeys"
            desc="No passkeys registered"
            status="Off"
            statusTone="amber"
            action={<button type="button" className="btn ghost sm" disabled aria-disabled="true" style={{ marginLeft: 8 }}>Add</button>}
            last
          />
        </PCard>

        {/* Connected accounts + sessions */}
        <ConnectedAccountsCard hasGoogle={hasGoogle} email={email} />

        {/* Access & permissions — spans both columns */}
        <div style={{ gridColumn: '1 / -1' }}>
          <PCard icon="shield-check" title="Access & permissions">
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {roleBlurb} Permissions are assigned by school administrators and cannot be changed from this page.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {roleCaps.map((cap) => (
                <div
                  key={cap}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px',
                    background: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-border-faint)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12, color: 'var(--color-text-primary)',
                  }}
                >
                  <Icon name="check" size={13} style={{ color: 'var(--color-green-dk)', flexShrink: 0 }} />
                  {cap}
                </div>
              ))}
            </div>
          </PCard>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components (profile page only) ───────────────────────────────────────

function ManagedByClerk() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 22, padding: '0 9px', borderRadius: 'var(--radius-md)',
      background: 'var(--color-surface-alt)', border: '1px solid var(--color-border-faint)',
      fontFamily: 'var(--font-sans)', fontSize: 10.5, color: 'var(--color-text-secondary)',
    }}>
      <Icon name="shield-check" size={11} style={{ color: 'var(--color-text-muted)' }} />
      Managed by Clerk
    </span>
  );
}

function PCard({
  icon,
  title,
  action,
  children,
}: {
  icon: IconName;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        // Wraps the action under the title instead of breaking the title in two.
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border-faint)',
        background: 'var(--color-surface-alt)',
      }}>
        <Icon name={icon} size={14} style={{ color: 'var(--color-text-secondary)' }} />
        <h2 style={{
          margin: 0, flex: '1 0 auto', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
        }}>
          {title}
        </h2>
        {action}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </section>
  );
}

function PRow({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline',
      padding: '8px 0',
      borderBottom: last ? 'none' : '0.5px solid var(--color-border-faint)',
    }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-primary)' }}>{children}</span>
    </div>
  );
}

function SecRow({
  icon,
  title,
  desc,
  status,
  statusTone = 'green',
  action,
  last,
}: {
  icon: IconName;
  title: string;
  desc: string;
  status?: string;
  statusTone?: ChipTone;
  action?: ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 0',
      borderBottom: last ? 'none' : '0.5px solid var(--color-border-faint)',
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-alt)',
        border: '1px solid var(--color-border-faint)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        color: 'var(--color-text-secondary)',
      }}>
        <Icon name={icon} size={15} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
          {desc}
        </div>
      </div>
      {status && <StatusChip tone={statusTone} icon={TONE_ICON[statusTone]}>{status}</StatusChip>}
      {action}
    </div>
  );
}

type ChipTone = 'green' | 'amber' | 'blue' | 'neutral';

// Each tone carries its own glyph so the chip never signals by color alone.
const TONE_ICON: Record<ChipTone, IconName> = {
  green: 'check',
  amber: 'alert-circle',
  blue: 'check',
  neutral: 'info-circle',
};

function StatusChip({ tone, icon, children }: { tone: ChipTone; icon: IconName; children: ReactNode }) {
  const neutral = tone === 'neutral';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 22, padding: '0 8px', borderRadius: 'var(--radius-md)',
      background: neutral ? 'var(--color-surface-alt)' : `var(--color-${tone}-lt)`,
      color: neutral ? 'var(--color-text-secondary)' : `var(--color-${tone}-dk)`,
      fontSize: 11, fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      <Icon name={icon} size={12} />
      {children}
    </span>
  );
}
