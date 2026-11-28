// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { openSession, viewSession } from "../../src/application/document-session";
import { makeComponent } from "../../src/core/component-edits";
import type { Node } from "../../src/core/contracts";
import { createMemoryDocumentRepository } from "../../src/infrastructure/memory-document-repository";
import { EndpointDialog } from "../../src/workspace/connections";
import { Editor } from "../../src/workspace/editor";
import { Connector } from "../../src/workspace/flow";
import { sampleDiagram } from "../../src/workspace/sample";
import { buildScene } from "../../src/workspace/scene";
import { Workspace } from "../../src/workspace/workspace";

vi.mock("@xyflow/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("@xyflow/react")>(),
  EdgeLabelRenderer: ({ children }: { children: ReactNode }) => children,
  ReactFlow: () => null,
}));

const id = "4f64b6d3-040a-4227-b4ca-f5f7df4436f0";

async function opened() {
  const fixture = sampleDiagram();
  fixture.document.id = id;
  fixture.document.nodes.push(makeComponent("general.note", "2eaa5c7b-b999-4c60-b90c-531747dd5bdc", { x: 0, y: -300 }) as Node);
  const repository = createMemoryDocumentRepository();
  const result = await repository.create(fixture);
  if (!result.ok) throw Error("Expected fixture creation");
  const record = await repository.open(id);
  if (!record.ok) throw Error("Expected fixture open");
  const session = openSession(id, repository, record.value);
  if (!session.ok) throw Error("Expected active session");
  return session.value;
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      fireEvent(this, new Event("close"));
    } },
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

test("UX-11 workspace routes undo and redo through the repository session and starts fresh on reopen", async () => {
  render(<Workspace initial="/" />);
  await screen.findByText("No diagrams yet");
  fireEvent.click(screen.getByRole("button", { name: "New diagram" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Diagram name" }), { target: { value: "History workflow" } });
  fireEvent.click(screen.getByRole("button", { name: "Create diagram" }));
  const canvas = await screen.findByRole("region", { name: "Diagram canvas" });
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  const undo = screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement;
  const redo = screen.getByRole("button", { name: "Redo" }) as HTMLButtonElement;
  expect(undo.disabled).toBe(true);
  expect(redo.disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Insert Process" }));
  await waitFor(() => expect(undo.disabled).toBe(false));
  expect(screen.getByText("1 nodes · 0 edges · 0 boundaries")).toBeDefined();
  fireEvent.keyDown(canvas, { key: "z", ctrlKey: true });
  await waitFor(() => expect(redo.disabled).toBe(false));
  expect(screen.queryByLabelText("Find an object")).toBeNull();
  const grid = screen.getByRole("button", { name: "Grid" }) as HTMLButtonElement;
  fireEvent.click(grid);
  await waitFor(() => expect(grid.disabled).toBe(false));
  expect(grid.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(redo);
  await waitFor(() => expect(undo.disabled).toBe(false));
  expect(grid.getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByText("1 nodes · 0 edges · 0 boundaries")).toBeDefined();
  fireEvent.click(screen.getByRole("link", { name: "Back to diagram library" }));
  fireEvent.click(await screen.findByRole("link", { name: "History workflow" }));
  await screen.findByRole("region", { name: "Diagram canvas" });
  expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Redo" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("1 nodes · 0 edges · 0 boundaries")).toBeDefined();
});

test("connector paint uses canonical dashed stroke, labels and arrows beside a selection outline", () => {
  const document = sampleDiagram().document;
  const edge = document.edges[0];
  edge.route = "straight";
  edge.arrows = "both";
  edge.label = "Request\n<Literal>";
  edge.style.strokeStyle = "dashed";
  edge.style.strokeWidth = 3;
  edge.style.text.align = "right";
  const scene = buildScene(document);
  const { container } = render(<svg><Connector data={{ edge: scene.edges[0], selected: true }} /></svg>);
  const line = container.querySelector(".connection-line")!;
  expect(line.getAttribute("stroke-dasharray")).toBe("12 9");
  expect(line.getAttribute("stroke")).toBe(edge.style.stroke);
  expect(line.getAttribute("stroke-width")).toBe("3");
  expect(container.querySelectorAll("polygon")).toHaveLength(2);
  const label = container.querySelector(".diagram-edge-label")!;
  expect(label.querySelector("rect")?.getAttribute("fill")).toBe("white");
  expect(scene.edges[0].label?.align).toBe("right");
  expect(Number(label.querySelector("tspan")?.getAttribute("x"))).toBeGreaterThan(4);
  expect([...label.querySelectorAll("tspan")].map((line) => line.textContent)).toEqual(["Request", "<Literal>"]);
  expect(container.querySelector("literal")).toBeNull();
  expect(container.querySelectorAll("polyline")).toHaveLength(2);
});

test("endpoint dialog disables incompatible choices and preserves the draft on a rejected submission", async () => {
  const { editor } = await opened();
  const [client, gateway] = editor.document.nodes;
  const commit = vi.fn(() => "Document changed. Try again.");
  const close = vi.fn();
  render(<EndpointDialog editor={editor} scene={buildScene(editor.document)} onEdge={commit} close={close}
    start={{ kind: "connect", id, source: { nodeId: client.id, handleId: "right" } }} />);
  const target = screen.getByLabelText("Target component") as HTMLSelectElement;
  expect([...target.options].find(({ value }) => value === client.id)?.disabled).toBe(true);
  expect([...target.options].some(({ text }) => /Note|Production environment/.test(text))).toBe(false);
  fireEvent.change(target, { target: { value: gateway.id } });
  const point = screen.getByLabelText("Target point") as HTMLSelectElement;
  expect([...point.options].find(({ value }) => value === "left")?.disabled).toBe(true);
  expect(screen.getByRole("alert").textContent).toContain("already exists");
  fireEvent.change(point, { target: { value: "top" } });
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));
  expect(commit).toHaveBeenCalledWith({ kind: "connect", id,
    source: { nodeId: client.id, handleId: "right" }, target: { nodeId: gateway.id, handleId: "top" } }, 0);
  expect(screen.getByRole("alert").textContent).toBe("Document changed. Try again.");
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalledOnce();
});

test("editor restricts connection tools by selection and sends the scoped route command", async () => {
  const session = await opened();
  const onEdge = vi.fn(() => null);
  const onView = vi.fn();
  const onProperty = vi.fn(() => null);
  const props = { onEdge, onView, onToggle: vi.fn(), onEdit: vi.fn(), onProperty, onHierarchy: vi.fn(), onHistory: vi.fn() };
  const note = session.editor.document.nodes.at(-1)!;
  const pickedNote = viewSession(session, null, [note.id]);
  if (!pickedNote.ok) throw Error("expected selected annotation");
  const { rerender } = render(<Editor session={pickedNote.value} {...props} />);
  expect(screen.queryByRole("button", { name: "Connect to…" })).toBeNull();
  const edge = session.editor.document.edges[0];
  const pickedEdge = viewSession(session, null, [edge.id]);
  if (!pickedEdge.ok) throw Error("expected selected edge");
  rerender(<Editor session={pickedEdge.value} {...props} />);
  fireEvent.change(screen.getByLabelText("Connector route"), { target: { value: "straight" } });
  expect(onProperty).toHaveBeenCalledWith({ field: "route", ids: [edge.id], value: "straight" }, 0);
  fireEvent.click(screen.getByRole("button", { name: "Reconnect target" }));
  expect(screen.getByRole("dialog", { name: "Reconnect target" })).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete connection" }));
  expect(onEdge).toHaveBeenLastCalledWith({ kind: "delete", id: edge.id }, 0);
});

test("hierarchy controls exclude cyclic parents and route explicit actions with the current generation", async () => {
  const session = await opened();
  const { groups, nodes } = session.editor.document;
  const outer = groups.find(({ parentId }) => parentId === null)!;
  const nested = groups.find(({ parentId }) => parentId === outer.id)!;
  const child = nodes.find(({ parentId }) => parentId === nested.id)!;
  const props = { onView: vi.fn(), onToggle: vi.fn(), onEdit: vi.fn(), onEdge: vi.fn(), onProperty: vi.fn(),
    onHierarchy: vi.fn(() => "The selected boundary is closed for this test."), onHistory: vi.fn() };
  const pickedFrame = viewSession(session, null, [outer.id]);
  if (!pickedFrame.ok) throw Error("expected boundary selection");
  const { rerender } = render(<Editor session={pickedFrame.value} {...props} />);
  const parent = screen.getByRole("combobox", { name: "Parent boundary" }) as HTMLSelectElement;
  expect([...parent.options].find(({ value }) => value === nested.id)?.disabled).toBe(true);
  expect([...parent.options].find(({ value }) => value === outer.id)?.disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Ungroup" }));
  expect(props.onHierarchy).toHaveBeenCalledWith({ kind: "ungroup", ids: [outer.id] }, 0);
  expect(screen.getByRole("alert").textContent).toContain("selected boundary");
  const pickedChild = viewSession(session, null, [child.id]);
  if (!pickedChild.ok) throw Error("expected node selection");
  rerender(<Editor session={pickedChild.value} {...props} />);
  expect(screen.getByText("Parent-local position")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Remove from boundary" }));
  expect(props.onHierarchy).toHaveBeenLastCalledWith({ kind: "reparent", ids: [child.id], parentId: outer.id }, 0);
});
