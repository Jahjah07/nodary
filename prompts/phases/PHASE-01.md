# Codex — Phase 01 — Technical prototypes and decision gates

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 01 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-08_Document_Persistence_and_Export_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 00 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-01-01 — Nested boundaries spike | Prove two nested levels, parent motion once, reparent and ungroup preserve world positions, expansion and undo with cross-boundary edges. | SP-02 |
| T-01-02 — Connector spike | Prove four cardinal handles, negative coordinates, resize/reconnect, straight and orthogonal geometry and full scene fit; invalid reconnect keeps ID and endpoints. | SP-03 |
| T-01-03 — Vector export spike | Build minimal controlled SVG/PNG proof with multiline labels, vector icons, markers and nested boundaries; inspect independent viewer, XML safety and font parity. | SP-04 |
| T-01-04 — Persistence spike | Demonstrate transactional CAS in two real browser pages, quota/abort, edit during save and stale deletion; capture outcomes and recovery UI implications. | SP-05 |
| T-01-05 — History spike | Prove compound duplicate/delete/undo, redo invalidation, failed command immutability and 50 transactions using representative graph. | SP-06 |
| T-01-06 — Keyboard and accessibility spike | Prove focus arbitration, native text undo, keyboard alternative to connect/resize, cancellation and visible focus; document gaps. | SP-07 |
| T-01-07 — Performance baseline spike | Run 100-node/150-edge synthetic workload in production shell; capture hardware/browser/build, frame and commit/save/export measurements or explicitly unavailable measurements; DGS-10 owns thresholds. | SP-08 |
| T-01-08 — Architecture review and compatibility decisions | Record each spike result, ADR outcome, font strategy, XML-incompatible text policy and license review; no failed mandatory spike silently waived. Re-run affected prototypes after changes. | SP-01–08 |

## Phase-specific instructions

Execute SP-02–08 in order; SP-01 must already pass from Phase 00. Isolate prototypes; evidence includes working cases, failures, environment and proposed architecture adaptations. T-01-08 resolves CR-01 (XML compatibility), parser and font strategy, licenses, renderer/export choice and any performance blocker with owner approval and revalidation. Stop on unresolved mandatory blocker. Do not implement Phase 02.

## Exit gate

SP-02–08 evidence recorded; mandatory architecture blockers resolved or formally stop dependent work.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
