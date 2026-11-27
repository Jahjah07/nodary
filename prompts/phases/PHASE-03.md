# Codex — Phase 03 — Workspace and canvas

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 03 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/03-design/DGS-04_UI_UX_Design_and_Workspace_Specification_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 02 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-03-01 — Workspace routes and shell | Implement / and query-based editor route, list workspace, create/open and missing-ID states against temporary adapter; header, toolbar, collapsible panels, status bar and neutral design tokens. | UX-01–04 |
| T-03-02 — React Flow projection adapter | Project canonical nodes/groups/edges, parent-first ordering, stable IDs; renderer measurements/preview transient; no direct committed graph mutation. | CI-01–04 |
| T-03-03 — Viewport navigation and grid | Pan, pointer zoom 25–200%, fit via scene bounds interface, reset and 20-unit grid/snap independent; complete fit verified again after scene integration. | CI-02–04,CI-06,DM-18 |
| T-03-04 — Selection and hit testing | Single/shift/marquee/full selection, empty canvas clear, overlap priority, noncapturing boundary interior and pointer cancellation; no history on selection. | CI-07–09,CI-29 |
| T-03-05 — Keyboard/focus controller and responsive shell | Implement shortcut arbitration and visible alternatives; native input/dialog behavior, focus restoration, desktop panel breakpoints and responsive overflow; final keyboard audit Phase 11. | UX-15,UX-17,CI-32 |

## Phase-specific instructions

Build static workspace/editor shell and controlled renderer adapter with explicit temporary in-memory repository. Implement grid/snap, viewport, fit and selection/focus, supported desktop breakpoints and shortcuts. Do not label in-memory data as saved locally. Include UX-05 selection evidence for T-03-04; later insertion/resize and persistence cases remain pending.

## Exit gate

Working local in-memory editor shell with viewport, selection, focus and navigation; persistence explicitly not yet complete.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
