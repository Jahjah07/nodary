# Nodary

A local-first visual workspace for flowcharts, IT/software architecture and structured diagrams. The current application includes the Phase 00 static library and read-only SP-01 sample.

## Start here
1. Open the `nodary` repository in your IDE/Codex workspace.
2. Read [AGENTS.md](AGENTS.md), [specification index](docs/INDEX.md), [consistency review](docs/CONSISTENCY_REVIEW.md) and [decisions](DECISIONS.md).
3. See [MASTER_INITIALIZATION.md](prompts/MASTER_INITIALIZATION.md) and [Phase 00 evidence](docs/04-development/evidence/PHASE-00.md) for the initialization scope and results.
4. After Phase 00, review evidence and authorize [Phase 01](prompts/phases/PHASE-01.md). Continue in numerical order using the matching phase prompt. Use smaller task prompts where needed, especially for prototypes.

## Stack and setup

Use Node.js 22 LTS (22.12 or later in the 22.x line) and npm 11.21.1. [package.json](package.json) lists the exact direct versions, [package-lock.json](package-lock.json) pins the full tree, and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) records package licenses. React Flow is a candidate pending Phase 01 spikes.
```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:e2e
```
Install Google Chrome and Microsoft Edge to run all browser projects. On a clean Linux CI runner, use `npx playwright install --with-deps chromium chrome msedge`. Run `npm start` after building to serve `out/` on `http://127.0.0.1:4173`. Playwright starts that same server itself, so leave port 4173 free before running E2E. Open `/editor/?id=fixture` to exercise SP-01 directly.

Production target is static HTTPS hosting. Vendor choice and terms review are deferred to the deployment phase. Browser data is origin-specific and should be backed up independently once persistence is implemented.

## Project structure
```text
nodary/
├── src/app/               # Static library and editor routes
├── src/prototypes/sp-01/  # Read-only synthetic sample and renderer mount
├── docs/                  # 11 DGS specs, schema, registry, registers, review
├── tests/fixtures/        # 4 portable JSON example/template/benchmark files
├── prompts/               # master initialization + 13 phase prompts
├── AGENTS.md
├── README.md
├── IMPLEMENTATION_TRACKER.md
├── DECISIONS.md
└── CHANGELOG.md
```
Source paths retain full original filenames to preserve source references. The original 20 files' SHA-256 hashes and byte sizes are in [docs/BASELINE_MANIFEST.json](docs/BASELINE_MANIFEST.json). Phase 00 checked them before updating the working registers. To verify initial copies in PowerShell from the repo root:
```powershell
$m = Get-Content docs/BASELINE_MANIFEST.json -Raw | ConvertFrom-Json
$m.files | ForEach-Object {
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.path).Hash.ToLowerInvariant()
  if ($hash -ne $_.sha256) { throw "Baseline mismatch: $($_.path)" }
}
```
The two working registers change as evidence is recorded. The manifest continues to describe the initial copies.

## Progress and execution
- 11/11 specs drafted, 56 tasks planned across 13 phases, 218 scenarios (205 mandatory), 8 spikes, 28 deferred future features.
- See the [tracker](IMPLEMENTATION_TRACKER.md) for Phase 00 verification and remaining work.
- Current target V0.2, 29 components, 2 starter templates, local documents, JSON/PNG/SVG exports. No AI/cloud/collaboration in MVP.
- The 19–30 focused-day estimate is provisional; not a delivery promise.

Machine registers: [tasks](docs/04-development/registers/DGS-09_Implementation_Task_Register_v0.1.json), [acceptance](docs/04-development/registers/DGS-10_Acceptance_Test_Register_v0.1.json), [future](docs/05-roadmap/registers/DGS-11_Future_Feature_Register_v0.1.json). Review clarifications and technical decisions before their associated gates. No name/trademark/domain clearance has been performed.
