# Codex — Phase 04 — Component library

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 04 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/03-design/DGS-04_UI_UX_Design_and_Workspace_Specification_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 03 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-04-01 — Component registry and local assets | Import all 29 definitions with typed adapter and local pinned vector icons; validate defaults and inventory, licensing and no remote asset fetch. | CL-01–04,CL-26,DM-02 |
| T-04-02 — Shared primitive geometry and scene | Implement DGS-06 exact primitives, text regions, visual bounds and cardinal anchors; test all 104 eligible anchors and finite shape geometry; export consumes same scene later. | CL-05–06,CL-19 |
| T-04-03 — Component library insertion | Implement categories and previews, drag/click/keyboard insert to root, correct transformed placement and one transaction; invalid drop no change. | CI-05,CL-01–02 |
| T-04-04 — Move and resize interactions | Implement preview and commit, reference snapping, opposite-side resize, circular aspect lock and floor checks; provisional text measurement replaced with full fitter Phase 06. | CI-10–14,CL-09,CL-13 |

## Phase-specific instructions

Implement all 29 registry entries, shared scene and local vectors, exact primitives/anchors, insertion, movement and resizing; verify minimums and aspect ratios. Include UX-05 insertion and resize slices at T-04-03/04. Treat boundary insertion separately from nested membership work in Phase 07. No duplicate shape definitions for export. Do not claim full font/layout/export verification before dependent work.

## Exit gate

All 29 registered types insert and render, geometry/anchors and resize validated, local assets present.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
