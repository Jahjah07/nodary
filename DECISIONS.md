# Nodary — Decision register

**Date:** 27 November 2026. Product owner indicated the planning series looks good and chose provisional name Nodary. That does not constitute approval of future features, unresolved engineering decisions, dependency versions, production deployment or spend. This register indexes decisions and review items; no changes to original DGS files.

| ID | Decision | State | Evidence / next action |
|---|---|---|---|
| ND-01 | Product/repository name Nodary / nodary | Provisional name confirmed; repo convention proposed | Owner conversation; trademark/domain not checked |
| ADR-01 | Client-side modular monolith | Baseline draft | DGS-03 |
| ADR-02 | Static Next.js shell/query route | SP-01 passed locally | Use a client query boundary and full document navigation for the shell. Verify the production host later. [Phase 00 evidence](docs/04-development/evidence/PHASE-00.md) |
| ADR-03 | Controlled React Flow adapter | Conditional | SP-02/03/04 |
| ADR-04 | Independent versioned canonical schema | Baseline draft | DGS-05; schema v1 unchanged |
| ADR-05 | Parent-relative explicit grouping | Conditional | SP-02; DGS-07 |
| ADR-06 | Zustand session, commands, bounded history | Conditional | SP-06/08 |
| ADR-07 | Dexie snapshot revision checks | Conditional | SP-05 |
| ADR-08 | Shared scene, native SVG, PNG rasterization | Conditional | SP-04 |
| ADR-09 | Bundled vector icons and controlled typography | Conditional | SP-04; notices/font strategy pending |
| ADR-10 | Optional ELK only | Deferred | FR-17, license review before use |
| ADR-11 | Static HTTPS, no mandatory telemetry | Baseline draft | Host selection/terms/header checks pending |
| ADR-12 | Version pins and reproducible CI | Verified on clean local runner | Node 22 LTS, npm 11.21.1, strict lockfile install. GitHub Actions run pending. [Phase 00 evidence](docs/04-development/evidence/PHASE-00.md) |
| CR-01 | Canonical XML-compatible Unicode text | Open | Review before Phase 02; explicit decision by T-01-08; no silent loss |
| CR-02 | UX-05 supplemental task mapping | Phase 00 working interpretation, owner review pending | Use DGS-10 `relatedTaskIds` for T-03-04, T-04-03 and T-04-04. T-11-01 owns final verification. |
| CR-03 | RG-09 cannot waive mandatory pilot gate | Phase 00 working interpretation, owner review pending | Keep the 4/5 within 10 minutes unassisted target. T-11-04 verifies it. |
| CR-04 | Phase 11 predeployment vs Phase 12 closure | Phase 00 working interpretation, owner review pending | Follow the DGS-10 §14 split. Close deployment, smoke and rollback evidence in Phase 12 after explicit deployment approval. |
| CR-05 | V0.1 styling milestone wording | Open naming detail | Review at M2, no task reorder |
| ND-02 | Retain full source filenames and initial hashes | Pack assembly decision | docs/BASELINE_MANIFEST.json |
| ND-03 | No app scaffold or dependencies in starter ZIP | Pack assembly decision | Phase 00 selects versions and initializes |

See docs/CONSISTENCY_REVIEW.md for exact proposed changes and references. Confirm assumptions during Phase 00 and record owner responses. A failed mandatory spike blocks dependent work; choose adaptation only with evidence, review and rerun.

## Decision entry template
```text
ID / date / status (proposed, accepted, rejected, superseded, deferred)
Decision and reason / alternatives considered / affected DGS, tasks, scenarios
Compatibility, migration, security and cost implications
Evidence / owner approval reference / implementation and revalidation plan
```
