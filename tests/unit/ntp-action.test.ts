import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBatchesFromNtpAction } from '@/app/(dashboard)/t/[tenantCode]/actions';

const m = vi.hoisted(() => ({
  resolveRouteScope: vi.fn(),
  resolveTrustedRole: vi.fn(),
  appendActivity: vi.fn(),
  getAouYears: vi.fn(),
  uploadEvidence: vi.fn(),
  createBatchesFromNtp: vi.fn(),
  findTakenRqmCodes: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/app/(dashboard)/tenant-scope', () => ({ resolveRouteScope: m.resolveRouteScope }));
vi.mock('@/modules/auth/data/role', () => ({ resolveTrustedRole: m.resolveTrustedRole }));
vi.mock('@/modules/activity/data/activity', () => ({ appendActivity: m.appendActivity }));
vi.mock('@/modules/tenancy/data/tenantAou', () => ({ getAouYears: m.getAouYears }));
vi.mock('@/modules/documents/data/evidence', () => ({ uploadEvidence: m.uploadEvidence }));
vi.mock('@/modules/batches/data/createBatches', () => ({ createBatchesFromNtp: m.createBatchesFromNtp, findTakenRqmCodes: m.findTakenRqmCodes }));
// The other action in the same file imports the batches data layer.
vi.mock('@/modules/batches/data/batches', () => ({ getBatchesSnapshot: vi.fn(), setBatchRqmCode: vi.fn() }));

const TENANT = '11111111-1111-4111-8111-111111111111';
const OK_SCOPE = {
  status: 'ok',
  scope: { tenantId: TENANT, code: 'nen', name: 'Nenita Farm Rice-Based Farm' },
  profile: { id: 'p-1', role: 'coordinator', tenants: [{ id: TENANT, province: 'South Cotabato' }] },
};

const ROW = {
  rqmCode: 'RQM3-2026-CFSP-1263-0009',
  province: 'South Cotabato',
  qualification: 'Agricultural Crops Production NC II',
  approvedSlots: '17',
  totalAmount: '416343.60',
  indicativeStartDate: '2026-04-15',
};

const pdf = () => new File([new Uint8Array([37, 80, 68, 70])], 'notice.pdf', { type: 'application/pdf' });

function form(fields: Record<string, string | File> = {}): FormData {
  const f = new FormData();
  const all: Record<string, string | File> = {
    tenantCode: 'nen',
    schoolName: 'NENITA FARM RICE-BASED FARM',
    receiptDate: '2026-04-16',
    ntpDate: '2026-04-15',
    approvalDate: '2026-04-06',
    rows: JSON.stringify([ROW]),
    ntpFile: pdf(),
    ...fields,
  };
  for (const [k, v] of Object.entries(all)) f.set(k, v);
  return f;
}

const IDLE = { status: 'idle' } as const;

describe('createBatchesFromNtpAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T03:00:00Z'));
    m.resolveRouteScope.mockResolvedValue(OK_SCOPE);
    m.resolveTrustedRole.mockResolvedValue('coordinator');
    m.appendActivity.mockResolvedValue({ ok: true });
    m.getAouYears.mockResolvedValue({ status: 'ok', years: [2026] });
    m.uploadEvidence.mockImplementation(async (i: { tenantId: string; batchId: string; documentKey: string; filename: string }) => ({
      status: 'ok',
      path: `${i.tenantId}/${i.batchId}/${i.documentKey}/${i.filename}`,
    }));
    m.findTakenRqmCodes.mockResolvedValue({ status: 'ok', codes: [] });
    m.createBatchesFromNtp.mockImplementation(async (a: { rows: { id: string }[] }) => ({ status: 'created', batchIds: a.rows.map((r) => r.id) }));
  });

  it('denies a caller who is not a member of the school, before reading any file', async () => {
    m.resolveRouteScope.mockResolvedValue({ status: 'not-a-member', fallback: null });
    expect(await createBatchesFromNtpAction(IDLE, form())).toEqual({ status: 'denied' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it.each(['viewer', 'trainer'])('denies a %s without uploading or writing', async (role) => {
    m.resolveTrustedRole.mockResolvedValue(role);
    expect(await createBatchesFromNtpAction(IDLE, form())).toEqual({ status: 'denied' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
    expect(m.createBatchesFromNtp).not.toHaveBeenCalled();
  });

  it('re-validates the rows on the server and uploads nothing when they are invalid', async () => {
    const result = await createBatchesFromNtpAction(IDLE, form({ rows: JSON.stringify([{ ...ROW, approvedSlots: '0' }]) }));
    expect(result).toEqual({ status: 'invalid', message: 'Row 1: approved slots must be a whole number of at least 1.' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('refuses a receipt date that is in the future in Manila', async () => {
    const result = await createBatchesFromNtpAction(IDLE, form({ receiptDate: '2026-04-21' }));
    expect(result).toMatchObject({ status: 'invalid' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('refuses an NTP file that is not a PDF', async () => {
    const png = new File([new Uint8Array([1])], 'scan.png', { type: 'image/png' });
    expect(await createBatchesFromNtpAction(IDLE, form({ ntpFile: png }))).toEqual({ status: 'invalid', message: 'The Notice to Proceed must be a PDF.' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('refuses a file named .pdf whose content is not a PDF', async () => {
    const fake = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'notice.pdf', { type: 'application/pdf' });
    expect(await createBatchesFromNtpAction(IDLE, form({ ntpFile: fake }))).toEqual({ status: 'invalid', message: 'The Notice to Proceed must be a PDF.' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('treats malformed rows JSON as no rows', async () => {
    expect(await createBatchesFromNtpAction(IDLE, form({ rows: '{not json' }))).toMatchObject({ status: 'invalid' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('asks for the AOU when none is on file for the year and none is attached, uploading nothing', async () => {
    m.getAouYears.mockResolvedValue({ status: 'ok', years: [2025] });
    expect(await createBatchesFromNtpAction(IDLE, form())).toEqual({ status: 'aou-required', year: 2026 });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('uploads the NTP first, then creates the batches with server-made ids and the stored path', async () => {
    const result = await createBatchesFromNtpAction(IDLE, form());
    expect(result).toEqual({ status: 'saved', codes: ['RQM3-2026-CFSP-1263-0009'], logFailed: false });

    expect(m.uploadEvidence).toHaveBeenCalledTimes(1);
    const upload = m.uploadEvidence.mock.calls[0]![0];
    expect(upload).toMatchObject({ tenantId: TENANT, documentKey: 'ntp', filename: 'NTP-RQM3-2026-CFSP-1263-0009.pdf', mimeType: 'application/pdf' });

    const call = m.createBatchesFromNtp.mock.calls[0]![0];
    expect(call.rows[0].id).toBe(upload.batchId);
    expect(call).toMatchObject({
      tenantId: TENANT,
      receiptDate: '2026-04-16',
      ntpPath: `${TENANT}/${upload.batchId}/ntp/NTP-RQM3-2026-CFSP-1263-0009.pdf`,
      aouPath: null,
    });
    expect(m.uploadEvidence.mock.invocationCallOrder[0]).toBeLessThan(m.createBatchesFromNtp.mock.invocationCallOrder[0]!);
    expect(m.appendActivity).toHaveBeenCalledTimes(1);
  });

  it('uploads the AOU alongside the NTP when none is on file, and passes its path', async () => {
    m.getAouYears.mockResolvedValue({ status: 'ok', years: [] });
    const aou = new File([new Uint8Array([37, 80, 68, 70])], 'affidavit.pdf', { type: '' });
    expect(await createBatchesFromNtpAction(IDLE, form({ aouFile: aou }))).toMatchObject({ status: 'saved' });
    const keys = m.uploadEvidence.mock.calls.map((c) => c[0].documentKey);
    expect(keys).toEqual(['ntp', 'aou']);
    expect(m.uploadEvidence.mock.calls[1]![0]).toMatchObject({ filename: 'AOU-2026.pdf', mimeType: 'application/pdf' });
    expect(m.createBatchesFromNtp.mock.calls[0]![0].aouPath).toMatch(/\/aou\/AOU-2026\.pdf$/);
  });

  it('does not upload an attached AOU when one is already on file for the year', async () => {
    const aou = new File([new Uint8Array([1])], 'affidavit.pdf', { type: 'application/pdf' });
    await createBatchesFromNtpAction(IDLE, form({ aouFile: aou }));
    expect(m.uploadEvidence.mock.calls.map((c) => c[0].documentKey)).toEqual(['ntp']);
  });

  it('writes nothing when the upload fails', async () => {
    m.uploadEvidence.mockResolvedValue({ status: 'sync-failed', error: 'x' });
    expect(await createBatchesFromNtpAction(IDLE, form())).toMatchObject({ status: 'error' });
    expect(m.createBatchesFromNtp).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'duplicate' }, { status: 'invalid', message: 'One of these RQM codes is already recorded on a batch in this school.' }],
    [{ status: 'unknown-program', codes: 'RESP' }, { status: 'invalid', message: 'This Notice to Proceed has a program that is not set up in the app: RESP.' }],
    [{ status: 'aou-required', year: 2026 }, { status: 'aou-required', year: 2026 }],
  ])('maps a refused save to the modal state', async (refusal, expected) => {
    m.createBatchesFromNtp.mockResolvedValue(refusal);
    expect(await createBatchesFromNtpAction(IDLE, form())).toEqual(expected);
    expect(m.appendActivity).not.toHaveBeenCalled();
  });

  it('refuses a taken code before uploading anything, naming it', async () => {
    m.findTakenRqmCodes.mockResolvedValue({ status: 'ok', codes: ['RQM3-2026-CFSP-1263-0009'] });
    expect(await createBatchesFromNtpAction(IDLE, form())).toEqual({
      status: 'invalid',
      message: 'RQM3-2026-CFSP-1263-0009 is already recorded on a batch in this school.',
    });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
    expect(m.createBatchesFromNtp).not.toHaveBeenCalled();
  });

  it('names every taken code, in the plural', async () => {
    const second = { ...ROW, rqmCode: 'RQM3-2026-CFSP-1263-0010' };
    m.findTakenRqmCodes.mockResolvedValue({ status: 'ok', codes: [ROW.rqmCode, second.rqmCode] });
    expect(await createBatchesFromNtpAction(IDLE, form({ rows: JSON.stringify([ROW, second]) }))).toEqual({
      status: 'invalid',
      message: 'RQM3-2026-CFSP-1263-0009, RQM3-2026-CFSP-1263-0010 are already recorded on batches in this school.',
    });
  });

  it.each(['sync-failed', 'unconfigured'])('returns the save-failed state without uploading when the code check is %s', async (status) => {
    m.findTakenRqmCodes.mockResolvedValue({ status });
    expect(await createBatchesFromNtpAction(IDLE, form())).toEqual({ status: 'error', message: "The batches couldn't be saved. Nothing was saved. Try again." });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
    expect(m.createBatchesFromNtp).not.toHaveBeenCalled();
  });

  it('checks the validated codes for the scope school before the first upload', async () => {
    await createBatchesFromNtpAction(IDLE, form({ rows: JSON.stringify([{ ...ROW, rqmCode: ' rqm3-2026-cfsp-1263-0009 ' }]) }));
    expect(m.findTakenRqmCodes).toHaveBeenCalledWith(TENANT, ['RQM3-2026-CFSP-1263-0009']);
    expect(m.findTakenRqmCodes.mock.invocationCallOrder[0]).toBeLessThan(m.uploadEvidence.mock.invocationCallOrder[0]!);
  });

  it('refuses a Notice to Proceed for another school, uploading nothing', async () => {
    const result = await createBatchesFromNtpAction(IDLE, form({ schoolName: 'Other Training Center' }));
    expect(result).toMatchObject({ status: 'invalid', message: expect.stringContaining('different school') });
    expect(m.findTakenRqmCodes).not.toHaveBeenCalled();
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('compares against the school from the URL scope: a posted name matching another school is refused', async () => {
    m.resolveRouteScope.mockResolvedValue({ ...OK_SCOPE, scope: { ...OK_SCOPE.scope, name: 'Other Training Center' } });
    // The form names the school the scope used to have; the scope now says otherwise.
    const result = await createBatchesFromNtpAction(IDLE, form());
    expect(result).toMatchObject({ status: 'invalid', message: expect.stringContaining('this school is "Other Training Center"') });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
    // The same name posted as the NTP school is accepted only because it equals the scope name.
    expect(await createBatchesFromNtpAction(IDLE, form({ schoolName: 'Other Training Center' }))).toMatchObject({ status: 'saved' });
  });

  it('cannot be made to match by extra form fields that carry a school name', async () => {
    const result = await createBatchesFromNtpAction(
      IDLE,
      form({ schoolName: 'Other Training Center', name: 'Other Training Center', schoolRegisteredName: 'Other Training Center', tenantName: 'Other Training Center' }),
    );
    expect(result).toMatchObject({ status: 'invalid', message: expect.stringContaining('this school is "Nenita Farm Rice-Based Farm"') });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('refuses a row in another province, uploading nothing', async () => {
    const result = await createBatchesFromNtpAction(IDLE, form({ rows: JSON.stringify([{ ...ROW, province: 'Laguna' }]) }));
    expect(result).toEqual({ status: 'invalid', message: 'Row 1 is for a different province. This school is in South Cotabato.' });
    expect(m.uploadEvidence).not.toHaveBeenCalled();
  });

  it('flags logFailed when the activity entry cannot be written', async () => {
    m.appendActivity.mockResolvedValue({ ok: false });
    expect(await createBatchesFromNtpAction(IDLE, form())).toMatchObject({ status: 'saved', logFailed: true });
  });
});
