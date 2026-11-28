# Phase 09 verification

28 November 2026 PHT.

## Phase 08 closure

The owner accepted Phase 08 at the existing local commit `44bfdb617fad41b71a486f58dbbb014b17d82717` (Command and Editing history). The working tree was clean at entry. The closure reviewed all 19 files against the authorized transaction, keyboard, regression and record-keeping scope. The 16 new passes were checked against DGS-10 assertions and the linked tests. The registers agreed on 95 mandatory passes, 110 mandatory cases unrun, and 13 conditional cases unrun.

The audit confirmed 18 immutable source hashes, the approved CR-01 v1 amendment and CR-05 milestone, the unchanged dependency lock, and 36 historical PNGs with exact Git bytes and valid PNG chunks. It reviewed the reference test’s 50 mixed commits, 50 undos and 50 redos, the 78 passing serial browser results, and the four passing comparison results. The earlier intermittent Edge click stall remains unresolved. Standalone export and cross-platform font fidelity remain open. Hosted GitHub Actions remains unrun. [Phase 08 evidence](PHASE-08.md)

## Implementation and architecture

| Task | Implementation |
|---|---|
| T-09-01 | Static hydration opens Dexie database `diagramming-system`, logical version 1, with independent document, viewport and allowlisted panel preference stores. Rows are validated against portable v1 and indexed metadata. Creation and copying are add-only at revision 1, with bounded identifier-collision retries. Deletion removes document and viewport together. Library and editor actions expose rename, independent copy and confirmed deletion. |
| T-09-02 | One coordinator per open document session uses a 750 ms trailing timer and 1,000 ms first-pending bound. The immutable in-flight capture keeps its token, generation and expected revision. New edits stay available while a write is in flight. The visible badge follows actual transaction completion, and a failed write pauses automatic saving until explicit retry. |
| T-09-03 | Expected-revision conditions and row changes share each write transaction. No broadcast or messaging API participates in production correctness. Focus and visibility return re-read the stored revision and library. Conflict actions reload with confirmation, open an independent copy, download the current graph or stay in the editor. Navigation resolves drafts, cancels gestures and awaits pending writes. |
| T-09-04 | A 500 ms independent viewport timer validates coordinates and verifies document existence transactionally. Invalid stored view and panel preferences fall back with diagnostics. The adapter closes on version change and pins the native open request to the declared version, blocking Dexie fallback and automatic incompatible-schema patching. |
| T-09-05 | The toolbar and recovery panel download the current validated graph as the exact portable v1 envelope through a local Blob. Filename cleanup and the 10 MiB byte limit apply before browser handoff. A missing or invalid viewport can be omitted explicitly. The action needs only the active session. |

The workspace holds one canonical graph with immutable command history. The stored graph is the reload authority and the editor graph is the current editing authority. Draft text, selection, gesture previews, revision numbers and history stay out of the portable envelope. Undo and redo publish new content generations and use the same write path as other graph edits. The built-in read-only example remains a bundled fixture and does not add a stored document.

The repository awaits Dexie’s outer transaction. Chromium’s strict durability option is requested where supported. Browser commit does not establish protection from power loss, eviction, private-mode storage clearing or user-initiated deletion. Application content stays local and scoped to the same origin and browser profile. No migration for hypothetical payload versions is installed.

## Verification

Windows 11 x64. Node 22.14.0, npm 11.21.1, Next.js 16.4.6, Dexie 4.4.7, Vitest 5.1.2 and Playwright 1.65.1. Chrome 158.0.8127.38, Edge 158.0.4370.45 and Chromium 159.0.8154.6. Static build ID `JEUGs1G9CuerPxsp69k_A`.

| Command | Local result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 171/171 unit and integration cases across 20 files |
| `npm run test:coverage` | 171/171 passed with the measurements below |
| `npm run build` | Pass. Both application routes statically exported |
| Installed Playwright CLI with `--workers=1 --timeout=60000 --output=test-results/phase09-verified --reporter=line,json` | 102/102 passed in 4.0 minutes, 34 each in Chrome, Edge and Chromium. Report `test-results/phase09-verified.json` |

The first typecheck identified the absent Dexie `getKey` API and outdated shell test props. The adapter now checks existence inside the required transaction with `get`, and the test passes the new library inputs. Lint identified synchronous React effect dispatch and an unused test binding. The startup and location subscriptions now use cancellable microtasks, and the test compares full remapped copies without discarded bindings.

The first Chrome target run passed 11/16. Four assertions matched Next.js’s route announcer as well as their intended library diagnostic. The stale-tab test attempted to zoom in after fit already reached the maximum. The rerun scoped alerts to the library and used an available zoom direction while retaining the diagnostic and no-orphan assertions. The expanded focused Chrome rerun passed 11/11 in 45.2 seconds. The initial report and traces remain in `test-results/phase09-chrome-targeted.json` and `test-results/phase09-chrome-targeted/`.

The first full serial run passed 101/102 in 4.0 minutes. All twenty-four new persistence cases passed across the three engines. An older Chromium SVG geometry regression failed because its temporary-session harness registered unconditional dialog accept handlers for hard-navigation between examples. Pending-write warnings are now conditional, so two handlers could accumulate and try to accept the same dialog. The test now uses the guarded library transition and retains the same component and SVG assertions. The initial full report and trace remain in `test-results/phase09-serial.json` and `test-results/phase09-serial/`. The older Edge click-stall investigation remains open.

The next serial run passed 101/102. Its Edge registry test recorded one request for the already-declared startup favicon approximately 0.77 seconds after offline mode was set. Chrome and Edge both passed a traced check that waited for the finished startup request first. Bundled Chromium did not issue the request and timed out in that focused wait. The harness now waits for the startup favicon only in the installed channels and enforces the original zero-request assertion during offline editing in all three engines. The second serial and focused reports are `test-results/phase09-final.json` and `test-results/phase09-favicon-check.json`.

| Coverage | Lines | Branches | Functions |
|---|---:|---:|---:|
| Core | 97.10% | 89.41% | 100% |
| Whole measured source | 73.82% | 60.86% | 72.23% |

Whole-source coverage declined from Phase 08 as production storage and recovery code expanded. Line and branch coverage remain above the 70% and 60% targets, with the same instrumentation scope.

| Artifact | SHA-256 |
|---|---|
| `out/index.html` | `e4115b5457ad8e334333e3566636f8236d89001e68180efd36accc267707ae65` |
| `out/editor/index.html` | `a3338fb56aac843e67af2d88a147b5eabe905e6b4ed5a8e6a036562457b7d7e9` |
| `package-lock.json` | `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e` |

## Acceptance evidence

| Scenarios | Assertions exercised |
|---|---|
| AC-FR-01-01 through AC-FR-01-05, PE-02 through PE-05 | Created independent documents, reopened nested graphs, validated titles and no-op behavior, copied current unsaved committed content with fresh IDs and remapped references, proved source independence after changing a copy, and verified cancel and atomic delete after reload. Failed writes during navigation preserved the active graph and offered recovery. |
| AC-FR-10-04, CI-31, PE-10, PE-19 | With actual storage, undo and redo advanced revisions. Reopened and reloaded the last committed graph with fresh history. A live pointer preview did not enter storage. The dirty-draft or pending-write guard requested browser confirmation, and reload after a failed write opened the previous successful graph. |
| AC-FR-11-01 through AC-FR-11-04, UX-12, PE-07 through PE-09, PE-11, PE-12 | Fake-clock tests verified 750 ms debounce, the 1,000 ms bound and serialized captures. An actual outstanding transaction held the badge in Saving while later edits remained possible. Quota and abort injection retained the previous row. Retry stored the latest graph and the current revision. |
| PE-13 through PE-18 | Two tabs opened the same revision without broadcast messages. A single competing write won, stale deletion failed, and a later deletion could not be resurrected by content or viewport writes. Focus re-read stored revision. Tested independent conflict copy, cancelled and approved reload, navigation flush and late acknowledgement isolation. |
| PE-20 through PE-22, PE-39 | A separate viewport write left the document row and history unchanged. Invalid views and preferences fell back and corrupt or unsupported rows were preserved. Denied access showed an unavailable library. Native connection blockers, version change and incompatible rollback preserved stored and active content. |
| PE-27 | Downloaded and decoded the latest validated graph after a failed write or storage version change. |

Phase 09 verified 34 new mandatory scenarios. Both working registers now record 129 of 205 mandatory passes. There are 76 mandatory and 13 conditional scenarios still unrun.

## Editable backup evidence

Playwright awaited the real browser download event and read the resulting bytes. The recovery case downloaded `Recovery map.json` while the active graph held three nodes and the last committed database row held one. The portable file contained only `document` and `viewport`. The explicit retry later committed a document that compared equal to the downloaded document. A separate newer-version test confirmed that a dirty in-memory graph remained downloadable after the original storage connection closed. Tests checked safe filename handling, invalid viewport omission, strict v1 validation and ID independence.

The browser used native IndexedDB for the actual compare-and-swap, view checks and transaction commits. Tests injected a quota exception at the write boundary and issued an actual transaction abort after its put request succeeded. A separate second-write fault left no partially created copy. The quota fault verifies recovery behavior and establishes no browser capacity or physical durability limit.

### Partial evidence and release limits

PE-01 retains blank creation evidence and awaits starter templates. PE-06 retains the second-write rollback evidence for document creation and awaits the import transaction. DM-19 retains transactional conflict evidence and awaits failed import coverage. UX-13 retains successful backup-on-failure evidence and awaits valid and invalid import. These cases remain unrun in the working register until their complete assertions are supported. The broader import, template, SVG, PNG, cross-platform font, performance and release gates remain open.

## Workspace captures

These five captures are from the passing Chrome cases on the Phase 09 static build. All 41 evidence files passed the PNG signature and chunk CRC checks. The 36 predecessor PNGs match their Git blobs byte for byte, and each new PNG matches its source capture.

- [Populated local diagram library](PHASE-09-library.png)
- [Unsaved changes before the first debounced write](PHASE-09-unsaved.png)
- [Saved locally after both generations committed](PHASE-09-saved.png)
- [Save failure with navigation and backup recovery controls](PHASE-09-recovery.png)
- [Nested architecture and live connections after reload](PHASE-09-reloaded-architecture.png)

## Files

- Application and domain: `src/application/{autosave,document-lifecycle,document-repository,document-session}.ts`, `src/core/{component-edits,validation}.ts`.
- Storage: `src/infrastructure/indexed-document-repository.ts`.
- Workspace: `src/workspace/{backup,navigation}.ts`, `src/workspace/{canvas,document-actions,editor,library,properties,workspace}.tsx`, `src/app/globals.css`.
- Tests: `tests/e2e/{persistence,hierarchy,workspace,components}.spec.ts`, `tests/integration/{autosave,indexed-repository}.test.ts`, `tests/integration/connections-view.test.tsx`, `tests/unit/static-shell.test.tsx`.
- Records: this report and Chrome screenshots, DGS-09 and DGS-10 working registers, `README.md`, `IMPLEMENTATION_TRACKER.md`, `DECISIONS.md` and `CHANGELOG.md`.

## Phase 09 gate

Passed locally. All five authorized tasks passed with real IndexedDB saves and reload, revision conflicts and stale deletion, preserved in-memory edits, and a validated JSON download from a failed-save session. Scope and schema remain compatible with the approved specifications. The Phase 09 changes remain in the working tree based on `44bfdb6`.

Hosted GitHub Actions remains unrun. The next action is owner review and separate authorization for Phase 10.
