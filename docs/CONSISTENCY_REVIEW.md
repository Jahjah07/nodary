# Nodary — Consolidated specification review

**Date:** 27 November 2026 · **Baseline:** DGS-01–11 v0.1 · **Disposition:** ready for Phase 00 setup upon owner instruction; not production-ready. This review is a handover note, not DGS-12. Originals preserved byte-for-byte. Decisions below are proposed working interpretations; owner review required for substantive changes.

## Scope and consistency checks actually performed

| Check | Result |
|---|---|
| Source artifact inventory and SHA-256 copy equality | 11 Markdown + 9 JSON, all 20 copied unchanged |
| JSON Schema | Draft 2020-12 meta-schema validation passed; timestamp format checking enabled for fixtures |
| Registry | 29 unique component identifiers exactly match schema node enum + boundary; default style validation and min/default geometry checks passed |
| Fixtures | All four passed structural schema validation and basic domain checks (unique IDs, known parents, acyclic ancestry ≤8, baseline 16/36 containment padding, registry minimums, circle ratio, status eligibility, valid handles, no duplicate directed tuples or self-loops, world origin bounds) |
| Roadmap | 13 ordered phases; 56 unique tasks; phase membership exact; dependencies exist and form DAG |
| Acceptance | 218 unique cases, same inventory as DGS-09, 205 mandatory and 13 conditional; related/final task refs resolve; source line contains case ID |
| Spikes and gates | Eight matching spike IDs, ten performance metrics, ten release gates |
| Future | 28 unique deferred entries; dependency refs resolve and graph acyclic |
| Estimate | Phase estimate sums 19–30 focused working days, excluding extended remediation/external review |
| Status | All 56 tasks not_started; all 218 acceptance cases not_run; all future items deferred |

Fixture counts:

| Source file | Nodes | Edges | Groups |
|---|---:|---:|---:|
| DGS-05_Example_Architecture_v1.json | 10 | 9 | 3 |
| DGS-06_Template_Basic_Flowchart_v1.json | 6 | 6 | 0 |
| DGS-06_Template_IT_Architecture_v1.json | 10 | 10 | 3 |
| DGS-10_Reference_Benchmark_100N_150E_v1.json | 100 | 150 | 2 |

These are limited artifact-level checks, not executable product tests. Text measurement, stroke/visual containment, connector routing, rendering, parser security, complete geometry invariants, browser behaviour, Zod parity, dependency versions and licenses are not verified. Source-line check confirms ID location, not a formal proof of all scenario assertions. No application repository, build or runtime tests were created here.

## Baseline reconciliation and action register

| ID | Location and issue | Recommended working interpretation / exact proposed change | Owner / gate |
|---|---|---|---|
| CR-01 | DGS-05 §9 text policy and portable schema string fields; DGS-08 §9 SVG rules and final limitations; DGS-09 T-01-08; DGS-10 compatibility note. XML 1.0 rejects U+FFFE/U+FFFF even if structurally valid JSON. Existing canonical text policy already rejects C0/C1 (except tab/LF), unpaired surrogates and CR. | At T-01-08 approve an explicit additional canonical restriction for XML-invalid scalars, including U+FFFE/U+FFFF. Preserve literal markup as inert text; preserve original import file and legacy record on error. No silent stripping, replacement or lossy normalization. Add parity fixtures and update DGS-05, schema reference if needed, registry-independent domain checks and acceptance evidence together under change control. Until approved, apply DGS-08 clear visual export failure and preserve JSON; do not declare mandatory SVG gate passed on incompatible accepted documents. | Open; resolve by end Phase 01 before schema implementation; T-02-01/T-06-02/T-10-03 verify. |
| CR-02 | DGS-09 task verification fields T-03-04/T-04-03/T-04-04 omit UX-05; DGS-10 case UX-05 explicitly supplies these candidate links. | Use DGS-10 `relatedTaskIds` as supplementary verification mapping now. T-03-04 selection, T-04-03 insertion, T-04-04 resize; T-11-01 final full assertion. Proposed future edit: append `UX-05` to each of those task verification strings in revised DGS-09 and register, retaining all other IDs. No new task/scenario. | Working interpretation; owner review Phase 00; no original edit. |
| CR-03 | DGS-01 §11 pilot target; DGS-10 RG-04 and RG-09 wording ("Pilot target met or explicit documented disposition before release"). | For V0.2 use 4/5 representative users within 10 minutes without assistance as the default gate. Proposed RG-09 replacement: "Pilot target met with recorded evidence; any formal requirement change must update NFR-01/affected criteria and be approved and revalidated." A disposition alone never passes a missed mandatory target. | Conservative interpretation; confirm Phase 00; verify T-11-04. |
| CR-04 | DGS-09 Phase 11 exit gate says all mandatory DGS-10 release gates pass, while Phase 12 produces deployment/smoke/closure evidence. DGS-10 §14 explicitly splits predeployment and closure. | Use DGS-10 sequencing: Phase 11 meets applicable predeployment gates; Phase 12 completes deployment approval, smoke/rollback and RG-05/RG-10 closure. No circular requirement to deploy before Phase 12, no release declaration before closure. Proposed wording replacement in DGS-09 Phase 11 gate: "All applicable predeployment gates pass; postdeployment evidence remains pending until Phase 12." | Working interpretation; confirm Phase 00. |
| CR-05 | DGS-01 §10 includes basic styling in V0.1; DGS-09 M2 after Phase 05 precedes full inspector/style implementation in Phase 06. | M2 is an internal development demonstration, not stable or public release. Default rendering/styles and labels may exist there; full style editing is Phase 06. If owner wants the earlier V0.1 product label to require basic user styling, apply label after the applicable Phase 06 tasks; do not reorder tasks silently. | Milestone naming only; review at M2. |

## Shared baseline to protect

- FR-01–15 Must; FR-16–18 Should; FR-19 Could. Stretch items and all FF-01–28 deferred unless explicitly approved. V0.2 has no server, auth, cloud, AI, collaboration, billing, freehand or mobile editing. V0.1 internal milestone only.
- DGS-03: Next.js static export, `/` and `/editor/?id=<uuid>` (not dynamic build-time ID segments), controlled React Flow conditional on spikes, framework-independent canonical model, Zustand session, Zod strict runtime validation, Dexie transactional storage, trusted local Lucide vectors.
- DGS-05/06: schema version 1, flat `nodes`, `edges`, `groups`, explicit parent-relative geometry, UUIDs, four cardinal anchors for connectable components, 28 nodes plus one boundary, no annotation/boundary endpoints. 1,000 nodes / 2,000 edges / 100 boundaries, eight group ancestors; 10 MiB JSON and 32 nesting depth. Defensive limits not performance promises.
- DGS-07: one valid transaction per committed edit; at least 50 history entries; no transient state persistence; 25–200% zoom; separate grid/snap, 20-unit grid; explicit membership; sibling grouping; preserve children on frame deletion, expand ancestors without moving unrelated children.
- DGS-08: 750 ms save debounce, 1,000 ms idle max-wait, 500 ms viewport debounce; compare expected revision inside transaction; no resurrecting deleted docs; last committed graph remains recoverable in memory for backup. Full-scene white visual export with 32-unit padding; 2× PNG, explicit 1× alternative, 8192 side and 16,777,216 pixel caps; native SVG; local JSON backup independent of save.
- DGS-10: 100 nodes/150 edges reference workload; 205 mandatory cases and all applicable conditional cases; eight NFRs; Chrome/Edge real browsers; performance and coverage targets proposed, verify before release. No skipped or unexecuted mandatory case treated as passed.

## Approval and next action

The owner approved CR-01 on 27 November 2026. Its approved scope includes all four canonical free-text fields, a field/code point diagnostic, preservation of source bytes and stored records, and atomic rejection of invalid edits. Valid supplementary characters remain valid. XML escaping remains a separate serialization requirement. Apply the amendment in Phase 02 with a separately tracked v1 reference schema and parity evidence. [Decision register](../DECISIONS.md)

Owner may authorize Phase 00 without resolving runtime spikes first. Phase 00 records review and any requested edits. CR-01 and architecture/font/parser/license/performance decisions must be resolved or explicitly block dependent work at Phase 01. The original specification files and registers were not edited. No legal name/domain clearance or commercial hosting review performed. Do not add a new broad planning phase.
