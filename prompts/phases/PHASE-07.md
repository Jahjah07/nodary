# Codex — Phase 07 — Grouping and boundaries

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 07 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-06_Shape_and_Component_Library_Specification_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 06 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-07-01 — Boundary scene and nesting | Render frames behind descendants, title/border hit regions, dynamic padding; nested children parent-relative, cross-boundary edges intact. | CL-16,CI-23–25 |
| T-07-02 — Group and explicit reparent operations | Create same-parent selection group, add/remove membership with world-coordinate preservation and cycle/depth checks; visual overlap never changes membership. | DM-06–08,CI-23,CI-26 |
| T-07-03 — Recursive expansion and resizing | Expand ancestor frames in all directions, rebase child locals to preserve unrelated world positions; boundary resize does not scale children, invalid shrink rejects. | CI-24–25,CL-12,DM-08 |
| T-07-04 — Delete, ungroup and duplicate graph operations | Normalize selected roots, remove incident edges only for deleted nodes, preserve unselected descendants, remap copied internal edges and IDs; undo fully restores transaction. | DM-12–13,CI-27–28,CL-17,UX-09 |

## Phase-specific instructions

Implement explicit same-parent grouping, nesting, reparenting, world-preserving boundary resize/expansion and safe frame deletion. Descendants move once, nonselected children survive, internal edges remap during duplication. Reject cycles/depth violations, test compound transactions and undo. No automatic membership from visual overlap.

## Exit gate

Nested group geometry, expansion, explicit membership and safe deletion/duplication pass.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
