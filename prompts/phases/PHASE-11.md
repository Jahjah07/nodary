# Codex — Phase 11 — Testing and stabilization

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 11 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-01_Product_Requirements_Document_v0.1.md`
- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/03-design/DGS-04_UI_UX_Design_and_Workspace_Specification_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-08_Document_Persistence_and_Export_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 10 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-11-01 — Consolidated mandatory traceability suite | Execute every mandatory parent, feature and specialist scenario per DGS-10; evidence with test ID, commit and environment; no unexecuted mandatory checks treated as passes. | AC-01–08,AC-FR-01–15 |
| T-11-02 — Security, accessibility and compatibility audit | Test malformed imports, markup, remote network requests, keyboard-only editing, contrast/focus, licenses and actual Chrome/Edge desktop; use synthetic data only. | UX-17,CL-25–26,CI-32,PE-24,PE-30 |
| T-11-03 — Performance and visual fidelity | Measure reference graph on approved hardware/browser, save/export timings and memory; independently inspect vector and PNG; compare approved DGS-10 thresholds, fix regressions. | CI-35,PE-40,CL-21,DM-24 |
| T-11-04 — Usability, defect triage and release candidate | Run pilot tasks and gate review; classify defects, fix and rerun impacted tests; record explicit optional deferrals, approve candidate only with all mandatory gates satisfied. | AC-01–08 |

## Phase-specific instructions

Execute full mandatory acceptance suite, applicable optional decisions, security/privacy/license audit, actual Chrome/Edge and independent exports, performance protocol, coverage floors, accessibility and pilot. Resolve CR-03 and outstanding mandatory defects; no fake pilot or benchmark evidence. CR-04: only applicable predeployment gates here; RG-05/10 final deployment closure remains pending. Do not deploy.

## Exit gate

All applicable predeployment gates pass with evidence, no mandatory blockers; RG-05/RG-10 deployment closure remains pending until Phase 12 (CR-04).

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
