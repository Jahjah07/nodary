# Codex — Phase 02 — Core domain and command foundation

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 02 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 01 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-02-01 — Canonical contracts and runtime schema | Define TypeScript/Zod from DGS-05 v1; strict unknowns, field ranges, finite geometry, UUID/time validation; parity tests against JSON schema and fixtures. | DM-01–05,DM-21 |
| T-02-02 — Graph integrity and registry contract | Load trusted registry, validate global IDs, parent types/cycles/depth, eligibility, duplicate directed tuples and status; reject invalid graph atomically. | DM-06,DM-09–10,DM-14 |
| T-02-03 — Coordinate and containment primitives | Pure world/local conversion, bounds and ancestor traversal; test negative/fractional values, expansion and preserved sibling positions. | DM-07–08,DM-18,CI-01 |
| T-02-04 — Command dispatcher and history foundation | Implement typed command results, atomic validation, committed/noop/rejected state, graph-only history API, generation counter and selection reconciliation; wire before UI mutations. | DM-15,CI-33 |
| T-02-05 — Session and repository interfaces | Define document repository port, session tokens, save-state contracts and version boundary; in-memory test adapter clearly distinguished from real persistence. | DM-19,DM-20 |

## Phase-specific instructions

Implement strict schema v1 runtime parity, registry validation, graph invariants, parent-local/world transformations and atomic commands/history foundation. Respect CR-01 decision, code-point counts and bounded parsing policy; do not import renderer or browser APIs into core. Session/repository ports remain separate. Test invalid input and no-op/failed mutation immutability; later integration tests stay pending.

## Exit gate

Schema parity, pure graph validation and atomic command/history foundation pass; no renderer dependency in core.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
