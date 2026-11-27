# Third-party notices

DGS-03 §4.3 and DGS-09 T-00-02. Versions and source repositories were checked against the installed package manifests. Paths in the last column are relative to each package directory under `node_modules/` unless indicated.

| Package | Version | License | Source | Notice path |
|---|---|---|---|---|
| @xyflow/react | 13.0.3 | MIT | [xyflow](https://github.com/xyflow/xyflow) | `LICENSE` |
| dexie | 4.4.7 | Apache-2.0 | [Dexie](https://github.com/dexie/Dexie.js) | `LICENSE`, `NOTICE` |
| lucide-react | 1.82.0 | ISC, with MIT for listed Feather-derived icons | [Lucide](https://github.com/lucide-icons/lucide) | `LICENSE`, including Feather terms |
| next | 16.4.6 | MIT | [Next.js](https://github.com/vercel/next.js) | `license.md`, plus individual notices in `dist/compiled/` |
| react, react-dom | 19.3.0 each | MIT | [React](https://github.com/facebook/react) | `LICENSE` in each package |
| zod | 4.6.7 | MIT | [Zod](https://github.com/colinhacks/zod) | `LICENSE` |
| zustand | 5.1.0 | MIT | [Zustand](https://github.com/pmndrs/zustand) | `LICENSE` |
| @playwright/test | 1.65.1 | Apache-2.0 | [Playwright](https://github.com/microsoft/playwright) | `LICENSE`, `NOTICE` |
| @tailwindcss/postcss, tailwindcss | 4.3.3 each | MIT | [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | `LICENSE` in each package |
| @testing-library/dom | 10.4.2 | MIT | [DOM Testing Library](https://github.com/testing-library/dom-testing-library) | `LICENSE` |
| @testing-library/react | 16.3.3 | MIT | [React Testing Library](https://github.com/testing-library/react-testing-library) | `LICENSE` |
| @types/node, @types/react, @types/react-dom | 22.20.7, 19.3.3, 19.3.0 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | `LICENSE` in each package |
| @vitest/coverage-v8 | 5.1.2 | MIT | [Vitest](https://github.com/vitest-dev/vitest) | `LICENSE` |
| eslint | 9.39.5 | MIT | [ESLint](https://github.com/eslint/eslint) | `LICENSE` |
| eslint-config-next | 16.4.6 | MIT | [Next.js v16.4.6](https://github.com/vercel/next.js/tree/v16.4.6) | Upstream `license.md` at the release tag |
| fake-indexeddb | 6.2.8 | Apache-2.0 | [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) | `LICENSE` |
| http-server | 14.1.1 | MIT | [http-server](https://github.com/http-party/http-server) | `LICENSE` |
| jsdom | 27.4.0 | MIT | [jsdom](https://github.com/jsdom/jsdom) | `LICENSE.txt` |
| typescript | 5.9.3 | Apache-2.0 | [TypeScript](https://github.com/microsoft/TypeScript) | `LICENSE.txt`, `ThirdPartyNoticeText.txt` |
| vitest | 5.1.2 | MIT | [Vitest](https://github.com/vitest-dev/vitest) | `LICENSE.md` |

Phase 02 added Ajv 8.20.0 and ajv-formats 3.0.1 as test-only dependencies for Draft 2020-12 parity and date-time format checks. Both installed packages include MIT terms in `LICENSE`. [Ajv](https://github.com/ajv-validator/ajv) · [ajv-formats](https://github.com/ajv-validator/ajv-formats)

The lockfile review included platform-specific optional dependencies. Runtime-tree exceptions include Sharp/libvips platform binaries with LGPL terms, `caniuse-lite` under CC-BY-4.0, `d3-ease` and `source-map-js` under BSD-3-Clause, and `tslib` under 0BSD. The development-only `union` package omits license metadata in the lockfile and includes MIT terms in `node_modules/union/LICENSE`. Several runtime-tree packages also omit standalone license files, including `@next/env`, the Windows SWC package, `client-only`, and `react-compiler-runtime`. Resolve upstream notice provenance and audit the actual distributed files before release.

Retain each applicable copyright and permission notice with distributed copies. Preserve Dexie’s `NOTICE` if shipped, and use Lucide’s installed `LICENSE` for any bundled or copied icon vectors, including Feather attribution where applicable. SP-01 uses system fonts and installs Lucide for later use. It contains no copied React Flow Pro examples or bundled font files. The bootstrap review covers package metadata and available local notices. Release distribution and platform-specific obligations remain subject to review.

## Phase 04 diagram vectors

The 14 registry keys below were copied from the corresponding `dist/esm/icons/<key>.mjs` entries in the lockfile-pinned `lucide-react` 1.82.0 package. The local array stores geometry and removes React reconciliation keys. The original ISC and Feather MIT notices are byte-identical to the package license and shipped in the static build as `LUCIDE-LICENSE.txt`. [Bundled license](public/LUCIDE-LICENSE.txt)

| Applicable terms in the installed release | Icon keys |
|---|---|
| Lucide ISC and listed Feather MIT attribution | `database`, `monitor`, `server` |
| Lucide ISC | `app-window`, `boxes`, `cable`, `cloud`, `globe`, `hard-drive`, `key-round`, `mail`, `network`, `shield`, `user-round` |

Standalone export notice handling is a Phase 10 dependency. The broader release distribution audit remains open.
