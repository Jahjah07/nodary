# AGENTS.md — Nodary

## Mission and scope
Build Nodary, a desktop-first local-first visual diagramming and architecture editor. Product name provisional; preserve DGS IDs. Current release target V0.2, V0.1 internal working-editor milestone. Only FR-01–15 Must; optional FR-16–19 and DGS-11 FF-01–28 are deferred unless owner explicitly schedules them. No backend, accounts, AI, billing, cloud sync, real-time collaboration, freehand or mobile editing for MVP.

## Read before editing
Read this file, README.md, docs/INDEX.md, docs/CONSISTENCY_REVIEW.md, DECISIONS.md and IMPLEMENTATION_TRACKER.md. Read DGS-09 and DGS-10 plus the active phase prompt and applicable source specs. Consult source by ID; original filenames and source lines are preserved.
- `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` — execution task authority.
- `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` — acceptance evidence authority.
- `docs/05-roadmap/registers/DGS-11_Future_Feature_Register_v0.1.json` — deferred feature backlog, not a work queue.
- DGS-01/02 define product scope and priority; DGS-03 architecture; DGS-04 UX; DGS-05 portable contract; DGS-06 registry/scene; DGS-07 interactions; DGS-08 persistence/export. DGS-09 sequences work, DGS-10 verifies, DGS-11 future only. Detailed compatible decisions refine earlier illustrations; actual conflicts require recorded owner-approved change, not arbitrary latest-wins. Review note CR-01–05 states conservative working interpretations; do not treat pending substantive changes as approved.

## Implementation boundaries
- Next.js App Router static export, `/` library and `/editor/?id=<uuid>` query route; no server routes for local IDs. Use browser APIs only client-side. Choose exact supported stable versions and compatible Node LTS in Phase 00; pin via lockfile, document notices and licenses. React Flow choice conditional on spikes; no paid service installs without approval.
- Canonical document is authoritative, not React Flow. `src/core` is pure TypeScript, no React, Next, Zustand, Dexie or canvas library dependency. Keep application ports and infrastructure adapters separate. No duplicate authoritative graph. Use strict Zod plus graph/registry/geometry validation; no unsafe coercion/unknown-field stripping.
- Use one shared scene/geometry pipeline for editor and native SVG, PNG rasterized from that scene. Bundle trusted vectors; no raw user SVG, external image/font loads or executable imported text. Preserve identifiers and schema v1 unless reviewed version/migration change is approved.
- All mutations via atomic commands; preview not committed; undo/redo logical transactions. Explicit grouping, parent-relative positions, cross-boundary edges, no orphan references. Respect DGS-06 capabilities and DGS-07 constraints; do not let renderer defaults bypass invariants.
- Save complete validated snapshots via revision-checked transactions; never show saved before commit or overwrite stale records. Failed save preserves current memory; editable JSON backup independent of storage. Do not clear DB as recovery. No fake persistence or fake export success.

## Phase workflow
1. Inspect Git status and current files before work; never discard user changes or overwrite existing repo contents. Read scoped task IDs, predecessor status, evidence and acceptance. Confirm the user-authorized phase/task; if unclear or blocked, report and stop dependent work.
2. Implement only the authorized tasks in dependency order. Start from minimal tested increments; prototypes stay isolated until explicitly adopted. New commands/tests should cite DGS IDs. No unrelated refactors, speculative abstractions or empty directory trees.
3. Add positive, negative and regression tests. Run applicable lint, typecheck, unit/integration, production build and Playwright E2E. Test real Chrome/Edge and real IndexedDB where required. No fabricated evidence, weakened assertions, hidden skips or auto-accepting screenshot baselines. Report unavailable commands and first failures even after reruns.
4. Update working JSON task and acceptance registers with actual results, evidence references, commit/build and environment. Keep statuses synchronized with tracker. Baseline manifest hashes are initial hashes, not expected to match intentionally updated working registers after baseline commit; never rewrite manifest to conceal changes. Store synthetic evidence only, no secrets or private diagrams.
5. Present diff summary, task status, tests, evidence, decisions, blockers, remaining work and phase gate result. Stop at phase boundary; do not auto-advance, push, publish, deploy, spend, or create external accounts. Local commit after owner review; no destructive git commands. Phase 12 requires explicit deployment approval for identified candidate.

## Quality and safety
All mandatory acceptance assertions and NFRs must pass before release; no unresolved S1/S2 or failed mandatory case. Optional cases only non-applicable with recorded reason. Use DGS-10 predeployment/closure split. Maintain visible errors and accessible keyboard alternatives. Do not claim a performance target or coverage floor achieved without measurements. If an approved design change affects schema/registry/fixtures/docs, update them together and add migration/regression evidence. No broad rewrite of historical specifications or evidence.
