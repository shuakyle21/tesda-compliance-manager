import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createSupabaseServiceClientMock, rpcMock } = vi.hoisted(() => ({
  createSupabaseServiceClientMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: createSupabaseServiceClientMock,
}));

const PROFILE_ID = '9ba49067-26ef-4a66-b8a3-b6a1dc9da128';
const TENANT_ID = '5a622db0-b89f-4e57-adf9-fbded488f77d';

function profilesQuery() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: PROFILE_ID }, error: null }),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  createSupabaseServiceClientMock.mockImplementation(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`);
      return profilesQuery();
    }),
    rpc: rpcMock,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function provisionExistingProfile() {
  const { upsertProfileFromClerkUser } = await import('@/modules/auth/data/provisioning');

  return upsertProfileFromClerkUser({
    id: 'user_123',
    email: 'invitee@example.com',
    fullName: 'Invited User',
    publicMetadata: {
      tvicamsRole: 'viewer',
      tvicamsTenantId: TENANT_ID,
    },
  });
}

describe('invitation membership provisioning', () => {
  it('uses the atomic membership RPC', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await expect(provisionExistingProfile()).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('ensure_profile_tenant_membership', {
      target_profile_id: PROFILE_ID,
      target_tenant_id: TENANT_ID,
    });
  });

  it('accepts a concurrent duplicate membership', async () => {
    rpcMock.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    await expect(provisionExistingProfile()).resolves.toBeUndefined();
  });

  it('logs and rethrows other membership failures', async () => {
    const membershipError = { code: '42501', message: 'permission denied' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    rpcMock.mockResolvedValue({ error: membershipError });

    await expect(provisionExistingProfile()).rejects.toBe(membershipError);
    expect(consoleError).toHaveBeenCalledWith(
      `Clerk invitation grant: tenant membership failed for profile "${PROFILE_ID}"`,
      membershipError,
    );
  });
});
