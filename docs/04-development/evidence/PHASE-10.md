# Phase 10 verification

28 November 2026 PHT.

## Phase 09 closure

The owner accepted Phase 09 at the existing local commit `e0d9d7e0931372c8519b62e08a3922fe08a87bb1` (Persistence & Recovery). The starting working tree was clean. The review covered 36 files confined to the five authorized tasks and their tests and records. The 34 newly passed scenarios matched their original assertions and linked evidence. The registers agreed on 129 mandatory passes, 76 mandatory cases unrun and 13 conditional cases unrun.

The audit verified all 18 immutable source hashes, the CR-01 v1 amendment, CR-05 approval, the unchanged dependency lock and 41 evidence PNGs with exact Git bytes and valid chunks. The final Phase 09 browser report records 102 passes. The storage tests preserve the distinction between real saves, reloads, concurrent revisions and stale deletion, and injected quota failures. The verified recovery download contained the latest three-node graph while the last committed row held one node. The earlier intermittent Edge click stall remains open. Hosted GitHub Actions remains unrun. [Phase 09 evidence](PHASE-09.md)

## Implementation and architecture

| Task | Implementation |
|---|---|
| T-10-01 | Size and strict UTF-8 checks precede JSON grammar preflight. The bounded traversal checks decoded object member names for duplicates and unsafe keys before object construction. Strict v1, graph and measured containment checks run before acceptance and after identity remapping. Import writes through the existing add-only document and viewport transaction. JSON export reuses the editable-backup serializer. |
| T-10-02 | The New diagram dialog exposes blank, Basic process flowchart and IT architecture with local preview graphics. It uses the original immutable fixtures, checks production text measurement, and gives each instance fresh document and graph IDs and timestamps. |
| T-10-03 | The existing scene builder lives in pure core and remains shared with the editor. A typed XML serializer emits native geometry in the established paint order. Full world bounds include visual ink, markers and labels, round outward and add 32 units of padding. Export emits only allowlisted primitives and properties, escaped Unicode text and locally bundled icon vectors with their notice. |
| T-10-04 | PNG decodes the same SVG with explicit raster dimensions. Preflight checks the edge and total area limits before browser allocation. Decode and encode are cancellable from the UI, and the lease remains held while outstanding native work settles. 1× is an explicit alternative when 2× exceeds the budget. |
| T-10-05 | Import validates a selected local file before explicit confirmation. Export captures one immutable graph and view after resolving the current draft and cancelling transient gestures. The dialog offers PNG, SVG and editable JSON with bounded filenames and browser download status. The separate recovery backup remains available. |

There are no new dependencies, network converters or bundled fonts. Editable JSON preserves canonical text and IDs. Visual files exclude the viewport and editor affordances. File generation does not modify the captured graph or mark it saved. The browser determines download destination and retention.

## Initial verification

The entry browser run passed 6/6 across Chrome, Edge and Chromium. Both original starter fixtures passed production measurement. The four source diagrams, including the 100-node reference fixture, imported successfully. The first parser test iterations contained unmatched parentheses in depth assertions. The corrected tests exercise the exact 32/33-level boundary without changing the production limit.

The first Chrome export run passed 5/6. Both template export sequences reached native download checks. The independent viewer inherited the Chrome project channel and Firefox refused that launch. Setting the Firefox launch channel explicitly to undefined follows the SP-04 configuration and preserves the standalone check. [SP-04 evidence](PHASE-01.md#t-01-03--sp-04--svg-and-png)

The next Chrome run passed 6/7, including the independent viewer. The live gesture case targeted a Process node underneath a newly inserted Decision. The test now separates the two nodes before dragging and still requires an actual uncommitted pointer preview. The first coverage run passed 179/180. The existing reference history case exceeded its 5-second timeout at 5,141 ms while the production build ran concurrently. A serial rerun of the checks passed all 180 tests with the timeout and assertions intact.

## Browser and export evidence

Synthetic diagrams were served from the production static export. The browser tests compare portable graph semantics after removing identity and timestamp differences. They check original template content, independent copies, source fixture imports, reimports, negative world coordinates and equivalent SVG bytes at different pan and zoom settings. Failure tests check storage integrity, preservation of the live graph and browser-local download handoff. Storage-abort and raster failure injection test recovery paths. They establish neither physical browser capacity nor claim that a user's browser retained a file.

| Synthetic download | Editable JSON | Native SVG | PNG |
|---|---|---|---|
| Flowchart | [4,684 bytes](PHASE-10-export-flowchart.json) | [4,152 bytes, viewBox −203 −33 856 682](PHASE-10-export-flowchart.svg) | [1,712 × 1,364 px](PHASE-10-export-flowchart.png) |
| IT architecture | [8,905 bytes](PHASE-10-export-architecture.json) | [15,970 bytes, viewBox −217 −33 1210 766](PHASE-10-export-architecture.svg) | [2,420 × 1,532 px](PHASE-10-export-architecture.png) |

Workspace screenshots show [template selection](PHASE-10-template-selection.png), [duplicate-key validation](PHASE-10-import-validation.png), the [export dialog](PHASE-10-export-dialog.png), the [completed flowchart](PHASE-10-completed-flowchart.png) and the [completed architecture diagram](PHASE-10-completed-architecture.png).

Firefox 159.0 opened the actual SVG and PNG downloads using local file URLs on Windows. The SVG's text boxes remained inside the viewport and tested rectangle labels fit their shapes. Firefox reported the matching PNG dimensions and made no remote requests. In the editor browsers, the 1× catalog case checks all 29 component types, edge modes, nested boundaries and statuses with zero differing RGBA channels between decoded SVG and PNG. The generated 2× template PNGs had white corners and no diagram ink within 45 pixels of any edge. The explicit 1× control generated identical PNG bytes at two device pixel ratios. [Firefox standalone evidence](PHASE-10-firefox-standalone.png)

The PNG preflight tests check both 8192-pixel edges and the 16,777,216-pixel area. Controlled failure tests exercise dimension validation, decode, unavailable context, encode, null or invalid Blob, the 64 MiB Blob limit, timeout, stale results and cleanup. The browser holds a raster encode callback open, verifies that a second raster attempt cannot start, and checks for exactly one download after the old callback settles and a retry succeeds. The same browser case independently verifies that a JSON download captures the committed graph before a subsequent edit and excludes an uncommitted pointer preview. Failure injection is confined to tests.

The 12 attached files match the Playwright screenshot and native download bytes. All eight new PNGs have valid chunk CRCs and terminal IEND chunks. Git's filtered and raw blob hashes agree for all 12 files. Along with the 41 historical PNGs, the evidence directory contains 49 verified PNGs. SVG preserves CR-01 text and explicit line positions using the approved local font stack. Windows evidence found no clipping in the tested viewer and document. Font substitutions on other operating systems and consolidated release tolerances remain open. If those checks demonstrate material differences, review a suitably licensed bundled font for viewer compatibility, text accessibility and file size before changing the representation or font stack.

## Verification and environment

Windows 11 x64, Node.js 22.14.0, npm 11.21.1, Next.js 16.4.6, Vitest 5.1.2, Playwright 1.65.1 and Dexie 4.4.7. The starting Git commit was `e0d9d7e0931372c8519b62e08a3922fe08a87bb1`. Production build ID was `7jXMnJvb-RO6fraXTKRua`. The SHA-256 hashes of `out/index.html` and `out/editor/index.html` were `84cc9d06e6a5359f0b5499f7b9ae7c107fc0e661301f7868959369b021c7f2e7` and `40ef2607be74dc247bfe7aa4b11958893536e173314b1563f67357c64de816f3`. The dependency lock hash was `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e`.

| Command | Actual result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 180/180 in 23 unit and integration files |
| `node .\node_modules\vitest\vitest.mjs run --coverage --maxWorkers=2` | 181/181 in 23 files after adding filename-limit and raster failure assertions. An earlier coverage run passed 180/180. |
| `npm run build` | Pass, static production library and query-route editor |
| `node .\node_modules\@playwright\test\cli.js test --workers=1 --timeout=60000 --output=test-results/phase10-full --reporter=line,json` | 123/123 in 329.7 seconds, 41 each in Chromium 159.0.8154.6, Chrome 158.0.8127.38 and Edge 158.0.4370.45. No retries or skips. |
| `node .\node_modules\@playwright\test\cli.js test tests/e2e/files.spec.ts --workers=1 --timeout=60000 --output=test-results/phase10-files-final --reporter=line,json` | 21/21 in 102.6 seconds, seven in each editor browser and standalone Firefox within the Chrome download case. No retries or skips. Verified exact graph content apart from new identities, timestamps and suggested names for fresh template instances, and an empty-diagram JSON export and reimport. |

| Coverage | Lines | Branches | Functions |
|---|---:|---:|---:|
| Pure core | 97.40% | 88.98% | 100% |
| Whole source | 73.45% | 61.28% | 71.50% |

The local Playwright commands use the previously installed browsers from `$env:TEMP/nodary-phase00-playwright` and write JSON reports under `test-results/`. The Windows runner reported existing Node and terminal-color deprecation warnings. The hosted run reported later is recorded in the CI follow-up.

## Files in the review

| Area | Files |
|---|---|
| Portable files and lifecycle | `src/application/portable-file.ts`, `src/application/starter-templates.ts`, `src/application/document-lifecycle.ts`, `src/core/validation.ts` |
| Shared scene and encoders | `src/core/scene.ts`, `src/core/svg-export.ts`, `src/core/assets/lucide-license.json`, `src/infrastructure/png-export.ts` |
| Workspace and download integration | `src/workspace/import-dialog.tsx`, `src/workspace/export-dialog.tsx`, `src/workspace/backup.ts`, `src/workspace/component-graphic.tsx`, `src/workspace/editor.tsx`, `src/workspace/library.tsx`, `src/workspace/scene.ts`, `src/workspace/workspace.tsx`, `src/app/globals.css` |
| Verification | `tests/e2e/files.spec.ts`, `tests/integration/png-export.test.ts`, `tests/unit/portable-file.test.ts`, `tests/unit/visual-export.test.ts`, `tests/unit/static-shell.test.tsx` |
| Review and evidence | `IMPLEMENTATION_TRACKER.md`, `DECISIONS.md`, `docs/CONSISTENCY_REVIEW.md`, `CHANGELOG.md`, `README.md`, `THIRD_PARTY_NOTICES.md`, `.gitattributes`, working DGS-09 and DGS-10 registers, this report and the 12 linked artifacts |

## Acceptance and gate

T-10-01 through T-10-05 are implemented and passed their local verification. The 46 newly passed mandatory scenarios are recorded in both working registers.

| Source | Newly verified IDs |
|---|---|
| DGS-02 | AC-FR-05-03, AC-FR-07-03, AC-FR-12-01–03, AC-FR-13-01–04, AC-FR-15-01–03 |
| DGS-04 | UX-02, UX-13, UX-14, UX-16 |
| DGS-05 | DM-16, DM-17, DM-19, DM-20, DM-22, DM-23 |
| DGS-06 | CL-03, CL-18–20, CL-22–24 |
| DGS-07 | CI-34 |
| DGS-08 | PE-06, PE-23–26, PE-28–38 |

PE-27 already passed in Phase 09. Phase 10 adds real browser SVG and PNG handoff with inaccessible IndexedDB and verifies that the editable JSON reflects the latest in-memory edit. CL-21 remains unrun pending the consolidated visual tolerances and viewer matrix. PE-01 remains unrun pending one test of all three creation paths that measures initial stored revisions and list ordering. The registers contain 175/205 mandatory passes and 30 mandatory cases unrun. All 13 conditional cases and all 10 release gates remain unrun. Phase 10 browser results support the applicable fidelity and local file safety checks for NFR-04 and NFR-08. Consolidated NFR, pilot, accessibility, security and performance qualification remain open.

**Phase 10 gate passed locally.** Both templates are editable and independent. Native JSON round trips preserve graph semantics, invalid imports preserve existing data, and standalone SVG and PNG contain the full scene. Resource failure and download checks verified the recovery paths, and the full browser regression passed. No mandatory Phase 10 blocker remains. The V0.2 feature-complete MVP candidate is ready for owner review. The previous intermittent Edge click stall remains open. No source specification amendment is proposed. Phase 10 changes are uncommitted for review. Review the candidate and then separately authorize Phase 11 stabilization and release qualification.

## Hosted CI follow-up

The supplied Ubuntu GitHub Actions log reported 99/102 passes. Chromium, Chrome and Edge each failed the CI-11 / UX-11 history test at the same assertion after Ctrl+Y. The X field stayed at 173 after undo. DGS-07 §10 specifies Ctrl+Shift+Z or Cmd+Shift+Z for redo, with Ctrl+Y as an additional Windows shortcut. The application already implemented that rule.

The history test now waits until the library enables New diagram, verifies Ctrl+Y on the browser's platform, and checks Ctrl+Shift+Z and Cmd+Shift+Z on every runner. The workflow now installs Firefox for Phase 10's independent SVG and PNG viewer check. This follow-up changes tests, CI configuration and evidence. A hosted result for the corrected workflow is pending.

The first Windows run of `npm run test:e2e` used eight workers after npm consumed the requested worker flag. It passed 115/123 and timed out in eight cases across file workflows, history setup and property-test teardown. The first focused simulation passed 2/3. Chromium pressed Enter before New diagram was enabled and timed out waiting for the dialog. With the readiness wait in place, the focused run passed 3/3 with no retries or skips. It used real Windows Chromium, Chrome and Edge with `navigator.platform` set to `Linux x86_64` for the test. The local JSON report is `test-results/ci-shortcuts-linux-platform-rerun.json`.

The corrected full Windows run used `node .\node_modules\@playwright\test\cli.js test --workers=2 --output=test-results/ci-shortcuts-windows-rerun --reporter=line,json` with `CI=true`. It passed 123/123 in 218.4 seconds with 41 tests per browser and no retries or skips. Firefox 159.0 independently opened the exported files during the Chrome case. The suite served the previously verified static build `7jXMnJvb-RO6fraXTKRua`. Local lint, typecheck and `git diff --check` passed.
