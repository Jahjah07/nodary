# Codex — Phase 09 — Persistence and recovery

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 09 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/03-design/DGS-07_Canvas_and_Interaction_Specification_v0.1.md`
- `docs/04-development/DGS-08_Document_Persistence_and_Export_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 08 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-09-01 — Dexie repository and lifecycle | Implement documents/viewports/preferences stores, create/open/rename/duplicate/delete and atomic row/view operations; strict loaded content validation, no reset on error; template path completed Phase 10. | PE-01–06,PE-20–22 |
| T-09-02 — Autosave coordinator | 750 ms debounce, 1s max-wait when available, one in-flight immutable snapshot, generation-aware acknowledgement, retry latest, undo saved as new revision. | PE-07–12,PE-19,CI-31 |
| T-09-03 — Cross-tab conflict and recovery | CAS transaction, stale deletion protection, copy/reload/backup, session isolation and pending navigation; test two actual tabs even with notifications disabled. | PE-13–18,DM-19,UX-12 |
| T-09-04 — Viewport, upgrades and failure handling | Independent 500ms viewport debounce without graph revision, safe corrupt-view fallback, blocked upgrade/versionchange, no destructive rollback; test transaction abort and unavailable storage. | PE-20–22,PE-39 |
| T-09-05 — Editable backup recovery integration | Expose safe JSON export of current valid in-memory snapshot even when DB unavailable, reusing Phase 02 validation; no stale substitution; final import/export UI Phase 10. | PE-11,PE-27,UX-13 |

## Phase-specific instructions

Implement Dexie document lifecycle and separate viewport, serialized autosave, transactional expected-revision compare-and-swap, no stale resurrection, real-tab conflicts and failure recovery. Save acknowledgment after transaction and only for current generation. Build usable JSON backup path before full import/export work. Verify real browser abort/failure, edit-during-save and navigation flush; retain in-memory graph on failure.

## Exit gate

Real browser saves, reload, revision conflict, stale deletion and backup-on-failure verified.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
