# TVI-CAMS Architecture Diagrams

Comprehensive architecture documentation for TVI-CAMS showing key components, data flow, and security boundaries.

## System Overview

TVI-CAMS is a Next.js 16 App Router application (React 19, TypeScript strict, Tailwind v4) that serves as an internal multi-tenant compliance tool for TVI schools running TESDA scholarship batches. It uses:

- **Clerk** for authentication
- **Supabase** (Postgres + Storage) for data
- Domain-driven design with module-based architecture
- Row-Level Security (RLS) as the primary security boundary

## High-Level Architecture

```mermaid
architecture-beta
    group client(dashboard)[Client Browser]
    group nextjs(cloud)[Next JS App]
    group auth(cloud)[Authentication]
    group data(database)[Data Layer]

    service user(internet)[User] in client
    service app(server)[App Router] in nextjs
    service clerk(cloud)[Clerk] in auth
    service supabase(database)[Supabase] in data

    user:R --> L:app
    app:T --> B:clerk
    app:B --> T:supabase
    clerk:R --> L:supabase
```

## Authentication & Data Flow Sequence

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Clerk as 🔐 Clerk Middleware
    participant SC as 🖥️ Server Component
    participant Data as 📊 Module Data Layer
    participant Supabase as 🗄️ Supabase (RLS)
    participant RLS as 🛡️ RLS Policies

    User->>Clerk: Request protected route
    Clerk->>Clerk: Validate session
    Clerk->>SC: Forward request (if authenticated)
    SC->>Data: Call getBatchesSnapshot()
    Data->>Supabase: Query with Clerk JWT
    Supabase->>RLS: Apply tenant/role scoping
    RLS-->>Supabase: Filtered rows
    Supabase-->>Data: DB rows (RLS-scoped)
    Data->>Data: mapBatchRow() (DB → UI types)
    Data->>Data: deriveLifecycle() (computed values)
    Data-->>SC: Batch[] (UI domain types)
    SC->>SC: Compose module UI components
    SC-->>User: Rendered dashboard
```

## Module Structure & Layering

```mermaid
flowchart TB
    subgraph App["app/ - Thin Routes"]
        Dashboard["dashboard/page.tsx"]
        Trainer["trainer/page.tsx"]
        Documents["documents/page.tsx"]
    end

    subgraph Batches["modules/batches/"]
        BatchesData["data/batches.ts"]
        BatchesDomain["domain/urgency.ts"]
        BatchesUI["ui/dashboard/*"]
    end

    subgraph Auth["modules/auth/"]
        AuthData["data/auth.ts"]
        AuthUI["ui/*"]
    end

    subgraph Shared["shared/ - Leaf Level"]
        SharedUI["ui/StatusBadge.tsx"]
        SharedTypes["types.ts"]
        SharedMocks["mocks/seed.ts"]
    end

    subgraph LibSupabase["lib/supabase/ - Data Boundary"]
        Server["server.ts"]
        Client["client.ts"]
        DBTypes["database.types.ts"]
    end

    Dashboard --> BatchesData
    Dashboard --> AuthData
    Trainer --> AuthData
    Documents --> BatchesData

    BatchesData --> SharedTypes
    BatchesData --> DBTypes
    AuthData --> SharedTypes
    AuthData --> DBTypes

    BatchesUI --> SharedUI
    AuthUI --> SharedUI
    Dashboard --> BatchesUI

    Server --> DBTypes
    Client --> DBTypes

    BatchesData --> Server
    AuthData --> Server

    style App fill:#e1f5ff
    style Shared fill:#fff4e1
    style LibSupabase fill:#e8f5e9
```

## Data Layer Pattern (fetch → map → derive)

```mermaid
flowchart LR
    subgraph Fetch["1. Fetch - I/O Layer"]
        Query["Typed Supabase Query"]
        RLS["RLS Scoping"]
    end

    subgraph Map["2. Map - Pure Translation"]
        Mapper["mapBatchRow"]
        DBTypes["DB Types"]
        UITypes["UI Domain Types"]
    end

    subgraph Derive["3. Derive - Computed Values"]
        Lifecycle["deriveLifecycle"]
        Dates["toDisplayDate"]
        Urgency["daysUntil"]
    end

    Query --> RLS
    RLS --> Mapper
    DBTypes --> Mapper
    Mapper --> UITypes
    UITypes --> Lifecycle
    UITypes --> Dates
    UITypes --> Urgency

    style Fetch fill:#ffe1e1
    style Map fill:#e1ffe1
    style Derive fill:#e1e1ff
```

## Import Direction (ESLint-enforced)

```mermaid
flowchart TB
    App["app/"] --> Modules["modules/"]
    Modules --> Shared["shared/"]
    Shared --> LibSupabase["lib/supabase/"]

    ModulesData["modules/*/data/"] -.-> ModulesDomain["modules/*/domain/"]
    ModulesData -.-> ModulesUI["modules/*/ui/"]
    
    App --> ModulesData
    App --> ModulesUI
    App --> ModulesDomain

    style App fill:#ffcccc
    style Modules fill:#ccffcc
    style Shared fill:#ccccff
    style LibSupabase fill:#ffffcc
```

## Security Architecture

```mermaid
flowchart TB
    User["User Request"] --> Middleware["proxy.ts (Clerk)"]
    Middleware -->|Valid Session| Server["Server Component"]
    Middleware -->|No Session| SignIn["Redirect to /sign-in"]
    
    Server -->|getToken| JWT["Clerk JWT (template: supabase)"]
    JWT --> SupabaseClient["createSupabaseServerClient"]
    SupabaseClient -->|Bearer Token| RLS["Postgres RLS Policies"]
    
    RLS -->|Tenant Scoping| Data["Filtered Data"]
    RLS -->|Role Checks| Permissions["Write Permissions"]
    
    Data --> Mapper["mapBatchRow"]
    Mapper --> UI["UI Components"]
    
    Permissions -->|Trainer DTO| ServerFilter["Server-side Filtering"]
    ServerFilter --> UI

    style Middleware fill:#ff6b6b
    style JWT fill:#feca57
    style RLS fill:#54a0ff
    style Data fill:#5f27cd
```

## Key Architectural Patterns

### 1. Authentication Chain
`proxy.ts` (Clerk middleware) → `lib/supabase/server.ts` (attaches Clerk JWT) → Postgres RLS policies

### 2. Code Organization (Domain Modules)
- `app/` - Thin App Router routes (Server Components)
- `modules/<domain>/{data,domain,ui}` - One module per functional requirement
- `shared/` - Presentational primitives and shared types
- `lib/supabase/` - External data boundary

### 3. Data Layer Pattern (fetch → map → derive)
1. **fetch** - Typed Supabase query with RLS scoping
2. **map** - Pure DB-row → domain translation
3. **derive** - Lifecycle/date helpers computed from row

### 4. Import Direction (ESLint-enforced)
`app → modules → shared → lib/supabase`

## Security Architecture

- RLS is the security boundary (UI hiding is usability only)
- Service-role key never reaches client code
- Clerk session token supplied via the `accessToken` callback (native third-party auth)
- Tenant context lives in URL path segment
- Role-based access control (admin, coordinator, trainer, viewer)

## Data Flow

1. User requests protected route
2. Clerk middleware validates session
3. Server Component fetches data via module's `data/` layer
4. Supabase client includes Clerk JWT in Authorization header
5. RLS policies scope data to user's tenant/role
6. Data is mapped from DB types to UI domain types
7. Derived values computed (lifecycle, urgency, dates)
8. Server Component composes module UI components
9. Response rendered to user