"use client";

import { Maximize, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type Ref, type RefObject } from "react";
import type { CommandState } from "../core/commands";
import { componentDispatcher, insertionPosition, makeComponent, resizeHandles, resizeRect, type ComponentEdit, type ComponentType, type ResizeHandle } from "../core/component-edits";
import type { DiagramDocument, Position, Viewport } from "../core/contracts";
import { candidateEdge, type End, type Endpoint } from "../core/edge-edits";
import { clientToWorld, worldToClient } from "../core/geometry";
import type { Rect } from "../core/graph";
import type { Immutable } from "../core/immutable";
import { componentFor } from "../core/registry";
import { ComponentGraphic, measureLabel } from "./component-graphic";
import { targetEdit, type ConnectionStart, type EditEdge } from "./connections";
import { Projection } from "./flow";
import type { EditHierarchy, HierarchyIntent } from "./hierarchy-controls";
import { buildScene, clampTranslation, connectionAnchor, connectionAnchors, fitScene, hitTest, objectsIn,
  originView, projectConnection, rectBetween, zoomAt, type Scene, type SceneAnchor } from "./scene";

export type Tool = "select" | "pan";
export type EditComponent = (edit: ComponentEdit, selection: readonly string[], generation: number) => string | null;
export type CanvasControls = { insert(type: ComponentType): boolean; clearDrop(): void };
export type PaletteDrag = { type: ComponentType; hotspot: Position };
const dispatcher = componentDispatcher(measureLabel);
const dropType = "application/x-nodary-component";
const arrows: Record<string, Position> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
type Gesture = {
  pointer: number; mode: "pan" | "select"; start: Position; view: Viewport;
  hit: string | null; selection: readonly string[]; shift: boolean;
  editor: CommandState; resize?: ResizeHandle;
  connection?: ConnectionStart;
};

export function Canvas({ scene, viewport, selection, tool, isSample, editor, pending, controls, drag, onEdit, onEdge, onView, onLabel, onHierarchy }: {
  scene: Scene; viewport: Viewport | null; selection: readonly string[]; tool: Tool; isSample: boolean;
  editor: CommandState; pending: boolean; controls: Ref<CanvasControls>; drag: RefObject<PaletteDrag | null>; onEdit: EditComponent;
  onEdge: EditEdge;
  onHierarchy: EditHierarchy;
  onLabel(id: string): void;
  onView(view: Viewport, selection: readonly string[]): void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const previousSize = useRef<{ width: number; height: number }>(null);
  const gesture = useRef<Gesture | null>(null);
  const nudge = useRef<{ key: string; edit: ComponentEdit; selection: readonly string[]; base: CommandState }>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [space, setSpace] = useState(false);
  const [draggingPan, setDraggingPan] = useState(false);
  const [marquee, setMarquee] = useState<Rect>();
  const [menu, setMenu] = useState<Position>();
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<{ document: Immutable<DiagramDocument>; selection: readonly string[] }>();
  const [ghost, setGhost] = useState<ReturnType<typeof makeComponent>>();
  const [hover, setHover] = useState<string | null>(null);
  const [link, setLink] = useState<{ points: Position[]; target?: Endpoint; valid: boolean; message: string }>();
  const active = viewport ?? originView;
  const { gridVisible, snapToGrid, gridSpacing } = editor.document.settings;
  const spacing = gridSpacing * active.zoom * (active.zoom < .4 ? 2 : 1);
  const shown = preview ? buildScene(preview.document, measureLabel) : scene;
  const picked = preview?.selection ?? selection;
  const objects = [...scene.nodes, ...scene.groups];
  const selectedEdge = picked.length === 1 ? shown.edges.find(({ item }) => item.id === picked[0]) : undefined;
  const enabled = !isSample && !pending && tool === "select" && !space;
  const sceneAnchors = useMemo(() => connectionAnchors(scene), [scene]);
  const anchors = enabled ? sceneAnchors : [];
  const resizer = !isSample && tool === "select" && !space && picked.length === 1 ?
    [...shown.nodes, ...shown.groups].find(({ item }) => item.id === picked[0] && componentFor(item.type).resizable) : undefined;
  const hierarchyActions = [
    ...(objects.filter(({ item }) => selection.includes(item.id)).length > 1 ? [{ kind: "group", label: "Group selection" } as const] : []),
    ...(scene.groups.some(({ item }) => selection.includes(item.id)) ? [{ kind: "ungroup", label: "Ungroup" } as const] : []),
    ...(objects.some(({ item }) => selection.includes(item.id)) ? [{ kind: "duplicate", label: "Duplicate" } as const] : []),
    { kind: "delete", label: "Delete selection" } as const,
  ];

  function origin() {
    const rect = surface.current!.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }
  function local(event: { clientX: number; clientY: number }) {
    const corner = origin();
    return { x: event.clientX - corner.x, y: event.clientY - corner.y };
  }
  function center() {
    const rect = surface.current!.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  }
  function zoom(zoom: number, pivot = center()) {
    onView(zoomAt(active, zoom, pivot), selection);
  }
  function fit() {
    const rect = surface.current!.getBoundingClientRect();
    const result = fitScene(scene.bounds, rect.width, rect.height);
    onView(result.view, selection);
    setNotice(result.cropped ? "The complete scene cannot fit at the minimum zoom." : "");
  }
  function stop(cancel: boolean) {
    const current = gesture.current;
    if (!current) return;
    gesture.current = null;
    setMarquee(undefined);
    setDraggingPan(false);
    setPreview(undefined);
    setLink(undefined);
    if (cancel) setNotice("");
    if (cancel && current.mode === "pan") onView(current.view, current.selection);
    if (surface.current?.hasPointerCapture(current.pointer)) surface.current.releasePointerCapture(current.pointer);
  }
  function screenPoint(anchor: Pick<SceneAnchor, "point" | "direction">, view: Viewport) {
    const position = worldToClient(anchor.point, view, originView);
    return { x: position.x + 17 * anchor.direction.x, y: position.y + 17 * anchor.direction.y };
  }

  function resolveTarget(position: Position, view: Viewport) {
    const box = surface.current!;
    if (position.x < 0 || position.y < 0 || position.x >= box.clientWidth || position.y >= box.clientHeight) return;
    let closest: Endpoint | undefined;
    let best = 9.01;
    for (const anchor of anchors) {
      const screen = screenPoint(anchor, view);
      const distance = Math.hypot(position.x - screen.x, position.y - screen.y);
      if (distance < best) { closest = anchor.endpoint; best = distance; }
    }
    return closest;
  }

  function linkPreview(current: Gesture, end: Position) {
    const start = current.connection!;
    const original = start.kind === "reconnect" ? scene.edges.find(({ item }) => item.id === start.id) : undefined;
    const fixed = start.kind === "connect" ? connectionAnchor(scene, start.source) :
      original?.[start.side === "source" ? "target" : "source"];
    const target = resolveTarget(end, current.view);
    const fallback = fixed ? [fixed.point, clientToWorld(end, current.view, originView)] : [];
    if (!target) return { points: fallback, valid: false, message: "Drop on a component connection point." };
    const edit = targetEdit(start, target);
    const candidate = candidateEdge(current.editor.document, edit);
    if (!candidate.ok) return { points: fallback, valid: false, target, message: candidate.issues[0].message };
    const source = connectionAnchor(scene, candidate.value.source);
    const destination = connectionAnchor(scene, candidate.value.target);
    const projected = source && destination && projectConnection(candidate.value, source, destination);
    if (!projected || typeof projected === "string") return { points: fallback, valid: false, target,
      message: projected || "The connection point is unavailable." };
    return { points: projected.points, valid: true, target, message: "Release to connect." };
  }
  function insert(type: ComponentType, position: Position) {
    const id = crypto.randomUUID();
    const error = onEdit({ kind: "insert", type, id, position }, [id], editor.generation);
    setNotice(error ?? "");
    if (!error) surface.current?.focus({ preventScroll: true });
    return !error;
  }
  useImperativeHandle(controls, () => ({
    insert(type) {
      const midpoint = clientToWorld(center(), active, originView);
      const position = insertionPosition(type, midpoint, { x: .5, y: .5 }, snapToGrid);
      const occupied = () => objects.some(({ rect }) => rect.x === position.x && rect.y === position.y);
      for (let count = 0; count < 10 && occupied(); count++) {
        position.x += gridSpacing;
        position.y += gridSpacing;
      }
      const box = componentFor(type).defaultSize;
      const middle = worldToClient({ x: position.x + box.width / 2, y: position.y + box.height / 2 }, active, originView);
      const available = center();
      if (occupied() || middle.x < 0 || middle.y < 0 || middle.x >= 2 * available.x || middle.y >= 2 * available.y) {
        setNotice("No insertion position is available here. Pan to open space and try again.");
        return false;
      }
      return insert(type, position);
    },
    clearDrop: () => setGhost(undefined),
  }));

  function placed(event: DragEvent<HTMLDivElement>) {
    if (!drag.current || isSample || pending || !event.dataTransfer.types.includes(dropType)) return;
    const point = local(event);
    if (point.x < 0 || point.y < 0 || point.x >= event.currentTarget.clientWidth || point.y >= event.currentTarget.clientHeight) return;
    const { type, hotspot } = drag.current;
    return { type, position: insertionPosition(type, clientToWorld(point, active, originView), hotspot, snapToGrid) };
  }
  function finishNudge(commit: boolean) {
    clearTimeout(nudgeTimer.current);
    const current = nudge.current;
    if (!current) return;
    nudge.current = null;
    setPreview(undefined);
    const error = commit ? onEdit(current.edit, current.selection, current.base.generation) : null;
    setNotice(error ?? "");
    return commit && !error ? current : null;
  }

  const onResize = useEffectEvent((width: number, height: number) => {
    if (!width || !height) return;
    const previous = previousSize.current;
    previousSize.current = { width, height };
    if (!viewport) onView(fitScene(scene.bounds, width, height).view, selection);
    else if (previous && !gesture.current && (width !== previous.width || height !== previous.height)) {
      onView({ ...viewport, x: clampTranslation(viewport.x + (width - previous.width) / 2),
        y: clampTranslation(viewport.y + (height - previous.height) / 2) }, selection);
    }
  });
  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (menu || gesture.current || !event.cancelable) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.current!.clientHeight : 1;
    if (event.ctrlKey || event.metaKey) {
      if (document.activeElement !== surface.current) return;
      event.preventDefault();
      zoom(active.zoom * Math.exp(Math.max(-2, Math.min(2, -.002 * event.deltaY * unit))), local(event));
    } else {
      event.preventDefault();
      const horizontal = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      onView({ ...active, x: clampTranslation(active.x - horizontal * unit),
        y: clampTranslation(active.y - (event.shiftKey && !event.deltaX ? 0 : event.deltaY * unit)) }, selection);
    }
  });
  const cancelOnBlur = useEffectEvent(() => { setSpace(false); stop(true); finishNudge(false); });
  const releaseArrow = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (nudge.current?.key === event.key) finishNudge(true);
  });
  useEffect(() => {
    const element = surface.current!;
    const resize = new ResizeObserver(([{ contentRect }]) => onResize(contentRect.width, contentRect.height));
    const wheel = (event: WheelEvent) => onWheel(event);
    const blur = () => cancelOnBlur();
    const releaseKey = (event: globalThis.KeyboardEvent) => { if (event.code === "Space") setSpace(false); releaseArrow(event); };
    resize.observe(element);
    element.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keyup", releaseKey);
    window.addEventListener("blur", blur);
    return () => {
      resize.disconnect();
      element.removeEventListener("wheel", wheel);
      window.removeEventListener("keyup", releaseKey);
      window.removeEventListener("blur", blur);
      clearTimeout(nudgeTimer.current);
    };
  }, []);

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || (event.button !== 0 && event.button !== 1) || gesture.current) return;
    event.preventDefault();
    finishNudge(true);
    event.currentTarget.focus({ preventScroll: true });
    if (event.currentTarget !== document.activeElement) return;
    if (menu) { setMenu(undefined); return; }
    const start = local(event);
    const mode = event.button === 1 || tool === "pan" || space ? "pan" : "select";
    const handle = (event.target as HTMLElement).dataset.resize as ResizeHandle | undefined;
    const data = (event.target as HTMLElement).dataset;
    const connection: ConnectionStart | undefined = enabled && mode === "select" ?
      data.reconnect && selectedEdge ? { kind: "reconnect", id: selectedEdge.item.id, side: data.reconnect as End } :
        data.port && data.nodeId ? { kind: "connect", id: crypto.randomUUID(), source: { nodeId: data.nodeId, handleId: data.port as Endpoint["handleId"] } } :
          undefined : undefined;
    const resize = mode === "select" && !pending ? handle : undefined;
    setNotice("");
    gesture.current = { pointer: event.pointerId, mode, start, view: active, selection, shift: event.shiftKey,
      editor, resize, connection, hit: mode === "select" ? (resize && resizer ? resizer.item.id :
        hitTest(scene, clientToWorld(start, active, originView), active.zoom)) : null };
    if (connection) setLink(linkPreview(gesture.current, start));
    setDraggingPan(mode === "pan");
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function transform(current: Gesture, dx: number, dy: number) {
    if (isSample || pending || !current.hit) return;
    const object = objects.find(({ item }) => item.id === current.hit);
    if (!object) return;
    const id = object.item.id;
    const delta = { x: dx / current.view.zoom, y: dy / current.view.zoom };
    const next = current.selection.includes(id) ? current.selection : current.shift ? [...current.selection, id] : [id];
    const definition = componentFor(object.item.type);
    const edit: ComponentEdit = current.resize ? { kind: "resize", id, rect: resizeRect(object.rect, current.resize, delta,
      definition.aspectRatio === 1, current.editor.document.settings.snapToGrid) } :
      { kind: "move", ids: next.filter((id) => objects.some(({ item }) => item.id === id)), reference: id, delta };
    let floor;
    if (edit.kind === "resize" && current.resize && (edit.rect.width < definition.minSize.width || edit.rect.height < definition.minSize.height)) {
      const width = Math.max(edit.rect.width, definition.minSize.width);
      const height = Math.max(edit.rect.height, definition.minSize.height);
      floor = { ...edit, rect: { width, height, x: current.resize.includes("w") ? object.rect.x + object.rect.width - width : edit.rect.x,
        y: current.resize.includes("n") ? object.rect.y + object.rect.height - height : edit.rect.y } };
    }
    return { edit, next, floor };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current) {
      if (enabled) {
        const client = local(event);
        const hit = hitTest(scene, clientToWorld(client, active, originView), active.zoom);
        const candidate = anchors.find(({ endpoint }) => endpoint.nodeId === hit) ??
          anchors.filter((anchor) => {
            const point = screenPoint(anchor, active);
            return Math.hypot(point.x - client.x, point.y - client.y) <= 24;
          }).at(-1);
        setHover((event.target as HTMLElement).dataset.nodeId ?? candidate?.endpoint.nodeId ?? null);
      }
      return;
    }
    if (current.pointer !== event.pointerId) return;
    const end = local(event);
    if (current.connection) {
      setLink(linkPreview(current, end));
      return;
    }
    const dx = end.x - current.start.x;
    const dy = end.y - current.start.y;
    if (current.mode === "pan") {
      onView({ ...current.view, x: clampTranslation(current.view.x + dx), y: clampTranslation(current.view.y + dy) }, current.selection);
    } else if (Math.hypot(dx, dy) >= 4) {
      const change = transform(current, dx, dy);
      if (change) {
        const result = dispatcher.preview(current.editor, { type: "component", payload: change.edit, expectedGeneration: editor.generation });
        const visible = !result.ok && change.floor ? dispatcher.preview(current.editor,
          { type: "component", payload: change.floor, expectedGeneration: editor.generation }) : result;
        if (visible.ok) setPreview({ document: visible.value, selection: change.next });
        setNotice(result.ok ? "" : result.issues[0].message);
      } else if (!current.hit) setMarquee(rectBetween(current.start, end));
    } else {
      setPreview(undefined);
      setMarquee(undefined);
      setNotice("");
    }
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    const end = local(event);
    const dragged = Math.hypot(end.x - current.start.x, end.y - current.start.y) >= 4;
    stop(false);
    if (current.mode === "pan") return;
    if (current.connection) {
      if (!dragged) return;
      const next = linkPreview(current, end);
      if (!next.valid || !next.target) setNotice(next.message);
      else setNotice(onEdge(targetEdit(current.connection, next.target), current.editor.generation) ?? "");
      return;
    }
    const change = dragged && transform(current, end.x - current.start.x, end.y - current.start.y);
    if (change) {
      setNotice(onEdit(change.edit, change.next, current.editor.generation) ?? "");
      return;
    }
    if (current.resize) return;
    if (current.hit) {
      const id = current.hit;
      const selected = current.selection.includes(id);
      const next = dragged && selected ? current.selection : current.shift ?
        selected ? current.selection.filter((item) => item !== id) : [...current.selection, id] : [id];
      onView(current.view, next);
    } else if (dragged) {
      const world = (point: Position) => clientToWorld(point, current.view, originView);
      const hits = objectsIn(scene, rectBetween(world(current.start), world(end)));
      onView(current.view, current.shift ? [...current.selection, ...hits] : hits);
    } else onView(current.view, []);
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (gesture.current) stop(true);
      else if (nudge.current) finishNudge(false);
      else if (menu) setMenu(undefined);
      else onView(active, []);
    } else if (!gesture.current && (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      onView(active, objectsIn(scene));
    } else if (event.code === "Space" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!gesture.current) setSpace(true);
    } else if (!gesture.current && !isSample && !pending && event.key === "Enter" && selection.length === 1) {
      event.preventDefault();
      onLabel(selection[0]);
    } else if (!gesture.current && !nudge.current && !isSample && !pending && selection.length > 0 &&
        (event.key === "Delete" || event.key === "Backspace") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!event.repeat) setNotice(onHierarchy({ kind: "delete", ids: selection }, editor.generation) ?? "");
    } else if (!gesture.current && !nudge.current && !isSample && !pending && selection.length > 0 &&
      (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      if (!event.repeat) setNotice(onHierarchy({ kind: "duplicate", ids: selection }, editor.generation) ?? "");
    } else if (!gesture.current && !isSample && !pending && !event.altKey && !event.ctrlKey && !event.metaKey &&
      Object.hasOwn(arrows, event.key)) {
      const ids = objects.filter(({ item }) => selection.includes(item.id)).map(({ item }) => item.id);
      if (!ids.length) return;
      event.preventDefault();
      let previous = nudge.current;
      let base = previous?.base ?? editor;
      if (previous && (previous.key !== event.key || previous.selection.join() !== selection.join())) {
        const committed = finishNudge(true);
        if (committed) base = dispatcher.dispatch(committed.base, { type: "component", payload: committed.edit }).state;
        previous = null;
      }
      const vector = arrows[event.key];
      const step = snapToGrid ? gridSpacing : 1;
      const before = previous?.edit.kind === "nudge" ? previous.edit.delta : { x: 0, y: 0 };
      const edit: ComponentEdit = { kind: "nudge", ids, reference: ids[0],
        delta: { x: before.x + vector.x * step, y: before.y + vector.y * step } };
      const result = dispatcher.preview(base, { type: "component", payload: edit });
      nudge.current = { key: event.key, edit, selection, base };
      if (result.ok) setPreview({ document: result.value, selection });
      setNotice(result.ok ? "" : result.issues[0].message);
      clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => finishNudge(true), 300);
    }
  }

  function context(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    if (gesture.current || tool === "pan" || space) return;
    const point = local(event);
    const hit = hitTest(scene, clientToWorld(point, active, originView), active.zoom);
    if (hit && !selection.includes(hit)) onView(active, [hit]);
    const size = surface.current!.getBoundingClientRect();
    setMenu({ x: Math.max(4, Math.min(point.x, size.width - 165)),
      y: Math.max(4, Math.min(point.y, size.height - (isSample || (!hit && !selection.length) ? 88 : 240))) });
  }

  function applyFromMenu(kind: Exclude<HierarchyIntent["kind"], "reparent">) {
    setMenu(undefined);
    setNotice(onHierarchy({ kind, ids: selection }, editor.generation) ?? "");
    surface.current?.focus();
  }

  return <section className="canvas-area" aria-label={isSample ? "Read-only sample diagram" : "Diagram workspace"}>
    <div ref={surface} id="diagram-canvas" className="canvas-surface" data-tool={tool === "pan" || space || draggingPan ? "pan" : "select"}
      data-dragging={draggingPan} tabIndex={0} role="region" aria-label="Diagram canvas"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => setHover(null)}
      onDoubleClick={(event) => {
        if (!enabled) return;
        const id = hitTest(scene, clientToWorld(local(event), active, originView), active.zoom);
        if (id) onLabel(id);
      }}
      onPointerCancel={() => stop(true)} onLostPointerCapture={() => stop(true)} onContextMenu={context} onKeyDown={key}
      onDragOver={(event) => {
        const candidate = placed(event);
        if (!candidate) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setGhost(makeComponent(candidate.type, "", candidate.position));
      }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as HTMLElement | null)) setGhost(undefined); }}
      onDrop={(event) => {
        const candidate = placed(event);
        if (!candidate || event.dataTransfer.getData(dropType) !== candidate.type) return;
        event.preventDefault();
        drag.current = null;
        setGhost(undefined);
        insert(candidate.type, candidate.position);
      }}
      onBlur={() => { setSpace(false); stop(true); finishNudge(false); }} onAuxClick={(event) => { if (event.button === 1) event.preventDefault(); }}>
      {gridVisible && <div aria-hidden="true" className="canvas-grid" style={{ backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${active.x - spacing / 2}px ${active.y - spacing / 2}px` }} />}
      <Projection scene={shown} viewport={active} selection={picked} />
      {link && <svg className="connection-preview" aria-hidden="true">
        <polyline points={link.points.map((p) => {
          const { x, y } = worldToClient(p, active, originView);
          return `${x},${y}`;
        }).join(" ")} data-valid={link.valid} />
      </svg>}
      {!preview && anchors.filter(({ endpoint }) => link || endpoint.nodeId === hover || picked.includes(endpoint.nodeId)).map((anchor) => {
        const { endpoint } = anchor;
        const point = screenPoint(anchor, active);
        const highlighted = link?.target?.nodeId === endpoint.nodeId && link?.target?.handleId === endpoint.handleId;
        return <span key={`${endpoint.nodeId}:${endpoint.handleId}`} aria-hidden="true" className="connection-port"
          data-node-id={endpoint.nodeId} data-port={endpoint.handleId} data-valid={highlighted ? link!.valid : undefined}
          style={{ left: point.x, top: point.y }} />;
      })}
      {enabled && selectedEdge && !link && (["source", "target"] as const).map((side) => {
        const anchor = selectedEdge[side];
        const point = screenPoint(anchor, active);
        const other = screenPoint(selectedEdge[side === "source" ? "target" : "source"], active);
        const overlap = Math.hypot(other.x - point.x, other.y - point.y) < 18;
        const offset = overlap ? (side === "source" ? -11 : 11) : 0;
        return <span key={side} aria-hidden="true" className="connection-port reconnect-port" data-reconnect={side}
          title={`Reconnect ${side}`} style={{ left: point.x + offset, top: point.y }} />;
      })}
      {ghost && <div className="drop-preview" style={{ left: active.x + ghost.position.x * active.zoom,
        top: active.y + ghost.position.y * active.zoom, width: ghost.size.width * active.zoom, height: ghost.size.height * active.zoom }}>
        <ComponentGraphic item={ghost} />
      </div>}
      {resizer && resizeHandles.filter((handle) => componentFor(resizer.item.type).aspectRatio !== 1 || handle.length === 2).map((handle) => {
        const { x, y, width, height } = resizer.rect;
        const point = worldToClient({ x: x + width * (handle.includes("w") ? 0 : handle.includes("e") ? 1 : .5),
          y: y + height * (handle.includes("n") ? 0 : handle.includes("s") ? 1 : .5) }, active, originView);
        return <span key={handle} aria-hidden="true" className="component-resize" data-resize={handle}
          style={{ left: point.x, top: point.y, cursor: `${handle}-resize` }} />;
      })}
      {!scene.bounds && <div className="canvas-empty"><strong>Blank canvas</strong><span>Choose Pan or use the viewport controls.</span></div>}
      {marquee && <div className="canvas-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}
    </div>
    <div className="canvas-controls" role="group" aria-label="Viewport controls">
      <button className="icon-button" aria-label="Zoom out" title="Zoom out" disabled={active.zoom <= .25} onClick={() => zoom(active.zoom / 1.2)}><Minus size={16} /></button>
      <output aria-label="Zoom level">{Math.round(active.zoom * 100)}%</output>
      <button className="icon-button" aria-label="Zoom in" title="Zoom in" disabled={active.zoom >= 2} onClick={() => zoom(active.zoom * 1.2)}><Plus size={16} /></button>
      <span className="header-divider" />
      <button className="icon-button" aria-label="Fit diagram" title="Fit diagram" onClick={fit}><Maximize size={16} /></button>
      <button className="icon-button" aria-label="Reset zoom" title="Reset to 100%" onClick={() => scene.bounds ? zoom(1) : onView(originView, selection)}><RotateCcw size={15} /></button>
    </div>
    {(link || notice || shown.diagnostics[0] || selectedEdge?.warning) && <p className="canvas-notice" data-valid={link?.valid}
      role={preview || link ? undefined : "status"}>{link?.message ?? (notice || shown.diagnostics[0] || selectedEdge?.warning)}</p>}
    {menu && <div className="canvas-menu" role="group" aria-label="Canvas actions" style={{ left: menu.x, top: menu.y }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(undefined); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setMenu(undefined); surface.current?.focus(); } }}>
      <button className="button" ref={(element) => { element?.focus({ preventScroll: true }); }} onClick={() => {
        setMenu(undefined); onView(active, []); surface.current?.focus();
      }}>Clear selection</button>
      <button className="button" onClick={() => { setMenu(undefined); fit(); surface.current?.focus(); }}>Fit diagram</button>
      {!isSample && selection.length > 0 && hierarchyActions.map(({ kind, label }) =>
        <button key={kind} className="button" disabled={pending} onClick={() => applyFromMenu(kind)}>{label}</button>)}
    </div>}
  </section>;
}
