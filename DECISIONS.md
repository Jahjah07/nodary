# Nodary — Decision register

**Date:** 27 November 2026. Product owner indicated the planning series looks good and chose provisional name Nodary. That does not constitute approval of future features, unresolved engineering decisions, dependency versions, production deployment or spend. This register indexes decisions and review items; no changes to original DGS files.

| ID | Decision | State | Evidence / next action |
|---|---|---|---|
| ND-01 | Product/repository name Nodary / nodary | Provisional name confirmed; repo convention proposed | Owner conversation; trademark/domain not checked |
| ADR-01 | Client-side modular monolith | Baseline draft | DGS-03 |
| ADR-02 | Static Next.js shell/query route | Phase 09 durable workspace integrated | Preserve direct static entry pages and real link hrefs. Same-tab navigation resolves drafts and waits for pending content. Reopening loads the validated stored graph with fresh history. [Phase 09 evidence](docs/04-development/evidence/PHASE-09.md) |
| ADR-03 | Controlled React Flow adapter | Phase 05 connection editing integrated | Project canonical items parent-first. Canvas pointer capture and the endpoint dialog send validated edge commands. React Flow displays the derived stroke, markers and label. Its native mutations and keyboard operations stay disabled. |
| ADR-04 | Independent versioned canonical schema | Phase 02 core verified | Strict Zod v1 contracts and graph validation. CR-01 has a separately tracked v1 reference and executable parity checks. [Amended schema](docs/02-architecture/schemas/DGS-05_Portable_Diagram_Schema_v1_CR-01.json) |
| ADR-05 | Parent-relative explicit grouping | Phase 07 hierarchy implemented | Canonical commands group siblings, choose parents explicitly and preserve world coordinates. Containment expands bottom-up using measured ink and title geometry. Deletion promotes surviving descendants, and duplication remaps a single copy of each selected subtree and its internal edges. |
| ADR-06 | Zustand session, commands, bounded history | Phase 08 editor history integrated | The shared dispatcher stores up to 50 immutable graph snapshots and reuses unchanged collections. Undo and redo validate graph restoration using current metadata, reconcile selection, and publish through the existing session path. Viewport, metadata and repository revision stay independent. Canvas shortcuts and toolbar actions share the same path and cancel an active gesture before changing history. [Phase 08 evidence](docs/04-development/evidence/PHASE-08.md) |
| ADR-07 | Dexie snapshot revision checks | Phase 09 persistence integrated | Use `diagramming-system` v1. Compare revisions inside write and delete transactions, acknowledge only after commit, and coalesce newer generations separately. Persist viewport independently. Focus re-reads revisions, and conflict and failure recovery keep the current graph available for local JSON backup. [Phase 09 evidence](docs/04-development/evidence/PHASE-09.md) |
| ADR-08 | Shared scene, native SVG, PNG rasterization | Phase 05 router integrated | Straight and orthogonal routes derive from world anchors. Orthogonal candidates rank by endpoint interior crossings, length, bends and enumeration. The scene owns marker, stroke and label bounds. Coincident straight anchors use the orthogonal fallbacks while retaining the stored preference. Phase 10 will consume the shared scene for visual export. |
| ADR-09 | Bundled vector icons and controlled typography | Phase 06 measured layout integrated | Use the installed Arial/Liberation Sans/system fallback stack. The shared scene stores measured ink and explicit SVG line placements. Canonical style and label edits fit or reject atomically. Phase 10 verifies standalone SVG portability and export notices. |
| ADR-10 | Optional ELK only | Deferred | FR-17, license review before use |
| ADR-11 | Static HTTPS, no mandatory telemetry | Baseline draft | Host selection/terms/header checks pending |
| ADR-12 | Version pins and reproducible CI | Verified on clean local runner | Node 22 LTS, npm 11.21.1, strict lockfile install. GitHub Actions run pending. [Phase 00 evidence](docs/04-development/evidence/PHASE-00.md) |
| CR-01 | Canonical XML-compatible Unicode text | Approved by owner, 27 November 2026 | Reject U+FFFE and U+FFFF alongside existing restrictions in document titles, node labels, boundary titles and edge labels. Preserve valid supplementary Unicode, original rejected inputs and stored records. Report field and code point. Invalid edits leave graph and history intact. XML escaping remains mandatory. Retain portable version 1 and preserve baseline artifacts. [Phase 01 evidence](docs/04-development/evidence/PHASE-01.md#owner-closure) |
| CR-02 | UX-05 supplemental task mapping | Approved by owner, 27 November 2026 | Use DGS-10 `relatedTaskIds` for T-03-04, T-04-03 and T-04-04. T-11-01 owns final verification. |
| CR-03 | RG-09 cannot waive mandatory pilot gate | Approved by owner, 27 November 2026 | Keep the 4/5 within 10 minutes unassisted target. T-11-04 verifies it. |
| CR-04 | Phase 11 predeployment vs Phase 12 closure | Approved by owner, 27 November 2026 | Follow the DGS-10 §14 split. Close deployment, smoke and rollback evidence in Phase 12 after explicit deployment approval. |
| CR-05 | V0.1 working connected editor milestone | Approved by owner, 27 November 2026 | M2 demonstrates insertion, movement, resizing, connections and routing with supported default styles. Phase 06 retains full label and style controls. V0.1 is an internal development milestone. All V0.2 mandatory requirements and release gates remain in force. |
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
