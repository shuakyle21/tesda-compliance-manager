/**
 * STEP 2 — Data Layer: Seed Module (ported from the design handoff's data/seed.js)
 *
 * This is a faithful TypeScript port of the prototype's seed data, INCLUDING the
 * three enrichment passes that run once at module load:
 *   1. enrichBatches   — recompute schedule-aware day counts + splice ENTRE stage
 *   2. buildRosters    — generate per-scholar T2MIS roster + EGACE funnel counts
 *   3. enrichTrainerCurriculum — competency pacing + schedule adjustments
 *
 * Because Next.js evaluates a module once, these passes run a single time and
 * every consumer (server or client) sees the same enriched, frozen data — the
 * exact analogue of the prototype's `window.*` globals.
 *
 * When the Laravel/Supabase backend lands, replace the exported constants with
 * async fetchers; the component call sites stay identical.
 */

import type {
  Tenant, User, DocumentRequirement, Batch, ActivityEvent, AlertEntry,
  Snapshot, EgaceStage, ScholarRow, Competency, ScheduleAdjustment,
} from '@/shared/types';

/* ----- Tenants (Clerk Organizations — TVI schools) ---------- */
export const TENANTS: Tenant[] = [
  { id: 'tnt_akb',    code: 'AKB',  color: 'blue',  name: 'AKB Technical Vocational Inc.',  region: 'Region IV-A · Laguna',     type: 'Technical-vocational institute', plan: 'Pro', activeBatches: 1, totalScholars: 15 },
  { id: 'tnt_j3ed',   code: 'J3ED', color: 'green', name: 'J3ED Farm School',               region: 'Region IV-A · Quezon',     type: 'Farm school',                    plan: 'Pro', activeBatches: 1, totalScholars: 15 },
  { id: 'tnt_nenita', code: 'NEN',  color: 'amber', name: 'Nenita Farm Rice-Based School',  region: 'Region III · Nueva Ecija', type: 'Rice-based farm school',         plan: 'Pro', activeBatches: 1, totalScholars: 17 },
];

/* ----- Users ------------------------------------------------ */
export const USERS: User[] = [
  { id: 'u_pia', name: 'Pia Buenaventura', email: 'pia@akb-tvi.ph',        role: 'admin', initials: 'PB', tenantIds: ['tnt_akb'] },
  { id: 'u_red', name: 'Rodel Esteban',    email: 'rodel@j3edfarm.ph',     role: 'admin', initials: 'RE', tenantIds: ['tnt_j3ed'] },
  { id: 'u_nen', name: 'Nenita Dela Cruz', email: 'nenita@nenita-farm.ph', role: 'admin', initials: 'ND', tenantIds: ['tnt_nenita'] },

  { id: 'u_kcr', name: 'Karina Cruz',    email: 'karina.registrar@tesda-iv.ph', role: 'coordinator', initials: 'KC', tenantIds: ['tnt_akb', 'tnt_j3ed', 'tnt_nenita'] },
  { id: 'u_jm',  name: 'Justin Morales', email: 'justin.registrar@tesda-iv.ph', role: 'coordinator', initials: 'JM', tenantIds: ['tnt_akb', 'tnt_j3ed'] },

  { id: 'u_acg', name: 'Archelyn Gagula',      email: 'archelyn@akb-tvi.ph',    role: 'trainer', initials: 'AG', tenantIds: ['tnt_akb'],    assignedBatchIds: ['BAT-1'] },
  { id: 'u_jma', name: 'Julius Maravilla',     email: 'julius@j3edfarm.ph',     role: 'trainer', initials: 'JM', tenantIds: ['tnt_j3ed'],   assignedBatchIds: ['BAT-2'] },
  { id: 'u_agp', name: 'Agustin Pudadera III', email: 'agustin@nenita-farm.ph', role: 'trainer', initials: 'AP', tenantIds: ['tnt_nenita'], assignedBatchIds: ['BAT-3'] },

  { id: 'u_rcm', name: 'Rosa C. Mendiola', email: 'auditor@tesda.gov.ph', role: 'viewer', initials: 'RM', tenantIds: ['tnt_akb', 'tnt_j3ed', 'tnt_nenita'] },
];

/* ----- Required document checklist (TESDA Circular 014-2026) - */
export const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  { key: 'aou',            label: 'Application & Offer Undertaking (AOU)', stage: 'aou',    critical: true,  icon: 'send' },
  { key: 'ntp',            label: 'Notice to Proceed (NTP)',              stage: 'ntp',    critical: true,  icon: 'file-invoice' },
  { key: 'tip_report',     label: 'TIP Conducted Report',                 stage: 'tip',    critical: true,  icon: 'presentation' },
  { key: 'training_sched', label: 'Approved Training Schedule',           stage: 'train',  critical: true,  icon: 'calendar' },
  { key: 'master_list',    label: 'Scholar Master List (Annex A)',        stage: 'ntp',    critical: true,  icon: 'users' },
  { key: 'attendance',     label: 'Daily Attendance Sheets',              stage: 'train',  critical: true,  icon: 'file-text' },
  { key: 'trainer_qual',   label: 'Trainer Qualification Records',        stage: 'aou',    critical: false, icon: 'user' },
  { key: 'progress_rpt',   label: 'Weekly Progress Report',               stage: 'train',  critical: false, icon: 'chart-dots' },
  { key: 'assessment',     label: 'Assessment Results (CoR)',             stage: 'assess', critical: true,  icon: 'file-check' },
  { key: 'bsrs',           label: 'BSRS Approval Slip',                   stage: 'bill',   critical: true,  icon: 'shield-check' },
  { key: 'nc_cert',        label: 'NC Certificates Issued',               stage: 'bill',   critical: false, icon: 'certificate' },
  { key: 'billing_rpt',    label: 'Billing & Liquidation Report',         stage: 'bill',   critical: true,  icon: 'receipt' },
];

/* ----- Batches (with embedded document state) --------------- */
export const BATCHES: Batch[] = [
  {
    id: 'BAT-1', tenantId: 'tnt_akb', name: 'AKB Tech-Voc · Batch 1',
    qualification: 'Cookery NC II', program: 'TWSP', ncLevel: 'NC II',
    trainer: 'Archelyn Gagula', trainerId: 'u_acg', scholars: 15,
    trainingDays: 'weekdays', trainingDaySchedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    notes: '', trainingStart: 'Apr 21', trainingEnd: 'Jun 8, 2026', duration: 42,
    currentDay: 31, totalDays: 42, progressPct: 74, ntpLag: 7, tipDate: 'Apr 21',
    billingDeadline: 'Jun 18, 2026', daysToBilling: 3, bsrs: true,
    remark: 'Training ongoing — Day 31 of 42. Earliest billing deadline. 1 critical document still missing.',
    status: 'ongoing',
    lifecycle: [
      { key: 'aou',    label: 'AOU',      status: 'done',    date: 'Apr 9' },
      { key: 'ntp',    label: 'NTP',      status: 'done',    date: 'Apr 15' },
      { key: 'tip',    label: 'TIP',      status: 'done',    date: 'Apr 21' },
      { key: 'train',  label: 'TRAINING', status: 'active',  date: 'Apr 21 – Jun 8' },
      { key: 'assess', label: 'ASSESS',   status: 'pending', date: 'Pending' },
      { key: 'bill',   label: 'BILLING',  status: 'pending', date: 'By Jun 18' },
    ],
    documents: {
      aou:            { status: 'verified',  url: 'storage://akb/aou-bat1',    updated: 'Apr 09', source: 'Supabase' },
      ntp:            { status: 'verified',  url: 'storage://akb/ntp-bat1',    updated: 'Apr 15', source: 'Supabase' },
      tip_report:     { status: 'verified',  url: 'storage://akb/tip-bat1',    updated: 'Apr 22', source: 'Supabase' },
      training_sched: { status: 'verified',  url: 'storage://akb/sched-bat1',  updated: 'Apr 18', source: 'Supabase' },
      master_list:    { status: 'verified',  url: 'storage://akb/master-bat1', updated: 'Apr 14', source: 'Supabase' },
      attendance:     { status: 'submitted', url: 'storage://akb/att-bat1',    updated: 'May 20', source: 'Supabase' },
      trainer_qual:   { status: 'verified',  url: 'storage://akb/tq-bat1',     updated: 'Apr 02', source: 'Storage' },
      progress_rpt:   { status: 'submitted', url: 'storage://akb/wpr-bat1',    updated: 'May 18', source: 'Supabase' },
      assessment:     { status: 'pending',   url: null, updated: null, source: null },
      bsrs:           { status: 'verified',  url: 'storage://akb/bsrs-bat1',   updated: 'May 14', source: 'Supabase' },
      nc_cert:        { status: 'pending',   url: null, updated: null, source: null },
      billing_rpt:    { status: 'missing',   url: null, updated: null, source: null },
    },
  },
  {
    id: 'BAT-2', tenantId: 'tnt_j3ed', name: 'J3ED Farm School · Batch 1',
    qualification: 'Agri Crops Production NC I', program: 'CFSP', ncLevel: 'NC I',
    trainer: 'Julius Maravilla', trainerId: 'u_jma', scholars: 15,
    trainingDays: 'Mon · Wed · Fri', trainingDaySchedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    notes: 'BSRS approved — coordinate with cooperative head for billing submission.',
    trainingStart: 'Apr 28', trainingEnd: 'Jun 22, 2026', duration: 38,
    currentDay: 35, totalDays: 38, progressPct: 92, ntpLag: 0, tipDate: 'Apr 28',
    billingDeadline: 'Jul 1, 2026', daysToBilling: 14, bsrs: true,
    remark: '92% training complete — READY FOR BILLING. BSRS approved. Billing report and weekly progress report still outstanding.',
    status: 'ongoing',
    lifecycle: [
      { key: 'aou',    label: 'AOU',      status: 'done',    date: 'Apr 12' },
      { key: 'ntp',    label: 'NTP',      status: 'done',    date: 'Apr 28' },
      { key: 'tip',    label: 'TIP',      status: 'done',    date: 'Apr 28' },
      { key: 'train',  label: 'TRAINING', status: 'active',  date: 'Apr 28 – Jun 22' },
      { key: 'assess', label: 'ASSESS',   status: 'pending', date: 'Pending' },
      { key: 'bill',   label: 'BILLING',  status: 'pending', date: 'By Jul 1' },
    ],
    documents: {
      aou:            { status: 'verified',  url: 'storage://akb/aou-bat2',    updated: 'Apr 12', source: 'Supabase' },
      ntp:            { status: 'verified',  url: 'storage://akb/ntp-bat2',    updated: 'Apr 28', source: 'Supabase' },
      tip_report:     { status: 'verified',  url: 'storage://akb/tip-bat2',    updated: 'Apr 29', source: 'Supabase' },
      training_sched: { status: 'verified',  url: 'storage://akb/sched-bat2',  updated: 'Apr 22', source: 'Supabase' },
      master_list:    { status: 'verified',  url: 'storage://akb/master-bat2', updated: 'Apr 25', source: 'Supabase' },
      attendance:     { status: 'submitted', url: 'storage://akb/att-bat2',    updated: 'May 19', source: 'Supabase' },
      trainer_qual:   { status: 'verified',  url: 'storage://akb/tq-bat2',     updated: 'Apr 02', source: 'Storage' },
      progress_rpt:   { status: 'missing',   url: null, updated: null, source: null },
      assessment:     { status: 'pending',   url: null, updated: null, source: null },
      bsrs:           { status: 'verified',  url: 'storage://akb/bsrs-bat2',   updated: 'May 21', source: 'Supabase' },
      nc_cert:        { status: 'pending',   url: null, updated: null, source: null },
      billing_rpt:    { status: 'missing',   url: null, updated: null, source: null },
    },
  },
  {
    id: 'BAT-3', tenantId: 'tnt_nenita', name: 'Nenita Rice-Based Farm · Batch 1',
    qualification: 'Rice Machinery Operations NC II', program: 'CFSP', ncLevel: 'NC II',
    trainer: 'Agustin Pudadera III', trainerId: 'u_agp', scholars: 17,
    trainingDays: 'weekdays', trainingDaySchedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    notes: '', trainingStart: 'May 5', trainingEnd: 'Jul 10, 2026', duration: 47,
    currentDay: 13, totalDays: 47, progressPct: 28, ntpLag: 5, tipDate: 'May 5',
    billingDeadline: 'Jul 18, 2026', daysToBilling: 28, bsrs: true,
    remark: 'Early training phase. Document set complete through TIP.',
    status: 'ongoing',
    lifecycle: [
      { key: 'aou',    label: 'AOU',      status: 'done',    date: 'Apr 18' },
      { key: 'ntp',    label: 'NTP',      status: 'done',    date: 'Apr 30' },
      { key: 'tip',    label: 'TIP',      status: 'done',    date: 'May 5' },
      { key: 'train',  label: 'TRAINING', status: 'active',  date: 'May 5 – Jul 10' },
      { key: 'assess', label: 'ASSESS',   status: 'pending', date: 'Pending' },
      { key: 'bill',   label: 'BILLING',  status: 'pending', date: 'By Jul 18' },
    ],
    documents: {
      aou:            { status: 'verified',  url: 'storage://akb/aou-bat3',    updated: 'Apr 18', source: 'Supabase' },
      ntp:            { status: 'verified',  url: 'storage://akb/ntp-bat3',    updated: 'Apr 30', source: 'Supabase' },
      tip_report:     { status: 'verified',  url: 'storage://akb/tip-bat3',    updated: 'May 06', source: 'Supabase' },
      training_sched: { status: 'verified',  url: 'storage://akb/sched-bat3',  updated: 'Apr 28', source: 'Supabase' },
      master_list:    { status: 'verified',  url: 'storage://akb/master-bat3', updated: 'May 02', source: 'Supabase' },
      attendance:     { status: 'submitted', url: 'storage://akb/att-bat3',    updated: 'May 20', source: 'Supabase' },
      trainer_qual:   { status: 'verified',  url: 'storage://akb/tq-bat3',     updated: 'Apr 02', source: 'Storage' },
      progress_rpt:   { status: 'submitted', url: 'storage://akb/wpr-bat3',    updated: 'May 17', source: 'Supabase' },
      assessment:     { status: 'pending',   url: null, updated: null, source: null },
      bsrs:           { status: 'verified',  url: 'storage://akb/bsrs-bat3',   updated: 'May 14', source: 'Supabase' },
      nc_cert:        { status: 'pending',   url: null, updated: null, source: null },
      billing_rpt:    { status: 'pending',   url: null, updated: null, source: null },
    },
  },
  {
    id: 'BAT-7', tenantId: 'tnt_nenita', name: 'Nenita Rice-Based Farm · Batch 2',
    qualification: 'Rice Machinery Operations NC II', program: 'CFSP', ncLevel: 'NC II',
    trainer: 'Lourdes Catalan', trainerId: 'u_agp', scholars: 22,
    trainingDays: 'weekdays', trainingDaySchedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    notes: '', trainingStart: 'Apr 14', trainingEnd: 'Jun 19, 2026', duration: 47,
    currentDay: 38, totalDays: 47, progressPct: 81, ntpLag: 3, tipDate: 'Apr 9',
    billingDeadline: 'Jun 27, 2026', daysToBilling: 16, bsrs: true,
    remark: 'Approaching billing readiness — weekly progress report still outstanding.',
    status: 'ongoing',
    lifecycle: [
      { key: 'aou',    label: 'AOU',      status: 'done',    date: 'Apr 2' },
      { key: 'ntp',    label: 'NTP',      status: 'done',    date: 'Apr 9' },
      { key: 'tip',    label: 'TIP',      status: 'done',    date: 'Apr 9' },
      { key: 'train',  label: 'TRAINING', status: 'active',  date: 'Apr 14 – Jun 19' },
      { key: 'assess', label: 'ASSESS',   status: 'pending', date: 'Pending' },
      { key: 'bill',   label: 'BILLING',  status: 'pending', date: 'By Jun 27' },
    ],
    documents: {
      aou:            { status: 'verified',  url: 'storage://akb/aou-bat7',    updated: 'Apr 02', source: 'Supabase' },
      ntp:            { status: 'verified',  url: 'storage://akb/ntp-bat7',    updated: 'Apr 09', source: 'Supabase' },
      tip_report:     { status: 'verified',  url: 'storage://akb/tip-bat7',    updated: 'Apr 10', source: 'Supabase' },
      training_sched: { status: 'verified',  url: 'storage://akb/sched-bat7',  updated: 'Apr 08', source: 'Supabase' },
      master_list:    { status: 'verified',  url: 'storage://akb/master-bat7', updated: 'Apr 05', source: 'Supabase' },
      attendance:     { status: 'submitted', url: 'storage://akb/att-bat7',    updated: 'May 21', source: 'Supabase' },
      trainer_qual:   { status: 'verified',  url: 'storage://akb/tq-bat7',     updated: 'Mar 28', source: 'Storage' },
      progress_rpt:   { status: 'missing',   url: null, updated: null, source: null },
      assessment:     { status: 'pending',   url: null, updated: null, source: null },
      bsrs:           { status: 'verified',  url: 'storage://akb/bsrs-bat7',   updated: 'May 18', source: 'Supabase' },
      nc_cert:        { status: 'pending',   url: null, updated: null, source: null },
      billing_rpt:    { status: 'missing',   url: null, updated: null, source: null },
    },
  },
  {
    id: 'BAT-0', tenantId: 'tnt_j3ed', name: 'J3ED Farm School · Batch 2025-B',
    qualification: 'Agri Crops Production NC I', program: 'CFSP', ncLevel: 'NC I',
    trainer: 'Julius Maravilla', trainerId: 'u_jma', scholars: 20,
    trainingDays: 'weekdays', trainingDaySchedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    notes: '6-month employment follow-up due Jun 15, 2026.',
    trainingStart: 'Nov 4, 2025', trainingEnd: 'Dec 15, 2025', duration: 30,
    currentDay: 30, totalDays: 30, progressPct: 100, ntpLag: 3, tipDate: 'Nov 4, 2025',
    billingDeadline: 'Dec 30, 2025', daysToBilling: 0, bsrs: true,
    remark: 'Completed Dec 2025. Within mandatory 6-month employment follow-up window.',
    status: 'completed',
    lifecycle: [
      { key: 'aou',    label: 'AOU',      status: 'done', date: 'Oct 20' },
      { key: 'ntp',    label: 'NTP',      status: 'done', date: 'Oct 30' },
      { key: 'tip',    label: 'TIP',      status: 'done', date: 'Nov 4' },
      { key: 'train',  label: 'TRAINING', status: 'done', date: 'Nov 4 – Dec 15' },
      { key: 'assess', label: 'ASSESS',   status: 'done', date: 'Dec 18' },
      { key: 'bill',   label: 'BILLING',  status: 'done', date: 'Dec 30' },
    ],
    documents: {
      aou:            { status: 'verified', url: 'storage://j3ed/aou-bat0',    updated: 'Oct 20', source: 'Supabase' },
      ntp:            { status: 'verified', url: 'storage://j3ed/ntp-bat0',    updated: 'Oct 30', source: 'Supabase' },
      tip_report:     { status: 'verified', url: 'storage://j3ed/tip-bat0',    updated: 'Nov 05', source: 'Supabase' },
      training_sched: { status: 'verified', url: 'storage://j3ed/sched-bat0',  updated: 'Oct 28', source: 'Supabase' },
      master_list:    { status: 'verified', url: 'storage://j3ed/master-bat0', updated: 'Nov 01', source: 'Supabase' },
      attendance:     { status: 'verified', url: 'storage://j3ed/att-bat0',    updated: 'Dec 15', source: 'Supabase' },
      trainer_qual:   { status: 'verified', url: 'storage://j3ed/tq-bat0',     updated: 'Oct 10', source: 'Storage' },
      progress_rpt:   { status: 'verified', url: 'storage://j3ed/wpr-bat0',    updated: 'Dec 12', source: 'Supabase' },
      assessment:     { status: 'verified', url: 'storage://j3ed/assess-bat0', updated: 'Dec 18', source: 'Supabase' },
      bsrs:           { status: 'verified', url: 'storage://j3ed/bsrs-bat0',   updated: 'Dec 05', source: 'Supabase' },
      nc_cert:        { status: 'verified', url: 'storage://j3ed/cert-bat0',   updated: 'Dec 22', source: 'Supabase' },
      billing_rpt:    { status: 'verified', url: 'storage://j3ed/bill-bat0',   updated: 'Dec 30', source: 'Supabase' },
    },
  },
];

/* ----- Activity log (audit + system events) ----------------- */
export const ACTIVITY: ActivityEvent[] = [
  { id: 'a1',  when: 'today · 14:02', tone: 'green', who: 'System',         role: 'system',      text: 'BAT-2 J3ED Farm reached 92% training progress — signalled READY FOR BILLING. Coordinator notified.' },
  { id: 'a2',  when: 'today · 11:18', tone: 'blue',  who: 'System',         role: 'system',      text: 'Refreshed 3 batch records (47 scholar records · 33 docs). No structural changes.' },
  { id: 'a3',  when: 'today · 09:40', tone: 'amber', who: 'System',         role: 'system',      text: 'Deadline alert sent — BAT-1 billing window opens in 3 days. Email delivered to 2 recipients.' },
  { id: 'a4',  when: 'yesterday',     tone: 'green', who: 'Justin Morales', role: 'coordinator', text: 'Marked TIP conducted for BAT-3 Nenita Rice Farm. Lifecycle advanced to Training.' },
  { id: 'a5',  when: 'yesterday',     tone: 'amber', who: 'System',         role: 'system',      text: 'BAT-1 entered <7-day billing window. Urgency tier escalated to critical.' },
  { id: 'a6',  when: '2 days ago',    tone: 'green', who: 'A. Gagula',      role: 'trainer',     text: 'Updated scholar attendance for BAT-1 Day 30 — 15 of 15 present.' },
  { id: 'a7',  when: '2 days ago',    tone: 'blue',  who: 'Pia B.',         role: 'admin',       text: 'Invited Rosa C. Mendiola (auditor@tesda.gov.ph) as Viewer. Access limited to AKB Technical Vocational Inc. only.' },
  { id: 'a8',  when: '3 days ago',    tone: 'blue',  who: 'Justin Morales', role: 'coordinator', text: 'Exported audit report — Q2 2026 (3 batches across 3 schools, 47 scholars, 33 documents).' },
  { id: 'a9',  when: '4 days ago',    tone: 'red',   who: 'System',         role: 'system',      text: 'NTP-to-Start lag exceeded 7 days for BAT-1. Flagged for compliance review.' },
  { id: 'a10', when: '5 days ago',    tone: 'green', who: 'J. Maravilla',   role: 'trainer',     text: 'Attached Weekly Progress Report to BAT-2 J3ED Farm.' },
];

/* ----- Alerts log (Resend email deduplication) ------------- */
export const ALERTS_LOG: AlertEntry[] = [
  { id: 'al0', sentAt: 'today · 14:02', kind: 'billing-ready',    batch: 'BAT-2', recipients: 3, status: 'delivered', subject: 'BAT-2 J3ED Farm reached 80%+ training progress — ready for billing' },
  { id: 'al1', sentAt: 'today · 09:40', kind: 'billing-critical', batch: 'BAT-1', recipients: 2, status: 'delivered', subject: 'BAT-1 billing window opens in 3 days' },
  { id: 'al2', sentAt: 'yesterday',     kind: 'bsrs-approved',    batch: 'BAT-2', recipients: 4, status: 'delivered', subject: 'BAT-2 BSRS approved — eligible for billing' },
  { id: 'al3', sentAt: '3 days ago',    kind: 'doc-missing',      batch: 'BAT-1', recipients: 2, status: 'delivered', subject: 'BAT-1 missing 1 critical document' },
  { id: 'al4', sentAt: '4 days ago',    kind: 'ntp-lag',          batch: 'BAT-1', recipients: 1, status: 'delivered', subject: 'BAT-1 NTP-to-start lag exceeded 7 days' },
  { id: 'al5', sentAt: '1 week ago',    kind: 'weekly-digest',    batch: 'ALL',   recipients: 3, status: 'delivered', subject: 'Weekly compliance digest — Wk 20' },
];

/* ----- Batch snapshots (point-in-time history) ------------- */
export const SNAPSHOTS: Snapshot[] = [
  { batchId: 'BAT-1', date: 'Apr 21', progressPct: 0,  docsComplete: 5 },
  { batchId: 'BAT-1', date: 'Apr 28', progressPct: 17, docsComplete: 6 },
  { batchId: 'BAT-1', date: 'May 5',  progressPct: 33, docsComplete: 7 },
  { batchId: 'BAT-1', date: 'May 12', progressPct: 50, docsComplete: 8 },
  { batchId: 'BAT-1', date: 'May 19', progressPct: 67, docsComplete: 9 },
  { batchId: 'BAT-1', date: 'today',  progressPct: 74, docsComplete: 9 },
];

export const EGACE_STAGES: EgaceStage[] = [
  { key: 'enrolled',  label: 'Enrolled',  short: 'E', icon: 'users',        colorKey: 'blue' },
  { key: 'graduate',  label: 'Graduate',  short: 'G', icon: 'presentation', colorKey: 'teal' },
  { key: 'assessed',  label: 'Assessed',  short: 'A', icon: 'file-check',   colorKey: 'amber' },
  { key: 'certified', label: 'Certified', short: 'C', icon: 'certificate',  colorKey: 'purple' },
  { key: 'employed',  label: 'Employed',  short: 'E', icon: 'briefcase',    colorKey: 'green' },
];

export const EMPLOYMENT_STATUSES = {
  wage: 'Wage-Employed',
  self: 'Self-Employed',
  awaiting: 'Awaiting Follow-up',
  unemployed: 'Unemployed',
  na: '',
} as const;

/* ===========================================================================
   ENRICHMENT PASS 1 — schedule-aware day counts + ENTRE lifecycle stage.
   =========================================================================== */
(function enrichBatches() {
  const TODAY = new Date(2026, 5, 1); // Jun 1, 2026
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parse(s: string): Date | null {
    const m = (s || '').match(/([A-Za-z]+)\s+(\d+)(?:,\s*(\d+))?/);
    return m ? new Date(m[3] ? +m[3] : 2026, MON[m[1]], +m[2]) : null;
  }
  function fmt(d: Date) { return MONS[d.getMonth()] + ' ' + d.getDate(); }
  function isTrainingDay(d: Date, sched: string[]) { return sched.includes(DOW[d.getDay()]); }
  function countDays(start: Date, end: Date, sched: string[]) {
    let n = 0; const d = new Date(start);
    while (d <= end) { if (isTrainingDay(d, sched)) n++; d.setDate(d.getDate() + 1); }
    return n;
  }

  BATCHES.forEach((b) => {
    const sched = b.trainingDaySchedule || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const start = parse(b.trainingStart);
    const end = parse(b.trainingEnd);

    if (start && end) {
      const total = countDays(start, end, sched);
      const elapsed = TODAY < start ? 0 : Math.min(total, countDays(start, TODAY > end ? end : TODAY, sched));
      b.totalDays = total;
      b.currentDay = elapsed;
      b.progressPct = Math.round((elapsed / total) * 100);
      if (b.remark) b.remark = b.remark.replace(/Day \d+ of \d+/g, `Day ${elapsed} of ${total}`);

      const ed: Date[] = []; const cur = new Date(end);
      while (ed.length < 3) { cur.setDate(cur.getDate() + 1); if (isTrainingDay(cur, sched)) ed.push(new Date(cur)); }
      b.entreStart = fmt(ed[0]);
      b.entreEnd = fmt(ed[2]);

      let entreStatus: 'done' | 'active' | 'pending' = 'pending';
      if (TODAY > ed[2]) entreStatus = 'done';
      else if (TODAY >= ed[0]) entreStatus = 'active';

      if (b.lifecycle && !b.lifecycle.some((s) => s.key === 'entre')) {
        const idx = b.lifecycle.findIndex((s) => s.key === 'train');
        b.lifecycle.splice(idx + 1, 0, {
          key: 'entre', label: 'ENTRE', status: entreStatus,
          date: `${b.entreStart} – ${b.entreEnd}`,
        });
      }
    }

    const aou = (b.lifecycle || []).find((s) => s.key === 'aou');
    const ntp = (b.lifecycle || []).find((s) => s.key === 'ntp');
    if (b.approvedSeats == null) b.approvedSeats = b.scholars;
    if (b.completers == null) b.completers = 0;
    if (b.dropouts == null) b.dropouts = 0;
    if (b.aouDate == null) b.aouDate = aou ? aou.date : '—';
    if (b.ntpDate == null) b.ntpDate = ntp ? ntp.date : '—';
    if (b.reportDate == null) {
      const tp = parse(b.tipDate);
      if (tp) { const r = new Date(tp); r.setDate(r.getDate() + 7); b.reportDate = fmt(r); } else b.reportDate = '—';
    }
  });
})();

/* ===========================================================================
   ENRICHMENT PASS 2 — per-scholar T2MIS roster + EGACE funnel counts.
   =========================================================================== */
const OUTCOME_TARGETS: Record<string, { graduate: number; assessed: number; certified: number; employed: number }> = {
  'BAT-0': { graduate: 20, assessed: 20, certified: 18, employed: 11 },
  'BAT-1': { graduate: 0,  assessed: 0,  certified: 0,  employed: 0 },
  'BAT-2': { graduate: 14, assessed: 14, certified: 13, employed: 3 },
  'BAT-3': { graduate: 0,  assessed: 0,  certified: 0,  employed: 0 },
};

(function buildRosters() {
  const LN = ['Autor', 'Balco', 'Bayo', 'Catubig', 'Escabarte', 'Loria', 'Maderazo', 'Pingol', 'Sarmiento', 'Villamor',
    'Dela Peña', 'Gimena', 'Ablon', 'Rosales', 'Tampus', 'Quirante', 'Nanoy', 'Bagayas', 'Hilot', 'Mendez',
    'Cabahug', 'Delos Reyes', 'Fuentes', 'Olarte', 'Pacaldo'];
  const FN_M = ['Jomar', 'John Michael', 'Jayson', 'Mark Anthony', 'Reniel', 'Aldrin', 'Kevin', 'Rico', 'Dexter', 'Joford'];
  const FN_F = ['Ritchel', 'Marivic', 'Shyna Mae', 'Joean', 'Maricel', 'Aira', 'Crisel', 'Janine', 'Roselyn', 'Mae'];
  const OCC = ['Agricultural Crew', 'Poultry Farm Attendant', 'Farm Worker', 'Production Helper', 'Crop Technician', 'Greenhouse Operator'];
  const EMP = ['Sarangani Agri Ventures', 'AgriFresh Trading Inc.', 'Sunrise Farms Coop.', 'Vitarich Corp.', 'GreenLeaf Produce', 'Local Farmers Cooperative'];
  const EDUC = ['High School Graduate', 'Senior High (K-12)', 'Elementary Graduate', 'College Level', 'High School Graduate'];
  const CIVIL = ['Single', 'Single', 'Married', 'Single', 'Common Law/Live-In'];

  function initials(s: string) { return s.split(/\s+/).map((w) => w[0]).join('').toUpperCase(); }

  const COHORT_DATES: Record<string, { assessed: string; followUpDue: string; reported: string }> = {
    'BAT-0': { assessed: '12/18/2025', followUpDue: 'Jun 15, 2026', reported: '05/12/2026' },
    'BAT-2': { assessed: '06/05/2026', followUpDue: 'Dec 22, 2026', reported: '06/02/2026' },
  };

  BATCHES.forEach((b) => {
    const t = OUTCOME_TARGETS[b.id] || { graduate: 0, assessed: 0, certified: 0, employed: 0 };
    const cd = COHORT_DATES[b.id] || ({} as { assessed?: string; followUpDue?: string; reported?: string });
    b.assessedDate = cd.assessed || '';
    b.followUpReportDate = cd.reported || '';
    b.followUpDue = cd.followUpDue || null;
    const n = b.scholars;
    const roster: ScholarRow[] = [];
    for (let i = 0; i < n; i++) {
      const female = i % 2 === 1;
      const ln = LN[(i + b.id.charCodeAt(4) * 3) % LN.length];
      const fn = (female ? FN_F : FN_M)[i % 10];
      const mi = LN[(i + 7) % LN.length][0] + '.';
      const isGrad = i < t.graduate;
      const isAssessed = i < t.assessed;
      const isCertified = i < t.certified;
      const isEmployed = i < t.employed;

      const assessmentResult = isCertified ? 'Competent' : (isAssessed ? 'Not Yet Competent' : '');
      const trainingStatus = isGrad ? 'Graduate' : (t.graduate > 0 ? 'Discontinued' : 'Enrolled');

      let employmentStatus: string = EMPLOYMENT_STATUSES.na;
      if (isCertified) {
        if (isEmployed) employmentStatus = (i % 5 === 2) ? EMPLOYMENT_STATUSES.self : EMPLOYMENT_STATUSES.wage;
        else employmentStatus = (i % 4 === 3) ? EMPLOYMENT_STATUSES.unemployed : EMPLOYMENT_STATUSES.awaiting;
      }
      const employed = employmentStatus === EMPLOYMENT_STATUSES.wage || employmentStatus === EMPLOYMENT_STATUSES.self;

      roster.push({
        seq: i + 1,
        lastName: ln.toUpperCase(),
        firstName: fn.toUpperCase(),
        middleInit: mi.toUpperCase(),
        extName: '',
        uli: initials(fn) + ln[0] + '-' + String(10 + (i * 7) % 89) + '-' + String(100 + (i * 13) % 899) + '-12063-' + String(1 + i).padStart(3, '0'),
        sex: female ? 'Female' : 'Male',
        dob: ['0' + ((i % 9) + 1), String(10 + (i * 3) % 18).padStart(2, '0'), String(2002 + (i % 6))].join('/'),
        age: 19 + (i % 9),
        civilStatus: CIVIL[i % CIVIL.length],
        education: EDUC[i % EDUC.length],
        nationality: 'Filipino',
        clientClass: 'Farmers and Fishermen',
        scholarshipType: b.program === 'TWSP'
          ? 'Training for Work Scholarship Program (TWSP)'
          : 'Community-Based Training for Enterprise Development (CFSP)',
        contact: '09' + String(10 + (i * 7) % 89) + '-' + String(100 + (i * 31) % 899) + '-' + String(1000 + (i * 137) % 8999),
        email: (fn.split(/\s+/)[0] + ln).toLowerCase().replace(/[^a-z]/g, '') + '@gmail.com',
        trainingStatus,
        dateStarted: b.trainingStart,
        dateFinished: isGrad ? b.trainingEnd : '',
        dateAssessed: isAssessed ? b.assessedDate || '' : '',
        assessmentResult,
        empStatusBefore: 'Unemployed',
        employmentStatus,
        dateEmployed: employed ? (b.followUpReportDate || '') : '',
        occupation: employed ? OCC[i % OCC.length] : '',
        employer: employed ? (employmentStatus === EMPLOYMENT_STATUSES.self ? 'Self-employed' : EMP[i % EMP.length]) : '',
        empClassification: employed ? (employmentStatus === EMPLOYMENT_STATUSES.self ? 'Self-employment' : 'Wage employment') : '',
        salary: employed ? String(9000 + (i % 6) * 1500) : '',
      });
    }
    b.scholars_list = roster;

    const count = (pred: (s: ScholarRow) => boolean) => roster.filter(pred).length;
    b.egace = {
      enrolled: roster.length,
      graduate: count((s) => s.trainingStatus === 'Graduate'),
      assessed: count((s) => s.assessmentResult !== ''),
      certified: count((s) => s.assessmentResult === 'Competent'),
      employed: count((s) => s.employmentStatus === EMPLOYMENT_STATUSES.wage || s.employmentStatus === EMPLOYMENT_STATUSES.self),
    };
    const certifiedCount = b.egace.certified;
    b.employmentFollowUp = certifiedCount > 0 ? {
      due: b.followUpDue || null,
      certified: certifiedCount,
      employed: b.egace.employed,
      awaiting: count((s) => s.employmentStatus === EMPLOYMENT_STATUSES.awaiting),
      unemployed: count((s) => s.employmentStatus === EMPLOYMENT_STATUSES.unemployed),
      rate: certifiedCount ? Math.round(b.egace.employed / certifiedCount * 100) : 0,
      reported: count((s) => s.employmentStatus !== EMPLOYMENT_STATUSES.na && s.assessmentResult === 'Competent'),
    } : null;
  });
})();

/* ===========================================================================
   ENRICHMENT PASS 3 — trainer curriculum pacing + schedule adjustments.
   =========================================================================== */
(function enrichTrainerCurriculum() {
  const CURRICULUM: Record<string, Competency[]> = {
    'Cookery NC II': [
      { name: 'Clean and maintain kitchen premises', focus: 'Workstation sanitation' },
      { name: 'Prepare stocks, sauces and soups',    focus: 'Stock clarity and seasoning' },
      { name: 'Prepare appetizers',                  focus: 'Cold plating techniques' },
      { name: 'Prepare salads and dressing',         focus: 'Emulsified dressings' },
      { name: 'Prepare sandwiches',                  focus: 'Hot and cold assembly' },
      { name: 'Prepare meat dishes',                 focus: 'Marination and doneness' },
      { name: 'Prepare vegetable dishes',            focus: 'Blanching and sautéing' },
      { name: 'Prepare egg dishes',                  focus: 'Egg cookery methods' },
      { name: 'Prepare starch dishes',               focus: 'Pasta and rice handling' },
      { name: 'Present a range of food products',    focus: 'Plating and portioning' },
    ],
    'Agri Crops Production NC I': [
      { name: 'Apply safety measures in farm operations', focus: 'PPE and field safety' },
      { name: 'Use farm tools and equipment',             focus: 'Tool care and handling' },
      { name: 'Perform estimation and basic calculation', focus: 'Farm input computation' },
      { name: 'Prepare land for planting',                focus: 'Plot layout and tillage' },
      { name: 'Conduct nursery operations',               focus: 'Seedling management' },
      { name: 'Plant crops',                              focus: 'Transplanting technique' },
      { name: 'Care and maintain crops',                  focus: 'Pest and nutrient watch' },
      { name: 'Harvest crops',                            focus: 'Maturity indexing' },
    ],
    'Rice Machinery Operations NC II': [
      { name: 'Apply safety measures in farm operations', focus: 'Machine guarding and PPE' },
      { name: 'Use farm tools and equipment',             focus: 'Pre-operation checks' },
      { name: 'Perform preventive maintenance',           focus: 'Lubrication schedule' },
      { name: 'Operate land preparation machinery',       focus: 'Tractor field patterns' },
      { name: 'Operate planting machinery',               focus: 'Transplanter calibration' },
      { name: 'Operate harvesting machinery',             focus: 'Combine settings' },
      { name: 'Perform post-harvest operations',          focus: 'Drying and moisture checks' },
    ],
  };
  const ADJUSTMENTS: Record<string, ScheduleAdjustment[]> = {
    'BAT-1': [{ date: 'May 19', reason: 'Typhoon — classes suspended', effect: '1 make-up day added' }],
    'BAT-3': [{ date: 'Jun 12', reason: 'Independence Day holiday', effect: 'Completion moved 1 day' }],
  };
  BATCHES.forEach((b) => {
    const comps = CURRICULUM[b.qualification] || [];
    const done = comps.length ? Math.min(comps.length, Math.floor((b.progressPct / 100) * comps.length)) : 0;
    b.competencies = comps;
    b.competenciesDone = done;
    b.currentCompetency = comps.length ? comps[Math.min(done, comps.length - 1)] : null;
    b.hoursPerDay = 8;
    b.remainingDays = Math.max(0, b.totalDays - b.currentDay);
    b.remainingHours = b.remainingDays * b.hoursPerDay;
    b.scheduleAdjustments = ADJUSTMENTS[b.id] || [];
  });
})();
