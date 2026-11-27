# Phase 00 verification

27 November 2026, 17:33–17:34 PHT. Windows 11 Home Single Language x64, Node 22.14.0, npm 11.21.1, Git 2.49.0.windows.1. Verified uncommitted Phase 00 sources copied into an isolated local runner from workspace HEAD `c4e2dc2d195972f8706ba6bf5b6f05e9a45eb34e`.

## T-00-01 · Repository and specification baseline

Verified all 20 initial artifact paths, byte counts and SHA-256 hashes against `docs/BASELINE_MANIFEST.json` before editing the working registers. The repository already had a Create Next App commit. The specification pack was present in the working tree and will need owner review before it is committed. Git had no configured remote. The sample uses synthetic data.

## T-00-02 and T-00-03 · Toolchain and local CI baseline

The isolated runner started without `node_modules/`, build output or a populated download cache. Commands ran with `CI=true` and `NEXT_TELEMETRY_DISABLED=1` for verification. The packaged workflow provisions the same Node major and npm version on Ubuntu 24.04. Hosted GitHub Actions execution remains pending. DGS-10 §12 allows equivalent local evidence when hosted CI is unavailable.

| Check | Result |
|---|---|
| `npm ci` with an empty temporary cache | Exit 0. Installed 496 packages, audited 497, and reported 0 vulnerabilities at install time. Strict engine and peer checks enabled. A second install in the workspace also passed. |
| `npm run lint` | Exit 0, no warnings. |
| `npm run typecheck` | Exit 0. Generated Next.js route types, then ran `tsc --noEmit`. |
| `npm run test` | Exit 0, 5/5 Vitest assertions covering the library link and missing/unrecognized IDs. |
| `npm run test:coverage` | Exit 0, 5/5 tests. V8 measured 23.52% lines, 22.22% statements, 25% functions and 50% branches across the shell sources. Browser E2E is separate from this measurement. |
| `npm run build` | Exit 0 in the isolated runner and the workspace. Next.js emitted `/`, `/editor/` and its not-found page as static routes. |
| `npx playwright install chromium` via the locked CLI | Downloaded browser revision 1255 into a temporary Playwright cache. Chrome and Edge were already installed on the host. |
| `npm run test:e2e` | Exit 0, 9/9 tests in 11.7 seconds on the production export with Playwright 1.65.1. |

Build ID `908LVIlzUhxtwpz5acAj4`. SHA-256 fingerprints:

| File | SHA-256 |
|---|---|
| `package-lock.json` | `74cca1a9a0b5651e9fa88fa04826e81d86fddad2dc42d3f3d55848d1908f7336` |
| `out/index.html` | `97e22350679f84208c638389de111420a6cca80c5c773a0408a4db4b9fc306e0` |
| `out/editor/index.html` | `9e9f3c9115408dc9d45c22d8df88e7857d4f5068cb3d43be9f04d1c35b65be58` |

## T-00-04 and SP-01 · Static library and query route

`npm start` served only `out/` on `127.0.0.1:4173`. The library linked to `/editor/?id=00000000-0000-4000-8000-000000000001`. Direct load and reload of `/editor/?id=fixture` returned HTTP 200 and displayed the read-only React Flow sample after browser initialization. With JavaScript disabled, the same URL returned the prerendered heading and loading fallback. Missing and unknown IDs showed a recovery link, and a dynamic path under `/editor/` returned 404. The successful navigation test observed zero browser errors or warnings, failed responses, or off-origin requests. No Next.js runtime server or IndexedDB was involved.

| Browser | Version | Result |
|---|---|---|
| Playwright Chromium | 159.0.8154.6 | 3/3 passed |
| Google Chrome | 158.0.8127.38 | 3/3 passed |
| Microsoft Edge | 158.0.4370.45 | 3/3 passed |

## First failures and remaining decisions

- Default sandbox registry requests failed with `EACCES`. Approved registry access resolved metadata and completed both installs. ESLint 10 resolution produced peer warnings for three Next.js lint plugins. ESLint 9.39.5 passed strict peer resolution. npm flagged that compatible ESLint line and transitive `whatwg-encoding` as deprecated. `http-server` also emitted a Node deprecation warning during E2E.
- Initial lint found an anonymous PostCSS export and flagged an internal anchor. A repeat lint also inspected generated coverage scripts. Named the PostCSS export and excluded generated test artifacts. Vitest’s initial CommonJS configuration warning was resolved by using an ESM configuration.
- A component run with Next.js `Link` dropped the trailing slash outside the Next.js runtime. The production browser run also found segment prefetch HTTP 404s on all three browsers, despite successful direct reloads. Switched the shell links to full document navigation on the plain static host. The final tests still require the trailing slash, the visible sample, and zero browser warnings and failed requests.
- The first browser run’s restricted Windows process cleanup left the test server listening, and the next invocation rejected the occupied port. Stopped the test-owned server and reran with normal process permissions. The final runs completed and released the port. A Docker daemon probe failed with access denied. Hosted CI remains unrun.
- CR-02, CR-03 and CR-04 were used as working interpretations pending owner review. CR-01 remains open for Phase 01, along with the renderer, font, parser, persistence and remaining technical spikes. The installed-package notice review is recorded in [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md). Distribution review remains open.

**Gate result — Pass on equivalent local evidence.** T-00-01 through T-00-04 and SP-01 passed their Phase 00 checks. The 218 product scenarios and release gates remain unrun. Phase 01 requires owner authorization.
