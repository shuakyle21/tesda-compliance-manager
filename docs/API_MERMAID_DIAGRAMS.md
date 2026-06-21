# TVI-CAMS API Mermaid Diagrams

These diagrams describe the planned production API architecture for TVI-CAMS.

Stack direction:

- Frontend: Next.js App Router
- Backend: Laravel API
- Auth: Clerk
- Database/storage: Supabase Postgres and Supabase Storage
- Rule: Laravel enforces tenant, role, and trainer scope before returning data.

## System Architecture

```mermaid
flowchart LR
  User[User browser] --> Next[Next.js App Router]
  Next --> Clerk[Clerk auth]
  Next --> API[Laravel API]

  API --> Auth[Auth middleware<br/>Verify Clerk session/JWT]
  Auth --> Policy[Laravel policies<br/>Role + tenant + trainer scope]

  Policy --> Services[Domain services]
  Services --> DB[(Supabase Postgres)]
  Services --> Storage[(Supabase Storage<br/>S3-compatible)]
  Services --> Queue[Laravel queue jobs]

  Queue --> Import[CSV import]
  Queue --> Export[CSV export]
  Queue --> Activity[Activity log writer]

  DB --> Services
  Storage --> Services
  Services --> API
  API --> Next
```

## Frontend Routes To API Endpoints

```mermaid
flowchart TD
  subgraph Next["Next.js routes"]
    Dashboard["/dashboard"]
    Cards["/batch-cards"]
    Table["/table-view"]
    Docs["/documents"]
    Analytics["/analytics"]
    Activity["/activity-log"]
    TrainerDashboard["/trainer"]
    TrainerClasses["/trainer/classes"]
    TrainerAttendance["/trainer/classes/[batchId]/attendance"]
    TrainerDocuments["/trainer/classes/[batchId]/documents"]
  end

  subgraph API["Laravel API"]
    GetDashboard["GET /api/dashboard"]
    GetBatchSummary["GET /api/batches?summary=true"]
    GetBatches["GET /api/batches"]
    GetBatch["GET /api/batches/{batch}"]
    GetTable["GET /api/batches?view=table"]
    GetDocMatrix["GET /api/documents/matrix"]
    PostDoc["POST /api/batches/{batch}/documents"]
    GetAnalytics["GET /api/analytics/summary"]
    GetActivity["GET /api/activity-log"]
    GetTrainerDashboard["GET /api/trainer/dashboard"]
    GetTrainerClasses["GET /api/trainer/classes"]
    GetAttendance["GET /api/trainer/classes/{batch}/attendance"]
    PostAttendance["POST /api/trainer/classes/{batch}/attendance"]
    GetTrainerDocs["GET /api/trainer/classes/{batch}/documents"]
    PostTrainerDocs["POST /api/trainer/classes/{batch}/documents"]
  end

  Dashboard --> GetDashboard
  Dashboard --> GetBatchSummary
  Cards --> GetBatches
  Cards --> GetBatch
  Table --> GetTable
  Docs --> GetDocMatrix
  Docs --> PostDoc
  Analytics --> GetAnalytics
  Activity --> GetActivity
  TrainerDashboard --> GetTrainerDashboard
  TrainerClasses --> GetTrainerClasses
  TrainerAttendance --> GetAttendance
  TrainerAttendance --> PostAttendance
  TrainerDocuments --> GetTrainerDocs
  TrainerDocuments --> PostTrainerDocs
```

## Request Authorization Pipeline

```mermaid
sequenceDiagram
  autonumber
  participant Browser as Browser
  participant Next as Next.js
  participant Clerk as Clerk
  participant API as Laravel API
  participant Policy as Policies
  participant DB as Supabase Postgres
  participant Storage as Supabase Storage

  Browser->>Next: Open protected route
  Next->>Clerk: Read signed-in session
  Clerk-->>Next: User identity + claims
  Next->>API: Request with Clerk token
  API->>Clerk: Verify token
  Clerk-->>API: Verified user id
  API->>DB: Load profile + tenant memberships
  DB-->>API: Role, tenant_ids, assigned_batch_ids
  API->>Policy: Authorize route/action

  alt Authorized
    Policy-->>API: Allow
    API->>DB: Tenant-scoped query
    opt File operation
      API->>Storage: Upload/read scoped object
      Storage-->>API: File metadata or signed URL
    end
    API-->>Next: Scoped response
    Next-->>Browser: Render UI
  else Denied
    Policy-->>API: Deny
    API-->>Next: 403 Forbidden
    Next-->>Browser: Access denied state
  end
```

## Role-Based API Access

```mermaid
flowchart TD
  Request[API request] --> Verify[Verify Clerk user]
  Verify --> Profile[Load profile]
  Profile --> Role{Role}

  Role --> Admin[Admin]
  Role --> Coordinator[Coordinator]
  Role --> Trainer[Trainer]
  Role --> Viewer[Viewer]

  Admin --> AdminScope[One-school tenant scope<br/>Full write inside tenant]
  Coordinator --> CoordScope[Assigned multi-school scope<br/>Compliance workflow writes]
  Trainer --> TrainerScope[Assigned batches only<br/>Training-side writes only]
  Viewer --> ViewerScope[Assigned schools<br/>Read-only]

  AdminScope --> Query[Tenant-scoped query]
  CoordScope --> Query
  ViewerScope --> Query

  TrainerScope --> HideTrainerFields[Remove billing deadline<br/>Remove BSRS<br/>Remove NTP lag<br/>Remove financial documents]
  HideTrainerFields --> AssignedBatchCheck{Assigned batch?}
  AssignedBatchCheck -->|Yes| Query
  AssignedBatchCheck -->|No| Deny[403 Forbidden]

  Query --> Response[Return allowed data]
```

## Core Data Model

```mermaid
erDiagram
  TENANTS ||--o{ PROFILES : has_members
  TENANTS ||--o{ BATCHES : owns
  TENANTS ||--o{ ACTIVITY_LOG : records

  SCHOLARSHIP_PROGRAMS ||--o{ PROGRAM_RQM : defines
  SCHOLARSHIP_PROGRAMS ||--o{ PROGRAM_DOCUMENT_REQUIREMENTS : requires
  SCHOLARSHIP_PROGRAMS ||--o{ PROGRAM_BILLING_RULES : configures
  SCHOLARSHIP_PROGRAMS ||--o{ BATCHES : classifies

  PROFILES ||--o{ BATCHES : trains
  BATCHES ||--o{ LEARNERS : enrolls
  BATCHES ||--o{ DOCUMENTS : has_evidence
  BATCHES ||--o{ ATTENDANCE_RECORDS : tracks
  BATCHES ||--o{ TRAINER_UPDATES : receives
  BATCHES ||--o{ LAMR_REPORTS : has
  BATCHES ||--o{ ACTIVITY_LOG : logs

  PROGRAM_DOCUMENT_REQUIREMENTS ||--o{ DOCUMENTS : validates

  LAMR_REPORTS ||--o{ LAMR_OUTCOMES : defines
  LAMR_OUTCOMES ||--o{ LAMR_ACTIVITIES : contains
  LAMR_ACTIVITIES ||--o{ LAMR_ENTRIES : records
  LEARNERS ||--o{ LAMR_ENTRIES : completes
  LEARNERS ||--o{ ATTENDANCE_RECORDS : attends

  TENANTS {
    uuid id PK
    string code
    string name
    string region
    string type
  }

  PROFILES {
    uuid id PK
    string clerk_user_id
    string role
    uuid[] tenant_ids
    uuid[] assigned_batch_ids
  }

  SCHOLARSHIP_PROGRAMS {
    uuid id PK
    string code
    string name
    boolean active
  }

  PROGRAM_RQM {
    uuid id PK
    uuid scholarship_program_id FK
    string requirement_code
    string requirement_name
    string status
  }

  PROGRAM_DOCUMENT_REQUIREMENTS {
    uuid id PK
    uuid scholarship_program_id FK
    string document_key
    string label
    string role_scope
    boolean critical
  }

  PROGRAM_BILLING_RULES {
    uuid id PK
    uuid scholarship_program_id FK
    int billing_preparation_threshold
  }

  BATCHES {
    uuid id PK
    uuid tenant_id FK
    uuid scholarship_program_id FK
    uuid trainer_profile_id FK
    string batch_code
    string qualification
    string nc_level
    int progress_pct
    string lifecycle_stage
  }

  LEARNERS {
    uuid id PK
    uuid batch_id FK
    string learner_no
    string full_name
  }

  DOCUMENTS {
    uuid id PK
    uuid batch_id FK
    uuid requirement_id FK
    string status
    string storage_path
    string source
  }

  ATTENDANCE_RECORDS {
    uuid id PK
    uuid batch_id FK
    uuid learner_id FK
    date class_date
    string status
  }

  TRAINER_UPDATES {
    uuid id PK
    uuid batch_id FK
    uuid trainer_profile_id FK
    string update_type
    text notes
  }

  LAMR_REPORTS {
    uuid id PK
    uuid batch_id FK
    string module_title
    string schedule
    string source_document_path
  }

  LAMR_OUTCOMES {
    uuid id PK
    uuid lamr_report_id FK
    string outcome_label
  }

  LAMR_ACTIVITIES {
    uuid id PK
    uuid lamr_outcome_id FK
    string activity_label
  }

  LAMR_ENTRIES {
    uuid id PK
    uuid lamr_activity_id FK
    uuid learner_id FK
    boolean completed
    string assessment_result
  }

  ACTIVITY_LOG {
    uuid id PK
    uuid tenant_id FK
    uuid batch_id FK
    uuid actor_profile_id FK
    string event_type
    text message
  }
```

## Trainer Data Boundary

```mermaid
flowchart LR
  TrainerAPI["Trainer API response"] --> Include["Include"]
  TrainerAPI --> Exclude["Exclude"]

  Include --> AssignedClasses["Assigned classes"]
  Include --> Roster["Learner roster for assigned batch"]
  Include --> Attendance["Attendance/progress actions"]
  Include --> TrainerDocs["Training-side documents"]
  Include --> LAMR["LAMR evidence when assigned"]

  TrainerDocs --> Tip["tip_report"]
  TrainerDocs --> Schedule["training_sched"]
  TrainerDocs --> AttendanceDoc["attendance"]
  TrainerDocs --> Progress["progress_rpt"]
  TrainerDocs --> TrainerQual["trainer_qual"]

  Exclude --> BillingDeadline["Billing deadline"]
  Exclude --> BSRS["BSRS approval/status"]
  Exclude --> NtpLag["NTP-to-start lag"]
  Exclude --> BillingPrep["Billing preparation signal"]
  Exclude --> FinanceDocs["Financial/billing documents"]
  Exclude --> OtherTenants["Other school data"]
```

