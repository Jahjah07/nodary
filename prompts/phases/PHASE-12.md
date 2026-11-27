# Codex — Phase 12 — Deployment and release

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 12 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-01_Product_Requirements_Document_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/04-development/DGS-08_Document_Persistence_and_Export_Specification_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: Phase 11 gate with evidence.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-12-01 — Production build and deployment approval | Create reproducible tagged static build, verify no private data, licenses and origin warnings; hosting choice and production deployment require owner approval. | AC-01–08 |
| T-12-02 — Production smoke and rollback | On intended HTTPS origin verify new diagram, save/reload, JSON backup, PNG/SVG, no unintended uploads; test compatible rollback plan and document origin isolation/migration constraints. | AC-05–07,PE-39 |
| T-12-03 — Release handover | Record tag, build hash, known issues, test evidence, backup guide and deferred scope; update README/tracker/changelog; release only after owner sign-off. | AC-01–08 |

## Phase-specific instructions

Confirm Phase 11 predeployment gates and immutable candidate; produce production build, verify static host eligibility, HTTPS, origin and backup guidance. Require separate explicit deployment approval before external actions; without it stop with candidate evidence. On approved deployment perform smoke, compatible rollback/forward-fix strategy, final documentation and RG-05/10 closure. No release declaration on failed smoke; never clear user DB.

## Exit gate

Production static artifact deployed only after approval; smoke checks, origin/backup warning and rollback documented.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
