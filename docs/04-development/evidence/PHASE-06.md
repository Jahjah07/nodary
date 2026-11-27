# Phase 06 verification

**Phase 06 gate passed locally.** T-06-01, T-06-02 and T-06-03 are complete. The implementation remains in the working tree for owner review.

27 November 2026 PHT. Phase 05 implementation `c694948` was accepted and closed locally in `fc252a0d9292fabc87e42870a9a640d166fd5468`. The owner approved CR-05 and recognized V0.1 as the internal connected-editor milestone. It demonstrates the canonical engine, workspace and all 29 components, placement and transforms, and connection creation, routing and reconnection with default styles. All V0.2 mandatory requirements and release gates remain in force. The closure confirmed all eleven Phase 05 acceptance passes, reconciled 41 mandatory passes and 177 unrun cases, and preserved UX-07 and UX-08 partial evidence at that boundary. It verified the 18 immutable baseline artifacts, CR-01 schema, lockfile and all 12 committed Phase 04 and 05 PNGs. The closure ran 150/150 tests. Hosted GitHub Actions remains unrun. [Phase 05 evidence](PHASE-05.md#owner-closure)

## Task results

| Task | Implementation |
|---|---|
| T-06-01 | The contextual inspector shows applicable metadata and supported fields for nodes, edges, boundaries and multiple selections. The controlled edit form supports numeric geometry, validated hexadecimal colours and native colour pickers, text and line appearance, routing and arrow modes. Common fields show mixed values and apply atomically. Double-click or canvas Enter opens the plain-text label editor. |
| T-06-02 | The shared text pipeline uses local Canvas 2D advances and measured ink extents. Explicit line positions drive component and connector SVG painting and scene bounds. Content edits grow components and affected ancestors in the same command, including circular geometry. Numeric and pointer resize reject content loss. Edge identity and endpoint references remain stable. |
| T-06-03 | All four manual statuses use the canonical architecture eligibility, neutral row, fixed marker colour and readable text. Reset omits the row while preserving style. Boundaries have title, text styles, stroke, fill and opacity controls. Content edits preserve children’s world coordinates when title growth expands a boundary. |

## Architecture and limitations

The property command intersects capabilities from the selected canonical items and validates the staged candidate against portable v1. A valid edit publishes one history entry with required geometry and ancestor expansion. Invalid, cancelled and no-op edits preserve graph state. Native text selection and undo stay in the field. Multiline Enter inserts a line break. Ctrl/Cmd+Enter and Apply commit. Inspector blur commits a valid draft, and an invalid blur retains the draft with inline feedback. A colour picker changes the field’s local swatch while editing. Drafts stay outside the document and history.

The renderer and content fitter share a pure measurement interface. The browser implementation uses Arial, Liberation Sans and the system sans-serif fallback. Word segments wrap at available width and long tokens split on grapheme boundaries. Explicit line breaks and intentional whitespace are preserved, with tabs expanded for display. The resulting line placements and ink bounds drive selection, containment and fit. Status colour remains independent of shape paint. A low-contrast warning preserves the chosen underlying style.

Bounded content growth keeps a component origin fixed before any ancestor compensation. Boundary titles determine the dynamic top inset. Exact position fields refer to the parent’s coordinate system for nested objects and world coordinates for root objects. Numeric size edits leave the top-left fixed. Edge labels share line metrics and remain anchored by path length. The approved CR-01 restriction comes from the existing v1 validation path.

Browser evidence is specific to the Windows fonts installed in the target environment. Renderer-independent layout supports injected metrics. Cross-platform font substitution and standalone SVG glyph parity require additional Phase 10 evidence. IME event sequencing was exercised in the browser; the run did not start a hardware or OS input method. Editable membership, durable reload, production exports and graph undo controls retain their scheduled phases.

## Changed files

| Area | Files |
|---|---|
| Canonical command and shared geometry | `src/core/{component-edits,geometry,properties,routes,visual}.ts` |
| Workspace | `src/workspace/{canvas,component-graphic,editor,flow,properties,workspace}.tsx`, `src/workspace/scene.ts`, `src/app/globals.css` |
| Verification | `tests/integration/{connections-view.test.tsx,property-edits.test.ts}`, `tests/e2e/properties.spec.ts` |
| Project records | This report and Chrome screenshots, DGS-09 and DGS-10 working registers, `IMPLEMENTATION_TRACKER.md`, `DECISIONS.md` and `CHANGELOG.md` |

The screenshot audit also found four corrupted historical Git blobs from Phases 01 and 03. Their original working-tree PNGs passed chunk CRC validation. The evidence-only commit `20496d475856e903ad3fd79fc60967b30244d6c8` restores those four original byte sequences using the existing PNG attributes.

## Verification

Windows 11 x64, Node 22.14.0, npm 11.21.1, Next.js 16.4.6, React Flow 13.0.3, Vitest 5.1.2 and Playwright 1.65.1. Production static build `oY-8_c6Kjm_sMwAt3UHEj`.

| Check | Actual result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build` | Exit 0. Both static application routes generated. |
| `npm test`, `npm run test:coverage` | 155/155 tests across 16 files. Includes canonical growth and undo, mixed style, invalid Unicode and range, architecture status and nested boundary regressions. |
| `playwright test --workers=2` (installed CLI) | 57/57 in 1.9 minutes, 19 each in Chrome 158.0.8127.38, Edge 158.0.4370.45 and Chromium 159.0.8154.6. Includes nine Phase 06 runs and 48 earlier regressions. |
| Baseline and Git audit | All 18 immutable hashes, both dependency manifests and the CR-01 amendment matched. All 25 evidence PNGs passed signature and chunk CRC checks. New screenshot bytes match the original browser captures and Git attributes preserve those bytes. |

An initial typecheck caught the new property callback missing in the existing component-test harness. The first browser run timed out because exact label locators included descendant control content. The corrected locators use accessible role and name. A follow-up exposed three test assumptions: native undo removed the last typed keystroke, Tab reached Apply within the draft before leaving it, and the status backdrop used `#FFFFFF`. The revised assertions verify a single native edit undo, preserve the draft while focus remains in its form, commit on leaving it, and check the canonical backdrop. Targeted Chrome then passed 3/3 in 14.8 seconds. The final three-browser run passed 57/57 with no retries.

All three browsers reported six lines and `228.79 × 177.00` CSS px painted bounds for the same 24-unit multilingual label at 100% zoom. This comparison covers the installed Windows fonts and the tested character set.

| Coverage scope | Lines | Branches | Functions |
|---|---:|---:|---:|
| Core | 96.55% | 88.16% | 100% |
| Whole measured source | 68.79% | 59.28% | 65.31% |

Whole-source coverage increased in all three metrics. Lines and branches remain below the proposed Phase 11 whole-source targets. Browser execution is separate from Vitest coverage.

| Artifact | SHA-256 |
|---|---|
| `out/index.html` | `6e2f74084fdb8654fbda7bbeb7d24e9c8d85f98309ccecb9ceaead50905d3cf4` |
| `out/editor/index.html` | `f9c4a2c4147c1dbfc03cb04a7fe47352bae4892f47b59a8ac813d5a7cddc26f2` |
| `package-lock.json` | `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e` |

## Acceptance

| Newly passed | Evidence |
|---|---|
| AC-FR-05-02, AC-FR-05-04, UX-06, CL-10, CI-17 | Rejected invalid colours, ranges and unsupported text-only fields. Mixed-value UI and atomic compatible shared edits preserved unrelated objects. Undo restored the shared fill transaction. |
| AC-FR-07-01, UX-08 | Browser changed label, arrows, stroke and routing on the same edge. Phase 05 evidence verifies valid and rejected reconnection and edge preservation. |
| AC-FR-09-03, UX-10, CL-14, CL-15 | Every architecture type accepted all four canonical status values. Browser evidence verifies representative indicators, grayscale text, neutral backing and reset with unchanged paint. Domain undo restored the previous status and style. |
| DM-04, CL-11–13, CI-14–16 | Verified CR-01, markup as literal text, whitespace and grapheme wrapping, measured content bounds, label/font growth and nested ancestor compensation. Numeric and pointer shrink reject content loss. Drafts support IME event sequencing, valid blur, invalid draft retention, Escape and native undo. |

The two working registers agree on 59 mandatory passes out of 205 and 159 total unrun scenarios. CL-16 retains partial evidence for nested title fitting. UX-07 still awaits browser connection creation in editable groups. Reload and duplication cases retain their durable workflow dependencies. Visual-export assertions remain unrun. No phase-blocking defect remains in the tested scope. Review the working tree and evidence before authorizing a local Phase 06 commit or Phase 07.

## Chrome captures

All captures use synthetic documents from the verified 1520 × 1050 production browser run.

- [Node properties and invalid resize feedback](PHASE-06-node-properties.png)
- [Edge properties](PHASE-06-edge-properties.png)
- [Boundary title and opacity](PHASE-06-boundary-properties.png)
- [Mixed multi-selection values](PHASE-06-mixed-values.png)
- [Multiline and long-label fitting](PHASE-06-multiline-fit.png)
- [Architecture status values](PHASE-06-architecture-statuses.png)
- [Status text in grayscale](PHASE-06-architecture-statuses-grayscale.png)
- [Styled release approval flowchart](PHASE-06-styled-flowchart.png)
- [Styled service architecture](PHASE-06-styled-architecture.png)
