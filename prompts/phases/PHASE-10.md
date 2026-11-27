# Codex — Phase 10 — Import, export and templates

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 10 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-08_Document_Persistence_and_Export_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 09 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-10-01 — Bounded JSON import and portable export | Implement strict UTF-8/duplicate-key/depth/size checks, v1 validation, ID remap, atomic add-only import and immutable export snapshot; reject unsupported versions and unsafe keys. | PE-23–28,DM-16–17,DM-20 |
| T-10-02 — Starter templates and independence | Bundle exact DGS-06 flowchart and architecture fixtures, remap all IDs, validate, persist and open; independently editable, immutable sources; template instances JSON round-trip. | CL-22–24,DM-23,UX-02,UX-16 |
| T-10-03 — Standalone SVG serializer | Generate native safe XML vector output from scene with full bounds, 32-unit white padding, icons, text and statuses; no UI, remote assets or raster wrapper; handle XML errors explicitly. | PE-29–33,CL-18–21,DM-22 |
| T-10-04 — PNG renderer and preflight | Rasterize same scene at 2x (explicit 1x), 8192 edge and 16 Mi pixel budgets; decode/encode/null/timeout cleanup and correct dimensions; no hidden scale reduction. | PE-34–36 |
| T-10-05 — File dialogs, handoff and regression | Wire import/export dialog, filename sanitization, stable captured snapshot after draft resolution, browser download handoff; independently inspect PNG/SVG and reimport JSON in target browsers. | PE-37–38,UX-13–14,CI-34,CL-03 |

## Phase-specific instructions

Implement strict JSON parse/validate/remap/add-only import and JSON backup, independent template creation, controlled native SVG and raster PNG with full visual bounds. Use shared scene, XML policy, no remote dependencies, 32-unit padding and white default; enforce resource caps before allocation and explicit 1× alternative. Test export from unsaved valid state, independent viewer, filename/download cleanup and invalid import atomicity.

## Exit gate

Both templates, JSON semantic round trip, genuine SVG and PNG with full bounds verified.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
