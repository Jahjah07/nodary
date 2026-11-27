# Phase 03 verification

27 November 2026, 19:29 PHT. Phase 02 closure is the existing local commit `e9f321cf98b1dd174f54d4c69c000dce4fd48b57`. The owner accepted the reported result. The closure audit found a clean working tree, verified all 18 immutable manifest artifacts, the separately tracked CR-01 reference, all 76 unchanged runtime lock entries, two justified test-only Ajv packages, ten passing scenarios and 208 unrun scenarios. Closure Vitest passed 86/86. Hosted GitHub Actions remains unrun. [Phase 02 evidence](PHASE-02.md)

## Task results

| Task | Result and implementation |
|---|---|
| T-03-01 | **Pass.** Static library and editor, Nodary identity, blank creation dialog, empty/loading/missing views and explicit temporary status. Native hrefs are valid static routes. Enhanced same-tab navigation and Back/Forward retain the in-memory repository. Actual reload warns for created or modified work. `src/app/{page.tsx,editor/page.tsx}`, `src/workspace/{workspace,library,navigation,sample}.*`. |
| T-03-02 | **Pass.** Zustand binds the immutable canonical session. The React Flow adapter projects parent-first groups and nodes, stable object and endpoint IDs, and read-only display edges. Renderer measurement is transient and default editing is disabled. Browser geometry matches the canonical parent-relative fixture. `src/workspace/{scene,flow}.*`. |
| T-03-03 | **Pass.** Pan tool, Space drag, middle drag, wheel pan, pointer-centred zoom, 25–200% clamping, reset, supported scene fit and world-aligned display grid. Independent grid and snap settings use the domain command dispatcher. Dedicated browser and pure tests cover view transformations while Phase 02 session tests establish view independence. `src/workspace/{canvas,scene}.*`. |
| T-03-04 | **Pass.** Single/Shift selection, full-containment marquee and Shift union, context selection, empty area clearing and boundary title/border selection. Deterministic pure geometry resolves overlapping nodes and edge labels. Escape cancels an active marquee. Scope-specific visual feedback and contextual inspector follow selection. `src/workspace/{canvas,scene,editor}.*`. |
| T-03-05 | **Pass.** Scoped select-all and Escape, native text shortcut isolation in the create dialog, focus restoration, visible controls, shortcut help, and responsive independent panels. Chrome and Edge tested 1440 × 900, 1280 × 720, 1100 × 720 and 940 × 730. Overlay drawers are mutually exclusive and preserve canvas size. `src/workspace/editor.tsx`, `src/app/globals.css`. |

## Verification

Windows 11 x64, Node 22.14.0, npm 11.21.1, React Flow 13.0.3, Playwright 1.65.1. No package manifest, lockfile, core, application port, memory adapter, prototype or original specification changes.

| Command | Actual result |
|---|---|
| `npm run lint` and `npm run typecheck` | Exit 0. Initial typecheck found a React Flow v13 unsupported `colorMode` prop and boundary style narrowing issue. Both were corrected. |
| `npm run test` and `npm run test:coverage` | 89/89 in nine suites. Core coverage 96.61% lines and 87.57% branches. Whole measured source 59.36% lines and 49.75% branches. Playwright browser execution is separate from Vitest coverage. |
| `npm run build` | Exit 0. Static library and editor build ID `DKkKRksDviQVlw6cKs2gA`. |
| `npm run test:e2e` | 27/27 in 27.4 seconds, comprising nine SP-01 regression runs and 18 workspace runs. Chrome 158.0.8127.38, Edge 158.0.4370.45 and Chromium 159.0.8154.6 each ran the same nine tests. |

The first SP-01 rerun found multiple text matches after adding the object picker. The assertion now targets the visible sample in the canvas. The first workspace run passed 24/27 and found an ambiguous drawer-heading locator. The corrected assertion targets the named heading. The final run verified both with the original behavioral assertions retained, including no off-origin requests or navigation failures. Existing CLI color and http-server deprecation warnings remained. The production build fingerprints are `f0ef16d0d8934fedd2a5c66d9a4038bcbe1d82aecd9a50789d0857bb437f1e43` for `out/index.html` and `a806344f381f36bd33453ed4e53429749c9d52f17cfef06df710540eb185dfcd` for `out/editor/index.html`. The unchanged lockfile SHA-256 is `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e`.

| Capture | Browser and size |
|---|---|
| [Library with temporary diagram](PHASE-03-library.png) | Chrome, 1440 × 900 |
| [Editor and object inspector](PHASE-03-editor.png) | Chrome, 1440 × 900 |
| [Compact properties drawer](PHASE-03-compact.png) | Chrome, 940 × 730 |

## Acceptance and architecture

Verified complete assertions for UX-04, UX-15, CI-01, CI-02, CI-07, CI-08 and DM-18. Linked partial evidence for UX-01–03, UX-05, UX-17, CI-03, CI-04, CI-06, CI-29 and CI-32. CI-09 still awaits connection and resize affordances. The other 201 scenarios remain unrun, including partial cases. Release gates remain unrun.

The server exports both entry paths. The workspace handles same-document URL updates with the browser History API, preserving its repository and subscription. Plain links serve direct entry and new-tab navigation. Temporary work exists in one tab and the sample has a stable synthetic ID that can be reconstructed after reload. The static host test covers direct navigation, reload, Back/Forward and the absence of server component fetch errors. Production host verification remains a deployment task.

The shared presentation scene covers the current rectangular objects, boundary labels, and representative connector paths and markers. Full registry drawing and insertion, complete connector routing and editing, measured text layout, durable IndexedDB, export and the release accessibility audit remain assigned to later phases. The workspace tests cover the supported selection and viewport actions. The temporary adapter exposes no durable save indication.

**Phase 03 gate — Pass.** Local workspace, projection, viewport, selection, focus and static navigation checks passed. Phase 04 requires separate authorization.
