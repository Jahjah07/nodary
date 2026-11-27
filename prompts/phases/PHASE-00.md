# Codex — Phase 00 — Project initialization

Use from Nodary repository root. Submit only after owner authorizes this phase.

Implement **Phase 00 only**. Read AGENTS.md, README.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, docs/CONSISTENCY_REVIEW.md, DGS-09, DGS-10, and the source references below. Inspect existing Git state and previous evidence; preserve user changes.

## Required specifications

- `docs/01-product/DGS-01_Product_Requirements_Document_v0.1.md`
- `docs/01-product/DGS-02_MVP_Scope_and_Functional_Requirements_v0.1.md`
- `docs/02-architecture/DGS-03_System_Architecture_and_Technology_Stack_v0.1.md`
- `docs/02-architecture/DGS-05_Diagram_Data_Model_and_Schema_v0.1.md`
- `docs/04-development/DGS-09_Development_Roadmap_and_Implementation_Tasks_v0.1.md`
- `docs/04-development/DGS-10_Testing_and_Release_Acceptance_Criteria_v0.1.md`

## Entry and task scope

- Predecessor: owner authorization and pack baseline.
- Read `docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json` for exact task dependencies and deliverables; `docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json` for assertions and evidence.
- Do not assume task-linked tests that depend on later phases have already passed.

| Task | Deliverable / exit condition | Verification references |
|---|---|---|
| T-00-01 — Repository and specification baseline | Copy unchanged DGS-01–11 and companion fixtures into agreed locations; record checksums, initialize Git, AGENTS.md, README, tracker and decisions; baseline paths verified and no private diagrams committed. | — |
| T-00-02 — Scaffold and dependency lock | Initialize Next.js App Router static export, TypeScript, Tailwind, React Flow, Zustand, Zod, Dexie and test tooling; record exact stable versions, Node LTS compatibility, lockfile, license/notice review and reproducible install. | — |
| T-00-03 — CI and test harness | Add lint, typecheck, unit/integration, production build and Playwright scripts; clean runner executes all baseline checks; no secrets or paid services required. | — |
| T-00-04 — Static shell spike | Serve static output, reload /editor/?id=fixture, verify browser-only initialization and no server route dependency; record build and browser evidence. | SP-01 |

## Phase-specific instructions

Preserve baseline files and verify initial manifest. Initialize Git only if absent; if scaffold tooling refuses nonempty directory, generate in a temporary sibling directory and merge only reviewed scaffold files without overwriting existing docs. Choose compatible exact versions and Node LTS from actual package requirements; record license and lockfile. Build static shell and prove direct query-route reload using a synthetic local fixture. Do not implement production editor or claim persistence. Confirm CR-02/03/04 working interpretations; keep CR-01 open for Phase 01. Test harness must execute real baseline tests, not empty scripts.

## Exit gate

Clean install, static production build and CI baseline; SP-01 passed before further spikes.

Execute applicable checks from AGENTS.md and DGS-10. Record exact commands and actual outcomes (including skipped/blocked tests), changed files, task and scenario IDs, commit/build/environment and evidence references. Update working registers and tracker; report unresolved issues and proposed decisions. No fabricated pass, no unrelated changes, no automatic Git push or deployment. Stop and return phase gate result for owner review; do not execute the next phase.
