# Codex — Phase 06 — Properties and styling

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 06 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/03-design/DGS-04_UI_UX_Design_and_Workspace_Specification_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 05 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-06-01 — Contextual properties and styles | Implement no/single/mixed-selection inspector, allowed style fields, labels, route/arrows/dash and numeric bounds; invalid edits preserve graph; shared properties update atomically. | CL-10,CI-16–17,UX-06,UX-08 |
| T-06-02 — Text layout and content fit | Measured local font metrics, Unicode/multiline wrapping, no clipping or silent shrink; grow content or reject invalid dimensions; fit and ancestor growth integrate with Phase 07. Apply approved XML policy. | CL-11–13,CI-14–16,DM-04 |
| T-06-03 — Architecture status and boundary title controls | Implement four status values for architecture only, marker and text without overriding style; group title and opacity; ensure neutral status backing and readable contrast. | CL-14–16,DM-14,UX-10 |

## Phase-specific instructions

Implement contextual properties, plain text wrapping, measured content fit and atomic auto-growth or rejection, architecture-only statuses and group titles. Follow approved CR-01 Unicode policy. Styling is explicit canonical data, not arbitrary CSS; status must not override fill/border. Verify unsupported controls absent and multiselect mixed fields preserved.

## Exit gate

Validated node/edge/group property controls, status and text-fitting behavior work.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
