# Phase 02 verification

27 November 2026, 18:52 PHT. Worktree evaluated against Phase 01 closure commit `51fcac8b822be1c91e238091c8bcd1f06519b710`. Windows 11 x64, Node 22.14.0, npm 11.21.1, Git 2.49.0.windows.1 and Vitest 5.1.2. The Phase 02 result is uncommitted. Hosted GitHub Actions remains unrun. [Phase 01 closure](PHASE-01.md#owner-closure)

| Task | Verified result | Implementation and executable evidence |
|---|---|---|
| T-02-01 | **Pass.** Strict v1 contracts, canonical UTC and text checks, format parity and stable diagnostics. | `src/core/contracts.ts`, `src/core/validation.ts`, `tests/unit/portable-parity.test.ts` |
| T-02-02 | **Pass.** All 29 registry defaults accepted, all four supplied graphs valid, and invalid graph inputs rejected without mutation. | `src/core/{registry,graph,hierarchy}.ts`, `tests/unit/graph.test.ts` |
| T-02-03 | **Pass.** Fractional transforms, negative snap ties, bottom-up expansion, preserved world positions and atomic shrink/cycle/limit rejection. | `src/core/geometry.ts`, `tests/unit/geometry.test.ts` |
| T-02-04 | **Pass.** Typed prepare/dispatch results, immutable graph-only history, 50-step undo/redo, view independence, generation checks, no-op and failure immutability. | `src/core/{commands,immutable}.ts`, `tests/unit/commands.test.ts` |
| T-02-05 | **Pass.** Repository port, isolated temporary snapshots, revision checks, and generation-bound session write coordination. | `src/application/{document-repository,document-session}.ts`, `src/infrastructure/memory-document-repository.ts`, `tests/integration/document-session.test.ts` |

## CR-01 and fixture validation

The owner-approved policy applies to document titles, node labels, boundary titles and edge labels. The guard reports the field path and prohibited scalar, including U+FFFE and U+FFFF. Existing control and lone surrogate restrictions remain in force. Tests preserve tabs, LF, literal markup and valid supplementary scalars. Failed transactions retain the same graph, history and generation. Temporary repository and session tests verify that rejected input and a corrupt incoming record are available unchanged to the caller and existing stored content remains intact. XML escaping is a separate Phase 10 serialization requirement.

The amended Draft 2020-12 reference retains `schemaVersion: 1`. In addition to CR-01, its patterns express existing DGS-05 rules for trimmed titles, exact UUID/color token endings and real canonical UTC timestamps. Original DGS prose, schema, registry and fixtures retain their baseline hashes. Ajv validates the separate amended reference with date-time format checks. Zod validates independently. Runtime graph checks layer global ID uniqueness, hierarchy, capabilities, endpoints, directed tuples, timestamp order, rectangle containment and resource constraints over that shape. [Amended v1 reference](../../02-architecture/schemas/DGS-05_Portable_Diagram_Schema_v1_CR-01.json)

The DGS-05 example, DGS-06 Basic Flowchart and IT Architecture templates, and DGS-10 100-node/150-edge benchmark all passed both structural validators and runtime graph validation. SP-08 remains Phase 01 prototype evidence.

## Verification commands

| Command | Actual outcome |
|---|---|
| `npm install --save-dev --save-exact ajv@8.20.0 ajv-formats@3.0.1` | Exit 0. Pinned two test-only packages. npm audited 503 packages and reported zero vulnerabilities at install time. Existing ESLint retained its Ajv 6 subtree. |
| `npm run lint` and `npm run typecheck` | Exit 0. Next generated route types and TypeScript passed. |
| `npm run test` | 86/86 in eight suites, including 80 unit tests and six integration tests. |
| `npm run test:coverage` | 86/86. Core lines 96.61%, branches 87.57%, functions 100%. Whole measured source lines 93.15%, branches 85.67%, functions 92.85%. |
| `npm run build` | Exit 0. Static shell build ID `FZIxnCqhky81_gb-T0Rdk`. |
| `npm run test:e2e` | 9/9 on the static shell in 13.2 seconds. Chromium 159.0.8154.6, Chrome 158.0.8127.38, Edge 158.0.4370.45. The runner emitted the existing CLI color and http-server deprecation warnings. |

Build SHA-256 values are `f170a1f38204cd1a6088efa52864ce669d7b2c462e504ba5f8638ee9634c3af1` for `out/index.html`, `193bc1fcb1e0ac69ea10db463e6febbf5f59dbf2b865bfaacc72f950992b7280` for `out/editor/index.html`, and `f29cedf6325de5af3472a52e018bafd40503c8667602ed8640ec81dc2cc65a2e` for `package-lock.json`. The baseline audit verified 18 immutable artifacts and 76 unchanged runtime lock entries.

## Acceptance evidence and limitations

The core assertions DM-01, DM-02, DM-05–10, DM-14 and DM-21 passed. The acceptance register retains their Phase 11 consolidated verification assignment. DM-03 and DM-04 have structural and CR-01 evidence. Their remaining raw import, rendering or measured text requirements are pending. DM-15, DM-18–20, CI-01 and CI-33 have phase-local evidence. Their later command, pane, persistence, importer or browser checks remain pending. The temporary adapter intentionally acknowledges only process-local storage. Release gates remain unrun.

The core imports only Zod, typed local modules and the trusted registry data. The application owns the repository port and session capture/acknowledgement state. The temporary adapter sits in infrastructure. Preview is a disposable immutable candidate. Viewport, selection and repository revision stay outside graph history. Canonical rectangle containment accepts optional scene measurements. Actual font shaping and measured text fit remain scheduled for Phase 06, production IndexedDB and save scheduling for Phase 09, and raw-byte UTF-8, duplicate-key JSON parsing and SVG escaping for Phase 10.

**Phase 02 gate — Pass.** Schema parity, graph invariants and the atomic command foundation passed without a renderer dependency in core. Phase 03 requires separate authorization.
