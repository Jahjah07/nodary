# Phase 01 technical prototype evidence

27 November 2026, PHT. Reviewed baseline `24763487eb99db8f76babe3aa4f7faabe34beca7` with a clean working tree. The owner accepted Phase 00 on its equivalent local CI evidence. The existing initialization commit included 65 scoped files. The path and credential-pattern audit found no unrelated user files or credentials in the committed files. Baseline verification matched 18 artifacts directly and reconstructed the original bytes of both working registers by reversing only the documented Phase 00 status changes. Hosted GitHub Actions has no execution evidence in this review.

The prototypes live outside `src/`. `npm run build:prototypes` used Vite 8.4.0 from the existing Vitest dependency tree to build disposable static files. Playwright 1.65.1 exercised those files on loopback. The Next.js production shell has a separate build and browser suite. Package versions and `package-lock.json` were retained.

## Environment

Windows 11 Home Single Language x64, build 26200, Intel Core i5-13450HX, 16 logical CPUs, 7.71 GiB physical memory available to the OS, Intel UHD Graphics and NVIDIA GeForce RTX 4050 Laptop GPU installed, Balanced power profile and approximately 37.5 GiB free on C: at inspection. Tests used Node 22.14.0, npm 11.21.1, Chrome 158.0.8127.38 and Edge 158.0.4370.45. Playwright set a 1440 × 900 CSS pixel viewport and DPR 1. No CPU or network throttling was configured. AC power, physical display dimensions and the actual GPU selected by the headless process were unavailable. Firefox 159.0 provided an independent SVG engine.

## T-01-01 / SP-02 · Nested boundaries and transforms

**Result — Pass.** The test used a parent-relative graph and one controlled React Flow projection. At 125% zoom it checked the inverse viewport transform and compared DOM motion with the expected single translation. Reparenting and ungrouping preserved the worker’s world position. Expanding ancestors in both directions preserved the unaffected peer and cross-boundary edge. An impossible shrink and cyclic target rejected without history entries, a valid shrink kept the worker at the same position, and undo restored the graph and rendered connector path.

Files are `prototypes/sp-02/{model,view}.*` and `prototypes/tests/sp-02.spec.ts`. Run `npm run test:prototypes -- sp-02` after the prototype build. Both Chrome and Edge passed. The short synthetic titles use fixed containment insets. Production still needs measured title and stroke bounds and the full eligibility matrix. ADR-05 can proceed with parent-relative transforms, explicit membership and bottom-up expansion. React Flow receives parents first and never determines membership.

## T-01-02 / SP-03 · Connections, routes and reconnection

**Result — Pass.** A three-node scene included negative coordinates, four physical handles per node, a straight path and an orthogonal dogleg. The test checked handle centers within one CSS pixel, the path after resizing, and a real pointer reconnect. An empty release preserved the entire original edge. A valid drop changed only the target endpoint. Full-scene fit included an intentionally wide label extent beyond the node bounds.

Files are `prototypes/sp-03/{geometry,view}.*` and `prototypes/tests/sp-03.spec.ts`. Run `npm run test:prototypes -- sp-03`. Both Chrome and Edge passed. The dogleg and label fixture do not implement all route candidate scoring, marker placement, text layout, degenerate paths or registry geometry. Preserve the canonical edge independently of reconnect callbacks, use typed changesets from React Flow v13 and derive path/fit geometry in the scene layer.

## T-01-03 / SP-04 · SVG and PNG

**Result — Pass for the synthetic scene.** A controlled native SVG serializer emitted nested frames, a vector icon, an arrow, status text and explicit multiline baselines. Canvas rasterized the same scene at 2×. Chrome and Edge downloaded both files, decoded the 1064 × 554 PNG and checked white margins and representative shape/marker colors. XML parsing recovered literal markup and Unicode as text, and the tag and attribute assertions found no executable or external-resource constructs. A U+FFFE label failed visibly and produced no download.

Firefox opened the downloaded SVG directly from disk. The lines fit inside the service rectangle, and visual inspection confirmed readable labels, status, nested frames, connector, arrowhead and icon. The same-origin Blob used for Canvas decoding initially triggered an overly broad request assertion. Comparing request origins corrected the instrumentation while retaining the off-origin check. Firefox initially inherited the Chrome channel setting. Passing its own launch settings corrected that. [Independent Firefox capture](PHASE-01-SP-04.png)

Files are `prototypes/sp-04/{scene,view}.*`, `prototypes/tests/sp-04.spec.ts` and `tests/unit/sp-04.test.ts`. Install the locked Firefox browser with `npx playwright install firefox`, then run `npm run test:prototypes -- sp-04`. Both target browser tests and two unit tests passed. This fixed scene bounds its inputs and checks SVG dimensions and PNG allocation limits. Large dynamic SVG byte/element accounting and missing-font paths belong to the production serializer. Arial on Windows and Liberation Sans fallback are the proposed preview/export family. The independent renderer test establishes one Windows font case. It does not establish portability across installed fonts or arbitrary Unicode scripts. Use explicit layout metrics and line positions, fail clearly when required glyphs/metrics are unavailable, and retain editable JSON. If fallback parity fails the wider matrix, compare a locally bundled, licensed font or an approved text-to-path strategy before adoption.

## T-01-04 / SP-05 · IndexedDB and revision conflicts

**Result — Pass.** Two pages in the same real browser context loaded revision zero and raced a compare-and-swap write. Exactly one save committed and one conflicted. The loser retained its in-memory backup. A stale save after deletion left the row absent. A real aborted transaction rolled back an already-issued write request. A separately injected quota error preserved stored and in-memory data. An edit submitted during an in-flight save stayed dirty until its own transaction committed.

Files are `prototypes/sp-05/{repository,view}.*` and `prototypes/tests/sp-05.spec.ts`. Run `npm run test:prototypes -- sp-05`. All four browser cases passed. Dexie initially reported `PrematureCommitError` because the explicit abort branch returned success from the transaction callback. The corrected branch aborts and rejects, and independent storage reads verify rollback. Quota exhaustion was simulated at the storage boundary. The experiment does not establish browser capacity, upgrade behavior or power-loss durability. Keep revision/deletion checks inside the transaction, await completion before acknowledgement, and track the submitted snapshot independently of newer edits.

## T-01-05 / SP-06 · Atomic commands and history

**Result — Pass.** A pure snapshot journal staged graph candidates, validated before publication and recorded each mutation as one transaction. Group duplication remapped nested IDs and copied only internal edges. Explicit deletion preserved unselected descendants and removed incident edges. Tests verified undo/redo, failed command and no-op immutability, redo invalidation and 50 retained transactions after 52 edits with complete undo/redo traversal.

Files are `prototypes/sp-06/history.ts` and `tests/unit/sp-06.test.ts`. Run `npm run test` or `node node_modules/vitest/vitest.mjs run tests/unit/sp-06.test.ts`. Four cases passed with Node, including a full checkpoint comparison for 50 mixed movement, resize, style, status and edge-label edits. The experiment uses a synthetic nested graph, subset validation and no browser-dependent APIs. Production validation, immutable publication and history memory remain separate obligations. ADR-06 retains a single canonical authority and bounded semantic history. React Flow state remains derived.

## T-01-06 / SP-07 · Keyboard and accessibility

**Result — Pass for keyboard interaction.** The test used Tab and keyboard commands to focus the canvas, see a computed three-pixel focus outline, select an object, cancel a dialog without mutation, connect, resize and use native text undo. Delete in the inspector or dialog left the graph intact. Canvas Delete removed the selected object and its edge, and canvas undo restored both. Closing a dialog restored focus to the initiating control.

Files are `prototypes/sp-07/view.tsx` and `prototypes/tests/sp-07.spec.ts`. Run `npm run test:prototypes -- sp-07`. Both target browsers passed. The small SVG sample and native dialog/menu cover keyboard routing and focus restoration. A manual screen-reader session, IME workflows, pointer cancellation, dense scenes and complete WCAG verification remain pending. Use browser-native text history inside inputs and scope graph shortcuts to the canvas.

## T-01-07 / SP-08 · Reference workload

**Result — Pass for baseline collection.** The isolated production page loaded the unchanged DGS-10 benchmark fixture from real IndexedDB and rendered 100 nodes, 150 edges and two boundaries. Per browser, the suite measured 20 fresh-page opens, ten 3-second pointer node drags at 100%, one each for group drag, pan and controlled resize preview, and short 25%/200% drag diagnostics. It discarded three warm-up runs and measured 20 commits, writes and export operations. Heap samples used CDP garbage collection and a fixed 50-entry history. Both target browsers passed. [Raw samples, medians, nearest-rank p95 and maxima](PHASE-01-SP-08.json)

| Prototype measurement | Chrome p95 | Edge p95 |
|---|---:|---:|
| Cold editor open | 156.8 ms | 153.5 ms |
| Active node-drag frame interval | 7.1 ms | 7.2 ms |
| Group-drag frame interval | 7.5 ms | 7.3 ms |
| Pan frame interval | 7.2 ms | 7.4 ms |
| Resize-preview frame interval | 7.1 ms | 7.2 ms |
| Commit with subset validation and snapshot history | 1.2 ms | 1.1 ms |
| IndexedDB write to transaction completion | 10.5 ms | 9.9 ms |
| JSON Blob | 0.8 ms | 0.8 ms |
| SVG Blob | 1.8 ms | 1.2 ms |
| Default 2× PNG | 137.1 ms | 154.4 ms |

Both browsers generated a 4572 × 3092 PNG of 550,201 bytes. The nominal 2× RGBA allocation was about 53.9 MiB. Retained JS heap delta was −596,964 bytes in Chrome and −598,488 bytes in Edge. The highest frame interval was 83.5 ms in Edge resize. DGS-10 PF thresholds remain provisional. This run recorded RAF intervals without a release DevTools timeline. It omitted idle autosave dispatch and end-to-end JSON import, since the production scheduling and parser are outside this slice. Commit validation and export geometry use simplified prototype paths. Retest the full production implementation against the DGS-10 protocol before release.

Files are `prototypes/sp-08/{scene,view}.*` and `prototypes/tests/sp-08.spec.ts`. Run `npm run test:prototypes -- sp-08`. Initial runs remained in loading because the controlled adapter treated React Flow v13 changesets as arrays and omitted known measurements from the projected nodes. Switched to `getByType("position")`, supplied canonical measured dimensions and kept the DOM count/motion assertions. The successful prototype suite ran 14/14 in 2.2 minutes. Prototype entry `index-CNBetvc3.js` SHA-256 `873ed2449b2196f3fd146dd76e2616fc9f410e27476b801c0a4241dc4da90b1e`. Lockfile SHA-256 `74cca1a9a0b5651e9fa88fa04826e81d86fddad2dc42d3f3d55848d1908f7336`.

## T-01-08 · Architecture and change control

The owner explicitly approved CR-02, CR-03 and CR-04 on 27 November 2026. Preserve the supplemental UX-05 task mapping, mandatory 4/5 unassisted pilot within 10 minutes and predeployment/closure sequencing. No original DGS prose was amended.

Proposed CR-01 policy uses the intersection of existing DGS-05 control/surrogate restrictions and XML 1.0 permitted characters. Explicitly reject U+FFFE and U+FFFF, preserve valid Unicode, tabs, LF and literal markup, and identify the offending path and code point. Preserve source bytes and legacy storage. No silent replacement, stripping or normalization of imports. Existing explicit UI newline handling remains unchanged. On legacy export failure, keep the graph and allow validated editable JSON backup. Apply the policy to every canonical free-text field after owner decision, updating DGS-05/08 contract references, runtime validation, portable schema parity and regression fixtures together. [XML 1.0 character production](https://www.w3.org/TR/xml/#charsets)

Keep a bounded structural JSON preflight before native parsing so depth, duplicate keys, escaped aliases of prohibited property keys and strict UTF-8 can be checked before strict Zod validation. This is an implementation strategy for the existing DGS-05/08 parser requirements. Production parser code and parity evidence remain Phase 02/10 work.

Retain the installed license notices and compatible eslint-config-next/ESLint 9 pair. The prototype used a hand-written SVG icon and system typography. Review the actual release bundle and inherited license notices before distribution. [Third-party notices](../../../THIRD_PARTY_NOTICES.md)

Suggested specification revisions for owner review are an explicit XML-compatible text rule in DGS-05 with matching DGS-08 error behavior, supplemental UX-05 cross-references in DGS-09, the mandatory pilot rule in DGS-10 RG-09, and the predeployment/closure split in the DGS-09 Phase 11 gate wording. The last three working interpretations have owner approval. The original specification artifacts retain their baseline hashes.

## Final local verification

| Command | Result |
|---|---|
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0 after fixing the projected edge generic, using the native IME event, updating the v13 changeset API and typing benchmark samples |
| `npm run test` | 11/11 including SP-04 and SP-06 |
| `npm run test:coverage` | 11/11. Existing production shell scope measured 23.52% lines and 50% branches. |
| `npm run build` | Exit 0, static library and editor. Build ID `mGS3h4ZAQHJKAKbp6igB_`. |
| `npm run test:e2e` | SP-01 regression 9/9 in Chromium 159.0.8154.6, Chrome and Edge |
| `npm run build:prototypes` | Exit 0. Vite reported module-directive warnings from React Flow and the React compiler runtime in this browser-only bundle. |
| `npm run test:prototypes` | 14/14 in Chrome and Edge, with Firefox used by SP-04 |

The static shell build SHA-256 values were `04687d92105248b10f31e13a47ef2d03c34e2833bc5f641b9c4a9a89f9bb9dbc` for `out/index.html` and `1d3422f147430e546ba6b9857cf2080e8da431bb6debe0069a899a5beeac6680` for `out/editor/index.html`. Browser commands ran locally with normal Windows process permissions and reported the existing http-server deprecation and CLI color warnings. All 218 product scenarios and all release gates remain unrun.

**Phase 01 gate — Blocked on explicit CR-01 approval.** SP-01 regression and SP-02–08 passed. The architecture review and proposal are recorded. Final disposition of T-01-08 and dependent schema work await the owner’s decision.

## Owner closure

On 27 November 2026, the owner approved CR-01 and authorized Phase 02 after successful closure. The original blocker above records the pre-approval result. The closure audit started from the clean prototype commit `1780c28`, verified the 18 immutable baseline artifacts, unchanged dependency lockfile and production source isolation, all eight passing spike records, and both raw benchmark reports. Local lint, typecheck and Vitest passed, with 11/11 tests. SP-08 remains a prototype baseline. Hosted GitHub Actions remains unrun.

**Final Phase 01 gate — Pass.** T-01-08 is complete with the approved text policy recorded. Phase 02 will implement it in a separately tracked v1 schema reference and runtime validation.
