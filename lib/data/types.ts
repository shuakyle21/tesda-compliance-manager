/**
 * STEP 1 — Data Layer: TypeScript Interfaces
 *
 * These types are the contract between the ported mock data (lib/data/seed.ts),
 * the UI components, and (eventually) the Supabase/Laravel schema. They mirror
 * the shapes defined in the design handoff's `data/seed.js`.
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/configuring/typescript
 */

// ---------------------------------------------------------------------------
// Lifecycle — the TESDA batch process pipeline (AOU → NTP → TIP → TRAINING →
// ENTRE → ASSESS → BILLING). ENTRE is spliced in by the enrichment pass.
// ---------------------------------------------------------------------------
export type LifecycleStageKey =
  | 'aou' | 'ntp' | 'tip' | 'train' | 'entre' | 'assess' | 'bill';

export type LifecycleStatus = 'done' | 'active' | 'pending';

export interface LifecycleStage {
  key: LifecycleStageKey;
  label: string;
  status: LifecycleStatus;
  date: string;
}

// ---------------------------------------------------------------------------
// Urgency drives the 3px left-border color on batch cards. Derived from
// daysToBilling (see urgencyTier()).
// ---------------------------------------------------------------------------
export type UrgencyTier = 'critical' | 'warning' | 'on-track' | 'muted';

// ---------------------------------------------------------------------------
// Documents — each batch embeds a record keyed by document requirement key.
// ---------------------------------------------------------------------------
export type DocStatus = 'verified' | 'submitted' | 'pending' | 'missing';

export interface DocRecord {
  status: DocStatus;
  url: string | null;
  updated: string | null;
  source: string | null;
  verifiedBy?: string | null;
  verifiedDate?: string | null;
}

export interface DocumentRequirement {
  key: string;
  label: string;
  stage: string;
  critical: boolean;
  icon: string;
}

// ---------------------------------------------------------------------------
// Tenants (TVI schools) and Users (roles + access scope).
// ---------------------------------------------------------------------------
export interface Tenant {
  id: string;
  code: string;
  color: string;
  name: string;
  region: string;
  type: string;
  plan: string;
  activeBatches: number;
  totalScholars: number;
}

export type UserRole = 'owner' | 'admin' | 'coordinator' | 'trainer' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  tenantIds: string[];
  assignedBatchIds?: string[];
}

// ---------------------------------------------------------------------------
// EGACE — the five-stage TESDA outcome funnel + per-scholar T2MIS roster.
// ---------------------------------------------------------------------------
export interface EgaceCounts {
  enrolled: number;
  graduate: number;
  assessed: number;
  certified: number;
  employed: number;
}

export interface EmploymentFollowUp {
  due: string | null;
  certified: number;
  employed: number;
  awaiting: number;
  unemployed: number;
  rate: number;
  reported: number;
}

export interface ScholarRow {
  seq: number;
  lastName: string;
  firstName: string;
  middleInit: string;
  extName: string;
  uli: string;
  sex: string;
  dob: string;
  age: number;
  civilStatus: string;
  education: string;
  nationality: string;
  clientClass: string;
  scholarshipType: string;
  contact: string;
  email: string;
  trainingStatus: string;
  dateStarted: string;
  dateFinished: string;
  dateAssessed: string;
  assessmentResult: string;
  empStatusBefore: string;
  employmentStatus: string;
  dateEmployed: string;
  occupation: string;
  employer: string;
  empClassification: string;
  salary: string;
}

export interface Competency {
  name: string;
  focus: string;
}

export interface ScheduleAdjustment {
  date: string;
  reason: string;
  effect: string;
}

// ---------------------------------------------------------------------------
// Batch — the central record. Many fields are back-filled by the enrichment
// passes in seed.ts (currentDay, progressPct, entreStart, egace, etc.).
// ---------------------------------------------------------------------------
export interface Batch {
  id: string;
  tenantId: string;
  name: string;
  qualification: string;
  program: string; // generic ScholarshipProgram code (e.g. 'TWSP' | 'CFSP')
  ncLevel: string;
  trainer: string;
  trainerId: string;
  scholars: number;
  trainingDays: string;
  trainingDaySchedule: string[];
  notes: string;
  trainingStart: string;
  trainingEnd: string;
  duration: number;
  currentDay: number;
  totalDays: number;
  progressPct: number;
  ntpLag: number;
  tipDate: string;
  billingDeadline: string;
  daysToBilling: number;
  bsrs: boolean;
  remark: string;
  status: 'ongoing' | 'completed' | 'pending';
  lifecycle: LifecycleStage[];
  documents: Record<string, DocRecord>;

  /** ISO `updated_at` of the source row; drives dashboard data-freshness (TES-8 AC6, #65). */
  updatedAt?: string;

  // Enrichment-derived (optional at the source, always present after load)
  entreStart?: string;
  entreEnd?: string;
  approvedSeats?: number;
  completers?: number;
  dropouts?: number;
  aouDate?: string;
  ntpDate?: string;
  reportDate?: string;
  assessedDate?: string;
  followUpReportDate?: string;
  followUpDue?: string | null;
  scholars_list?: ScholarRow[];
  egace?: EgaceCounts;
  employmentFollowUp?: EmploymentFollowUp | null;
  competencies?: Competency[];
  competenciesDone?: number;
  currentCompetency?: Competency | null;
  hoursPerDay?: number;
  remainingDays?: number;
  remainingHours?: number;
  scheduleAdjustments?: ScheduleAdjustment[];
}

// ---------------------------------------------------------------------------
// Activity log + alerts + snapshots.
// ---------------------------------------------------------------------------
export interface ActivityEvent {
  id: string;
  when: string;
  tone: 'green' | 'blue' | 'amber' | 'red';
  who: string;
  role: string;
  text: string;
}

export interface AlertEntry {
  id: string;
  sentAt: string;
  kind: string;
  batch: string;
  recipients: number;
  status: string;
  subject: string;
}

export interface Snapshot {
  batchId: string;
  date: string;
  progressPct: number;
  docsComplete: number;
}

export interface EgaceStage {
  key: string;
  label: string;
  short: string;
  icon: string;
  colorKey: string;
}

// ---------------------------------------------------------------------------
// Dashboard metrics — the 5-card summary row.
// ---------------------------------------------------------------------------
export interface DashboardMetrics {
  totalBatches: number;
  totalScholars: number;
  avgProgress: number;
  earliestBillingDeadline: string;
  daysToEarliestBilling: number;
  activeBatches: number;
  docCompliancePct: number;
  docMissing: number;
  docPending: number;
}
