"use client";

import { Maximize, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { Position, Viewport } from "../core/contracts";
import { clientToWorld } from "../core/geometry";
import type { Rect } from "../core/graph";
import { Projection } from "./flow";
import { clampTranslation, fitScene, hitTest, objectsIn, originView, rectBetween, zoomAt, type Scene } from "./scene";

export type Tool = "select" | "pan";
type Gesture = {
  pointer: number; mode: "pan" | "select"; start: Position; view: Viewport;
  hit: string | null; selection: readonly string[]; shift: boolean;
};

export function Canvas({ scene, viewport, selection, tool, isSample, gridVisible, onView }: {
  scene: Scene; viewport: Viewport | null; selection: readonly string[]; tool: Tool; isSample: boolean; gridVisible: boolean;
  onView(view: Viewport, selection: readonly string[]): void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const previousSize = useRef<{ width: number; height: number }>(null);
  const gesture = useRef<Gesture | null>(null);
  const [space, setSpace] = useState(false);
  const [draggingPan, setDraggingPan] = useState(false);
  const [marquee, setMarquee] = useState<Rect>();
  const [menu, setMenu] = useState<Position>();
  const [notice, setNotice] = useState("");
  const active = viewport ?? originView;
  const spacing = 20 * active.zoom * (active.zoom < .4 ? 2 : 1);

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
    if (cancel && current.mode === "pan") onView(current.view, current.selection);
    if (surface.current?.hasPointerCapture(current.pointer)) surface.current.releasePointerCapture(current.pointer);
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
  const cancelOnBlur = useEffectEvent(() => { setSpace(false); stop(true); });
  useEffect(() => {
    const element = surface.current!;
    const resize = new ResizeObserver(([{ contentRect }]) => onResize(contentRect.width, contentRect.height));
    const wheel = (event: WheelEvent) => onWheel(event);
    const blur = () => cancelOnBlur();
    const releaseSpace = (event: globalThis.KeyboardEvent) => { if (event.code === "Space") setSpace(false); };
    resize.observe(element);
    element.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keyup", releaseSpace);
    window.addEventListener("blur", blur);
    return () => {
      resize.disconnect();
      element.removeEventListener("wheel", wheel);
      window.removeEventListener("keyup", releaseSpace);
      window.removeEventListener("blur", blur);
    };
  }, []);

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || (event.button !== 0 && event.button !== 1) || gesture.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    if (menu) { setMenu(undefined); return; }
    const start = local(event);
    const mode = event.button === 1 || tool === "pan" || space ? "pan" : "select";
    gesture.current = { pointer: event.pointerId, mode, start, view: active, selection, shift: event.shiftKey,
      hit: mode === "select" ? hitTest(scene, clientToWorld(start, active, originView), active.zoom) : null };
    setDraggingPan(mode === "pan");
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    const end = local(event);
    const dx = end.x - current.start.x;
    const dy = end.y - current.start.y;
    if (current.mode === "pan") {
      onView({ ...current.view, x: clampTranslation(current.view.x + dx), y: clampTranslation(current.view.y + dy) }, current.selection);
    } else if (!current.hit && (marquee || Math.hypot(dx, dy) >= 4)) setMarquee(rectBetween(current.start, end));
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    const end = local(event);
    const dragged = Math.hypot(end.x - current.start.x, end.y - current.start.y) >= 4;
    stop(false);
    if (current.mode === "pan") return;
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
      else if (menu) setMenu(undefined);
      else onView(active, []);
    } else if (!gesture.current && (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      onView(active, objectsIn(scene));
    } else if (event.code === "Space" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setSpace(true);
    }
  }

  function context(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    if (gesture.current || tool === "pan" || space) return;
    const point = local(event);
    const hit = hitTest(scene, clientToWorld(point, active, originView), active.zoom);
    if (hit && !selection.includes(hit)) onView(active, [hit]);
    const size = surface.current!.getBoundingClientRect();
    setMenu({ x: Math.max(4, Math.min(point.x, size.width - 165)), y: Math.max(4, Math.min(point.y, size.height - 88)) });
  }

  return <section className="canvas-area" aria-label={isSample ? "Read-only sample diagram" : "Diagram workspace"}>
    <div ref={surface} className="canvas-surface" data-tool={tool === "pan" || space || draggingPan ? "pan" : "select"}
      data-dragging={draggingPan} tabIndex={0} role="region" aria-label="Diagram canvas"
      onPointerDown={down} onPointerMove={move} onPointerUp={up}
      onPointerCancel={() => stop(true)} onLostPointerCapture={() => stop(true)} onContextMenu={context} onKeyDown={key}
      onBlur={() => { setSpace(false); stop(true); }} onAuxClick={(event) => { if (event.button === 1) event.preventDefault(); }}>
      {gridVisible && <div aria-hidden="true" className="canvas-grid" style={{ backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${active.x - spacing / 2}px ${active.y - spacing / 2}px` }} />}
      <Projection scene={scene} viewport={active} selection={selection} />
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
    {notice && <p className="canvas-notice" role="status">{notice}</p>}
    {menu && <div className="canvas-menu" role="group" aria-label="Canvas actions" style={{ left: menu.x, top: menu.y }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(undefined); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setMenu(undefined); surface.current?.focus(); } }}>
      <button className="button" ref={(element) => { element?.focus({ preventScroll: true }); }} onClick={() => {
        setMenu(undefined); onView(active, []); surface.current?.focus();
      }}>Clear selection</button>
      <button className="button" onClick={() => { setMenu(undefined); fit(); surface.current?.focus(); }}>Fit diagram</button>
    </div>}
  </section>;
}
