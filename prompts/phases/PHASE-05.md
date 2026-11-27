# Codex — Phase 05 — Connections and routing

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 05 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 04 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-05-01 — Edge creation and graph constraints | Create directed endpoints through pointer and keyboard controls; support branching and cycles, reject exact duplicates/self-loops/annotations/frames and dangling references. | DM-09–10,CI-18–19,CL-07 |
| T-05-02 — Shared route and marker geometry | Implement deterministic straight/orthogonal paths with endpoint normals, candidate ordering, explicit fallback and path-length label position; finite all handle/overlap cases; shared editor/export scene. | CI-21–22,CL-18 |
| T-05-03 — Edge renderer and reconnection | Render selectable edges and preview labels/arrows; reconnect either endpoint with stable ID/style; invalid release restores edge, motion and resize update anchors. | DM-11,CI-18–20,CL-08,UX-07–08 |

## Phase-specific instructions

Implement valid edge creation, directed tuple checks, deterministic straight/orthogonal routes and endpoint geometry; preserve connection identity on reconnection, reject invalid operations. Test branch labels, cycles, reverse directions, cross-boundary-ready edges and invalid targets. M2 is internal working-editor demonstration only; check CR-05 milestone labeling. No stable release.

## Exit gate

Branching, cycles, reconnect and route geometry work; invalid edges never mutate state.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
