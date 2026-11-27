# DGS-10 — Testing & Release Acceptance Criteria

## 1. Document control

| Field | Value |
|---|---|
| Project | Diagramming System |
| Document | DGS-10 |
| Version | 0.1 |
| Date | 27 November 2026 |
| Status | Draft — pending review and execution |
| Target | V0.2 MVP |
| Parents | DGS-01–09 v0.1; DGS-05 schema v1; DGS-06 registry v1 |
| Companion | DGS-10_Acceptance_Test_Register_v0.1.json |
| Benchmark | DGS-10_Reference_Benchmark_100N_150E_v1.json |
| Owner | Development / QA; release approval by product owner |

Purpose: turn the prior specifications into a repeatable quality program, measurable non-functional thresholds and an evidence-based release decision. This document does not expand MVP product scope. DGS-09 remains the implementation sequence; DGS-02 controls priorities; DGS-05/06 control portable structures and registry; DGS-07/08 control behavior. If requirements conflict, record the decision before implementation rather than silently choosing one. No runtime test has been executed in this specification activity.

## 2. Acceptance baseline and applicability

| Source | ID range | Mandatory | Conditional | Total |
|---|---|---:|---:|---:|
| DGS-01 | AC-01–08 | 8 | 0 | 8 |
| DGS-02 | AC-FR-* | 55 | 11 | 66 |
| DGS-04 | UX-01–18 | 17 | 1 | 18 |
| DGS-05 | DM-01–24 | 24 | 0 | 24 |
| DGS-06 | CL-01–26 | 26 | 0 | 26 |
| DGS-07 | CI-01–36 | 35 | 1 | 36 |
| DGS-08 | PE-01–40 | 40 | 0 | 40 |
| Total | | 205 | 13 | 218 |

Eight DGS-03 technical spikes are additional, tracked separately. The DGS-09 register supplies 56 implementation tasks in 13 phases. The companion acceptance register reproduces each source assertion, source filename/line, trace where available, candidate implementation tasks, planned test level and initially empty evidence/test ID fields. It adds separate performance metrics and release gates, not new source scenario IDs. One scenario can require several tests; one test can satisfy several scenarios only if its assertions cover them all. Final consolidated verification T-11-01 owns all mandatory scenarios, including those with only partial evidence in earlier phases. Task links do not imply completion. UX-05 is explicitly assigned additional candidate task links (T-03-04, T-04-03, T-04-04) because DGS-09 did not directly enumerate that scenario in task verification fields. Do not alter the DGS-09 register silently.

Conditional scenarios: 11 AC-FR-16–19 cases, UX-18 and CI-36. Record applicability at the individual feature/subfeature level. Example: if only minimap is implemented, applicable minimap assertions pass and unimplemented alignment/presets assertions are deferred with explicit reasons. UX-18 also requires absent optional UI not to mislead users; CI-36 requires applicable optional operations to use valid transactions. Do not mark a whole composite scenario not applicable if any part applies. Optional features remain out of MVP by default. Additional conditional checks described in prose (e.g., transparent export or persistent-storage permission) must be covered if the relevant feature is enabled even though they are not separate IDs in the 218 baseline.

Status vocabulary: `not_run`, `pass`, `fail`, `blocked`, `not_applicable` (conditional only). Partial evidence never equals pass. A failed test remains failed until a verified rerun; retain previous evidence. Report number passed / applicable, mandatory passed / 205, optional applicability and failures separately. Do not calculate readiness as average of phases or test coverage.

## 3. Test architecture and repository conventions

| Level | Proposed implementation | Evidence |
|---|---|---|
| Unit | Vitest; deterministic injected clock/UUID/measurement ports | Assertions, test output, coverage |
| Component | React Testing Library; DOM interaction and accessible roles | Behavior assertions, focus, validation |
| Integration | Vitest + fake-indexeddb; real command, store, repository ports | Before/after graph, transaction errors |
| Browser E2E | Playwright on actual Chrome and Edge for final gates | Trace, screenshots, downloads, assertions |
| Visual | Shared scene structural checks + screenshots and independent SVG viewer | Geometry reports, SVG/PNG files, reviewed diffs |
| Security | Negative fixtures, dependency checks, network instrumentation | Rejection, no mutation, no executable content |
| Performance | Browser traces, performance marks, memory sampling | Raw samples and environment metadata |
| Accessibility / usability | Automated scans, keyboard tests, manual and pilot protocols | Issues, observations, completed tasks |

Keep production `core/` independent of React, React Flow, Next.js and Dexie. Unit tests should exercise pure functions with representative and boundary values; test randomized invariant sequences with deterministic seeds as additional coverage, not as replacements for explicit cases. Use component tests for inspector fields, mixed selections, dialog focus, busy states, keyboard alternatives and feedback. Use integration tests with real application orchestration and injectable adapters, including controlled asynchronous failures. A fake IndexedDB test cannot establish real concurrency, quota, upgrades or browser durability. Playwright actual target browsers use a production static build served over localhost or HTTPS, not a development-only environment. Real browsers and browser versions must be recorded. Bundled Chromium can be a fast CI check but does not substitute for Chrome/Edge release evidence.

Suggested paths (create as needed):

```text
 tests/
   unit/{schema,geometry,commands,registry,scene}/
   integration/{session,persistence,import-export}/
   e2e/{workspace,canvas,connections,groups,recovery,export,accessibility}/
   fixtures/{schema,templates,invalid,benchmark}/
   visual/{baselines,review}/
   performance/{scenarios,results}/
 docs/04-development/registers/acceptance-test-register.json
 docs/04-development/evidence/
```

Use test IDs in titles or mapping manifest, e.g. `DM-13: deleting a node removes incident edges and undo restores both`. Name fixture versions and preserve input files; create copies for mutations. For numeric geometry use explicit tolerance 1e-6 world units for calculations and a proposed 1 CSS px for rendered anchor placement at tested zooms, not tolerance for IDs, graph relationships or status. Use stable accessible locators; prefer deterministic clocks/wait on observable conditions instead of arbitrary sleeps. Isolate browser contexts and DB state per case unless testing same-origin multi-tab sharing. Use synthetic data only; no real diagram, email or confidential infrastructure in CI logs/screenshots.

## 4. Test data and reference fixtures

Existing artifacts: DGS-05_Portable_Diagram_Schema_v1.json, DGS-05_Example_Architecture_v1.json, DGS-06_Component_Registry_v1.json, DGS-06_Template_Basic_Flowchart_v1.json, DGS-06_Template_IT_Architecture_v1.json. Keep originals immutable; validate with Draft 2020-12 and format checking, plus runtime Zod and domain validation. Add fixtures:

| Fixture family | Required cases |
|---|---|
| Valid minimal | Empty graph; empty boundary; null viewport; one node; negative coordinates |
| Full catalog | All 28 node types plus boundary, eligible/ineligible statuses and handles; multiline and international labels |
| Hierarchy | Two levels, maximum supported depth, siblings, cross-boundary edges, overlapping unrelated nodes |
| Invalid graph | Duplicate IDs, dangling edges, invalid handles, group cycles, excessive depth, impossible containment, invalid size, nonfinite values at runtime |
| Invalid input | Malformed JSON/UTF-8, duplicate keys, unsafe keys, unknown fields, unsupported version, oversize and deeply nested data |
| Export | Negative coordinates, long labels, arrow modes, dashed edges, empty visual scene, XML metacharacters, large image limits |
| Persistence | Two tabs same revision, aborted writes, stale deletion, corrupt viewport/graph, blocked upgrade |
| Benchmark | 100 nodes, 150 directed edges, two nested boundaries; varied statuses and routing, negative coordinates |

The supplied benchmark is synthetic and deterministic. UUID v4-shaped identifiers are generated deterministically for this test fixture only, never as a production ID-generation method. Nodes occupy ten columns and ten rows with the first five rows nested in a subgroup. Edges include 90 horizontal and 60 vertical connections, labels on a subset, all three arrow modes, straight/orthogonal routing. Fixture dimensions were chosen so default 2× export should be within DGS-08 nominal pixel budget, subject to measured scene bounds. Test actual text layout and routing; schema validity is not proof of visual fit. If content fitting makes a fixture invalid, report and revise the fixture explicitly while retaining workload and representative complexity. Do not lower node/edge count to make performance pass.

## 5. Domain, editing and component verification

Apply exact source assertions in DM-01–24, CL-01–26, CI-01–36 and AC-FR cases. Implementation procedures:

- Schema: validate each built-in type and every required field; compare Zod and portable schema for structural cases with date format checks. Test graph invariants separately because structural JSON Schema cannot enforce cross-object relationships. Use exact source expectations for unsupported field/type behavior. Assert imported labels remain inert text.
- Identity: snapshot before/after move, resize, style, reconnect, reparent and rename. IDs stable; duplicates and template/import copies remap all graph identities and references independently. Assert original untouched. For equivalence compare ordered graph objects with a consistent ID mapping, not raw IDs or new timestamps.
- Geometry: roundtrip client/canvas/world/local conversion with positive/negative/fractional positions, panel offsets and 25/100/200% zoom. Verify world grid tie behavior per DGS-07; group movement once; fixed opposite resize edge; text content fits; circular aspect ratio. Test failure leaves exact prior state, history and dirty generation unchanged.
- Selection: hit priority, marquee full containment, modifier toggles, overlapping boundary interiors, active gesture capture, cancellation, invalid insertion and text focus. Test single/multi movement with one reference snap delta. UI commands and keyboard alternatives reach identical domain rules.
- Connections: test all cardinal handle combinations for every connectable primitive; verify path endpoints against shared geometry and no forbidden self-loop, exact duplicate or dangling edge. Distinct-node cycles and valid reverse edges allowed. Invalid reconnect restores original. Test straight/orthogonal, forward/both/none, dashed and labels. Endpoint obstacle handling follows DGS-07; no promise of global obstacle avoidance.
- Groups: same-parent selection, explicit reparent, overlap without membership, nested move, recursive expansion on left/top/right/bottom, preserve unrelated siblings, resize rejection, ungroup/delete frame preserving children, node delete cascades edges. Cross-boundary edges persist; invalid depth or cycles rejected atomically.
- Styles: full registry defaults, controls restricted by capabilities, every supported text/colour/line property, status independent of style, label wrapping and explicit resize rejection. Test annotations and boundaries do not connect. Long Unicode strings, line breaks and high font sizes must not silently truncate.
- History: at least 50 valid transactions in reference workload; compare complete graph after each undo/redo. New commit clears redo branch; no-op/invalid/cancelled action does not add entry. Navigation and view settings remain non-history per DGS-05/07. Test partial gesture not persisted or exported. Ensure undo/redo do not rewind document lifecycle time or storage revision.

Test all 29 built-in types using registry-driven parameterization, not merely one rectangle and one server. For each, verify correct collection, defaults, insert, resize, render, accessible name and export. Include external asset availability after initial application assets load; do not claim full offline launch or PWA support.

## 6. Document reliability and recovery

Use unit tests for save queue with fake clocks, and integration tests for repository and transaction behavior. Validate actual IndexedDB behavior on Chrome and Edge. Cover PE-01–28, PE-39, DM-19–20, AC-05/06 and relevant FR-01/10/11/12 cases.

| Test | Procedure / required outcome |
|---|---|
| Acknowledged save | Edit, observe saved indicator, read DB and reload; same graph, no transient state, fresh history |
| Debounce and max wait | Rapid commits coalesce; sustained commits schedule within 1 s when no in-flight write; exactly one writer per coordinator |
| New edit during write | Delay first completion, edit again; older save advances revision but cannot mark latest generation saved |
| Transaction failure | Abort after first request or inject quota failure; no partial rows, previous valid snapshot retained, current valid work remains exportable |
| Retry | Edit after failure then retry; latest valid snapshot only, no stale callbacks |
| Conflict | Two same-origin pages in one browser context load same revision, coordinate write race; one wins, stale CAS fails, both graphs recoverable |
| Stale delete / resurrection | Remote edit then stale delete; remote delete then stale write/view update; no accidental recreation or orphan view |
| Navigate | Switch diagram while save pending; resolve pending write or show warning; callbacks cannot mutate new session |
| Viewport | Pan/zoom and reload; independent view record, no content revision/updatedAt/history changes |
| Corruption / upgrade | Corrupt view falls back; corrupt graph not overwritten; blocked DB upgrade guides user; no automatic delete/reset |
| JSON copy | Import remaps IDs, existing docs untouched; failed/cancelled import no writes |

Notifications are hints only; disable them and prove CAS still protects data. Where true browser quota exhaustion is impractical, execute controlled real transaction abort and injected quota error separately and label the distinction. Test clean storage, storage unavailable and storage full/denied paths. Never claim survival of unacknowledged edits or external disk durability. Release evidence must demonstrate that JSON export from valid memory is independent of successful DB save.

## 7. Export fidelity and security

Use AC-07, AC-FR-13-* and PE-29–38, CL-18–21 as primary references. Verify structural and visual outcomes independently:

1. Build visual scene from committed snapshot. Capture canonical and visual bounds. Compare same diagram at different viewport translations/zooms: exported geometry and visual bounds unchanged, no selection, grid or chrome. Verify negative positions and all visible content with 32 world-unit default padding.
2. Parse SVG as XML; verify namespace, finite viewBox/width/height, native vector tags, correct order (background, group layers, edges/nodes/labels per DGS-07), text/marker/stroke extents and safe local references. Reject scripts, event attributes, external assets, foreignObject, embedded raster-as-SVG, untrusted markup. Test escaped text `&`, `<`, `>`, quotes and valid multilingual/emoji content.
3. Open SVG in actual target browsers and at least one independent viewer (record name/version). Inspect at 100% and enlarged; all labels/icons/statuses/arrowheads readable and no clipping. Check fonts/fallbacks and content bounds explicitly. If font portability fails, resolve before release; do not imply pixel-perfect equivalence across every SVG viewer.
4. Decode PNG and check signature, dimensions, actual output, default white background and 2× scale. Compare to rasterized reference SVG at same bounds/scale in pinned environment. Test 1× alternative only when explicitly chosen; size/area caps reject before canvas allocation. Test decode failure, null Blob, encoding timeout and resource cleanup.
5. Download in actual Chrome/Edge; verify generated filename and file contents through browser download event, not assumed disk retention. Test reserved names, long Unicode and path separator sanitization.

Visual baselines are approved synthetic captures, not auto-generated expected results on every run. Use fixed viewport (1440×900 CSS pixels), DPR 1, pinned browser build, fonts installed, animations disabled, stable fixture and settled scene. Proposed image diff triage threshold: >1% differing pixels at per-channel threshold 0.10 in normalized same-size raster triggers manual review; do not allow this threshold to excuse missing text, arrows, clipped geometry or incorrect status even below 1%. Record baseline, diff and review. Any intentional visual change must be documented and approved before replacing reference. Cross-browser/independent viewer comparisons use semantic/geometry and human inspection rather than universal pixel equality.

Known compatibility decision: DGS-05 structural schema permits some strings not representable in XML 1.0 (e.g. U+FFFE/U+FFFF; structural validators also may accept values rejected by runtime refinements). DGS-08 preserves JSON and explicitly errors on visual export. Test both runtime prohibited strings and any remaining valid JSON/non-XML strings; no silent character deletion. Before MVP release resolve canonical text compatibility by approved runtime/schema refinement or documented lossless visual approach, with parity tests and appropriate compatibility treatment. Do not silently edit v1 schema or claim all valid JSON always visually exports. This remains an open decision, not an implemented fix.

## 8. Performance and benchmark protocol

NFR-02, NFR-03 and NFR-08 quantitative gates are proposed here, to be approved before implementation baseline. Reference device: developer's representative Windows laptop (document CPU model, RAM, OS/build, GPU, browser versions, power profile, DPR, screen dimensions, free storage and installed fonts). Target class: ordinary desktop/laptop; no minimum hardware support claim. Use plugged-in machine, standard browser flags, no CPU/network throttling, no competing intensive processes, clean profile and production build on local static server. Record actual specs; do not fabricate measurements. CI runners may be useful regression signals but cannot replace dedicated reference-device runs.

Use supplied 100N/150E fixture and both starter templates as functional controls. For benchmark import and opening, reset storage between samples or create new IDs. Define cold editor open as fresh browser page, assets available locally, document already persisted, start at navigation and end when graph displayed and controls usable; no network speed promise. For other timings perform 3 warm-up runs discarded and 20 measured runs per Chrome and Edge; for cold opens do 20 independent measured runs without warm-up of that page. Calculate p95 using nearest rank (ceil(0.95*n)), record raw samples, median, p95 and maximum. For frame intervals collect during 10 scripted 3-second drag sequences at 100%, with additional 25/200% functional and timing diagnostics; repeat representative group drag, resize and pan, record per gesture type. Use requestAnimationFrame timestamps plus browser traces; do not use an idle FPS counter. All required frame types should meet PF-02 in reference run. Report visible long stalls and investigate >100 ms frames even if aggregate passes.

| ID | Metric | Proposed required threshold |
|---|---|---|
| PF-01 | Cold editor open, local reference doc | p95 ≤ 2,000 ms |
| PF-02 | Active preview frame interval | p95 ≤ 33.3 ms; median ≤16.7 ms diagnostic target |
| PF-03 | Command commit incl. validation/history, excluding save | p95 ≤ 100 ms |
| PF-04 | IndexedDB write dispatch to completed transaction | p95 ≤ 500 ms |
| PF-05 | First pending valid edit to save dispatch (idle writer) | max ≤ 1,000 ms in foreground controlled schedule |
| PF-06 | JSON import incl. validation, remap and persistence | p95 ≤ 2,000 ms |
| PF-07 | Editable JSON Blob generation | p95 ≤ 500 ms |
| PF-08 | SVG generation to Blob | p95 ≤ 2,000 ms |
| PF-09 | Default 2× PNG generation incl. rasterize/encode | p95 ≤ 5,000 ms |
| PF-10 | Retained JS heap growth after 10 repeat export/edit cycles, fixed graph and history size | ≤ 32 MiB diagnostic target where reliable measurement available |

PF-01–09 proposed release gates; PF-10 diagnostic, not a substitute for resource leak and cleanup tests. For performance measurements exclude OS download prompts, unrelated browser startup, user think time and dialog interaction; include all required computation and storage completion where defined. Use instrumented production build with marks enabled only for synthetic testing; avoid collecting real-user telemetry. PF-05 distinguish queue scheduling from write completion; timer throttling in background tabs does not imply guarantee of ≤1s save. If writer busy, measure pending dispatch after completion separately. Frame thresholds are not hard guarantees for every device. Record output PNG size, nominal RGBA memory, actual process/heap samples if available and resource cleanup. Do not equate 64 MiB buffer cap to total browser memory. Resource ceilings from DGS-05/08 apply separately: 1,000 nodes, 2,000 edges, 100 groups, 8 ancestors, 10 MiB import, PNG max 8,192 each dimension and 16,777,216 pixels. Verify rejection above caps; no responsiveness guarantee at caps.

For history, execute 50 distinct committed actions (move, style, status, edges, groups), then 50 undo and redo; no missing history or graph corruption. For memory diagnostic, warm caches, keep same graph/history depth, run 10 repeated edit/export/reopen cycles, remove Blob URLs/resources, use comparable GC conditions where tooling supports it; report measurement availability. A persistent resource leak or browser crash is a defect irrespective of diagnostic metric. Threshold revisions require evidence and explicit approval, not changing targets after a failed test without review.

## 9. Security, privacy and licensing

Mandatory NFR-04 checks: test malformed UTF-8, oversized/deep JSON, duplicate keys including escaped equivalents, forbidden keys, invalid versions/IDs/geometry; reject before mutation or unsafe allocation. Native JSON.parse alone cannot detect duplicate keys; verify chosen bounded parser in Phase 01/10. Test markup-like label strings, XML special characters, unsafe strings and malicious raw SVG inputs; ensure inert rendering, no script execution or unexpected requests. Inspect serialized SVG allowlists. Inject failures into rasterize/encode, validate cleanup and concurrency budget. Verify no diagram content in network calls, analytics, crash reports or logs by intercepting network during create, edit, import, save and export. Hosting may fetch application assets; do not assert no network activity at all. Browser storage is not encrypted or permanent backup. Test recovery guidance and origin isolation. Verify import filename never treated as path, URL or executable content.

Dependency review: lockfile and reproducible clean install; run npm audit or equivalent, record advisories, transitive paths, exploitability and mitigations; high/critical applicable vulnerabilities block release. Review licenses for pinned direct/transitive packages and bundled icon assets, notices, any optional layout dependency; retain attribution. Do not infer all dependencies are approved from React Flow licensing alone. No secrets or personal data in repository, fixtures, evidence or public artifacts. Review content-security configuration on final host where feasible; enforce safe rendering regardless of policy. Document exceptions and owner disposition; unresolved critical/high risks cannot be waived by a passing build.

## 10. Accessibility, usability and browser compatibility

Target essential keyboard access, not full accessibility certification. Proposed measurable checks: normal-size UI text contrast ≥4.5:1, large text ≥3:1, meaningful non-text controls/focus ≥3:1 against adjacent colors where applicable; verify with measured colors. User-selected diagram styles can be low contrast by choice; default registry colors and status labels must remain readable. Automated accessibility scan (e.g. axe integration subject to dependency review) on workspace, editor, dialogs and error states; no unresolved serious/critical applicable violations; manual keyboard checks for canvas functionality that scanners cannot cover. Ensure focus indicator, accessible names, modal focus trapping/restoration, no keyboard traps, visible alternatives for reserved shortcuts, keyboard insertion/selection/connection and editing, Escape cancellation, text inputs unaffected by graph delete/undo. Test actual browser shortcut conflicts. Screen reader spot check on Windows using available reader, record tool/version and limitations. Status conveyed by text, not color alone.

Compatibility matrix: current stable desktop Chrome and Edge at release on documented Windows reference machine; record exact versions, production static build, 1440×900 and 1280×720, 1024×768 compact and overlay layout checks as applicable per DGS-04; 25/100/200% editor zoom; DPR 1 and higher-DPR spot check, browser zoom 100% baseline and 125% spot check. Test direct query route reload, deep link missing document, create/edit/connect/group, persistence/CAS, file selection and downloads. Mobile and other browsers outside claimed MVP editing support; not a failure merely because unsupported browser is untested.

Pilot protocol (DGS-01 target): five representative users who have not been trained on the app; start from blank library, give neutral task card: create start, process, decision and two labeled outcomes, then export readable PNG or SVG. No step-by-step coaching. Time from task presentation to successful export; success within ten minutes unassisted with correct branching and readable output. At least four of five succeed; record anonymized participant code, time, success, friction, errors and fixes. If target missed, investigate, improve and rerun or obtain explicit owner disposition consistent with DGS-01; no synthetic test may be reported as user research. If no participants available, mark pilot unexecuted and obtain explicit disposition before release rather than claim success. Additional architecture workflow review by developer/representative IT user: ≥10 nodes, nested group and statuses, JSON roundtrip and visual export.

## 11. NFR and parent acceptance traceability

| Requirement | Verification evidence |
|---|---|
| NFR-01 | UX-01–09, UX-17, pilot task completion and interface review |
| NFR-02 | SP-08, CI-35, PE-40, DM-24, PF-01–09 |
| NFR-03 | SP-05, PE-06–22/27/39, AC-05/06, real-browser transaction checks |
| NFR-04 | DM-03/17, PE-24/25/30/32/35/37, network and dependency review |
| NFR-05 | SP-07, UX-17, CI-32, CL-25, manual keyboard/contrast checks |
| NFR-06 | SP-01/08, AC-08, PE-38, actual browser compatibility matrix |
| NFR-07 | DM-21, PE-39, architectural boundary review, dependency lock, CI |
| NFR-08 | SP-04, AC-07, CL-18–21, PE-29–36, independent viewer comparison |

| Parent gate | End-to-end procedure |
|---|---|
| AC-01 | From blank, create branching flowchart; edit yes/no labels; export PNG/SVG and inspect |
| AC-02 | Create or build architecture from template, ≥10 components, boundary/status, inspect exports |
| AC-03 | Move/resize connected nodes; delete connected node; assert endpoints and no orphan edges |
| AC-04 | Undo/redo node, edge, grouping and style changes; assert exact graph and valid relationships |
| AC-05 | Observe acknowledged save, reload actual browser, compare persisted graph and layout |
| AC-06 | Export JSON, import separately; mapping-aware equivalence; malformed import preserves original |
| AC-07 | Nested groups, labels, icons, statuses and negative coordinates; SVG/PNG full scene, no chrome |
| AC-08 | Essential keyboard, target browser matrix, approved performance metrics |

Each FR-01–15 is verified via its AC-FR cases plus relevant specialist assertions in the companion register. Preserve all source IDs even if several map to same executable case. A test must assert intended observable result, not merely click an element or confirm a function returned.

## 12. Phase quality gates and CI

| Phase | Evidence to advance |
|---|---|
| 00 | Clean install/lockfile; lint, types, test harness, static build, SP-01 |
| 01 | SP-02–08 and SP-01 evidence consolidated; high-risk choices resolved; no affected implementation on failed spike |
| 02 | Structural parity, graph validation, geometry/command unit tests; module dependency checks |
| 03 | Static editor route, viewport, selection, keyboard scope and desktop shell; no false persistence claims |
| 04 | Registry 29/29, geometry, defaults/anchor and resize tests; asset notices |
| 05 | Connect/reconnect, invalid edge, route and labels tests; stable graph IDs |
| 06 | Inspector, content-fit, styles/status tests; invalid property rejection |
| 07 | Nested groups, reparent, expansion, duplicate/delete/ungroup tests |
| 08 | 50 history operations, cancellation, editor regression suite; V0.1 earlier is dev only |
| 09 | Actual IndexedDB persistence, revision conflict, failure/backup and upgrade verification |
| 10 | JSON/template, native SVG/PNG, resource cap, download tests; feature-complete candidate, not release |
| 11 | 205 mandatory cases plus applicable conditional cases, approved NFRs, pilot disposition, security/compatibility, RC |
| 12 | Approved candidate build, production smoke and rollback; release closure and documentation |

Run targeted tests per task, then relevant phase regression before advancing. CI on pull request: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e` as configured in Phase 00; coverage script and browser dependencies defined there. Run broader target-browser suite on release candidate; all mandatory tests must pass on release-equivalent commit/build, actual environment required for browser-specific cases. If CI unavailable, capture equivalent local evidence and document limitation; do not label CI passed. Proposed coverage floors by Phase 11 for `src/core/`: lines/functions ≥85%, branches ≥80%; across application source lines ≥70%, branches ≥60%. Exclude generated files/type-only declarations by documented narrow rules; do not game coverage with blanket exclusions. Coverage is secondary to assertion quality; 100% scenario pass still required. At earlier phases ratchet or track coverage without blocking new code on incomplete unrelated modules; regressions in critical rules require tests. Use production static build for browser E2E; log commit and lockfile hash. Keep test fixtures deterministic, do not allow retries to turn a flaky test silently green; record initial failure, reproduce, fix and rerun. Mandatory skipped, flaky unresolved or blocked cases prevent release.

## 13. Defect management and release blocking

| Severity | Definition / examples | Release policy |
|---|---|---|
| S1 Critical | Data loss, silent overwrite, executable malicious import, app unusable or widespread corruption | Blocks release immediately |
| S2 High | Mandatory editing/export/save broken, wrong graph relationships, inaccessible essential workflow, severe performance failure, applicable high security risk | Blocks release |
| S3 Medium | Recoverable limitation with workaround, noncritical presentation/interaction issue | Owner-approved documented disposition only if no mandatory assertion fails |
| S4 Low | Minor cosmetic or copy issue with no functional impact | Document and prioritize |

Severity and priority independent. All failed mandatory scenarios block release regardless of severity label; no defect relabeling to bypass gates. Defect record: ID, title, severity, priority, affected phase/task/source IDs, commit/build, environment, fixture, steps, expected/actual, evidence, regression test, owner, fix commit, retest and status. Preserve first failure and rerun evidence. Mandatory assertion changes must follow change control and update dependent specifications/registers. No silent scope reduction.

## 14. Release gates and approval

| ID | Gate |
|---|---|
| RG-01 | All 205 mandatory scenarios pass; no blocked, skipped or unrun mandatory cases |
| RG-02 | Applicable conditional scenarios pass; deferred features documented |
| RG-03 | Eight technical spikes pass or approved architecture adaptation is revalidated |
| RG-04 | All NFRs including PF-01–09 verified; proposed diagnostic coverage reviewed |
| RG-05 | All 15 Must requirements; all 56 planned mandatory tasks complete by release closure (predeployment gate excludes postdeployment steps) |
| RG-06 | Zero unresolved S1/S2 release-blocking defects; remaining accepted issues documented |
| RG-07 | Actual Chrome/Edge compatibility and independent SVG/PNG fidelity evidence |
| RG-08 | Security/privacy and dependency/asset license review complete |
| RG-09 | Pilot target met or explicit documented disposition before release |
| RG-10 | Production build, deployment approval, smoke and rollback evidence |

Before deployment, verify RG-01–09 and predeployment portions of RG-05/RG-10; owner approves deployment of identified immutable candidate. After deployment, execute smoke with synthetic documents: direct route, create/open, edit/connect, save/reload, duplicate/import, export all formats, check no content network upload, inspect browser errors. Confirm HTTPS/origin and document library isolation. Complete T-12-02/03 then finalize RG-05/10 and mark V0.2 released. If smoke fails, do not declare release; roll back to compatible known build or use approved forward fix if DB migration makes rollback unsafe. Never clear user DB to roll back. Record supported origin/browser, backup guidance, version and known issues. No deployment automatically authorized by passing tests.

## 15. Evidence and Codex workflow

Register fields: `id`, `source`, `sourceFile`, `sourceLine`, `assertion`, `sourceTrace`, `relatedTaskIds`, `finalVerificationTask`, `plannedTestLevel`, `status`, `testIds`, `evidence`, `defectIds`, `commit`, `environment`, `applicabilityDecision`. Planned levels are suggested initial groupings; actual test mapping is filled by implementation. Evidence entry should capture path/reference, run ID, timestamp UTC, test command, environment, commit/build, outcome and relevant observation. One case with several required assertions requires evidence for all. Register is human/machine-readable and tracked in Git; DGS-09 task register remains implementation authority, with verification state referencing DGS-10 IDs. Avoid duplicating conflicting status values: synchronize at phase review and record exact commit. Never store private diagrams or credentials.

Example phase report:

```text
Phase / task IDs:
Branch / commit / lockfile hash:
Implementation summary:
Commands executed and exit codes:
Tests pass/fail/skip (actual counts):
Source acceptance IDs passed, failed, blocked, deferred:
Manual/browser evidence and environment:
Performance raw results / thresholds:
Defect IDs and unresolved risks:
Gate: PASS | FAIL | BLOCKED
Owner approval and next eligible phase:
```

Codex instructions: read AGENTS.md, DGS-09 task and DGS-10 test register before changes; inspect existing code and tests; implement only current tasks; add meaningful positive/negative/regression tests; run available checks; do not fabricate test outputs, suppress failing checks, weaken expected outcomes, update baselines without review or mark unexecuted tests passed. Report unavailable browsers, tools, permissions or pilot participants. Update tracker and evidence after review, stop at phase gate. Fix root causes; when spec conflict arises record decision and block affected work until approved. Use explicit human review for visual fidelity, licensing, usability and release approval. Final prompts/AGENTS.md to be packaged after DGS-11, not created here as a new planning phase.

## 16. Artifact verification, decisions and handoff

Performed during authoring: inspected source acceptance tables and inline optional cases; extracted 218 unique IDs and actual assertions into register, reconciled with DGS-09 (205 mandatory, 13 conditional); retained eight original spike assertions; checked existing example and two template JSON files with Draft 2020-12 validator plus format checking; generated benchmark and validated schema, unique IDs, direct-parent rectangle padding, valid non-self endpoints and distinct directed endpoint tuples. Benchmark fixture has 100 nodes, 150 edges, two nested groups. These are artifact checks, not actual app tests. Full registry-specific text fitting, renderer behavior, real IndexedDB, performance, visual output, browser and accessibility tests remain pending. Benchmark IDs deterministic for test use only. Production repository not initialized.

Proposed decisions introduced here: PF thresholds and measurement protocol; fixed reference browser viewport; visual triage threshold; coverage floors; defect severity rules; explicit release-gate IDs; pilot evidence/disposition workflow; source case register and synthetic benchmark. All require review and actual validation. Known XML compatibility and font portability decisions from DGS-08 remain unresolved; dependency versions/license review also pending. Do not treat this specification as release approval or modify previous files. DGS-11 is the final planned specification covering post-MVP expansion. After DGS-11, consolidate starter pack, review consistency and begin Phase 00.
