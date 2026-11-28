# Phase 07 verification

28 November 2026 PHT. The owner accepted Phase 06 at the existing local implementation commit `4f2d856208216c309bf7e4d93d4fcdc74f34aee1`. The clean predecessor diff was limited to its three authorized tasks, tests, evidence and project records. The closure audit checked all 18 newly passed scenarios against their source assertions and reconciled 59 mandatory passes and 159 unrun scenarios. The fresh Phase 06 unit and integration run passed 155/155. All 25 committed PNGs matched their Git blobs and passed signature and chunk CRC checks. The immutable artifacts, CR-01 schema, approved CR-05 and dependency lock remained intact. The local history retains the separate `20496d4` evidence repair. The prior failures and reruns, cross-platform font and standalone export limitations, and UX-07 outstanding status are preserved in the Phase 06 record. Hosted GitHub Actions remains unrun. [Phase 06 evidence](PHASE-06.md)

## Task results

| Task | Implementation | Verification |
|---|---|---|
| T-07-01 | Controlled parent-first projection, explicit paint layers, measured boundary titles, non-intercepting interiors and nested fit bounds. Editable nested connectors retain their canonical IDs and recompute world anchors. | Pass |
| T-07-02 | Sibling grouping and an explicit parent chooser with named ancestry paths, disabled cyclic or depth-invalid targets, promotion to the parent’s parent, and root placement. Membership changes preserve world positions and select newly created groups. | Pass |
| T-07-03 | Measured title and stroke containment, shared transform-root normalization, recursive bottom-up expansion and frame-only resize. Invalid shrink leaves the previous graph and history intact. | Pass |
| T-07-04 | Safe mixed deletion and ungrouping, one copy per selected subtree, remapped internal edges and new IDs. Existing history records one transaction per operation. Canvas shortcuts and visible actions use the same commands. | Pass |

## Architecture and limitations

The canonical graph uses only parent IDs and local positions for membership. Commands derive world coordinates from the full ancestry chain. Grouping uses the visual union of sibling transform roots and the measured boundary insets. Reparenting converts each moving root’s existing world point against the explicit destination. Empty palette boundaries and drag overlap leave membership decisions to the user.

The editor paints outer-to-inner frames, edges, nodes, edge labels and then boundary titles. Geometry still controls hit testing. Empty interiors do not select a frame. Ports come only from the component registry. Cross-boundary links share the same routing and anchor geometry as other links. Numeric and pointer movement share Phase 06’s text-aware containment metrics.

The expansion algorithm grows affected boundaries from the bottom up. Left and top expansion compensates direct children so unrelated objects stay fixed. Boundary resize requests must fit content and leave child dimensions unchanged. Deletion promotes survivors to the nearest surviving ancestor. Duplication offsets only copied roots by `(20, 20)` and copies an edge only when both source nodes are copied. All edits validate through the same immutable graph dispatcher.

Undo and redo compatibility was exercised through the existing canonical history functions. Its full workspace UI belongs to Phase 08. Durable storage and standalone export remain scheduled for later phases.

## Changed files

| Area | Files |
|---|---|
| Domain | `src/core/{hierarchy,hierarchy-edits,geometry,component-edits}.ts` |
| Workspace | `src/workspace/{canvas,component-graphic,editor,flow,hierarchy-controls,workspace}.tsx`, `src/app/globals.css` |
| Tests | `tests/integration/{hierarchy-edits.test.ts,connections-view.test.tsx}`, `tests/e2e/{hierarchy,workspace,components,properties}.spec.ts` |
| Project records | This report and eight Chrome PNGs, the DGS-09 and DGS-10 working registers, `IMPLEMENTATION_TRACKER.md`, `DECISIONS.md` and `CHANGELOG.md` |

## Verification

Windows 11 x64, Node 22.14.0, npm 11.21.1, Next.js 16.4.6, React Flow 13.0.3, Playwright 1.65.1 and Vitest 5.1.2. Static build `6NhpwqUi9vBu4LTeL_gwc`. Chrome 158.0.8127.38, Edge 158.0.4370.45 and Chromium 159.0.8154.6. No dependency changes were required.

| Check | Local result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 162/162 unit and integration tests passed across 17 files |
| `npm run test:coverage` | 162/162 tests passed and generated the coverage report below |
| `npm run build` | Pass. `/` and `/editor/` statically exported |
| `playwright test --workers=1 --timeout=60000 --output=test-results/phase07-serial --reporter=line,json` | 66/66 passed in 2.9 minutes, 22 each in Chrome, Edge and Chromium. Local JSON report at `test-results/phase07-results.json` |
| Artifact verification | 18 immutable baseline hashes, unchanged CR-01 schema and dependency lock, and 33 PNGs verified |

The initial typecheck identified a TypeScript union spread that did not narrow the intent discriminator. The workspace now constructs each generated-ID payload explicitly. The first targeted Chrome run passed two of three scenarios. Its empty-interior click overlapped the nested frame’s left-border hit area, which correctly selected that frame. The revised test clicks a known empty position and retains the selection assertion. The targeted rerun passed 3/3 in 16.3 seconds. Existing tests follow boundary title text into the explicit render layer and retain their label and hit-test assertions.

The initial two-worker browser suite passed 64/66. Edge’s earlier branching regression exhausted the 30-second test budget after its browser and page fixtures took about 18.5 seconds. The new editable hierarchy case exhausted its 60-second budget while Playwright was waiting for the resolved Connect button to become actionable for a pointer click. The hierarchy case now asserts the same button is visible and enabled, then activates it with Enter, exercising the keyboard path. It continues to use pointer input for cross-boundary drag, invalid drop, movement and resize. The first serial attempt produced no completion artifact. The subsequent serial run completed with the 60-second test budget. The original Edge traces remain in the local default Playwright output directory.

| Coverage scope | Lines | Branches | Functions |
|---|---:|---:|---:|
| Core | 96.83% | 88.44% | 100% |
| Whole measured source | 69.93% | 60.11% | 67.22% |

Whole-source coverage rose from 68.79% lines, 59.28% branches and 65.31% functions in Phase 06. Branch coverage reached the proposed Phase 11 threshold, and line coverage remains below the 70% target.

| Artifact | SHA-256 |
|---|---|
| `out/index.html` | `fc8f5e5c6c9c76d2f4e0ee2d9b24c51130b77a8a6c572f4e2a8416a80f21d865` |
| `out/editor/index.html` | `de5e06d03ec73129dfe5fa5235a40dc06fe1b77a055938a09cf7e331e9a328c4` |
| `package-lock.json` | `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e` |

## Acceptance

| Scenarios | Assertions exercised |
|---|---|
| AC-FR-03-03, AC-FR-03-04, DM-12, DM-13, CI-27, CI-28 | Duplicated a directly selected node pair and a nested subtree with fresh IDs and internal edges only. Deleted selected nodes and incident edges, promoted surviving descendants, and used undo to restore the graph. Redo, edge-only duplication, stale generations and invalid IDs were also checked. |
| AC-FR-08-01, AC-FR-08-02, AC-FR-08-03, UX-09, CL-08, CL-16, CL-17, CI-23, CI-26 | Created titled boundaries, grouped siblings, nested and reparented objects explicitly, and preserved world positions. Rejected incompatible sibling selections, cyclic parents and a ninth ancestor. Checked paint order, empty-interior hit testing, scene fit bounds, live edges and surviving children after ungrouping. |
| AC-FR-08-04, AC-FR-08-05, CI-24, CI-25 | Expanded all affected ancestors after movement in four directions and held the unrelated sibling in place. Grew measured title space, rejected a frame shrink that would hide content, preserved children and their sizes, and restored deleted memberships on undo. |
| UX-07 | See editable browser workflow below. |

The acceptance assertions are in `tests/integration/hierarchy-edits.test.ts`, `tests/e2e/hierarchy.spec.ts`, and the retained connection regression suite. Twenty mandatory scenarios passed in Phase 07, bringing the total to 79 of 205. There are 139 unrun scenarios, including 13 conditional scenarios with applicability pending. The register also links supplemental verification for existing DM-06–08 and CL-12 passes. Full workspace history and durable-save assertions remain scheduled for Phases 08 and 09.

### UX-07 browser verification

UX-07 passed in installed Chrome and Edge and in bundled Chromium.

The test builds an editable architecture diagram from a blank workspace. It creates a same-boundary link with the keyboard endpoint chooser, drags a cross-boundary link between sibling frames, and connects nested and root-level nodes. Two outgoing connections from the decision node establish branching. The root-to-nested return link completes a directed cycle. Boundary frames expose no connection action. A pointer drop on the boundary title produces visible feedback and leaves the four committed connections intact.

The cross-boundary edge keeps its ID across movement, resize and reparenting. Moving the nested frame updates the route and moves the selected descendant only once. Resizing another frame keeps the child in place. Reparenting preserves the child’s world point and the route. Explicit target reconnection changes the endpoint on the same edge.

## Chrome captures

The eight 1600 × 1060 PNGs use synthetic editable diagrams. Their bytes match the local Chrome results and are preserved by Git filters. All 33 evidence PNGs passed signature and chunk CRC checks. The 25 historical copies also match their predecessor Git blobs byte for byte.

- [Nested architecture boundaries](PHASE-07-nested-boundaries.png)
- [Cross-boundary connections created in the editor](PHASE-07-cross-boundary-connections.png)
- [Explicit group membership controls](PHASE-07-membership-controls.png)
- [Selected and resized boundary](PHASE-07-resized-boundary.png)
- [Before ancestor expansion](PHASE-07-expansion-before.png)
- [After leftward and upward ancestor expansion](PHASE-07-expansion-after.png)
- [Duplicated group with internal connections](PHASE-07-duplicated-groups.png)
- [Ungrouped components at the same positions](PHASE-07-ungrouped.png)

## Phase 07 gate

Passed locally. All four authorized tasks and the outstanding UX-07 workflow have passing evidence. No unresolved Phase 07 defect or specification conflict was observed. Whole-source line coverage remains below the later-phase target, and the Phase 06 standalone export and cross-platform font limitations still apply. Hosted GitHub Actions remains unrun. The Phase 07 changes are ready for owner review in the working tree based on `4f2d856`. The next action is owner review and separate authorization for Phase 08.
