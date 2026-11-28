# Phase 08 verification

28 November 2026 PHT.

## Phase 07 closure

The owner accepted Phase 07. Its existing local commit is `a9de1eb3b52eff8033491e5258915302a80de097` (Grouping and Boundaries). The starting working tree was clean. The review covered its 31 files and found changes confined to the four authorized tasks, tests, and project records. The 20 newly passed scenarios were reconciled against their original assertions and linked tests, including UX-07’s editable branching, cycle, valid cross-boundary links, invalid drop feedback, and retained attachment. The registers agreed on 79 mandatory passes, 126 mandatory cases still unrun, and 13 conditional cases still unrun.

All 18 immutable source hashes passed. The CR-01 v1 schema and dependency lock matched the predecessor, and CR-05’s approved internal V0.1 milestone and V0.2 requirements were retained. All 33 historical PNGs matched their committed bytes and passed PNG signature and chunk CRC checks. The separate historical PNG repair commit `20496d4` is still an ancestor. Standalone export and cross-platform font fidelity remain open. Hosted GitHub Actions remains unrun. [Phase 07 evidence](PHASE-07.md)

## Task results

| Task | Implementation and verification |
|---|---|
| T-08-01 | Wired undo and redo through the existing canonical dispatcher and session write path. Validated restoration uses the current metadata and viewport, keeps repository revision on the session, advances generation and timestamp, and removes invalid selection IDs. Graph snapshots reuse unchanged immutable collections. Tested restoration and rejection with the supplied reference workload and with an invalid history candidate. |
| T-08-02 | Added labeled toolbar controls and scoped keyboard shortcuts. Coalesced arrow repeats finish on keyup, after 300 ms idle, or before a direction or selection change. Escape and undo during a gesture cancel the preview. Tests exercise keyboard and visible controls, native text undo, IME isolation, redo branching, and fresh history after reopening a temporary session. |
| T-08-03 | Regressed production flowchart and architecture edits, scene fitting, endpoint restoration, hierarchy, cancellation and stale generations. Checked graph and history integrity at the node ceiling. Retained existing temporary-session navigation and reload protections. |

## Production mutation audit

| Input path | Canonical handling |
|---|---|
| Palette buttons and drops, pointer drag and resize, keyboard nudge | Canvas translates input into a typed component command. Preview uses validated disposable state. The workspace dispatches only a completed operation. Directions chained during keyboard repeat use the actual committed state as their next base. |
| Direct and inspector drafts, single and bulk style, status, position and size fields | Property commands validate at commit. Measured label growth and recursive containment occur inside the same graph transaction. Invalid drafts stay editable and preserve graph and history. |
| Connector creation, reconnection, styles, labels, routing and deletion | Pointer releases and the endpoint dialog produce edge commands. Edge property fields use the canonical property command. A rejected or stale endpoint candidate leaves the original edge intact. |
| Group, reparent, ungroup, duplicate and delete | The visible and keyboard/context actions use hierarchy commands. The command contains reference remapping and recursive expansion and publishes one consistent graph. |
| Undo and redo | Toolbar and canvas use the same dispatcher and `editSession` path as graph edits. Restored content is validated with the latest metadata before the history stack changes. A successful restore publishes the graph, recomputes the shared scene, and saves through the existing temporary repository. |
| Settings, selection, viewport and navigation | Settings use a non-history command. Selection and viewport use the view session API. Open starts a fresh session from the repository snapshot. The controlled React Flow projection derives rendering from the canonical graph and publishes no graph edits. |

Invalid, no-op and stale commands keep committed content, history and edit generation. Stale drag and link previews are hidden once the generation changes. A captured pointer cancellation applies to the active pointer. Canvas and window focus loss cancel transient state, and canvas history shortcuts cancel an active gesture before touching committed history. Toolbar history actions return focus to the canvas so the temporary disabled state during repository acknowledgement does not interrupt keyboard editing.

### Fifty-transaction production history

`tests/integration/editor-history.test.ts` loaded the supplied DGS-10 reference fixture with 100 nodes, 150 edges and nested boundaries into the temporary repository. It verified 50 committed checkpoints using component and frame insertion, multi-object movement, resize, bulk style, architecture status, edge creation and reconnection, route and arrow changes, labels, nested membership, text-driven containment, duplication, ungrouping, deletion and nudge. Each restore compared the complete graph against the expected checkpoint and reran portable graph validation.

There were 50 successful undo operations and 50 successful redo operations. Selection was pruned when the selected object disappeared. Viewport, title, current settings and the repository base revision remained independent of restoration. A non-history settings edit preserved the complete redo stack. A new graph commit after undo cleared it. The fixture test verifies capacity and graph integrity. Workload timing, memory and release performance gates remain scheduled separately.

## Browser reliability investigation

The Phase 07 parallel run finished 64/66, and its serial run finished 66/66. The retained CI-18 Edge trace recorded approximately 6.1 seconds for browser launch and 12.2 seconds for page creation, using 18.5 seconds of a 30-second total test budget before interactions. The later locator timed out with the remaining budget. The UX-07 trace resolved the requested button and spent 58.2 seconds in Playwright’s click actionability path. These are two different failure points. The first has direct evidence of startup delay. The second shows a stalled browser interaction and does not establish its root cause. The successful serial results and separate pointer and keyboard assertions establish the tested application behavior.

The original traces remain locally in `test-results`. Exact copies were verified and placed in the ignored `playwright-report/phase07-initial-edge/` folder for retention across subsequent default-output runs.

| Phase 07 trace | SHA-256 |
|---|---|
| CI-18/19 Edge | `1e503145d7ea62ea7fb45f7933a4b2d27d626f0f158931fe9ba7186d1371fdac` |
| UX-07 Edge | `d3cd7d82705cff004c6c7b74dd79b4b070204605f28d141b72cc414c24a10483` |

The full Phase 08 suite used one worker and a 60-second CLI budget to reduce concurrency risk and retain the full interaction assertions. No checked-in Playwright configuration changed. A follow-up comparison used two workers with trace collection and the original 30-second CI-18 and 60-second UX-07 budgets. All four Chrome and Edge runs passed in 34.4 seconds. Edge completed CI-18 in 9.18 seconds and UX-07 in 9.04 seconds. Its traced setup took 1.20 seconds and 0.74 seconds respectively. The current comparison did not reproduce the Phase 07 timeouts. The earlier actionability stall remains unexplained. Use the serial command for reproducible local evidence while the intermittent parallel-run concern remains open.

The first comparison invocation through the Windows `.cmd` shim treated the regex pipe as a command separator and ran zero tests. The rerun called the installed JavaScript CLI directly with `--project=edge --project=chrome --grep 'CI-18/19|UX-07/09' --workers=2 --trace=on --output=test-results/phase08-edge-comparison --reporter=line,json`. Its report is `test-results/phase08-edge-comparison.json`.

## Acceptance evidence

| Scenarios | Assertions exercised |
|---|---|
| AC-FR-02-03, CI-03 | Fit an empty graph at 100%. Fit a flowchart with negative and positive positions, markers and labels, and report when the minimum zoom cannot contain it. Fit the restored architecture diagram with nested frames and titles. Measure rendered bounds against the viewport. |
| AC-FR-03-02 | Select two connected flowchart nodes, move them together and retain their relative positions. The same connection follows the movement and returns to its prior route on undo. |
| AC-FR-10-01, AC-FR-10-02, AC-FR-10-03, UX-11 | One undo and redo restores both ends of a continuous drag. A deleted grouped decision node and its incident connections restore atomically, including parent and endpoint IDs. A new graph edit clears redo. One style commit is one entry. History controls expose availability, and text drafts keep native undo. |
| AC-FR-14-01, AC-FR-14-02, AC-FR-14-03, CI-32 | Free and snapped pointer movement match expected world coordinates at two zooms. Keyboard selection, undo, redo, duplicate, delete, nudge and pan use the same state transitions as visible controls. Keyboard insertion, exact resize, connection, reconnection, and grouping have visible, focusable controls. Backspace, selection, undo and IME inside text drafts leave the graph alone. |
| DM-15, DM-24, CI-30 | Exact reference-workload counts, 50 logical graph entries, 50 undos and 50 redos. Validate every restored graph, retain current metadata, viewport and base revision, and test redo invalidation, no-ops and session isolation. |
| CI-29, CI-33 | Cancel move with Escape, resize through actual capture loss, connection with a matching pointer cancellation event, and marquee on focus loss. Cancel a drag through the first undo. Reject stale input, a coordinate overflow, the 1,001st node and an invalid history restore while retaining committed content and stacks. |

CI-08, CI-11, and CL-08 retain their prior passes with new regression evidence. AC-FR-10-04 and CI-31 still require durable save and reload evidence. The history capacity check leaves production performance thresholds and release gates pending.

Phase 08 added 16 verified mandatory scenarios. Both working registers now record 95 of 205 mandatory scenarios passed. The remaining 123 unrun cases comprise 110 mandatory and 13 conditional cases. Conditional applicability remains pending.

## Verification

Windows 11 x64 with Node 22.14.0, npm 11.21.1, Next.js 16.4.6, React Flow 13.0.3, Vitest 5.1.2 and Playwright 1.65.1. Chrome 158.0.8127.38, Edge 158.0.4370.45 and Chromium 159.0.8154.6. Static build ID `BU98cWLutl9Sdv0YqZvO6`.

| Command | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass after corrections below |
| `npm test` | 165/165 passed across 18 unit and integration files |
| `npm run test:coverage` | 165/165 passed with the coverage measurements below |
| `npm run build` | Pass. Both application routes statically exported |
| Installed Playwright CLI with `--workers=1 --timeout=60000 --output=test-results/phase08-serial --reporter=line,json` | 78/78 in 2.8 minutes. 26 each in Chrome, Edge and Chromium, zero retries or skips. Local JSON report `test-results/phase08-serial.json` |

Initial typechecks found overlapping JSX blur handlers, an untyped browser pointer fixture event, and an endpoint preview result that did not consistently expose its target field. The final implementation uses one blur handler, a typed pointer listener and a consistent preview result. The first targeted Chrome run passed 9/9 in 35.4 seconds. The full suite also exercised the added two-zoom pointer test and the prior connection regression. The connection test now sends the active pointer ID on cancellation, matching browser event semantics.

| Coverage | Lines | Branches | Functions |
|---|---:|---:|---:|
| Core | 97.10% | 89.41% | 100% |
| Whole measured source | 76.18% | 64.93% | 75.13% |

The whole-source line and branch measurements exceed the 70% and 60% targets. Instrumentation scope stayed the same. This local result leaves formal release qualification pending.

| Artifact | SHA-256 |
|---|---|
| `out/index.html` | `ffd7e4060f1e10e2715df172871f1751a54679047727232cd60f7f5e96c87bd3` |
| `out/editor/index.html` | `d9f72a73609d117505210165fd6545e71644e50386932096301a769164d1ea51` |
| `package-lock.json` | `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e` |

## Workspace captures

The following Chrome screenshots came from the production regression. All 36 evidence PNGs passed signature and chunk CRC checks. Each new image matched its source capture byte for byte. All historical images matched the local Phase 07 commit.

- [Undo and redo controls after undoing a nudge](PHASE-08-history-controls.png)
- [Connected release-approval flowchart](PHASE-08-connected-flowchart.png)
- [Nested architecture, status, and connections after history restoration](PHASE-08-restored-architecture.png)

## Changed files

| Area | Files |
|---|---|
| Canonical dispatcher | `src/core/commands.ts` |
| Editor integration | `src/workspace/{workspace,editor,canvas}.tsx` |
| Tests | `tests/integration/{editor-history.test.ts,connections-view.test.tsx}`, `tests/e2e/{history,connections,hierarchy,properties}.spec.ts` |
| Project records | This report and three screenshots, DGS-09 and DGS-10 working registers, `DECISIONS.md`, `CHANGELOG.md` and `IMPLEMENTATION_TRACKER.md` |

## Phase 08 gate

Passed locally. All three authorized tasks passed, and the production editor met the 50-transaction, cancellation and restoration requirements. The existing architecture and portable v1 schema cover the behavior. No specification change was required. The current base remains `a9de1eb` and Phase 08 is ready for owner review in the working tree.

History remains temporary and starts fresh on reopen. Durable history-outcome save and reload, portable import and standalone export, cross-platform font fidelity, and production performance and release acceptance remain open. Hosted GitHub Actions remains unrun. The next action is owner review and separate authorization for Phase 09.
