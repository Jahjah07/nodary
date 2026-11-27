# DGS-02 — MVP Scope & Functional Requirements

| Document control | Details |
|---|---|
| Project | Diagramming System |
| Document ID | DGS-02 |
| Version | 0.1 |
| Status | Draft — pending review |
| Date | 26 November 2026 |
| Parent specification | DGS-01 — Product Requirements Document v0.1 |
| Target release | V0.2 — Minimum Viable Product (MVP) |
| Owner | Product / Development |
| Audience | Product owner, developer, QA and implementation agents |

## 1. Purpose and authority

This specification expands the 19 functional requirements in DGS-01 into observable application behavior, validation rules, failure handling and acceptance criteria. It preserves the parent requirement IDs and priorities (15 Must, 3 Should, 1 Could). It also defines release boundaries and traceability to DGS-01 acceptance criteria. All requirements are proposed, not implemented or verified.

The document defines what the application does, not the final implementation library, data schema or pixel-level interface. If a later specialist specification conflicts with DGS-01 or DGS-02, record and resolve the conflict before implementation; do not silently reinterpret scope. A Must requirement cannot be demoted by an implementation agent without an approved scope change.

Terminology: **document** is one editable diagram; **node** is a visual object; **edge** is a connection between nodes; **boundary** is a logical container of nodes or nested boundaries; **viewport** is the current view of the canvas; **semantic type** describes the role of a shape; **transaction** is one completed logical editing operation. “Must” denotes a release gate, “Should” a stretch feature, and “Could” an optional enhancement. Numbered AC-FR identifiers are feature-level acceptance tests; AC-01 through AC-08 refer to the parent PRD release gates.

## 2. Scope and release boundaries

The MVP is a single-user, desktop-first web application with one structured node-and-edge editor. No account or paid service is required for the primary workflow. Supported categories are process flowcharts, IT/software architecture and basic general visual mapping; categories set initial defaults, not incompatible document formats. Users may mix shapes from different categories in one diagram.

| Capability | V0.1 working editor | V0.2 MVP |
|---|---|---|
| Canvas, basic nodes, connectors, basic styling | Required | Required |
| Document library, grouping, status, history, local persistence | Deferred to next milestone | Required |
| JSON, PNG, SVG, templates, validation and release testing | Deferred to next milestone | Required |
| Mini-map, alignment/distribution, extra presets, auto layout, extra templates | Deferred | Stretch only |
| Additional metadata, search, reusable custom styles | Deferred | Optional |

Out of scope: mandatory accounts, backend/cloud synchronization, real-time collaboration, billing, AI generation, document-to-diagram conversion, freehand drawing, mobile editing, formal BPMN/UML/ERD compliance, third-party integration execution and advanced enterprise permissions. A diagram can depict an integration; it does not execute that integration. There is no requirement to support Mermaid, Visio or draw.io file import in this release.

## 3. Actors and workspace

There is one actor: the local editor user. No roles, permissions, sign-in or shared sessions are required. The workspace comprises a document library, a canvas editor, shape library, editing toolbar, contextual properties panel and file/export controls. The exact layout is reserved for DGS-04.

Primary journey: open app → create blank or template → add components → connect and format → group and assign statuses if applicable → autosave → reopen or export. Users must be able to complete the journey without accounts. When there are no documents, show an empty state with a create action. When no object is selected, show document/canvas settings or a helpful empty properties state. When multiple objects are selected, show only shared applicable controls; distinguish mixed values and avoid unintended overwrites.

## 4. Functional requirement register

| ID | Requirement | Priority | Detail section |
|---|---|---|---|
| FR-01 | Diagram document management | Must | 5.1 |
| FR-02 | Canvas navigation | Must | 5.2 |
| FR-03 | Node manipulation and selection | Must | 5.3 |
| FR-04 | Shape and IT component library | Must | 5.4 |
| FR-05 | Text and visual properties | Must | 5.5 |
| FR-06 | Node connection system | Must | 5.6 |
| FR-07 | Connector styles, labels and reconnection | Must | 5.7 |
| FR-08 | Grouping and system boundaries | Must | 5.8 |
| FR-09 | Component status indicators | Must | 5.9 |
| FR-10 | Undo and redo | Must | 5.10 |
| FR-11 | Local storage and autosave | Must | 5.11 |
| FR-12 | Versioned JSON import/export | Must | 5.12 |
| FR-13 | PNG and SVG export | Must | 5.13 |
| FR-14 | Grid and keyboard shortcuts | Must | 5.14 |
| FR-15 | Starter templates | Must | 5.15 |
| FR-16 | Mini-map, alignment/distribution, extra presets | Should | 5.16 |
| FR-17 | Automatic arrangement | Should | 5.17 |
| FR-18 | Additional templates | Should | 5.18 |
| FR-19 | Extra metadata, search, reusable styles | Could | 5.19 |

## 5. Detailed functional requirements

### 5.1 FR-01 — Diagram document management (Must)

**User story:** As a user, I want to create and manage independent diagrams so that I can maintain multiple projects without overwriting existing work.

- FR-01.01: List locally saved diagrams with title, category and last-modified date; default to newest modified first.
- FR-01.02: Create an independent blank diagram with a stable unique ID and an initial title such as “Untitled diagram”. Allow choosing a category or a general blank canvas.
- FR-01.03: Open an existing document and restore its graph, styles, settings and saved viewport where supported. Changing documents must not cross-contaminate state or undo history.
- FR-01.04: Rename a document; reject empty/whitespace-only titles, trim outer whitespace and provide an inline validation message. Duplicate titles are permitted because IDs, not names, establish identity.
- FR-01.05: Duplicate a document as an independent copy with a new document ID and fresh internal identifiers with references remapped; append “(copy)” to the title. Editing the copy cannot mutate the original.
- FR-01.06: Confirm destructive document deletion. Cancel leaves the document unchanged. Successful deletion removes it from the library and returns an open editor to the library. Document deletion is not part of editor undo history.
- FR-01.07: On navigation away, flush pending saves or warn and let the user stay, retry, or knowingly discard unsaved changes. A storage failure must not show a successful create/delete/rename state.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-01-01 | Given an empty library, create two diagrams; both appear and open independently. |
| AC-FR-01-02 | Rename to a valid title, reload and confirm persistence; reject blank titles without losing the previous title. |
| AC-FR-01-03 | Duplicate a connected, grouped diagram, edit the copy and verify original graph and styling are unchanged. |
| AC-FR-01-04 | Cancel deletion then confirm it; verify the document survives cancellation and is absent after confirmed deletion and reload. |
| AC-FR-01-05 | Simulate a failed save during document switching; verify a warning and preservation of the in-memory edits. |

### 5.2 FR-02 — Canvas navigation (Must)

**User story:** As a user, I want to move around a large workspace without losing track of my diagram.

- FR-02.01: Provide an infinite-style canvas supporting positive and negative world coordinates; pan independently of document geometry.
- FR-02.02: Zoom in/out using visible controls and supported pointer gestures; maintain a coherent focal point and display current zoom.
- FR-02.03: Provide fit-to-view for the complete visible document, including boundaries and edges; provide a reset-to-100% control. Empty diagrams must have a safe default view.
- FR-02.04: Convert pointer/drop coordinates consistently between screen and world coordinates at any supported zoom and pan position.
- FR-02.05: Navigation does not move nodes, alter graph relationships or create undo history entries. Window resizing must not change world positions.
- FR-02.06: Proposed supported zoom range: 25%–200%; clamp zoom and allow fitting large diagrams as far as the range permits. Exact viewport behavior belongs to DGS-07.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-02-01 | Pan and zoom a populated canvas; verify node coordinates and graph remain unchanged. |
| AC-FR-02-02 | Drop the same component at a target under two viewport transforms; placement matches the pointer in world space. |
| AC-FR-02-03 | Fit a diagram spanning negative and positive coordinates; all bounds are visible when achievable within the supported zoom range. Fit on an empty canvas must not fail. |

### 5.3 FR-03 — Node manipulation and selection (Must)

**User story:** As a user, I want to arrange and revise diagram components without breaking their relationships.

- FR-03.01: Add a component by dragging it from the library or using an accessible insert action; assign unique identity, valid default dimensions and label. Click insertion uses a visible available canvas location.
- FR-03.02: Select a single node, select multiple nodes via modifier-click or marquee, and clear selection by clicking empty space or pressing Escape. Selection itself does not mutate document content.
- FR-03.03: Move selected nodes individually or together; preserve relative offsets during multi-drag, except intentional snapping of the selection anchor. Connected edges update with node movement.
- FR-03.04: Resize a single resizable component with visible handles; dimensions must remain finite and positive and respect type-specific minimums. Text remains readable or wraps; no silent clipping. Group rules are specified separately.
- FR-03.05: Duplicate selected nodes with fresh IDs and a visible offset. Duplicate edges whose two endpoints are within the duplicated selection and remap their references; do not duplicate edges to unselected nodes. Duplicating a selected group includes its descendants.
- FR-03.06: Delete selected nodes and all incident edges atomically; remove stale selection and membership references. Mixed selection cannot apply the same operation twice to a descendant of a selected group.
- FR-03.07: Overlap is allowed for manual arrangement. Do not introduce automatic collision avoidance in the MVP. Invalid movement or resizing must not leave partial document changes.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-03-01 | Insert, select, drag and resize a node; verify identity and connected endpoints are preserved. |
| AC-FR-03-02 | Select two connected nodes, move them together, and verify their relative layout and edge. |
| AC-FR-03-03 | Duplicate two connected nodes where one also connects outside the selection; verify only their internal edge is copied. |
| AC-FR-03-04 | Delete a connected node and confirm no orphaned edges or group memberships remain. Undo restores the graph. |

### 5.4 FR-04 — Shape and component library (Must)

**User story:** As a user, I want meaningful, recognizable shapes for both business and technical diagrams.

| Category | Proposed minimum initial inventory |
|---|---|
| Flowchart | Start/end, process, decision, input/output, document, data store, subprocess, on-page connector |
| IT architecture | User, device, website/application, server, database, cloud, network, security/firewall, identity/access, email, storage, API, integration |
| General | Rectangle, rounded rectangle, circle/ellipse, diamond, text, note, boundary/group |

- FR-04.01: Provide a categorized visible shape library with names and recognizable previews. Search is optional under FR-19, not a Must requirement.
- FR-04.02: Every component has a stable semantic type, default geometry, editable label, accessible name and supported connection handles where meaningful. Text and notes may be unconnected annotations.
- FR-04.03: Shared visual primitives may implement several semantic types. Do not conflate a process with a server solely because both render as rectangles.
- FR-04.04: Built-in components must be available without a third-party image request when editing. Use generic icons initially; provider-specific cloud/vendor packs are deferred and subject to licensing review.
- FR-04.05: Provide a consistent default visual style and allow components from all categories within one diagram. Exact inventory, geometry and icon rules are finalized in DGS-06.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-04-01 | Insert at least one of every mandatory component type; verify labels, selection and supported handles. |
| AC-FR-04-02 | Use a process, decision, server and database in one document; save/reopen and verify types are preserved. |
| AC-FR-04-03 | Open the loaded editor with network disconnected and verify built-in components remain available without remote assets. |

### 5.5 FR-05 — Text and visual properties (Must)

- FR-05.01: Edit labels through direct editing and/or a properties panel. Commit via explicit confirmation or appropriate focus transition; Escape cancels the active edit. Multiline labels are supported.
- FR-05.02: For applicable components, edit fill color, border color, font size and text alignment. Proposed additional basic controls: text color, border width and solid/dashed border. Unsupported properties are hidden or disabled for a given type.
- FR-05.03: Validate colors, finite dimensions and bounded numeric values. Invalid input shows feedback and does not mutate the last valid property. Proposed font range 8–72 px and border width 0–8 px; finalize visual constraints in DGS-04/DGS-06.
- FR-05.04: Apply shared compatible styles to multi-selection only when explicitly requested. Preserve semantic type, position and relationships when changing style.
- FR-05.05: Treat labels as plain text, never executable HTML or scripts. Preserve line breaks and Unicode; wrap or resize visibly rather than silently truncating text. The exported diagram must use the same supported style semantics.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-05-01 | Edit a multiline label, change fill/border/font/alignment, save and reopen; verify values survive. |
| AC-FR-05-02 | Enter invalid numeric and color values; verify validation and preservation of previous state. |
| AC-FR-05-03 | Enter text resembling HTML or a script; verify it renders as inert text in the editor and export. |
| AC-FR-05-04 | Apply a shared fill to multiple compatible shapes; verify unselected shapes are unchanged and undo reverses the operation. |

### 5.6 FR-06 — Node connection system (Must)

- FR-06.01: Connect eligible nodes by dragging from a connection handle to a valid target handle. Show a temporary preview and indicate valid/invalid targets.
- FR-06.02: Persist source and target node IDs and handle references; endpoint positions are derived from node geometry, not fixed viewport coordinates.
- FR-06.03: Allow multiple incoming and outgoing edges, branching and cycles. Proposed MVP rule: reject self-loops and exact duplicate directed endpoint/handle pairs; permit distinct handle pairs and reverse-direction edges. No formal process or network semantic validator is required.
- FR-06.04: Releasing a connection on empty space or an invalid endpoint cancels the operation without creating a dangling edge. Escape also cancels an in-progress connection.
- FR-06.05: Selecting and deleting an edge removes only that edge. Node movement, resize, grouping and style edits must preserve valid endpoint attachments.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-06-01 | Connect three nodes with two branches; move and resize them, and verify all endpoints stay attached. |
| AC-FR-06-02 | Attempt a self-loop, exact duplicate and invalid target; no invalid edge or history entry is created. |
| AC-FR-06-03 | Create a cycle using distinct nodes; verify valid graph relationships survive save/reopen. |
| AC-FR-06-04 | Delete one edge from a branched graph; other edges and nodes remain unchanged. |

### 5.7 FR-07 — Connector styles, labels and reconnection (Must)

- FR-07.01: Provide straight and orthogonal (right-angle) connectors. Basic orthogonal routing is required; global obstacle avoidance, manually editable waypoints and edge-crossing optimization are not required.
- FR-07.02: Allow no arrowhead, forward arrowhead and bidirectional arrowheads. Arrowhead appearance is distinct from stored endpoint identity. Provide edge label, color, width and solid/dashed style controls as applicable.
- FR-07.03: Place labels at a stable readable position on the rendered path; allow label edits such as Yes/No, HTTPS or data flow. Preserve label and style when routing changes.
- FR-07.04: Reconnect an existing source or target endpoint using its handle. Validate before committing; cancel or invalid drop restores the original edge unchanged.
- FR-07.05: Ensure connector paths, arrowheads and label bounds are included in fit-to-view and exports. Automatic collision avoidance is deferred; users may reposition nodes or choose another handle manually.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-07-01 | Switch a labeled edge between straight and orthogonal routes; verify style, label and endpoint identity. |
| AC-FR-07-02 | Reconnect an edge successfully and then attempt an invalid reconnection; verify the last valid edge is retained. |
| AC-FR-07-03 | Export edges with different arrowhead styles, labels and dashed lines; verify visible fidelity. |

### 5.8 FR-08 — Grouping and system boundaries (Must)

- FR-08.01: Create an empty titled boundary or group selected nodes. Boundaries have editable titles, visual style and geometry and render behind their descendants.
- FR-08.02: Store explicit parent membership. Moving a boundary moves its descendants exactly once; moving a child changes its position relative to its parent. Edges may connect nodes across boundaries.
- FR-08.03: Support one parent per node/group and nested boundaries (at least two boundary levels). Reject self-parenting and cyclic containment. Selection and duplication of a parent must not double-transform descendants.
- FR-08.04: Provide explicit add-to-group and remove-from-group/ungroup actions. Dropping a node over a boundary does not automatically change membership in the initial implementation. Reparenting preserves absolute visual position.
- FR-08.05: Boundary resizing does not scale children. Reject shrinking below the contained content bounds or expand to the minimum valid bounds with feedback. Moving a child beyond the boundary requires the boundary to expand or the user to remove membership; proposed default is automatic expansion, never silent detachment.
- FR-08.06: Ungroup removes the boundary and reparents direct children to its parent or canvas while preserving positions and relationships. Normal boundary deletion preserves children (same as ungroup); recursive deletion of contained content is deferred. Edges are attached to eligible child nodes, not boundary frames in the MVP.
- FR-08.07: Grouping, ungrouping, reparenting and boundary movement are atomic undoable transactions. Export preserves visible boundary titles, nesting and styles.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-08-01 | Create a titled boundary containing two nodes; move the boundary and verify each child moves once and cross-boundary edges remain attached. |
| AC-FR-08-02 | Nest a boundary, attempt cyclic membership and verify rejection without document mutation. |
| AC-FR-08-03 | Reparent a node and ungroup a boundary; verify absolute position and graph relationships are unchanged. |
| AC-FR-08-04 | Shrink below child content or move a child beyond a boundary; verify the defined containment rule and no hidden children. |
| AC-FR-08-05 | Delete a boundary, then undo; verify children survive and original membership is restored. |

### 5.9 FR-09 — Component status indicators (Must)

Status is manually maintained documentation metadata, not a live infrastructure health check.

| Value | Display label | Proposed color |
|---|---|---|
| completed | Completed | Green |
| in_progress | In progress | Amber/yellow |
| pending | Pending | Red |
| not_specified | Not specified | Neutral gray (indicator may be omitted) |

- FR-09.01: Architecture nodes support the four specified statuses; default is not specified. Expose a status field on eligible node properties.
- FR-09.02: Non-default statuses show readable text as well as a color marker; status styling must not overwrite user-selected node fill or border.
- FR-09.03: Persist, duplicate, undo and export status values. Resetting to not specified removes the active status indicator. No automatic polling or inference of statuses is required.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-09-01 | Assign each status to architecture nodes, reload, duplicate and verify values and labels. |
| AC-FR-09-02 | View/export the diagram in grayscale; distinct text labels remain understandable without color. |
| AC-FR-09-03 | Reset a status and undo; verify the indicator and underlying style are restored. |

### 5.10 FR-10 — Undo and redo (Must)

- FR-10.01: Provide visible undo/redo actions and keyboard shortcuts; disabled when no corresponding history exists.
- FR-10.02: Record logical transactions for insertion, deletion, movement, resize, duplication, labels/styles, edge creation/deletion/reconnection, status and group membership. Grouped edits include dependent graph changes.
- FR-10.03: Coalesce continuous gestures (drag, resize, a committed text/style edit) into one history entry; previews and cancelled edits do not create entries.
- FR-10.04: Undo restores the last valid graph state; redo reapplies it. A new committed edit after undo clears the redo branch. Selection and navigation are not content history.
- FR-10.05: History is session-local per opened document; proposed retention of at least 50 transactions. Persist the resulting document state after undo/redo, not necessarily the history stack. Reopening or reloading starts a fresh history; document-library actions are excluded.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-10-01 | Move a node via a continuous drag; one undo restores the initial position and one redo restores final position. |
| AC-FR-10-02 | Delete a connected grouped node, undo and redo; verify all dependent edges and membership are restored/removed atomically. |
| AC-FR-10-03 | Undo an edit then commit a different edit; redo becomes unavailable. |
| AC-FR-10-04 | Undo, wait for a successful save and reload; verify the restored document state, with fresh history. |

### 5.11 FR-11 — Local storage and autosaving (Must)

- FR-11.01: Automatically persist document content and relevant editor settings in browser-managed local storage; the specific storage engine is selected in DGS-03/DGS-08. No external transmission is required.
- FR-11.02: Autosave after committed edits with a proposed debounce of up to 1 second. Display distinguishable states: unsaved changes, saving, saved locally, save failed. Saved status is shown only after a successful durable storage transaction.
- FR-11.03: Save a consistent document snapshot atomically; serialize or revision-check saves so an older asynchronous write cannot overwrite a newer successful snapshot.
- FR-11.04: Restore the last valid saved document on reload. Do not promise recovery of edits that were not successfully saved. On quota, permission or corruption errors, keep current in-memory content if available, display an actionable error and offer retry/JSON backup.
- FR-11.05: Warn that browser data clearing, private browsing, eviction or device loss may remove local diagrams. Browser-local storage is not cloud backup.
- FR-11.06: Multi-tab concurrent editing is not supported. Detect an external revision change before overwriting a saved document and prompt reload or save a separate copy; do not silently use last-write-wins. Implementation details in DGS-08.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-11-01 | Edit a diagram, wait for saved locally, reload and compare graph, styling and settings. |
| AC-FR-11-02 | Simulate a quota/write failure; verify no false saved status, last valid snapshot remains intact and backup export is available. |
| AC-FR-11-03 | Rapidly commit several edits while a write is pending; final persisted state corresponds to the latest successful revision. |
| AC-FR-11-04 | Open the same document in two tabs and commit conflicting changes; verify the stale tab cannot silently overwrite the newer revision. |

### 5.12 FR-12 — Versioned editable JSON import/export (Must)

- FR-12.01: Export the current valid editable document as JSON containing schema version, node/edge/group data, styles, statuses, document metadata and relevant settings. Export current in-memory state even if local persistence failed. Do not include session history or transient UI selections.
- FR-12.02: Import a selected JSON file, parse and validate before writing to storage or changing active state. Create a separate document with a new document ID; remap graph IDs/references consistently if regenerating them. Existing documents are not overwritten.
- FR-12.03: Validate supported schema version, required fields, unique identifiers, finite positive sizes, allowed values, resolvable endpoint/parent references and acyclic containment. Reject unsupported versions or invalid graphs with useful messages. Never silently discard invalid nodes or edges.
- FR-12.04: Treat files as untrusted data, not executable code. Reject executable markup and unsafe asset references where applicable; render labels as inert text, not HTML. Proposed import guard: 10 MiB file limit, subject to DGS-05/DGS-08 testing; check size before parsing and bound parsing/validation work.
- FR-12.05: An import is atomic: failure must not create a partial document or change existing data. Clear cancellation, error and success feedback. If storage is unavailable, do not falsely report a completed durable import.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-12-01 | Export a styled, nested, connected diagram and import it as a new document; compare equivalent graph and styling, ignoring new identity/timestamps. |
| AC-FR-12-02 | Import malformed JSON, unsupported schema, duplicate IDs, dangling edges and cyclic groups; each is rejected with no mutation of existing documents. |
| AC-FR-12-03 | Import an oversized file or unsafe asset reference; verify controlled rejection and no execution or unauthorized remote requests. |

### 5.13 FR-13 — PNG and SVG export (Must)

- FR-13.01: Export the full diagram, not merely the current viewport. Bounds include visible nodes, group titles, connector geometry, labels, arrowheads and status indicators; include consistent padding.
- FR-13.02: Exclude editor chrome, handles, selection boxes, toolbar, grid and mini-map. Export a neutral background by default; optional transparent output is not a release gate.
- FR-13.03: PNG output is a readable raster image with proposed default 2x rendering scale, subject to browser capacity. Provide controlled errors for diagrams exceeding safe canvas dimensions; never silently clip. DGS-08 will define pixel limits and options.
- FR-13.04: SVG output is a standalone vector document for supported built-in shapes, icons, text and connectors, with a valid viewBox and no executable scripts or externally required assets. Use self-contained supported rendering rather than relying on external web fonts or editor DOM. Actual export feasibility must be proven early in DGS-03/DGS-08.
- FR-13.05: Export uses the current valid in-memory graph, does not change viewport or document state, and provides an understandable error on failure. An empty diagram should show a clear no-content message rather than an invalid image.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-13-01 | Export a diagram extending beyond the viewport and into negative coordinates; verify all content is included with padding. |
| AC-FR-13-02 | Open PNG and SVG in independent viewers; verify labels, icons, styles, nested boundaries, connectors and statuses are visible and no editor UI appears. |
| AC-FR-13-03 | Export while storage is unavailable but the current diagram is valid; verify export succeeds independently of local storage. |
| AC-FR-13-04 | Attempt export of empty or unsupported oversized content; verify a controlled message and no misleading success. |

### 5.14 FR-14 — Grid and keyboard shortcuts (Must)

- FR-14.01: Show a toggleable grid aligned with world coordinates; provide independent snap-to-grid toggle. Proposed spacing: 20 world units. Snap positions on insertion/movement when enabled; resizing snap behavior may be finalized in DGS-07.
- FR-14.02: Provide the following essential shortcuts and accessible visible equivalents. Use Ctrl on Windows/Linux, Cmd on macOS where applicable; initial browser QA targets desktop Chrome and Edge.

| Shortcut | Action |
|---|---|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z or Ctrl + Y (Windows) | Redo |
| Delete / Backspace | Delete selected diagram objects |
| Escape | Cancel active operation or clear selection |
| Ctrl/Cmd + A | Select all eligible diagram objects |
| Ctrl/Cmd + D | Duplicate selection (when editor handles the key) |
| Arrow keys | Nudge selected nodes |
| Space + drag | Pan canvas |

- FR-14.03: Scope shortcuts to the editor when focus is appropriate. Text inputs, editable labels, dialogs and browser/system shortcuts must retain expected behavior. Do not delete nodes when Backspace is used within a text editor. If a browser-reserved shortcut cannot be safely intercepted, provide a documented alternative and visible action.
- FR-14.04: Show tooltips or a discoverable shortcut reference; controls remain available without keyboard shortcuts.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-14-01 | Move with snapping enabled and disabled at multiple zoom levels; verify correct world-grid alignment and free placement respectively. |
| AC-FR-14-02 | Use required keyboard actions on the canvas and verify the same result as visible controls. |
| AC-FR-14-03 | Use Backspace, Ctrl/Cmd+A and undo while editing text; verify the surrounding diagram is not unintentionally mutated. |

### 5.15 FR-15 — Starter templates (Must)

- FR-15.01: Provide a blank canvas and two built-in editable templates: basic process flowchart (start, process, decision, two labeled branches and end) and IT architecture (at least ten components, system boundary, connections and example status labels).
- FR-15.02: Each template creates an independent document; template source is immutable. Instantiate with unique document identity and internally consistent graph IDs.
- FR-15.03: Template content is illustrative, not a verified business or infrastructure configuration. All nodes, labels, styles and relationships are editable.
- FR-15.04: Templates must work without fetching remote assets. Use the same versioned document model as user-created diagrams.

| Test ID | Acceptance criterion |
|---|---|
| AC-FR-15-01 | Create each template; verify all required elements and valid graph references. |
| AC-FR-15-02 | Edit one template instance then create another; verify the original template remains unchanged. |
| AC-FR-15-03 | Save, reopen, export and import a template instance through the same workflow as a blank diagram. |

### 5.16 FR-16 — Mini-map, alignment/distribution and additional presets (Should)

If scheduled, provide a mini-map showing diagram extents and viewport with navigation; align selected eligible nodes left/right/top/bottom/center; distribute three or more nodes horizontally/vertically; and provide extra named color presets. Respect group coordinate transforms and avoid unintended reparenting. Applying alignment or distribution is one undoable transaction. Presets apply only compatible style fields explicitly selected by the user. If omitted, manual placement and basic styling remain sufficient for MVP.

Acceptance: AC-FR-16-01 mini-map navigation changes only viewport; AC-FR-16-02 alignment/distribution preserves graph relationships and is reversible; AC-FR-16-03 applying a preset updates only intended visual properties.

### 5.17 FR-17 — Automatic diagram arrangement (Should)

If scheduled, provide user-triggered arrangement with at least one supported direction and undo or preview/cancel. Preserve node identity, edge endpoints, labels, styles, status and group membership. Handle cycles and disconnected components safely; either support nested boundaries or explicitly reject unsupported layouts before mutation. Failed layout leaves the original document intact. Global optimal routing or guaranteed non-overlapping labels are not promised.

Acceptance: AC-FR-17-01 arrange a branched graph and verify graph topology/metadata unchanged; AC-FR-17-02 undo restores exact previous positions; AC-FR-17-03 failed/unsupported layout leaves original document unchanged.

### 5.18 FR-18 — Additional template categories (Should)

If scheduled, add software architecture, automation workflow, organization chart and mind-map templates using existing components. Do not require a separate editor or formal notation validation. Each template must be valid, editable and independent on instantiation.

Acceptance: AC-FR-18-01 each extra template opens as a valid independent document; AC-FR-18-02 standard editing, save and export work on each template.

### 5.19 FR-19 — Extended metadata, component search and reusable custom styles (Could)

If scheduled, provide optional fields such as provider, owner, environment and notes; case-insensitive search of shape names/categories; and locally saved reusable user style presets. Metadata is user-supplied and must not imply verified system facts. Search does not alter the diagram. Presets must not overwrite semantic type or graph relationships. Define metadata limits and import compatibility in DGS-05.

Acceptance: AC-FR-19-01 metadata round-trips as inert text; AC-FR-19-02 search returns matching components and clearing restores all categories; AC-FR-19-03 reusable style applies compatible fields and is undoable.

## 6. Cross-feature rules and error handling

| ID | Rule |
|---|---|
| BR-01 | Stable document identity; node, edge and boundary identifiers are unique within a document. |
| BR-02 | Every edge references existing eligible endpoints and valid handles. No orphaned edges. |
| BR-03 | Containment forms an acyclic hierarchy; each child has at most one direct parent. |
| BR-04 | Committed mutations leave a valid document. A failed/cancelled operation has no partial graph effects. |
| BR-05 | Dependent edits are atomic and reversible as a logical history transaction. |
| BR-06 | Viewport and selection changes do not mutate graph coordinates or create content history. |
| BR-07 | Import creates a separate document and validates before committing. No silent overwrite. |
| BR-08 | Labels and metadata are untrusted plain text; no arbitrary scripts/HTML or remote assets from imported data. |
| BR-09 | Local-save success reflects actual storage completion; export is independent of local persistence. |
| BR-10 | Status colors communicate manual implementation status, not live service health. |
| BR-11 | Template instances never modify the template source or other instances. |
| BR-12 | Unknown/unsupported data is rejected or handled through an explicitly supported migration, not silently discarded. |

| Scenario | Required response |
|---|---|
| Empty library | Show clear create/template entry points. |
| Missing document | Show not-found state and return-to-library action. |
| Invalid property | Show field-level validation; preserve last valid value. |
| Invalid connection | Show invalid target feedback; cancel without graph mutation. |
| Unsupported or corrupt import | Explain failure; preserve active and stored documents. |
| Storage quota/permission error | Show save failed, retry and backup export; retain in-memory work when available. |
| Stale document revision | Block silent overwrite; offer reload or save a copy. |
| Export failure or size limit | Explain error and allow retry; do not report successful output. |
| Empty undo/redo stack | Disable action; no exception or document change. |
| Unexpected editor error | Preserve last valid saved snapshot; provide recovery route and avoid automatic destructive reset. |

## 7. Non-functional requirements and quality checks

The NFR identifiers are preserved from DGS-01. Detailed measurement protocols and final quantitative thresholds will be defined in DGS-10; the following are observable MVP expectations, not measured results.

| ID | MVP verification expectation |
|---|---|
| NFR-01 | Pilot users can create and export a basic diagram with discoverable controls, predictable selection and helpful feedback. Parent target: at least 4 of 5 users within 10 minutes without assistance. |
| NFR-02 | Benchmark editing, navigation, save and export using a reference graph of 100 nodes/150 edges on a documented desktop device. No quantitative pass thresholds asserted yet; define in DGS-10 before release testing. |
| NFR-03 | Successful saves survive reload; failure injection proves last valid snapshot and current edits are protected as described in FR-11. |
| NFR-04 | No mandatory content transfer; imported labels are inert and invalid/unsafe input is rejected. Inspect network behavior and exported SVG. |
| NFR-05 | Essential keyboard actions, discoverable focus, readable contrast, text-based statuses and visible alternatives to shortcuts. No formal accessibility conformance claim. |
| NFR-06 | Verify supported desktop Chrome and Edge versions at release; document versions and known limitations. |
| NFR-07 | Versioned data model independent of renderer; modular implementation, tested validation and controlled migrations. |
| NFR-08 | Full-diagram PNG/SVG output verified in independent viewers with representative geometry, text and status fixtures. |

## 8. Release acceptance and traceability

| DGS-01 gate | Functional coverage | Verification scenario |
|---|---|---|
| AC-01 | FR-02–07, FR-13, FR-15 | Create and export a flowchart with a decision and two labeled branches. |
| AC-02 | FR-02–09, FR-13, FR-15 | Create/export an architecture diagram of at least ten components, a boundary and status labels. |
| AC-03 | FR-03, FR-06–08 | Move/resize connected nodes, delete a node and validate referential integrity. |
| AC-04 | FR-03, FR-05–10, FR-14 | Undo/redo node, edge, styling, status and group operations. |
| AC-05 | FR-01, FR-11 | Save, reload and restore content/layout. |
| AC-06 | FR-12, FR-01, FR-11 | JSON round-trip as a separate diagram, plus invalid-import rejection. |
| AC-07 | FR-05, FR-07–09, FR-13 | Verify complete clean PNG/SVG in independent viewers with nested boundaries. |
| AC-08 | FR-02, FR-14; NFR-02, NFR-05, NFR-06 | Keyboard, browser compatibility and reference-graph benchmarks under DGS-10. |

Release gates: all Must requirements and their mandatory acceptance tests pass; all eight parent AC gates pass; non-functional tests pass against approved DGS-10 thresholds; no unresolved critical/high-severity core-editing or data-loss defects. Should/Could requirements may be deferred explicitly without blocking the release. Do not claim readiness solely because the UI looks complete.

Evidence per requirement: implementation reference, test IDs, pass/fail/not-run, environment, evidence artifact and known limitation/defect. All requirements start as Not started / Not run; this document does not assert implementation progress.

## 9. Proposed defaults and unresolved decisions

These are working decisions made to reduce complexity; they are not independently approved. Change through versioned review if they conflict with practical requirements.

| Decision ID | Proposed direction | Follow-up |
|---|---|---|
| FD-01 | One editor, local-first, no authentication | DGS-03 / DGS-08 |
| FD-02 | Explicit group membership, nested groups, delete boundary preserves children | DGS-05 / DGS-07 |
| FD-03 | Basic orthogonal routing; no obstacle avoidance or self-loops; exact duplicate edge rejection | DGS-05 / DGS-07 |
| FD-04 | Session-local undo history, at least 50 transactions | DGS-07 |
| FD-05 | Proposed 25–200% zoom, 20-unit grid; 8–72 px font; 0–8 px border | DGS-04 / DGS-06 / DGS-07 |
| FD-06 | Proposed up to 1s autosave debounce, stale-tab protection, 10 MiB import limit | DGS-05 / DGS-08 |
| FD-07 | Full PNG export, proposed 2x scale, standalone SVG required; safe size limits TBD | DGS-03 / DGS-08 |
| FD-08 | Generic built-in icons; exact component catalog, default geometry and licensing TBD | DGS-06 |
| FD-09 | Two mandatory templates; all others stretch | DGS-06 / DGS-09 |
| FD-10 | Quantitative performance thresholds, browser versions and severity definitions TBD | DGS-10 |

Technical risk checkpoints: prototype nested groups, connector attachment/reconnection, keyboard focus handling, local transactional persistence and portable SVG/PNG exports before committing to the final engine and export libraries. Standalone SVG is a genuine release gate; if the chosen engine cannot support it, evaluate a separate serializer or formally revise scope rather than silently substitute a raster image inside an SVG wrapper.

## 10. Specialist document handoffs

| Document | Responsibility |
|---|---|
| DGS-03 | Evaluate framework/engine, library licensing, client architecture, module boundaries and risky capability prototypes. |
| DGS-04 | Workspace layouts, responsive desktop behavior, interaction states, visual controls and accessibility design. |
| DGS-05 | Canonical schema, identifiers, graph invariants, validation, migrations and format limits. |
| DGS-06 | Exact component catalog, shapes, icons, anchors, dimensions, styles and template fixtures. |
| DGS-07 | Canvas coordinates, pointer/keyboard behavior, selection, grouping, edges, commands and history. |
| DGS-08 | Persistence transactions, recovery, revision handling, JSON format, PNG/SVG pipeline and export constraints. |
| DGS-09 | Implementation phases, dependencies, tasks, checkpoints and requirement traceability. |
| DGS-10 | Test fixtures, quantitative acceptance thresholds, severity definitions and release evidence. |
| DGS-11 | Deferred features, cloud/AI/collaboration evolution and scalability. |

Recommended repository path: `docs/01-product/DGS-02_MVP_Requirements.md`. Keep the full versioned source in the documentation register. Implementation agents must reference DGS-01 and DGS-02 together and record deviations rather than invent new mandatory features.

## 11. Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1 | 26 November 2026 | Initial detailed MVP requirements, feature acceptance tests, validation rules and release traceability | Draft |

**Next document:** DGS-03 — System Architecture & Technology Stack. No application implementation, library verification or usability testing was performed for DGS-02.
