# Codebase Map

Map of content for the **code** in this repo, mirroring the [[Wiki Home|wiki]] which maps the docs. One node per `modules/<domain>` (DDD layout from TES-68) plus the leaf layers. Open the graph view: this hub bridges the **code cluster** (module notes) to the **concept cluster** (wiki topics) — each module note links to the wiki topic that explains its domain.

> Structure fact (TES-68): code is grouped by **domain, not file type**. `app/` holds thin routes → `modules/<domain>/{data,domain,ui}` → `shared/` leaf primitives → `lib/supabase` data boundary. Import direction is ESLint-enforced: `app → modules → shared → lib/supabase`. See [[Architecture Overview]] and [[Data Layer Pattern]].

## Modules by functional requirement

| Module | FR | Status | Concept note |
| --- | --- | --- | --- |
| [[Auth Module]] | FR-01 | partial (data, ui) | [[Auth And Tenancy]] |
| [[Tenancy Module]] | FR-02 | partial (domain) | [[Auth And Tenancy]] |
| [[Batches Module]] | FR-03/04/05 | implemented (data, domain, ui) | [[Batch Lifecycle]] · [[Data Layer Pattern]] |
| [[Documents Module]] | FR-06 | partial (ui) | [[Document Checklist And Evidence]] |
| [[Attendance Module]] | FR-07 | stub (README) | [[Attendance And Progress]] |
| [[LAMR Module]] | FR-08 | stub (README) | [[LAMR Evidence]] |
| [[Billing Module]] | FR-09 | implemented (data, domain, ui) | [[Billing Engine]] |
| [[Import Export Module]] | FR-10 | stub (README) | [[Learner Identity And Import]] |
| [[Analytics Module]] | FR-11 | stub (README) | [[Attendance And Progress]] |
| [[Activity Module]] | FR-12 | stub (README) | [[Data Layer Pattern]] |
| [[Notifications Module]] | FR-13 | stub (README) | [[Alerts]] |
| [[Settings Module]] | FR-14 | stub (README) | [[Roles And Permissions]] |
| [[Reports Module]] | FR-15 | partial (ui) | [[LAMR Evidence]] |
| [[Shell Module]] | — (chrome) | partial (ui) | [[Architecture Overview]] |

## Leaf layers

- [[Shared Layer]] — `shared/ui` props-only primitives, `shared/types.ts` UI domain types, `shared/mocks` seed dataset. Never imports `modules/` or `app/`.
- `lib/supabase/` — the external data boundary (client/server factories + generated `database.types.ts`); the only place besides module `data/` allowed to touch generated row types. See [[Data Layer Pattern]].

## How the layers connect

`app/(dashboard)/<route>/page.tsx` (Server Component: fetch + compose) → `modules/<domain>/ui/*` screens → [[Shared Layer]] primitives; `modules/shell/ui/*` is the app chrome. Every module `data/` layer follows **fetch → map → derive** ([[Data Layer Pattern]]); only `data/` may import `database.types.ts`; components see [[Roles And Permissions|role-scoped]] domain DTOs only.

## Related

[[TVI-CAMS Knowledge Base]] · [[Wiki Home]] · [[Architecture Overview]] · [[Data Layer Pattern]]
