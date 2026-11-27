# DGS-09 — Development Roadmap & Implementation Tasks

| Field | Value |
|---|---|
| Project | Diagramming System |
| Document | DGS-09 |
| Version | 0.1 |
| Date | 27 November 2026 |
| Status | Draft — implementation not started |
| Target | V0.2 — MVP |
| Parents | DGS-01 through DGS-08 v0.1 |
| Handoffs | DGS-10, DGS-11, Codex Development Starter Pack |
| Audience | Product owner, developer, QA, Codex |

## 1. Purpose and source authority

This document translates the existing specifications into executable development slices, task IDs, dependency order, phase gates and evidence requirements. It does not revise the product baseline, portable schema, component registry or existing fixtures. The companion JSON register is a machine-readable mirror of the initial roadmap, not an implementation or test result. DGS-10 will establish definitive test procedures, severity classifications and measured release thresholds. DGS-11 records future scope; it is not a requirement to implement future features before MVP.

When requirements conflict, stop the affected work and record the exact source sections, proposed resolution, affected tests and migration impact. DGS-01/02 govern product scope and priorities; DGS-03 governs boundaries and stack; DGS-04 governs interface; DGS-05 and its schema govern portable data; DGS-06 and registry govern components; DGS-07 governs interactions; DGS-08 governs persistence/export. Later specialist detail can refine earlier proposed defaults but cannot silently override Must scope. DGS-09 owns sequencing, not new product behavior. The product owner approves material scope/schema/architecture changes. No source documents were edited.

## 2. Release baseline and implementation constraints

Deliver V0.2 with all FR-01–15 Must requirements, eight NFR categories and AC-01–08. FR-16–18 Should and FR-19 Could are explicitly deferred unless separately approved. Build one desktop-first editor supporting general, flowchart and architecture categories. Include 28 nodes plus a boundary, two starter templates, JSON import/export, native SVG and PNG. Local-first IndexedDB via Dexie; no mandatory login, backend, remote diagram transfer, telemetry, billing, AI, collaboration or mobile editing. No PDF, Mermaid, Draw.io interoperability, rotation, advanced obstacle avoidance or freehand drawing in mandatory scope.

Use Next.js static App Router, TypeScript, React Flow (conditional on spikes), Tailwind/shadcn UI, Zustand, Zod, Dexie, trusted Lucide geometry, native File/Blob/Canvas APIs and a custom vector serializer. Pin versions only at initialization after compatibility and licensing review. Do not add ELK.js unless FR-17 is separately scheduled and licensing reviewed. No paid service or deployment is authorized by this roadmap.

The core canonical document is authoritative. Renderer is a projection, not storage. Commands validate and commit atomically, temporary pointer previews remain separate, history covers graph only, persistence uses revision checks and immutable snapshots. Shared scene geometry drives both editor and export. Keep current DGS-05 v1 envelope, registry identifiers and fixture semantics. For a failed save, retain in-memory graph and provide editable backup. Never silently truncate, overwrite, raster-wrap SVG or reset a database.

## 3. Execution and milestone plan

Recommended single-developer sequence (AI-assisted), with owner review at gates. Phase 00–01 establish working toolchain and risk evidence. Phase 02 establishes command/history foundation early; Phase 08 integrates and verifies it rather than introducing it from scratch. Phase 03 uses an explicitly temporary in-memory adapter; real persistence arrives in Phase 09. The shared visual scene and geometry begin in Phase 04, not just at export. Integration tests that depend on later features are queued and cannot be reported as passed until executed. Spike code is disposable unless reviewed against production architecture and tests. Sequential dependencies in the register are conservative planning defaults, not a claim that all engineering work must be serial forever.

Estimates are focused workdays, not elapsed calendar dates, commitments or measured productivity. If spikes uncover substantial issues, re-estimate the remaining work. Do not cut Must features to meet a date.

| Phase | Objective | Tasks | Estimate | Exit gate |
|---|---|---:|---:|---|
| 00 | Project initialization | 4 | 1–2 d | Clean install, static production build and CI baseline; SP-01 passed before further spikes. |
| 01 | Technical prototypes and decision gates | 8 | 1–2 d | SP-02–08 evidence recorded; mandatory architecture blockers resolved or formally stop dependent work. |
| 02 | Core domain and command foundation | 5 | 2–3 d | Schema parity, pure graph validation and atomic command/history foundation pass; no renderer dependency in core. |
| 03 | Workspace and canvas | 5 | 2–3 d | Working local in-memory editor shell with viewport, selection, focus and navigation; persistence explicitly not yet complete. |
| 04 | Component library | 4 | 1–2 d | All 29 registered types insert and render, geometry/anchors and resize validated, local assets present. |
| 05 | Connections and routing | 3 | 1–2 d | Branching, cycles, reconnect and route geometry work; invalid edges never mutate state. |
| 06 | Properties and styling | 3 | 1–2 d | Validated node/edge/group property controls, status and text-fitting behavior work. |
| 07 | Grouping and boundaries | 4 | 2–3 d | Nested group geometry, expansion, explicit membership and safe deletion/duplication pass. |
| 08 | Commands and editing history integration | 3 | 1 d | All editing paths use command dispatcher; 50 transactions, cancellation and undo/redo pass. |
| 09 | Persistence and recovery | 5 | 2–3 d | Real browser saves, reload, revision conflict, stale deletion and backup-on-failure verified. |
| 10 | Import, export and templates | 5 | 1–2 d | Both templates, JSON semantic round trip, genuine SVG and PNG with full bounds verified. |
| 11 | Testing and stabilization | 4 | 3–4 d | All mandatory DGS-10 release gates pass with evidence, no blocking defects or unresolved decisions. |
| 12 | Deployment and release | 3 | 1 d | Production static artifact deployed only after approval; smoke checks, origin/backup warning and rollback documented. |

**Total: 56 mandatory roadmap tasks, 13 phases, estimated 19–30 focused days** (excluding extended spike remediation, external reviews and optional work). Earlier 18–30 day estimate was a coarse stage estimate; this task breakdown gives 19–30. All tasks are Not started; all verification is Not run. A task's linked test may need a later phase; phase gates require only the phase's available slice plus regression of completed work, with remaining cross-feature tests recorded as pending. All mandatory source scenarios must be passed at Phase 11.

Milestones:

- M1 (00–01): static shell and documented architecture evidence; no production MVP claim.
- M2 (02–05): working structured editor, canonical data, primitives and connections; candidate V0.1 development milestone only.
- M3 (06–08): complete editing behaviors and transactional history; not yet a reliable saved product.
- M4 (09–10): local persistence, templates and file operations; feature-complete candidate subject to acceptance.
- M5 (11–12): tested release candidate, owner approval and deployed V0.2.

## 4. Detailed task register and phase gates

Each task has a stable `T-PP-NN` ID, predecessor, primary requirement links, scenario references and concrete deliverable/exit evidence. Test references use range shorthand (e.g. CI-01–04 means CI-01 through CI-04); `AC-FR-01–15` refers to all feature cases in FR-01 through FR-15. A task is Done only when its own implementation and available verification are complete, reviewed and recorded. If a cross-phase test is not yet executable, record it as pending for the later phase, never as passed; phase 11 reconciles the full inventory. Status is initially Not started for every task. The sequential predecessor is the minimum scheduling dependency under the chosen solo workflow; refactoring order requires review and passing prerequisites.

### Phase 00 — Project initialization

**Entry:** Starter Pack assembled, specification review recorded and owner authorizes repository setup.

**Exit gate:** Clean install, static production build and CI baseline; SP-01 passed before further spikes.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-00-01 | Repository and specification baseline; after None | NFR-07; — | Copy unchanged DGS-01–11 and companion fixtures into agreed locations; record checksums, initialize Git, AGENTS.md, README, tracker and decisions; baseline paths verified and no private diagrams committed. |
| T-00-02 | Scaffold and dependency lock; after T-00-01 | NFR-06, NFR-07; — | Initialize Next.js App Router static export, TypeScript, Tailwind, React Flow, Zustand, Zod, Dexie and test tooling; record exact stable versions, Node LTS compatibility, lockfile, license/notice review and reproducible install. |
| T-00-03 | CI and test harness; after T-00-02 | NFR-07; — | Add lint, typecheck, unit/integration, production build and Playwright scripts; clean runner executes all baseline checks; no secrets or paid services required. |
| T-00-04 | Static shell spike; after T-00-03 | FR-01, FR-02, NFR-06; SP-01 | Serve static output, reload /editor/?id=fixture, verify browser-only initialization and no server route dependency; record build and browser evidence. |

### Phase 01 — Technical prototypes and decision gates

**Entry:** Phase 00 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** SP-02–08 evidence recorded; mandatory architecture blockers resolved or formally stop dependent work.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-01-01 | Nested boundaries spike; after T-00-04 | FR-03, FR-08, FR-10; SP-02 | Prove two nested levels, parent motion once, reparent and ungroup preserve world positions, expansion and undo with cross-boundary edges. |
| T-01-02 | Connector spike; after T-01-01 | FR-02, FR-06, FR-07; SP-03 | Prove four cardinal handles, negative coordinates, resize/reconnect, straight and orthogonal geometry and full scene fit; invalid reconnect keeps ID and endpoints. |
| T-01-03 | Vector export spike; after T-01-02 | FR-05, FR-07, FR-08, FR-09, FR-13, NFR-08; SP-04 | Build minimal controlled SVG/PNG proof with multiline labels, vector icons, markers and nested boundaries; inspect independent viewer, XML safety and font parity. |
| T-01-04 | Persistence spike; after T-01-03 | FR-01, FR-11, FR-12, NFR-03; SP-05 | Demonstrate transactional CAS in two real browser pages, quota/abort, edit during save and stale deletion; capture outcomes and recovery UI implications. |
| T-01-05 | History spike; after T-01-04 | FR-03, FR-06, FR-08, FR-10; SP-06 | Prove compound duplicate/delete/undo, redo invalidation, failed command immutability and 50 transactions using representative graph. |
| T-01-06 | Keyboard and accessibility spike; after T-01-05 | FR-03, FR-05, FR-14, NFR-05; SP-07 | Prove focus arbitration, native text undo, keyboard alternative to connect/resize, cancellation and visible focus; document gaps. |
| T-01-07 | Performance baseline spike; after T-01-06 | NFR-02, NFR-06, NFR-08; SP-08 | Run 100-node/150-edge synthetic workload in production shell; capture hardware/browser/build, frame and commit/save/export measurements or explicitly unavailable measurements; DGS-10 owns thresholds. |
| T-01-08 | Architecture review and compatibility decisions; after T-01-07 | NFR-04, NFR-07, NFR-08; SP-01–08 | Record each spike result, ADR outcome, font strategy, XML-incompatible text policy and license review; no failed mandatory spike silently waived. Re-run affected prototypes after changes. |

### Phase 02 — Core domain and command foundation

**Entry:** Phase 01 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Schema parity, pure graph validation and atomic command/history foundation pass; no renderer dependency in core.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-02-01 | Canonical contracts and runtime schema; after T-01-08 | FR-01, FR-04, FR-05, FR-12, NFR-07; DM-01–05,DM-21 | Define TypeScript/Zod from DGS-05 v1; strict unknowns, field ranges, finite geometry, UUID/time validation; parity tests against JSON schema and fixtures. |
| T-02-02 | Graph integrity and registry contract; after T-02-01 | FR-04, FR-06, FR-08, FR-09; DM-06,DM-09–10,DM-14 | Load trusted registry, validate global IDs, parent types/cycles/depth, eligibility, duplicate directed tuples and status; reject invalid graph atomically. |
| T-02-03 | Coordinate and containment primitives; after T-02-02 | FR-02, FR-03, FR-08; DM-07–08,DM-18,CI-01 | Pure world/local conversion, bounds and ancestor traversal; test negative/fractional values, expansion and preserved sibling positions. |
| T-02-04 | Command dispatcher and history foundation; after T-02-03 | FR-03, FR-10, NFR-07; DM-15,CI-33 | Implement typed command results, atomic validation, committed/noop/rejected state, graph-only history API, generation counter and selection reconciliation; wire before UI mutations. |
| T-02-05 | Session and repository interfaces; after T-02-04 | FR-01, FR-11, FR-12; DM-19,DM-20 | Define document repository port, session tokens, save-state contracts and version boundary; in-memory test adapter clearly distinguished from real persistence. |

### Phase 03 — Workspace and canvas

**Entry:** Phase 02 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Working local in-memory editor shell with viewport, selection, focus and navigation; persistence explicitly not yet complete.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-03-01 | Workspace routes and shell; after T-02-05 | FR-01, FR-02, NFR-01; UX-01–04 | Implement / and query-based editor route, list workspace, create/open and missing-ID states against temporary adapter; header, toolbar, collapsible panels, status bar and neutral design tokens. |
| T-03-02 | React Flow projection adapter; after T-03-01 | FR-02, FR-03; CI-01–04 | Project canonical nodes/groups/edges, parent-first ordering, stable IDs; renderer measurements/preview transient; no direct committed graph mutation. |
| T-03-03 | Viewport navigation and grid; after T-03-02 | FR-02, FR-14; CI-02–04,CI-06,DM-18 | Pan, pointer zoom 25–200%, fit via scene bounds interface, reset and 20-unit grid/snap independent; complete fit verified again after scene integration. |
| T-03-04 | Selection and hit testing; after T-03-03 | FR-03, FR-14; CI-07–09,CI-29 | Single/shift/marquee/full selection, empty canvas clear, overlap priority, noncapturing boundary interior and pointer cancellation; no history on selection. |
| T-03-05 | Keyboard/focus controller and responsive shell; after T-03-04 | FR-14, NFR-05, NFR-06; UX-15,UX-17,CI-32 | Implement shortcut arbitration and visible alternatives; native input/dialog behavior, focus restoration, desktop panel breakpoints and responsive overflow; final keyboard audit Phase 11. |

### Phase 04 — Component library

**Entry:** Phase 03 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** All 29 registered types insert and render, geometry/anchors and resize validated, local assets present.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-04-01 | Component registry and local assets; after T-03-05 | FR-04, NFR-04; CL-01–04,CL-26,DM-02 | Import all 29 definitions with typed adapter and local pinned vector icons; validate defaults and inventory, licensing and no remote asset fetch. |
| T-04-02 | Shared primitive geometry and scene; after T-04-01 | FR-04, FR-05, FR-13; CL-05–06,CL-19 | Implement DGS-06 exact primitives, text regions, visual bounds and cardinal anchors; test all 104 eligible anchors and finite shape geometry; export consumes same scene later. |
| T-04-03 | Component library insertion; after T-04-02 | FR-03, FR-04; CI-05,CL-01–02 | Implement categories and previews, drag/click/keyboard insert to root, correct transformed placement and one transaction; invalid drop no change. |
| T-04-04 | Move and resize interactions; after T-04-03 | FR-03, FR-14; CI-10–14,CL-09,CL-13 | Implement preview and commit, reference snapping, opposite-side resize, circular aspect lock and floor checks; provisional text measurement replaced with full fitter Phase 06. |

### Phase 05 — Connections and routing

**Entry:** Phase 04 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Branching, cycles, reconnect and route geometry work; invalid edges never mutate state.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-05-01 | Edge creation and graph constraints; after T-04-04 | FR-06; DM-09–10,CI-18–19,CL-07 | Create directed endpoints through pointer and keyboard controls; support branching and cycles, reject exact duplicates/self-loops/annotations/frames and dangling references. |
| T-05-02 | Shared route and marker geometry; after T-05-01 | FR-06, FR-07, FR-13; CI-21–22,CL-18 | Implement deterministic straight/orthogonal paths with endpoint normals, candidate ordering, explicit fallback and path-length label position; finite all handle/overlap cases; shared editor/export scene. |
| T-05-03 | Edge renderer and reconnection; after T-05-02 | FR-06, FR-07; DM-11,CI-18–20,CL-08,UX-07–08 | Render selectable edges and preview labels/arrows; reconnect either endpoint with stable ID/style; invalid release restores edge, motion and resize update anchors. |

### Phase 06 — Properties and styling

**Entry:** Phase 05 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Validated node/edge/group property controls, status and text-fitting behavior work.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-06-01 | Contextual properties and styles; after T-05-03 | FR-05, FR-07; CL-10,CI-16–17,UX-06,UX-08 | Implement no/single/mixed-selection inspector, allowed style fields, labels, route/arrows/dash and numeric bounds; invalid edits preserve graph; shared properties update atomically. |
| T-06-02 | Text layout and content fit; after T-06-01 | FR-03, FR-05, FR-08, FR-13; CL-11–13,CI-14–16,DM-04 | Measured local font metrics, Unicode/multiline wrapping, no clipping or silent shrink; grow content or reject invalid dimensions; fit and ancestor growth integrate with Phase 07. Apply approved XML policy. |
| T-06-03 | Architecture status and boundary title controls; after T-06-02 | FR-05, FR-08, FR-09; CL-14–16,DM-14,UX-10 | Implement four status values for architecture only, marker and text without overriding style; group title and opacity; ensure neutral status backing and readable contrast. |

### Phase 07 — Grouping and boundaries

**Entry:** Phase 06 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Nested group geometry, expansion, explicit membership and safe deletion/duplication pass.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-07-01 | Boundary scene and nesting; after T-06-03 | FR-08; CL-16,CI-23–25 | Render frames behind descendants, title/border hit regions, dynamic padding; nested children parent-relative, cross-boundary edges intact. |
| T-07-02 | Group and explicit reparent operations; after T-07-01 | FR-08; DM-06–08,CI-23,CI-26 | Create same-parent selection group, add/remove membership with world-coordinate preservation and cycle/depth checks; visual overlap never changes membership. |
| T-07-03 | Recursive expansion and resizing; after T-07-02 | FR-03, FR-05, FR-08; CI-24–25,CL-12,DM-08 | Expand ancestor frames in all directions, rebase child locals to preserve unrelated world positions; boundary resize does not scale children, invalid shrink rejects. |
| T-07-04 | Delete, ungroup and duplicate graph operations; after T-07-03 | FR-03, FR-06, FR-08, FR-10; DM-12–13,CI-27–28,CL-17,UX-09 | Normalize selected roots, remove incident edges only for deleted nodes, preserve unselected descendants, remap copied internal edges and IDs; undo fully restores transaction. |

### Phase 08 — Commands and editing history integration

**Entry:** Phase 07 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** All editing paths use command dispatcher; 50 transactions, cancellation and undo/redo pass.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-08-01 | Full transaction integration; after T-07-04 | FR-03, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10; DM-15,CI-29–30,UX-11 | Integrate all graph mutations with existing dispatcher/history; metadata/view excluded, one gesture/label/style commit, cancelled/noop no entry; undo/redo preserve current metadata/revision. |
| T-08-02 | Keyboard actions and history capacity; after T-08-01 | FR-10, FR-14, NFR-05; CI-11,CI-30,CI-32,DM-24 | Finish nudge coalescing, undo/redo availability, duplicate/delete/group shortcuts and keyboard alternatives; test at least 50 graph transactions and redo branching. |
| T-08-03 | End-to-end editor regression; after T-08-02 | FR-02, FR-03, FR-06, FR-07, FR-08, FR-10; CI-03,CI-08,CI-33,CL-08 | Verify full scene fit, complex multi-selection, stale preview and resource limits; use both reference diagram categories; fix any bypasses of dispatcher. |

### Phase 09 — Persistence and recovery

**Entry:** Phase 08 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Real browser saves, reload, revision conflict, stale deletion and backup-on-failure verified.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-09-01 | Dexie repository and lifecycle; after T-08-03 | FR-01, FR-11; PE-01–06,PE-20–22 | Implement documents/viewports/preferences stores, create/open/rename/duplicate/delete and atomic row/view operations; strict loaded content validation, no reset on error; template path completed Phase 10. |
| T-09-02 | Autosave coordinator; after T-09-01 | FR-11, FR-10; PE-07–12,PE-19,CI-31 | 750 ms debounce, 1s max-wait when available, one in-flight immutable snapshot, generation-aware acknowledgement, retry latest, undo saved as new revision. |
| T-09-03 | Cross-tab conflict and recovery; after T-09-02 | FR-01, FR-11, NFR-03; PE-13–18,DM-19,UX-12 | CAS transaction, stale deletion protection, copy/reload/backup, session isolation and pending navigation; test two actual tabs even with notifications disabled. |
| T-09-04 | Viewport, upgrades and failure handling; after T-09-03 | FR-02, FR-11; PE-20–22,PE-39 | Independent 500ms viewport debounce without graph revision, safe corrupt-view fallback, blocked upgrade/versionchange, no destructive rollback; test transaction abort and unavailable storage. |
| T-09-05 | Editable backup recovery integration; after T-09-04 | FR-11, FR-12; PE-11,PE-27,UX-13 | Expose safe JSON export of current valid in-memory snapshot even when DB unavailable, reusing Phase 02 validation; no stale substitution; final import/export UI Phase 10. |

### Phase 10 — Import, export and templates

**Entry:** Phase 09 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Both templates, JSON semantic round trip, genuine SVG and PNG with full bounds verified.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-10-01 | Bounded JSON import and portable export; after T-09-05 | FR-12, NFR-04; PE-23–28,DM-16–17,DM-20 | Implement strict UTF-8/duplicate-key/depth/size checks, v1 validation, ID remap, atomic add-only import and immutable export snapshot; reject unsupported versions and unsafe keys. |
| T-10-02 | Starter templates and independence; after T-10-01 | FR-15, FR-01; CL-22–24,DM-23,UX-02,UX-16 | Bundle exact DGS-06 flowchart and architecture fixtures, remap all IDs, validate, persist and open; independently editable, immutable sources; template instances JSON round-trip. |
| T-10-03 | Standalone SVG serializer; after T-10-02 | FR-13, NFR-08; PE-29–33,CL-18–21,DM-22 | Generate native safe XML vector output from scene with full bounds, 32-unit white padding, icons, text and statuses; no UI, remote assets or raster wrapper; handle XML errors explicitly. |
| T-10-04 | PNG renderer and preflight; after T-10-03 | FR-13, NFR-08; PE-34–36 | Rasterize same scene at 2x (explicit 1x), 8192 edge and 16 Mi pixel budgets; decode/encode/null/timeout cleanup and correct dimensions; no hidden scale reduction. |
| T-10-05 | File dialogs, handoff and regression; after T-10-04 | FR-12, FR-13, FR-15; PE-37–38,UX-13–14,CI-34,CL-03 | Wire import/export dialog, filename sanitization, stable captured snapshot after draft resolution, browser download handoff; independently inspect PNG/SVG and reimport JSON in target browsers. |

### Phase 11 — Testing and stabilization

**Entry:** Phase 10 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** All mandatory DGS-10 release gates pass with evidence, no blocking defects or unresolved decisions.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-11-01 | Consolidated mandatory traceability suite; after T-10-05 | FR-01–15, NFR-07; AC-01–08,AC-FR-01–15 | Execute every mandatory parent, feature and specialist scenario per DGS-10; evidence with test ID, commit and environment; no unexecuted mandatory checks treated as passes. |
| T-11-02 | Security, accessibility and compatibility audit; after T-11-01 | NFR-01, NFR-04, NFR-05, NFR-06; UX-17,CL-25–26,CI-32,PE-24,PE-30 | Test malformed imports, markup, remote network requests, keyboard-only editing, contrast/focus, licenses and actual Chrome/Edge desktop; use synthetic data only. |
| T-11-03 | Performance and visual fidelity; after T-11-02 | NFR-02, NFR-03, NFR-08; CI-35,PE-40,CL-21,DM-24 | Measure reference graph on approved hardware/browser, save/export timings and memory; independently inspect vector and PNG; compare approved DGS-10 thresholds, fix regressions. |
| T-11-04 | Usability, defect triage and release candidate; after T-11-03 | NFR-01, NFR-07; AC-01–08 | Run pilot tasks and gate review; classify defects, fix and rerun impacted tests; record explicit optional deferrals, approve candidate only with all mandatory gates satisfied. |

### Phase 12 — Deployment and release

**Entry:** Phase 11 gate passed, or an explicitly documented nonblocking sequencing change approved.

**Exit gate:** Production static artifact deployed only after approval; smoke checks, origin/backup warning and rollback documented.

| Task ID | Task / predecessor | Requirement and verification references | Deliverable and task exit condition |
|---|---|---|---|
| T-12-01 | Production build and deployment approval; after T-11-04 | NFR-04, NFR-06, NFR-07; AC-01–08 | Create reproducible tagged static build, verify no private data, licenses and origin warnings; hosting choice and production deployment require owner approval. |
| T-12-02 | Production smoke and rollback; after T-12-01 | FR-01, FR-11, FR-12, FR-13, NFR-03; AC-05–07,PE-39 | On intended HTTPS origin verify new diagram, save/reload, JSON backup, PNG/SVG, no unintended uploads; test compatible rollback plan and document origin isolation/migration constraints. |
| T-12-03 | Release handover; after T-12-02 | NFR-07; AC-01–08 | Record tag, build hash, known issues, test evidence, backup guide and deferred scope; update README/tracker/changelog; release only after owner sign-off. |

## 5. Technical spike protocol and risk gates

Run SP-01 first, then SP-02/03/04 as highest-risk areas. SP-05/06/07/08 follow using small proof fixtures; measure a representative production build, not just dev-mode rendering. Do not spend the entire first iteration perfecting UI aesthetics. A spike is complete only with reproducible commands, environment, fixture, observed result and decision; screenshot alone is insufficient. If a spike cannot be run (browser missing, platform constraint or dependency conflict), mark Blocked / Not run and identify owner action. If a mandatory capability fails, stop affected downstream work, investigate alternatives and re-run. A positive spike reduces risk but does not replace production tests.

| Spike | Critical evidence | Failure response |
|---|---|---|
| SP-01 | Static production build and local query route reload | Fix static/prerender boundary; reconsider deployment only through ADR. |
| SP-02 | Two levels, nested transforms, reparent, ungroup, expansion, undo and intact edges | Adapt controlled projection/domain coordinates; evaluate engine alternative if required. |
| SP-03 | Cardinal anchors, resize, reconnect, stable IDs and finite deterministic routes | Implement shared route/anchor adapter and test edge cases; do not remove connectors. |
| SP-04 | Independent SVG viewer, native paths/text/icons, nested frames, PNG | Prototype dedicated serializer and font strategy; do not substitute a raster SVG. |
| SP-05 | Two real browser tabs, CAS, failures, stale deletion and current backup | Fix transactional repository and generation protocol; fake DB tests alone insufficient. |
| SP-06 | Compound atomic undo/redo and 50 transactions | Fix immutable snapshot/patch approach and generation logic; never make history destructive. |
| SP-07 | Native input focus and keyboard alternatives for core actions | Resolve event arbitration and accessible controls before dependent UI. |
| SP-08 | Measured 100 nodes/150 edges interaction, save/export and memory baseline | Profile, reduce redundant updates and remeasure; DGS-10 defines acceptance thresholds. |

Record in `DECISIONS.md`: ID, status (proposed/accepted/rejected/superseded), source and tradeoff, alternatives, decision owner, affected tasks/tests and evidence. Capture code location or disposable proof reference; do not merge unsafe prototype code merely to preserve it. For partial measurement, record actual measured metrics and explicitly identify missing metrics.

## 6. Requirement-to-phase traceability

Primary phases deliver the capability; other phases supply prerequisites and regression. Phase 11 verifies all mandatory requirements and Phase 12 validates production smoke paths. No optional feature is promoted to Must.

| Requirement | Primary delivery phases | Main acceptance area |
|---|---|---|
| FR-01 Document management | 03, 09, 10 | Library CRUD, independent copies, safe navigation |
| FR-02 Canvas navigation | 03, 08 | World transforms, full bounds, zoom/pan |
| FR-03 Manipulation | 04, 07, 08 | Move, resize, duplicate/delete, selection |
| FR-04 Component library | 02, 04 | 29 registered types, local assets |
| FR-05 Text/appearance | 04, 06, 07 | Typed styles, measured text and growth |
| FR-06 Connections | 05, 07 | Branching, handles, graph validation |
| FR-07 Connector format/reconnect | 05, 06 | Route, arrow, label and stable edge ID |
| FR-08 Groups | 02, 07 | Nesting, containment, explicit membership |
| FR-09 Status | 06 | Manual labels and colors, semantic preservation |
| FR-10 History | 02, 08, 09 | Atomic graph history, 50 transactions, persistence |
| FR-11 Persistence | 09 | Save/reload, conflict, retry, backup |
| FR-12 JSON | 02, 09, 10 | Strict parser, add-only import, roundtrip |
| FR-13 SVG/PNG | 04, 05, 06, 10 | Shared scene, full bounds, safe native vector and raster |
| FR-14 Grid/shortcuts | 03, 04, 08 | Snap independent of grid, focus and nudging |
| FR-15 Templates | 10 | Two independent instances, valid remapping |
| FR-16 Productivity | Deferred | Conditional mini-map, align/distribute, presets |
| FR-17 Auto layout | Deferred | Conditional explicit validated arrangement |
| FR-18 Extra templates | Deferred | Conditional valid templates |
| FR-19 Extended metadata/search/styles | Deferred | Conditional schema/preset compatibility |
| NFR | Verification responsibility |
|---|---|
| NFR-01 Usability | 03/06 UI; 11 pilot tasks and error feedback |
| NFR-02 Performance | 01 baseline; 11 approved reference benchmark |
| NFR-03 Reliability | 09 repository/real tabs; 11 regression |
| NFR-04 Privacy/security | 02/04/10 input/asset controls; 11 audit |
| NFR-05 Accessibility | 01/03/08 keyboard; 11 keyboard and focus audit |
| NFR-06 Compatibility | 00 static build; 11 actual Chrome/Edge; 12 smoke |
| NFR-07 Maintainability | 00/02 architectural checks and CI; every phase |
| NFR-08 Export fidelity | 01/04–07 scene and geometry; 10/11 independent viewers |

## 7. Verification inventory and evidence management

The machine-readable register includes all distinct acceptance IDs extracted from the eight source specifications. The source documents retain the actual assertions; DGS-10 defines executable procedures. Multiple cases can map to one automated test or require multiple tests; counts are specification scenarios, not promises about the test count or code coverage.

| Source | Cases | Mandatory | Conditional |
|---|---:|---:|---:|
| DGS-01 (AC) | 8 | 8 | 0 |
| DGS-02 (AC-FR) | 66 | 55 | 11 |
| DGS-04 (UX) | 18 | 17 | 1 |
| DGS-05 (DM) | 24 | 24 | 0 |
| DGS-06 (CL) | 26 | 26 | 0 |
| DGS-07 (CI) | 36 | 35 | 1 |
| DGS-08 (PE) | 40 | 40 | 0 |
| **Total** | **218** | **205** | **13** |

Eight technical spikes are tracked separately. UX-18 and CI-36 are conditional; the 11 FR-16–19 cases are conditional. DGS-10 may add tests and refine applicability without discarding mandatory source coverage. For each case, record test ID/source, implementation commit, test level, environment, result, evidence location, defect reference and rerun status. Never treat skipped, blocked or not-run as passed. Source IDs are unique and unchanged. Unit tests cover pure graph/geometry/validation; integration tests cover stores, commands, persistence and serialization; Playwright E2E tests use production static output; verify actual Chrome/Edge for target browser behaviors and independent SVG viewers for fidelity. Synthetic diagrams only.

Phase gate report format:

```text
Phase / task IDs:
Branch / commit / build hash:
Implemented behavior:
Files changed:
Test commands and observed exit/results:
Source acceptance IDs verified:
Source acceptance IDs pending and owning later phase:
Manual/browser evidence (environment, fixture, result):
Defects / blockers / decision IDs:
Gate: PASS | FAIL | BLOCKED (not inferred from appearance)
Owner review / next eligible task:
```

## 8. Repository bootstrap and artifact placement

After DGS-11, consolidate the original artifacts, this roadmap/register, DGS-10/11 and starter instructions into one repository-ready pack. Do not regenerate originals silently. Proposed layout (actual filenames may retain full original names; record canonical mapping in README):

```text
diagramming-system/
  docs/01-product/        # DGS-01, 02
  docs/02-architecture/   # DGS-03, 05; portable JSON schema
  docs/03-design/         # DGS-04, 06, 07; registry JSON
  docs/04-development/    # DGS-08, 09, 10; DGS-09 task register
  docs/05-roadmap/        # DGS-11
  tests/fixtures/        # DGS-05 example; DGS-06 two templates
  src/                   # created incrementally
  AGENTS.md
  README.md
  IMPLEMENTATION_TRACKER.md
  DECISIONS.md
  CHANGELOG.md
  THIRD_PARTY_NOTICES.md
  .github/workflows/ci.yml
  package.json
  package-lock.json
```

The JSON register is an initial baseline; choose one mutable execution tracker in the Starter Pack (recommended JSON or Markdown generated from it) and avoid maintaining conflicting task statuses in two sources. Source schema and registry remain trusted reference artifacts; if runtime code generates copies, test parity and document which source is authoritative. Use dependency lockfile and `npm ci`, documented Node version, no secrets, no private client diagrams. Before scaffolding, inspect existing repository and do not overwrite uncommitted work or user files. Establish `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e` or documented equivalents. E2E serves the production static export, not a dev-only mock. CI must fail on required checks rather than suppress them. Browser setup is documented; exact dependency versions are deliberately not selected here because implementation environment and compatibility have not been validated.

## 9. Codex implementation workflow

Use a single scoped prompt for one phase, or split into task-sized prompts if the phase is large. At start, read AGENTS.md, task register, applicable DGS sections and prior evidence; inspect current branch, diff, lockfile and baseline tests. Identify missing dependencies and contradictions before changing files. Preserve user changes. Implement the smallest complete vertical slice, tests included. Run targeted and regression checks, then report actual results. Stop at phase gate; never advance automatically through dependent phases, alter scope, commit credentials, install unnecessary services or claim unrun tests. Owner authorizes material decisions and release. Codex may propose commits; user controls push/deploy. A task marked blocked includes reason, evidence and next required action.

Reusable phase prompt (to be copied after starter pack exists):

```text
Implement only DGS-09 Phase <PP>, tasks <IDs>, in this repository.
Read AGENTS.md, DGS-09, relevant DGS-01–08 sections, DGS-10 and prior phase evidence.
Check repository state and prerequisites. Do not overwrite user changes.
Keep Must scope, schema v1 and component IDs unchanged unless an approved decision says otherwise.
Follow the existing architectural boundaries; do not mutate canonical data through the renderer.
Implement code and tests for the selected tasks. No fake persistence or export claims.
Run applicable lint, typecheck, unit/integration, build and browser tests. Report actual outputs.
Record acceptance IDs passed, failed, blocked and pending, plus evidence and changed files.
Update the execution tracker and decisions only for actual work. Do not mark unrun checks passed.
Stop at the phase gate. Do not start another phase or deploy without owner direction.
```

For Phase 00 specifically: inspect the initial docs and artifacts, establish an npm static Next.js project and dependency compatibility; configure scripts and CI, prove query-route reload via SP-01. Do not implement all diagram features. Phase 01 prompts focus on a single spike at a time if necessary. Later prompts refer to the same task IDs, not duplicate requirements. At completion, review diff, record evidence and approve commit. If tests fail, fix scoped defects, rerun affected tests and keep the gate open. Do not make unrelated broad refactors while delivering a phase.

## 10. Git, CI and release engineering

Proposed solo workflow: protected or carefully maintained `main`, short branches `phase/00-foundation`, `phase/01-spikes`, or `task/T-05-02-routing`. Review each diff and use task ID in commit messages, e.g. `feat(T-05-02): add deterministic orthogonal routing`. Separate behavior changes from unrelated formatting and dependency updates. Commit lockfile and tests; exclude node_modules, build output, local browser data, env secrets, screenshots containing private data and test credentials. Do not rewrite user history or force-push. CI executes clean install, lint, typecheck, unit/integration, static build, E2E where available, with logs/artifacts retained as appropriate. No percentage coverage threshold asserted before DGS-10.

Tag development milestones only after phase gates, e.g. `v0.1.0-dev` after M2 and `v0.2.0-rc.1` after M4 if clearly labeled unverified candidate; final `v0.2.0` only after release gates and owner approval. Version tags proposed, not created. Deploy tested artifact to selected HTTPS static hosting only after approval. Preview/production origins are separate storage silos; explain JSON backup/transfer. Rollback to known compatible build, never destructive DB reset; if schema or DB upgrade makes rollback unsafe, use compatible forward fix and backup recovery. Production smoke checks use synthetic diagrams and confirm no accidental network uploads. Record actual host/build/commit, smoke evidence, known limitations and recovery steps. No hosting provider, plan or pricing selected here.

## 11. Change control, risk register and dependencies

| Risk / open decision | Owner task | Mitigation / escalation |
|---|---|---|
| React Flow nested groups or hit handling inadequate | T-01-01, T-01-02, T-01-08 | Proof and controlled adapter; change engine only via reviewed ADR. |
| Orthogonal route overlap and anchor fidelity | T-01-02, T-05-02 | Deterministic finite geometry; advanced obstacle avoidance remains deferred. |
| Font metrics differ between editor and independent SVG | T-01-03, T-06-02, T-10-03 | Test local fallback; consider licensed bundled font or approved text-to-path approach; document tradeoffs. |
| XML-incompatible text represented by v1 JSON | T-01-08, T-06-02, T-10-03 | Review explicit commit/import policy vs lossless representation; preserve existing JSON; no silent strip. Resolve before release through documented compatibility decision. |
| Incompatible schema/registry defaults or fixture text fit | T-02-01, T-04-01, T-06-02 | Validate structural parity and measured registry-specific fit; record exact proposed source change if needed. |
| Unsafe parser or dependency licenses | T-00-02, T-01-08, T-10-01, T-11-02 | Evaluate bounded duplicate-aware parser, pinned local assets, notices, dependency audit. |
| Stale writes or local browser data loss | T-01-04, T-09-03 | Real tabs, CAS, generation, explicit backup; no durability overclaim. |
| History overhead and frame drops | T-01-05, T-01-07, T-11-03 | Structural sharing, targeted renders and measured 50-history/reference graph workloads. |
| PNG resource failures | T-01-03, T-10-04 | Preflight, explicit 1x fallback, cleanup; no hidden degradation. |
| DGS-10 thresholds and defect policy not yet finalized | T-01-07, T-11-03/04 | Draft before Phase 00; benchmark and approve actual thresholds before release. |
| Planning estimate exceeded | Every phase | Re-estimate after spike/phase evidence; do not waive mandatory gates. |

A change record includes ID, reason, source section, before/after behavior, compatibility, tasks/tests impacted, risk and owner approval. Update specifications and machine artifacts together only on approval. If a requested change is optional, place it in backlog with priority and revisit after MVP. DGS-09 does not authorize a paid tool, vendor account, public deployment or migration of actual customer data.

## 12. Deferred feature backlog and scope protection

| FR | Priority | Earliest review | Prerequisites |
|---|---|---|---|
| FR-16 | Should | After core gates | Validated geometry/commands, explicit undo and viewport behavior |
| FR-17 | Should | Post-MVP default | Engine/license review, layout failure atomicity and nested rules |
| FR-18 | Should | Post-MVP default | Valid independent template instantiation |
| FR-19 | Could | Post-MVP default | Metadata/versioning review, search and preset persistence contracts |

Future AI, cloud, authentication, collaboration, commercial plans and integration formats belong to DGS-11. No hidden controls for unimplemented optional features. Keep optional tests conditional and record explicit deferrals at Phase 11. No optional work may block or replace a Must feature.

## 13. Definition of done and release readiness

Task Done means scoped implementation exists, targeted tests executed and recorded, available acceptance conditions pass, no new blocking defect, documentation and tracker updated, review complete. Phase Passed means all its applicable tasks Done, earlier gates intact, required phase evidence recorded and no blocker to dependent work. Later integration cases may remain pending only with an explicit owning phase; the final release cannot have pending mandatory cases. A prototype is not a production feature. A visually polished screen is not functional acceptance. A successful export handoff is not proof of retained backup. A successful DB write is not a guarantee against device loss.

Release V0.2 requires all 15 Must requirements and all eight parent gates, all mandatory specialist/feature scenarios and approved NFR thresholds under DGS-10, no unresolved critical/high-severity core-editing or data-loss defects, dependency/asset license review, verified compatibility on intended Chrome/Edge, verified JSON roundtrip and native SVG/PNG, recovery guidance, no unresolved material compatibility decisions, deployment and owner approval. Optional deferrals documented. If required tests are unavailable, mark release blocked; no claims based on unexecuted tests. Final smoke and rollback plan must be recorded before declaring release.

## 14. Specification readiness and handoff

This roadmap contains 56 mandatory execution tasks, 13 phases, 8 spike IDs and 218 existing acceptance scenario IDs, 205 mandatory and 13 conditional. Artifact verification checks unique task IDs, sequential dependency acyclicity, complete FR-01–15 direct task coverage, complete source scenario inventory and machine-register consistency. These are documentation checks only. No repository initialized, dependencies installed, code written, browser tests run or deployed. The prior eight specifications and JSON artifacts are unchanged. The phase order, estimates, branch conventions and tracker model are proposed decisions.

Next: DGS-10 — Testing & Release Acceptance Criteria (test matrix, benchmark definitions, defects, evidence, release gates); DGS-11 — Future Features & Scalability Plan (deferred roadmap); consolidated consistency review and Starter Pack, then start Phase 00. No further planning phase is required unless technical blockers require a focused decision.

## Revision history

| Version | Date | Change |
|---|---|---|
| 0.1 | 27 Nov 2026 | Initial implementation roadmap and task register; all implementation and test statuses unstarted. |
