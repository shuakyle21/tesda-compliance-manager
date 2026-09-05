# Data model

Entity-relationship reference for the `public` schema, generated from the migration history
as of these four versions:

| Version | Migration |
|---|---|
| `20260528160300` | `create_tenant_scoped_schema` — canonical schema, 14 tables, RLS |
| `20260705070510` | `add_trainer_credentials` |
| `20260717054607` | `migrate_akb_tenant_and_drop_rogue_table` |
| `20260831120000` | `seed_dev_operational_data` (data only, no DDL) |

If you add a migration, update this file in the same PR — nothing enforces that automatically,
so the version table above is how a reader tells whether this is current.

**15 tables, 33 foreign keys.** `tenants` and `profiles` are the two hubs, with 9 inbound
references each. Diagrams are split into four clusters because a single graph of 15 tables is
unreadable; every table appears in exactly one cluster, and every foreign key is drawn on
exactly one diagram.

Cardinality is taken from the column definitions, not from intent: a `not null` foreign key
renders as `||` on the parent side, a nullable one as `|o`.

---

## 1. Identity and tenancy

`tenants` and `profiles` are the roots of the entire schema. Neither carries a `tenant_id` —
they define the scope rather than living inside it. `profile_tenant_memberships` is the join
table that makes a user a member of a school, and it is what every RLS policy ultimately
consults.

```mermaid
erDiagram
    TENANTS ||--o{ PROFILE_TENANT_MEMBERSHIPS : "grants access to"
    PROFILES ||--o{ PROFILE_TENANT_MEMBERSHIPS : "holds"
    PROFILES ||--o| TRAINER_CREDENTIALS : "has"

    TENANTS {
        uuid id PK
        text code UK
        text name
        text region
        text school_type
        boolean is_active
    }
    PROFILES {
        uuid id PK
        text clerk_user_id UK "Clerk sub claim"
        text full_name
        text email
        profile_role role "admin|coordinator|trainer|viewer"
        boolean is_active
    }
    PROFILE_TENANT_MEMBERSHIPS {
        uuid id PK
        uuid tenant_id FK
        uuid profile_id FK
        boolean is_default
    }
    TRAINER_CREDENTIALS {
        uuid id PK
        uuid profile_id FK "unique - one row per profile"
        text credential_number
        text_array certified_nc_levels
        text specialization
        date accreditation_expiry
    }
```

`trainer_credentials.profile_id` is `unique`, so the relationship is one-to-zero-or-one, not
one-to-many.

---

## 2. Program catalog

Global reference data. These three tables have no `tenant_id` — a scholarship program and its
document requirements are the same for every school. Tenant scoping enters only when a batch
references a program.

```mermaid
erDiagram
    SCHOLARSHIP_PROGRAMS ||--o{ PROGRAM_DOCUMENT_REQUIREMENTS : "requires"
    SCHOLARSHIP_PROGRAMS ||--o| PROGRAM_BILLING_RULES : "billed under"

    SCHOLARSHIP_PROGRAMS {
        uuid id PK
        text code UK "TWSP or CFSP"
        text name
        text description
        boolean is_active
    }
    PROGRAM_DOCUMENT_REQUIREMENTS {
        uuid id PK
        uuid program_id FK
        text document_key "unique per program"
        text document_name
        lifecycle_stage required_for_stage
        document_audience audience
        boolean is_required
        integer sort_order
    }
    PROGRAM_BILLING_RULES {
        uuid id PK
        uuid program_id FK "unique - one rule per program"
        integer progress_threshold_percent "0-100, default 80"
        text label
        boolean is_active
    }
```

---

## 3. Operational core

The working tables. All four carry `tenant_id` and are RLS-scoped. `batches` is the centre of
the application — one row is one RQM-coded training batch moving through the lifecycle.

```mermaid
erDiagram
    TENANTS ||--o{ BATCHES : "owns"
    TENANTS ||--o{ LEARNERS : "owns"
    TENANTS ||--o{ DOCUMENTS : "owns"
    TENANTS ||--o{ ACTIVITY_LOG : "owns"
    SCHOLARSHIP_PROGRAMS ||--o{ BATCHES : "funds"
    PROFILES |o--o{ BATCHES : "trains"
    BATCHES ||--o{ LEARNERS : "enrolls"
    BATCHES ||--o{ DOCUMENTS : "evidenced by"
    BATCHES |o--o{ ACTIVITY_LOG : "logged against"
    PROGRAM_DOCUMENT_REQUIREMENTS |o--o{ DOCUMENTS : "satisfied by"
    PROFILES |o--o{ DOCUMENTS : "submitted"
    PROFILES |o--o{ DOCUMENTS : "verified"
    PROFILES |o--o{ ACTIVITY_LOG : "acted"

    BATCHES {
        uuid id PK
        uuid tenant_id FK
        uuid program_id FK
        text batch_code "RQM code, unique per tenant"
        text batch_section
        text qualification_title
        text nc_level
        uuid trainer_profile_id FK "nullable"
        text trainer_name
        integer learner_count
        date start_date
        date end_date
        lifecycle_stage current_stage "aou through completed, or blocked"
        batch_status status
        integer progress_percent "0-100"
        document_status billing_report_status
        text official_system_reference
        uuid created_by FK "audit, nullable"
        uuid updated_by FK "audit, nullable"
    }
    LEARNERS {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        text learner_no "unique per tenant and batch"
        text uli "permanent learner key"
        text last_name
        text first_name
        text middle_name
        text extension_name
        assessment_result assessment_result
        boolean is_active
    }
    DOCUMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        uuid requirement_id FK "nullable"
        text document_key
        text document_name
        document_status status
        document_audience audience
        text storage_path
        text external_url
        text notes
        uuid submitted_by FK "nullable"
        timestamptz submitted_at
        uuid verified_by FK "nullable"
        timestamptz verified_at
    }
    ACTIVITY_LOG {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK "nullable"
        uuid profile_id FK "nullable"
        activity_action action
        text entity_type "polymorphic, not a FK"
        uuid entity_id "polymorphic, not a FK"
        text summary
        jsonb metadata
    }
```

Two notes on what this diagram deliberately does not draw:

- `batches.created_by` and `batches.updated_by` are real foreign keys to `profiles`, shown as
  attributes rather than edges. Drawing all three `profiles → batches` references as separate
  lines buries the one that carries meaning (`trainer_profile_id`).
- `activity_log.entity_type` / `entity_id` are a polymorphic pointer with no foreign key
  constraint, so no line can be drawn. The database will not stop an `entity_id` pointing at
  a deleted row.

---

## 4. LAMR evidence

Learning Activity and Module Record data. Four tables, all tenant-scoped, forming a
report → outcome → activity → per-learner-entry hierarchy. `tenants` and `profiles` edges are
omitted here to keep the shape readable; every one of these tables has `tenant_id not null`,
and `lamr_entries.marked_by` is a nullable reference to `profiles`.

```mermaid
erDiagram
    BATCHES ||--o{ LAMR_REPORTS : "reported in"
    DOCUMENTS |o--o{ LAMR_REPORTS : "sourced from"
    LAMR_REPORTS ||--o{ LAMR_OUTCOMES : "covers"
    LAMR_REPORTS ||--o{ LAMR_ACTIVITIES : "scopes"
    LAMR_OUTCOMES ||--o{ LAMR_ACTIVITIES : "broken into"
    LAMR_REPORTS ||--o{ LAMR_ENTRIES : "scopes"
    LAMR_ACTIVITIES ||--o{ LAMR_ENTRIES : "marked in"
    LEARNERS ||--o{ LAMR_ENTRIES : "completes"

    LAMR_REPORTS {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        text tvi_name
        text program_title
        text batch_section
        text module_title
        text schedule_text
        text prepared_by
        text approved_by
        uuid source_document_id FK "nullable"
        text source_storage_path
        text source_external_url
    }
    LAMR_OUTCOMES {
        uuid id PK
        uuid tenant_id FK
        uuid lamr_report_id FK
        text outcome_code "unique per tenant and report"
        text outcome_title
        numeric hours
        integer sort_order
    }
    LAMR_ACTIVITIES {
        uuid id PK
        uuid tenant_id FK
        uuid lamr_report_id FK
        uuid outcome_id FK
        text activity_code "unique per tenant and outcome"
        text activity_title
        integer sort_order
    }
    LAMR_ENTRIES {
        uuid id PK
        uuid tenant_id FK
        uuid lamr_report_id FK
        uuid learner_id FK
        uuid activity_id FK
        boolean is_completed
        assessment_result assessment_result
        text notes
        uuid marked_by FK "nullable"
        timestamptz marked_at
    }
```

`lamr_entries` carries both `lamr_report_id` and `activity_id`, which is denormalised — the
report is already reachable through the activity. The redundant column exists so RLS policies
and the `lamr_entries_report_idx` index can filter by report without a join.

---

## The part no ER diagram can show

Foreign keys describe what *connects*. They say nothing about what a given user can *see*,
and in this schema that is the more important question. RLS is the security boundary; hiding
things in the UI is a usability nicety on top of it.

**Nine of fifteen tables carry `tenant_id`** and are filtered by tenant membership:
`profile_tenant_memberships`, `batches`, `learners`, `documents`, the four `lamr_*` tables,
and `activity_log`.

**Six deliberately do not**, for three different reasons:

- `tenants`, `profiles` — the roots that *define* scope, so they cannot sit inside it.
- `scholarship_programs` — a global catalog, readable by every authenticated user.
- `program_document_requirements`, `program_billing_rules`, `trainer_credentials` — scoped
  indirectly through their parent row.

### Policies by table

| Table | Read | Write |
|---|---|---|
| `tenants` | assigned tenants only | *no write policy* |
| `profiles` | own, or same-tenant | *no write policy* |
| `profile_tenant_memberships` | assigned tenants | *no write policy* |
| `trainer_credentials` | own, or same-tenant as admin/coordinator | own, trainer only |
| `scholarship_programs` | any authenticated user | admin, coordinator |
| `program_document_requirements` | any authenticated user | admin, coordinator |
| `program_billing_rules` | any authenticated user | admin, coordinator |
| `batches` | tenant members | admin, coordinator (separate insert/update/delete) |
| `learners` | tenant members | admin, coordinator |
| `documents` | tenant members | admin, coordinator; trainers may insert/update their own assigned training documents |
| `lamr_reports` | tenant members | admin, coordinator, assigned trainer |
| `lamr_outcomes` | tenant members | admin, coordinator, assigned trainer |
| `lamr_activities` | tenant members | admin, coordinator, assigned trainer |
| `lamr_entries` | tenant members | admin, coordinator, assigned trainer |
| `activity_log` | tenant members | tenant members (append-only insert) |

Three tables have no write policy at all. That is intentional: `tenants`, `profiles`, and
`profile_tenant_memberships` are provisioned out-of-band, not through the authenticated
client. A `viewer` has read access wherever their membership reaches and no write policy
anywhere.

Every policy resolves through the `app_private` helpers, which read the Clerk `sub` claim off
the JWT: `current_clerk_user_id()` → `current_profile_id()` → `current_role()` /
`can_access_tenant()` / `can_manage_tenant()`.

Storage objects in the evidence bucket carry their own parallel policies, scoped by the tenant
segment of the object path.

---

## Enums

| Type | Values |
|---|---|
| `profile_role` | `admin`, `coordinator`, `trainer`, `viewer` |
| `lifecycle_stage` | `aou`, `ntp`, `tip`, `training`, `assessment`, `billing`, `completed`, `blocked` |
| `batch_status` | `pending`, `ongoing`, `completed`, `blocked` |
| `document_status` | `missing`, `pending`, `submitted`, `verified` |
| `document_audience` | `admin`, `coordinator`, `trainer`, `viewer`, `all` |
| `assessment_result` | `competent`, `not_yet_competent`, `pending` |
| `activity_action` | `created`, `updated`, `uploaded`, `verified`, `submitted`, `deleted`, `system_note` |

These are the *database* spellings. The UI uses different names for three lifecycle stages
(`training→train`, `assessment→assess`, `billing→bill`), DB `blocked` surfaces as UI
`pending`, and the UI adds an `entre` stage that has no database column. That translation
happens in `DB_TO_UI_STAGE` in `modules/batches/data/batches.ts` and nowhere else.
