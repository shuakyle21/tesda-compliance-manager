# TVI-CAMS

**Compliance and Records Management for TESDA-accredited TVIs**

TVI-CAMS is a multi-school operations platform for Technical Vocational Institutions (TVIs) that run TESDA scholarship programs. It gives a school one dependable place to track every training batch from authorization to billing, so that nothing slips between the paperwork, the classroom, and the deadline.

> **Proprietary software.** TVI-CAMS is a private, internally developed product. It is not open source and is not distributed for public use. See [Ownership and Confidentiality](#ownership-and-confidentiality).

![TVI-CAMS sign-in](<screenshots/login page.png>)

---

## The problem

Running a TESDA-funded batch means juggling a long chain of requirements: an authorization to operate, a notice to proceed, a stack of required documents, daily attendance, learner records, evidence of learning activities, and finally billing documents that must be filed on time. At most schools this lives in spreadsheets, shared folders, and memory. The costs are familiar:

- Missing or unverified documents discovered only when billing is due.
- Billing deadlines missed because no one could see them coming.
- Coordinators rebuilding the same TESDA billing forms by hand, batch after batch.
- No clear answer to "which batches need attention today?"

## What TVI-CAMS does

TVI-CAMS replaces that scattered workflow with a single, role-aware workspace.

| Capability | What it gives your school |
| --- | --- |
| **Batch lifecycle tracking** | Every batch is followed through its internal stages: AOU, NTP, TIP, Training, Assessment, and Billing. Progress is computed from actual sessions held, not guesswork. |
| **Deadline and urgency alerts** | A dashboard that surfaces which batches are on track, which are at risk, and which need action now. Alerts are computed live from current data. |
| **Document compliance** | Per-batch checklists of required documents with clear states (missing, pending, submitted, verified) and attached evidence files. |
| **Billing document generation** | Populates the school's own `.docx` templates for TSF/Allowance, Training Cost, and Entrepreneurship billing. A packet becomes ready only when training progress and required documents both pass the readiness gate, then moves through `draft → ready → generated → submitted → settled`. |
| **Multi-school workspaces** | Each school operates in its own isolated workspace. Staff see only the schools they are assigned to. |
| **Role-based access** | Admin, Coordinator, Trainer, and read-only Viewer roles, each seeing only what they need. Trainers never see billing or financial information. |
| **Analytics and reports** | Portfolio-level charts and report views over active and completed batches, including employment follow-up. |
| **Activity log** | A record of who did what and when, supporting internal audit review. |

## Who it is for

| Role | Typical user | What they do in TVI-CAMS |
| --- | --- | --- |
| **Admin** | School head or registrar | Full control within their school: users, settings, batches, documents, billing. |
| **Coordinator** | Scholarship or compliance coordinator | Manages batch lifecycle, verifies documents, and prepares billing for assigned schools. |
| **Trainer** | Assigned instructor | Sees only their own classes: roster, attendance, and training-side evidence. No billing visibility. |
| **Viewer** | Internal reviewer or an auditor the school chooses to grant access | Read-only access to selected records. Cannot change anything. |
| **Platform admin** | TVI-CAMS operator | Registers new schools and manages the school registry. |

## How a batch moves through the system

```
AOU  →  NTP  →  TIP  →  Training  →  Assessment  →  Billing
 │       │       │         │              │             │
 │       │       │         │              │             └─ Documents generated from the
 │       │       │         │              │                school's own templates
 │       │       │         │              └─ Required documents verified
 │       │       │         └─ Progress = sessions held ÷ total sessions
 │       │       └─ Training implementation plan
 │       └─ Notice to Proceed recorded on the batch (RQM code identifies the batch)
 └─ Authority to Operate
```

One RQM code corresponds to one batch. Each learner is identified by their permanent ULI, so records stay consistent across schools and programs.

## Status

TVI-CAMS is in active development. This table reflects what is built today and what is planned.

| Area | Status |
| --- | --- |
| Sign-in and role-based access | Available |
| School workspaces and isolation | Available |
| Dashboard, batch cards, table view, lifecycle and urgency | Available |
| Document checklist and evidence | Available |
| Billing packet queue and document generation | Available |
| Analytics, reports, and activity log | Available |
| User and school registry administration | Available |
| Trainer attendance and daily progress | Planned |
| LAMR structured evidence (including blended learning) | Planned |
| CSV import | Planned |
| Notifications (in-app drawer) | Planned |
| Email notifications and weekly digest | Later |
| OCR / AI-assisted document review | Later |
| Offline / PWA mode | Later |
| Direct TESDA system integration | Later, only if permitted and technically feasible |

## Important boundary

TVI-CAMS is an **internal working layer**. It does not replace, connect to, or speak for TESDA's official systems (SIS, T2MIS, BSRS).

- Official records, approved qualification maps, schedules, ULI records, attendance submissions, and required reports remain authoritative in TESDA's systems.
- Nothing in TVI-CAMS implies official approval or submission by TESDA. Statuses describe the school's own internal progress.
- Generated billing documents are prepared for the school to review and file through the proper channels.

## Security and data protection

Because the platform holds learner and financial records, security is built into the data layer rather than layered on top.

- **School-level isolation enforced in the database.** Row-level security decides who can read or write every record. Hiding a button in the interface is a convenience, never the protection.
- **Server-side role enforcement.** Trainer views omit billing and financial fields at the server, not just on screen. Viewers are denied writes server-side.
- **Managed identity.** Authentication is handled by a dedicated identity provider. Role authority comes from the school's own profile records.
- **Evidence kept private.** Uploaded files live in private storage under school-scoped access.

To report a security concern, see [SECURITY.md](SECURITY.md).

## Technology

Next.js (App Router) and React with TypeScript, Tailwind CSS, Supabase (PostgreSQL, Storage, Row Level Security), Clerk for identity, deployed on Vercel.

## Product documentation

Internal reference documents for the project team:

| Document | Purpose |
| --- | --- |
| [Product Requirements (PRD/SRS)](docs/MASTER_PRD_SRS.md) | Product source of truth |
| [Technical Requirements (TRD)](docs/TRD.md) | Engineering companion to the PRD |
| [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) | Phased delivery plan |
| [Design Direction](docs/DESIGN.md) | Interface and accessibility rules |
| [Domain Glossary](CONTEXT.md) | Shared vocabulary for batches, billing, and compliance |
| [Architecture Decisions](docs/adr) | Recorded decisions, including the billing and attendance rules |
| [Engineering Rules](RULES.md) | Non-negotiable invariants for contributors |

## Ownership and confidentiality

TVI-CAMS and its source code, documentation, designs, and data models are proprietary and confidential. All rights reserved. No license is granted to copy, modify, distribute, or deploy any part of this repository without written permission from the owner. Access is limited to authorized project members.
