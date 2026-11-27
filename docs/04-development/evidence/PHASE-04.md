# Phase 04 verification

27 November 2026 PHT. **Phase 04 gate passed locally.** The owner accepted Phase 03. The closure audit found a clean working tree and the existing local commit `43e22d3a45520f4fed65ceb4c024a96c80e18768`. It reviewed the workspace-only diff, static routing, temporary-session warning, same-tab navigation safeguards and seven new passes (UX-04, UX-15, CI-01, CI-02, CI-07, CI-08, DM-18). At closure 201 scenarios remained unrun. The audit reran all 89 Phase 03 tests, checked 18 immutable manifest artifacts, and confirmed unchanged CR-01 schema and lockfile. No unrelated or sensitive material was found in the Phase 03 diff. Hosted GitHub Actions remains unrun. [Phase 03 implementation evidence](PHASE-03.md)

Phase 04 evidence identifies the static build from the working tree based on that commit. Phase 04 is ready for owner review and has no commit of its own.

## Task results

| Task | Result and implementation |
|---|---|
| T-04-01 | **Pass.** Reused the trusted DGS-06 registry. The unit, integration and browser suites covered all semantic IDs, entity collections, labels, default styles and dimensions. Browser tests inserted 8 flowchart nodes, 14 architecture nodes, 6 general nodes and 1 empty boundary in each browser with networking disabled after loading. All 14 architecture vectors rendered from the pinned Lucide package and the static output included its original notices. |
| T-04-02 | **Pass.** Pure local shape construction supplies outlines, decorations, visual bounds, safe label regions and 104 cardinal anchors. Tests checked exact primitive output, fractional coordinates, extreme aspect geometry, anchor coordinates and directions and ineligible annotations/boundaries. The controlled React Flow adapter renders the same shared SVG shapes, with representative connectors using their world-transformed anchors. |
| T-04-03 | **Pass.** Categorized tiles share the drawing code. Buttons and Enter place a selected root at the visible center with bounded collision offsets. Drag uses the normalized hotspot, client-to-world conversion and an on-canvas ghost. Native browser inputs at 100% and 120% verified placement, independent world snap and outside cancellation. The canvas regained focus after insertion. Each valid insertion was one graph transaction. |
| T-04-04 | **Pass.** Single selection and multi-selection move through the validated command dispatcher. Tests exercised world snap, exact nudge deltas, repeat gestures, ancestor normalization, preserved edge references, fixed-side resize, circular aspect, structural floors, cancellation and atomic rejection. Boundary resize kept descendants in world coordinates. Unit and integration evidence checked committed geometry and history after successful, invalid, stale and no-op proposals. |

## Changed files

| Area | Files |
|---|---|
| Geometry and commands | `src/core/visual.ts`, `src/core/geometry.ts`, `src/core/component-edits.ts` |
| Trusted assets and license | `src/core/assets/lucide-vectors.json`, `public/LUCIDE-LICENSE.txt`, `THIRD_PARTY_NOTICES.md` |
| Workspace | `src/app/globals.css`, `src/workspace/{canvas,component-graphic,editor,flow,workspace}.tsx`, `src/workspace/scene.ts` |
| Verification | `tests/unit/component-visuals.test.ts`, `tests/integration/component-edits.test.ts`, `tests/integration/component-graphic.test.tsx`, `tests/e2e/components.spec.ts` |
| Project records | This report and five Chrome captures, `DECISIONS.md`, `CHANGELOG.md`, `IMPLEMENTATION_TRACKER.md` and the DGS-09/DGS-10 working JSON registers |

## Verification

Windows 11 x64, Node 22.14.0, npm 11.21.1, React Flow 13.0.3, Lucide React 1.82.0, Vitest 5.1.2 and Playwright 1.65.1. Dependency manifests, lockfile, immutable specifications, fixtures and the CR-01 amended schema matched the predecessor.

| Command | Actual result |
|---|---|
| `npm run lint` and `npm run typecheck` | Exit 0. Initial typecheck caught the default-status token. ESLint caught an Effect Event used from a keyboard timer. Both were corrected using the canonical status token and an ordinary keyboard timer callback. |
| `npm test` and `npm run test:coverage` | 126/126 in 12 unit and integration suites. The initial expanded run caught one trusted upstream `fill="currentColor"` value. The asset assertion now verifies that exact token alongside the geometry allowlist. |
| `npm run build` | Exit 0. Static build `Soqjmo9k9k0SH654D7MA7` served both the library and query-based editor. |
| `playwright test --workers=3` (installed CLI) | 39/39 in 57.8 seconds against the production static build, 13 per browser. Chrome 158.0.8127.38, Edge 158.0.4370.45 and Chromium 159.0.8154.6. Includes 27 earlier regression runs and 12 Phase 04 runs. |
| Baseline and diff audit | All 18 immutable manifest hashes matched. `git diff --check` passed. The bundled Lucide notice matched the installed package and static output byte-for-byte. |

The first browser run passed 33/39. The six pointer assertions assumed exact tile centers. The rerun verified the browser's pixel-quantized hotspot against the DOM tile rectangle and compared moved offsets and the exact snapped reference coordinates. The second run passed 37/39, with two Edge page-fixture setup timeouts under eight concurrent workers. Directly invoking the installed CLI with three workers completed all 39 without retries or assertion skips. Existing CLI color and http-server deprecation warnings appeared.

| Coverage scope | Lines | Branches | Functions |
|---|---:|---:|---:|
| Core | 97.35% | 87.36% | 100% |
| Whole measured source | 57.38% | 49.70% | 49.68% |

Vitest measures the existing `src/**/*.{ts,tsx}` scope. Playwright coverage is separate from these figures. Whole-source line and branch coverage remain below the proposed Phase 11 floors. Phase 04 added coverage for all new primitives, graph commands and the SVG adapter.

| Build artifact | SHA-256 |
|---|---|
| `out/index.html` | `994ff22d2f0d934418a5d9be7806a8cca7ed8226a0682d900fbdbec29025ee46` |
| `out/editor/index.html` | `3d59a6f0ba0470e20a91eb5de7ce6712c7de0c56f71b048258100d6c3193dfbc` |
| `out/LUCIDE-LICENSE.txt` | `b495047bd93a9b06913511076f504daba17d5bbeb3e0650f3bb53a4220329c57` |
| `package-lock.json` | `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e` |

## Acceptance and architecture

| Verified scenarios | Evidence |
|---|---|
| CL-01, CL-02, CL-04, CL-26 | All 29 canonical defaults were inserted and rendered in every browser. Default labels fit under the supported Windows font stack. The complete palette was visually checked. The offline test observed zero network requests for all 29 insertions, 104 rendered ports and 14 rendered icons. The static bundle contains the verified upstream notices. |
| CL-05, CL-06 | Unit tests verified explicit shape primitives at reference and extreme sizes and computed finite stroke bounds. Tests traversed every registry handle, checked cardinal geometry and names, and repeated after resizing. The editor consumed the same geometry for its ports and outlines. |
| CL-09, CI-12, CI-13 | Browser side/corner resize kept the opposite sides fixed, and circle resize kept equal sides. Integration checks verified fractional geometry, anchor placement, floor/inversion rejection and invalid imported aspect. |
| CI-05, CI-10, CI-11, UX-05 | Real browser gestures and keyboard insertion covered the on-canvas outcomes, preserved multi-selection offsets and displayed resize feedback. Integration tests checked one history entry per accepted operation, no new entry on rejection/no-op, ancestor normalization, undo restoration and preserved edge references. |

The working registers now record 30 of 205 mandatory scenarios passed and 188 of 218 total scenarios unrun. CI-14 and CL-13 have provisional fit evidence and await Phase 06. CL-03 and CL-19 await durable round trips and shared export verification. Connector creation, routing and reconnection belong to Phase 05. Complete geometry and text ink fitting for imported labels, exact property fields and text/style editing are Phase 06 work. The current layout measures advances with Canvas 2D and breaks at grapheme boundaries. It preserves canonical whitespace and shows overflow instead of silently clipping. The document wave uses an enclosing editor hit area. Explicit grouping UX remains Phase 07, history controls Phase 08, durable persistence Phase 09 and serialization Phase 10. Release gates remain unrun.

The canonical document remains authoritative. React Flow receives derived positions and geometry. The interaction controller previews disposable candidates and publishes only validated commands. The Phase 03 fixture remains read-only. No specification changes were needed. Review the working diff and evidence before committing Phase 04 or authorizing Phase 05.

## Chrome captures

All captures are synthetic workspace data from Chrome 158.0.8127.38 on the verified static build. They are evidence screenshots.

| Capture | Viewport |
|---|---:|
| [Full categorized palette](PHASE-04-palette.png) | 1520 × 1560 |
| [All eight flowchart components](PHASE-04-flowchart.png) | 1520 × 1100 |
| [Representative architecture components](PHASE-04-architecture.png) | 1520 × 1100 |
| [All seven general components](PHASE-04-general.png) | 1520 × 1100 |
| [Selected circle resized to 104 × 104](PHASE-04-selected-resized.png) | 1520 × 1100 |

## Owner closure

The owner accepted Phase 04 on 27 November 2026. The closure audit reviewed the implementation at `f4aa40c95997c824f20503715cfb7e12ec929a15`, checked all 18 immutable baseline hashes and confirmed the unchanged CR-01 reference, dependency lock and bundled license. The working registers agreed on 30 mandatory passes and 188 total unrun scenarios. The 13 Phase 04 passes were checked against their DGS-10 assertions and the linked automated evidence. The prior pointer failures remain recorded above. A fresh closure run passed 126/126 Vitest cases and 39/39 production browser cases in 50.4 seconds with three workers. The prior Edge page setup timeouts did not recur.

The initial commit normalized the five Phase 04 PNGs through the documentation text rule. The original working-tree PNGs passed signature and chunk CRC verification. The closure commit exempts evidence PNGs from text normalization and restores those five captures byte-for-byte. Hosted GitHub Actions remains unrun.
