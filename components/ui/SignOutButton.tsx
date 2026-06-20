'use client';

import { useClerk } from '@clerk/nextjs';
import { Icon } from './Icon';

export function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      className={className ?? 'btn'}
      style={{
        color: 'var(--color-red-dk)',
        border: '1px solid var(--color-red-border)',
        background: 'var(--color-surface)',
      }}
      onMouseEnter={(e) => { (e.currentTarget).style.background = 'var(--color-red-lt)'; }}
      onMouseLeave={(e) => { (e.currentTarget).style.background = 'var(--color-surface)'; }}
      onClick={() => signOut({ redirectUrl: '/sign-in' })}
    >
      <Icon name="x" size={14} />Sign out
    </button>
  );
}
