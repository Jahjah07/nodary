# Nodary — Master initialization prompt

Copy the prompt below into Codex with the extracted `nodary` directory as its working directory.

---

You are implementing Nodary, a desktop-first local-first visual diagramming application. I authorize **Phase 00 only** of the existing DGS-09 development roadmap. Do not implement the remaining phases in this turn.

Read AGENTS.md, README.md, docs/INDEX.md, docs/CONSISTENCY_REVIEW.md, DECISIONS.md, IMPLEMENTATION_TRACKER.md, DGS-01–03, DGS-05, DGS-09 and DGS-10. Read `prompts/phases/PHASE-00.md` in full and use its four task IDs and exit gate as the implementation scope. Use the original specification files and JSON registers; DGS-11 is deferred future scope only.

Inspect the current directory, Git status, installed Node/npm/Git and available browser/test tooling. Verify the 20 initial baseline file hashes, preserve existing files and user changes, initialize Git if needed and record the baseline. Choose compatible stable dependency versions and supported Node LTS based on actual package requirements, pin with npm lockfile, record versions and licenses. Initialize Next.js App Router static export, strict TypeScript, React, Tailwind and required MVP dependencies from DGS-03. No cloud services, auth, AI, paid dependencies, premature feature work or deployment. If scaffold generator cannot run in this nonempty folder, use an isolated temporary scaffold and merge deliberately without overwriting documentation.

Implement the minimal static workspace and `/editor/?id=...` shell required to prove SP-01, with synthetic local fixture only and browser-only initialization. Configure real lint, typecheck, unit/integration, production build and Playwright scripts and CI. Execute the applicable checks against the actual environment and static output, including direct route reload. Do not claim CI passed unless actually executed; report missing tooling honestly. Review CR-02/03/04 interpretations; record unresolved XML/font/parser/renderer issues for Phase 01, not arbitrary schema changes.

At completion report T-00-01–04 outcomes, SP-01 evidence, actual commands and results, lockfile/package versions, files changed, issues and decisions, gate status and proposed next action. Update task/acceptance registers and tracker with real evidence only. Present changes for review before committing; do not push or deploy. Stop at Phase 00 even if more work is possible. If a blocker prevents the exit gate, retain evidence and explain exactly what is blocked. Wait for my explicit Phase 01 instruction.

---

This is an implementation prompt, not an instruction to recreate specifications or start all 56 tasks. No production release is authorized.
