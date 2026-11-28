# Changelog

## Phase 09 — 28 November 2026

- Added durable local documents, library actions, revision-checked autosave, and independent viewport and panel preferences.
- Added conflict and storage failure recovery, guarded navigation, and editable JSON backups from the current editor graph. [Phase 09 evidence](docs/04-development/evidence/PHASE-09.md)

## Phase 08 — 28 November 2026

- Added undo and redo controls and canvas shortcuts for validated graph-only history. Viewport, settings and repository revisions stay current when a graph is restored.
- Coalesced keyboard nudge repeats and verified cancellation, session isolation and 50 mixed history transactions in the reference workload. [Phase 08 evidence](docs/04-development/evidence/PHASE-08.md)

## Phase 07 — 28 November 2026

- Added explicit nested grouping and parent selection, measured recursive expansion, and world-preserving reparent and ungroup actions.
- Added hierarchy-aware deletion and duplication. Internal links remap to copied components, and links to outside components stay with the original graph. [Phase 07 evidence](docs/04-development/evidence/PHASE-07.md)

## Phase 06 — 27 November 2026

- Added contextual property editing and direct label drafts for nodes, edges, and boundaries, with shared-style edits for compatible selections.
- Added measured text layout, atomic content fitting, boundary title and opacity controls, and manual architecture statuses. [Phase 06 evidence](docs/04-development/evidence/PHASE-06.md)

## Phase 05 — 27 November 2026

- The owner approved CR-05 and recognized V0.1 as the internal connected-editor milestone. V0.2 mandatory requirements remain in force.

- Closed Phase 04 locally and restored the original screenshot bytes in Git.
- Added validated pointer and keyboard connection creation, endpoint reconnection, route selection and edge-only deletion.
- Added shared deterministic routing, arrowheads, stroke and label geometry, with live updates after moving or resizing components. [Phase 05 evidence](docs/04-development/evidence/PHASE-05.md)

## Phase 04 — 27 November 2026

- Closed Phase 03 at the existing local workspace commit after owner acceptance.
- Added the categorized 29-component palette, shared SVG geometry and 14 local architecture icons. Components can be inserted by button, keyboard or drag.
- Added validated move, nudge and resize gestures with preview, world-space snap, and one history entry per committed graph edit. [Phase 04 evidence](docs/04-development/evidence/PHASE-04.md)

## Phase 03 — 27 November 2026

- Closed Phase 02 by reviewing and accepting the existing domain foundation commit.
- Added the Nodary library, temporary blank diagrams, a responsive editor, and a controlled canonical projection.
- Added viewport navigation, independent grid and snap settings, selection, and scoped keyboard controls. Same-tab navigation retains the active temporary workspace. [Phase 03 evidence](docs/04-development/evidence/PHASE-03.md)

## Phase 02 — 27 November 2026

- Closed Phase 01 after owner approval of CR-01.
- Added strict portable v1 contracts and graph validation against the full DGS-06 registry. Tracked the approved CR-01 amendment in a separate v1 reference schema.
- Added pure coordinate and containment operations, atomic commands and 50-entry graph history, session coordination, and a temporary document repository.
- Verified all four supplied fixtures and the local static shell regression. [Phase 02 evidence](docs/04-development/evidence/PHASE-02.md)

## Unreleased — 27 November 2026
- Prepared Nodary development documentation starter pack, v0.1.
- Retained DGS-01–11 original Markdown and nine supporting JSON artifacts byte-for-byte.
- Added specification index, SHA-256 source manifest, focused consistency review, Codex instructions, tracker, decision register, initialization prompt and Phase 00–12 prompts.
- Recorded five review items CR-01–05 without editing original specifications or marking them resolved.
- Artifact-level schema, fixture, ID, dependency and register checks passed as documented. No application implementation or runtime testing performed.

Product V0.1 (internal working editor) and V0.2 (stable MVP) have not been built or released. Starter pack version is not a product release version.
