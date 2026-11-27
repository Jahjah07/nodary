# Nodary — Decision register

**Date:** 27 November 2026. Product owner indicated the planning series looks good and chose provisional name Nodary. That does not constitute approval of future features, unresolved engineering decisions, dependency versions, production deployment or spend. This register indexes decisions and review items; no changes to original DGS files.

| ID | Decision | State | Evidence / next action |
|---|---|---|---|
| ND-01 | Product/repository name Nodary / nodary | Provisional name confirmed; repo convention proposed | Owner conversation; trademark/domain not checked |
| ADR-01 | Client-side modular monolith | Baseline draft | DGS-03 |
| ADR-02 | Static Next.js shell/query route | Phase 03 navigation verified locally | Preserve direct static entry pages and real link hrefs. Same-tab library/editor navigation uses browser history while the workspace stays mounted. Reload and tab closure end the temporary session. [Phase 03 evidence](docs/04-development/evidence/PHASE-03.md) |
| ADR-03 | Controlled React Flow adapter | Phase 03 projection verified | Project canonical items parent-first. Canvas input uses pure scene transforms and deterministic geometry for selection. Renderer mutation and keyboard operations are disabled. Full component geometry and connector editing remain assigned to their later phases. |
| ADR-04 | Independent versioned canonical schema | Phase 02 core verified | Strict Zod v1 contracts and graph validation. CR-01 has a separately tracked v1 reference and executable parity checks. [Amended schema](docs/02-architecture/schemas/DGS-05_Portable_Diagram_Schema_v1_CR-01.json) |
| ADR-05 | Parent-relative explicit grouping | SP-02 passed | Normalize transform roots and expand ancestors bottom-up. Reparent and ungroup in world coordinates. Production containment uses measured visual bounds. |
| ADR-06 | Zustand session, commands, bounded history | Phase 03 UI binding verified locally | A workspace-scoped Zustand store holds the active immutable session. The pure dispatcher publishes settings changes and keeps graph-only history. Presentation and pointer gestures remain transient. |
| ADR-07 | Dexie snapshot revision checks | SP-05 passed | Compare revisions inside the write transaction and acknowledge after completion. Retain newer in-memory edits and backup on failure. |
| ADR-08 | Shared scene, native SVG, PNG rasterization | SP-04 passed | Serialize allowlisted primitives from the scene and rasterize the same SVG for PNG. Guard allocation and preserve editable JSON when visual export fails. |
| ADR-09 | Bundled vector icons and controlled typography | SP-04 established a Windows font baseline | Use verified local metrics and explicit line layout with Arial/Liberation Sans fallbacks. Recheck fallback and Unicode coverage in the release matrix. Preserve Lucide/Feather notices when using their vectors. |
| ADR-10 | Optional ELK only | Deferred | FR-17, license review before use |
| ADR-11 | Static HTTPS, no mandatory telemetry | Baseline draft | Host selection/terms/header checks pending |
| ADR-12 | Version pins and reproducible CI | Verified on clean local runner | Node 22 LTS, npm 11.21.1, strict lockfile install. GitHub Actions run pending. [Phase 00 evidence](docs/04-development/evidence/PHASE-00.md) |
| CR-01 | Canonical XML-compatible Unicode text | Approved by owner, 27 November 2026 | Reject U+FFFE and U+FFFF alongside existing restrictions in document titles, node labels, boundary titles and edge labels. Preserve valid supplementary Unicode, original rejected inputs and stored records. Report field and code point. Invalid edits leave graph and history intact. XML escaping remains mandatory. Retain portable version 1 and preserve baseline artifacts. [Phase 01 evidence](docs/04-development/evidence/PHASE-01.md#owner-closure) |
| CR-02 | UX-05 supplemental task mapping | Approved by owner, 27 November 2026 | Use DGS-10 `relatedTaskIds` for T-03-04, T-04-03 and T-04-04. T-11-01 owns final verification. |
| CR-03 | RG-09 cannot waive mandatory pilot gate | Approved by owner, 27 November 2026 | Keep the 4/5 within 10 minutes unassisted target. T-11-04 verifies it. |
| CR-04 | Phase 11 predeployment vs Phase 12 closure | Approved by owner, 27 November 2026 | Follow the DGS-10 §14 split. Close deployment, smoke and rollback evidence in Phase 12 after explicit deployment approval. |
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
