import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setBatchRqmCodeAction } from '@/app/(dashboard)/t/[tenantCode]/actions';

const m = vi.hoisted(() => ({
  resolveRouteScope: vi.fn(),
  resolveTrustedRole: vi.fn(),
  setBatchRqmCode: vi.fn(),
  getBatchesSnapshot: vi.fn(),
  appendActivity: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/app/(dashboard)/tenant-scope', () => ({ resolveRouteScope: m.resolveRouteScope }));
vi.mock('@/modules/auth/data/role', () => ({ resolveTrustedRole: m.resolveTrustedRole }));
vi.mock('@/modules/activity/data/activity', () => ({ appendActivity: m.appendActivity }));
vi.mock('@/modules/batches/data/batches', () => ({
  getBatchesSnapshot: m.getBatchesSnapshot,
  setBatchRqmCode: m.setBatchRqmCode,
}));

const OK_SCOPE = {
  status: 'ok',
  scope: { tenantId: 't-1' },
  profile: { id: 'p-1', role: 'coordinator', tenants: [{ id: 't-1', tesdaProviderCode: '0000' }] },
};

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries({ tenantCode: 'sch', batchCode: 'BAT-1', rqmCode: '', expectedPrevious: '', ...fields })) f.set(k, v);
  return f;
}

const IDLE = { status: 'idle' } as const;

describe('setBatchRqmCodeAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.resolveRouteScope.mockResolvedValue(OK_SCOPE);
    m.resolveTrustedRole.mockResolvedValue('coordinator');
    m.appendActivity.mockResolvedValue({ ok: true });
  });

  it('denies a caller who is not a member of the school', async () => {
    m.resolveRouteScope.mockResolvedValue({ status: 'not-a-member', fallback: null });
    expect(await setBatchRqmCodeAction(IDLE, form({}))).toEqual({ status: 'denied' });
    expect(m.setBatchRqmCode).not.toHaveBeenCalled();
  });

  it('reports an error, not a denial, when the profile could not be loaded', async () => {
    m.resolveRouteScope.mockResolvedValue({ status: 'unknown' });
    expect(await setBatchRqmCodeAction(IDLE, form({}))).toMatchObject({ status: 'error' });
    expect(m.setBatchRqmCode).not.toHaveBeenCalled();
  });

  it('denies a viewer without writing', async () => {
    m.resolveTrustedRole.mockResolvedValue('viewer');
    expect(await setBatchRqmCodeAction(IDLE, form({ rqmCode: 'RQM3-2026-CFSP-0000-0001' }))).toEqual({ status: 'denied' });
    expect(m.setBatchRqmCode).not.toHaveBeenCalled();
  });

  it('clears the code when the field is empty and a code was recorded', async () => {
    m.setBatchRqmCode.mockResolvedValue({ status: 'saved', batchUuid: 'b-1', from: 'OLD', to: null });
    const result = await setBatchRqmCodeAction(IDLE, form({ expectedPrevious: 'OLD' }));
    expect(m.setBatchRqmCode).toHaveBeenCalledWith({ tenantId: 't-1', batchCode: 'BAT-1', expectedPrevious: 'OLD', next: null });
    expect(result).toMatchObject({ status: 'saved', code: null, logFailed: false });
  });

  it('flags logFailed when the activity entry cannot be written', async () => {
    m.setBatchRqmCode.mockResolvedValue({ status: 'saved', batchUuid: 'b-1', from: 'OLD', to: null });
    m.appendActivity.mockResolvedValue({ ok: false });
    expect(await setBatchRqmCodeAction(IDLE, form({ expectedPrevious: 'OLD' }))).toMatchObject({ status: 'saved', logFailed: true });
  });
});
