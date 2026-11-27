# Phase 05 verification

27 November 2026 PHT. **Phase 05 gate passed locally.** The owner accepted Phase 04. The implementation is in `f4aa40c95997c824f20503715cfb7e12ec929a15` and the local closure commit is `7622353f334985e4b3146c8ac930f87fd7770b53`. The closure reran 126 unit and integration cases and 39 browser cases, reconciled 30 mandatory passes and 188 unrun scenarios, and corrected Git's text normalization of the five evidence PNGs. The closure commit preserved their original bytes. Hosted GitHub Actions remains unrun. [Phase 04 closure evidence](PHASE-04.md#owner-closure)

The Phase 05 static build comes from the working tree based on `7622353f334985e4b3146c8ac930f87fd7770b53`. No Phase 05 commit or version tag was created.

## Task results

| Task | Implementation and verification |
|---|---|
| T-05-01 | Canonical connect command uses the DGS-06 default style and a fresh UUID. The same endpoint checks serve portable validation, pointer previews, the keyboard endpoint dialog and command commits. Verified branching, cycles, reverse edges, distinct handle pairs and cross-boundary creation against the supplied DGS-05 architecture fixture. Rejected unsupported or absent endpoints, self-loops, exact duplicates and invalid drops. |
| T-05-02 | Pure world-space straight and orthogonal routes, terminal stubs, shared arrowhead and stroke geometry, label midpoint and fit bounds. Unit tests traversed all 16 cardinal pairs in standard, reversed, overlapping and coincident layouts. They also checked short-marker allocation, all arrow modes, dash lengths, long labels and bounded-fit feedback. |
| T-05-03 | Controlled React Flow projection renders the shared geometry. Canvas hit testing selects paths or labels. Selected edges expose source and target controls. Pointer and keyboard reconnection preserve the edge ID, style and other unaffected properties. Browser regressions cover transforms, fit, edge-only deletion, invalid releases, Escape and pointer cancellation. |

## Architecture and limitations

The canonical edge stores source and target references, style, label and the route preference. The scene resolves parent transforms and component outlines to world anchors. Straight segments connect those anchors. Orthogonal routing calculates outward stubs, enumerates direct, single-bend, midpoint, outer-lane and corner candidates, then ranks qualifying paths by endpoint-rectangle crossings, length, bend count and enumeration order. Coincident straight endpoints use the orthogonal search while retaining the saved straight preference. Impossible geometry returns a typed `ROUTE_UNAVAILABLE` diagnostic. An existing undrawable edge remains in the graph for recovery.

Marker tips use half the endpoint node stroke along the terminal ray, bounded by the available segment. Short straight segments divide that budget between bidirectional markers. Route geometry and label position are derived. Label backgrounds use the path-length midpoint and local Canvas 2D advances with grapheme wrapping. Exact glyph ink, word breaking and full style controls remain Phase 06. Hit testing and fit use world geometry independent of the viewport. The router scores crossings against the two attached components. Unrelated nodes, labels and borders can overlap a path.

Creation and reconnection use a transient path and generation-checked commands. Invalid, cancelled, stale and no-op edits preserve committed state and history. The inspector offers an endpoint dialog, a route preference selector and edge-only deletion. The read-only sample still uses its existing fixture. Cross-boundary creation and transformed references were exercised through the production command and shared scene against the immutable fixture. The browser visually verified the already-cross-boundary sample. Browser creation inside existing groups awaits an editable grouped document workflow.

CR-05 proposes V0.1 as the internal M2 working connected editor milestone. Its scope is insertion, movement, resizing, connections and routing with default styles. Phase 06 retains label and style controls. V0.2 obligations and release gates remain in force. [Decision register](../../../DECISIONS.md)

## Changed files

| Area | Files |
|---|---|
| Domain and geometry | `src/core/{component-edits,edge-edits,graph,routes,validation,visual}.ts` |
| Workspace | `src/workspace/{canvas,connections,editor,flow,workspace}.tsx`, `src/workspace/scene.ts`, `src/app/globals.css` |
| Tests | `tests/unit/{routes,workspace-scene}.test.ts`, `tests/integration/edge-edits.test.ts`, `tests/integration/connections-view.test.tsx`, `tests/e2e/connections.spec.ts` |
| Project records | This report and Chrome captures, both working JSON registers, `IMPLEMENTATION_TRACKER.md`, `DECISIONS.md`, `docs/CONSISTENCY_REVIEW.md` and `CHANGELOG.md` |

## Verification

Windows 11 x64, Node 22.14.0, npm 11.21.1, Next.js 16.4.6, React Flow 13.0.3, Vitest 5.1.2 and Playwright 1.65.1. Chrome 158.0.8127.38, Edge 158.0.4370.45 and Chromium 159.0.8154.6. Production static build `gI-m-jx3xslSsTOW-0264`.

| Command | Actual outcome |
|---|---|
| `npm run lint` and `npm run typecheck` | Exit 0. Updated earlier scene tests to use the shared label box shape and corrected a component-test locator type. |
| `npm test` and `npm run test:coverage` | 150/150 across 15 suites. Includes 24 new cases in geometry, command integration and component rendering/dialog tests. The initial long-label test assumed full fit at 25%, and the fixture movement test assumed snap was off. Revised the assertions to verify exact crop and snap behavior. jsdom needed explicit dialog lifecycle stubs. Browser dialogs were tested independently. |
| `npm run build` | Exit 0. Static routes `/` and `/editor/`. |
| `playwright test --workers=2` (installed CLI) | 48/48 in 1.5 minutes, with 16 tests per browser. Includes 39 earlier regression runs and nine Phase 05 runs. |
| Baseline and evidence audit | All 18 immutable hashes, the CR-01 reference, package manifests and lockfile unchanged. Verified all seven evidence PNGs and both working registers. |

The first Chrome connector run excluded vertical SVG polylines through a positive-layout-box visibility filter. The corrected assertion matches unique canonical endpoint IDs and inspects painted points. An eight-step Edge pointer move reached the 30-second test budget in the first three-worker full run (44/45). Its pointer action took over five seconds after prior interaction delays in the trace. The two-worker run passed that scenario. Its three new cross-boundary marker assertions used half the connector stroke instead of half the attached node stroke (45/48). The test now reads the actual node's rendered stroke and checks the marker at the same subpixel precision. The final two-worker suite passed every case with zero retries.

| Coverage scope | Lines | Branches | Functions |
|---|---:|---:|---:|
| Core | 97.56% | 88.64% | 100% |
| Whole measured source | 67.65% | 58.23% | 64.33% |

Whole-source coverage increased from 57.38% lines, 49.70% branches and 49.68% functions in Phase 04. Whole-source lines and branches remain below the proposed Phase 11 floors. Browser execution is separate from Vitest coverage.

| Artifact | SHA-256 |
|---|---|
| `out/index.html` | `adccaf88cb4617cc07dc86f340b538cad4a2a85a0e00cb6373636b7243ec44e7` |
| `out/editor/index.html` | `6c2e71b6960d137545933effa6f70414c662c17ae620add03bc9377b0aeed57f` |
| `package-lock.json` | `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e` |

## Acceptance

| Verified scenarios | Evidence |
|---|---|
| DM-11, CI-20, AC-FR-07-02 | Browser pointer and keyboard reconnection of both endpoints, invalid release and unchanged edge identity. Integration verifies preservation of label, route, arrows, stroke and unaffected endpoint, plus rollback and no-op history. |
| CL-07, CI-19, AC-FR-06-02 | Browser rejects annotation, frame, empty, self-loop and duplicate targets; excludes ineligible keyboard selections; and accepts reverse, cycle and distinct-handle edges. Integration validates missing endpoints, unsupported handles, strict imports, edit generation and history. DM-09 and DM-10 were already passed and regressed successfully. |
| CI-18, AC-FR-06-01, AC-FR-06-04 | Browser branches and measures attachments before and after movement and resize while preserving other edge paths. Edge-only deletion compares all remaining edge and node IDs. Integration checks atomic deletion and undo. |
| CI-21, CI-22 | All cardinal pairs, both route preferences, aligned/overlapping/coincident endpoints, arrow modes, short segments, dashed paint, multiline labels and complete scene bounds. Browser verifies mixed routes, transformed cross-boundary attachment and label fit. |

The working registers record 41 of 205 mandatory scenarios passed and 177 of 218 total scenarios unrun. UX-07 retains partial evidence for the keyboard and pointer graph workflow, the cross-boundary command fixture and the rendered grouped sample. UX-08 and AC-FR-07-01 retain partial evidence pending full label/style editing and the labeled route-switch browser workflow. CL-08 awaits a production reparent interaction. AC-FR-06-03 awaits the durable save/reopen path, and CL-18 and AC-FR-07-03 await visual export. Release gates remain unrun.

The V0.1 milestone scope was demonstrated on the local build. CR-05 remains a proposed milestone interpretation. Review the diff and evidence before a Phase 05 commit or separate authorization of Phase 06.

## Chrome captures

Synthetic workspace data captured on the tested static build in Chrome at 1440 × 900.

- [Connected branching flowchart](PHASE-05-branching-flow.png)
- [Straight and orthogonal connections](PHASE-05-straight-orthogonal.png)
- [Selected edge and endpoint controls](PHASE-05-selected-endpoints.png)
- [Connected architecture diagram](PHASE-05-architecture-connected.png)
- [Alignment after movement and resizing](PHASE-05-after-transform.png)
- [Valid reconnection preview](PHASE-05-reconnect-preview.png)
- [Same edge after reconnection](PHASE-05-reconnected.png)
