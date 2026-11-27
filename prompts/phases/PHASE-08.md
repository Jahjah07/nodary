# Codex — Phase 08 — Commands and editing history integration

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 08 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 07 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-08-01 — Full transaction integration | Integrate all graph mutations with existing dispatcher/history; metadata/view excluded, one gesture/label/style commit, cancelled/noop no entry; undo/redo preserve current metadata/revision. | DM-15,CI-29–30,UX-11 |
| T-08-02 — Keyboard actions and history capacity | Finish nudge coalescing, undo/redo availability, duplicate/delete/group shortcuts and keyboard alternatives; test at least 50 graph transactions and redo branching. | CI-11,CI-30,CI-32,DM-24 |
| T-08-03 — End-to-end editor regression | Verify full scene fit, complex multi-selection, stale preview and resource limits; use both reference diagram categories; fix any bypasses of dispatcher. | CI-03,CI-08,CI-33,CL-08 |

## Phase-specific instructions

Complete command/history integration, selection and keyboard regression, undo/redo for every supported mutation with at least 50 transactions. Native text shortcuts remain native; cancellation and invalid commands preserve state. Verify no-op, new commit clears redo, history stays session-local, viewport does not create graph history. No real persistence until Phase 09.

## Exit gate

All editing paths use command dispatcher; 50 transactions, cancellation and undo/redo pass.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
