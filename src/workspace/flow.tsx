"use client";

import { ConnectionMode, EdgeLabelRenderer, Handle, Position as Port, ReactFlow, type Edge as FlowEdge, type EdgeProps, type Node as FlowNode, type NodeProps } from "@xyflow/react";
import type { Boundary, Node, Position, Viewport } from "../core/contracts";
import type { Immutable } from "../core/immutable";
import { visualOf } from "../core/visual";
import { ComponentGraphic } from "./component-graphic";
import type { Scene } from "./scene";
import "@xyflow/react/dist/style.css";

type SceneNode = FlowNode<{ item: Immutable<Node | Boundary>; selected: boolean }>;
type SceneConnector = FlowEdge<{ edge: Scene["edges"][number]; selected: boolean }>;
const ports = { top: Port.Top, right: Port.Right, bottom: Port.Bottom, left: Port.Left };
function DiagramObject({ data }: NodeProps<SceneNode>) {
  const { item, selected } = data;
  return <>
    <ComponentGraphic item={item} selected={selected} />
    {visualOf(item).anchors.map(({ id, position }) => <Handle className="projection-port" key={id} id={id}
      type="source" position={ports[id]} isConnectable={false}
      style={{ left: position.x, top: position.y, right: "auto", bottom: "auto", transform: "translate(-50%, -50%)" }} />)}
  </>;
}

const poly = (points: Position[]) => points.map(({ x, y }) => `${x},${y}`).join(" ");
function Connector({ data }: EdgeProps<SceneConnector>) {
  const { edge, selected } = data!;
  const { style, label } = edge.item;
  const color = selected ? "#4F46E5" : style.stroke;
  return <>
    <polyline points={poly(edge.points)} fill="none" stroke={color} strokeWidth={style.strokeWidth + (selected ? 1 : 0)}
      strokeDasharray={style.strokeStyle === "dashed" ? "6 4" : undefined} strokeLinejoin="round" data-selected={selected} />
    {edge.arrows.map((arrow, i) => <polygon key={i} points={poly(arrow)} fill={color} />)}
    {edge.label && <EdgeLabelRenderer><span className="diagram-edge-label" data-selected={selected} style={{
      left: edge.label.x, top: edge.label.y, width: edge.label.width, height: edge.label.height,
      fontSize: style.text.fontSize, color: style.text.color,
    }}>{label}</span></EdgeLabelRenderer>}
  </>;
}
const nodeTypes = { diagram: DiagramObject };
const edgeTypes = { connector: Connector };

// T-03-02 Render from canonical state. No renderer event is allowed to commit graph or selection changes.
export function Projection({ scene, viewport, selection }: { scene: Scene; viewport: Viewport; selection: readonly string[] }) {
  const active = new Set(selection);
  const nodes: SceneNode[] = [...scene.groups, ...scene.nodes].map((entry, index) => ({
    id: entry.item.id, parentId: entry.item.parentId ?? undefined, position: entry.item.position,
    type: "diagram", ...entry.item.size, measured: entry.item.size,
    data: { item: entry.item, selected: active.has(entry.item.id) },
    zIndex: "title" in entry ? index : 250 + index,
  }));
  const edges: SceneConnector[] = scene.edges.map((edge) => ({
    id: edge.item.id, source: edge.item.source.nodeId, target: edge.item.target.nodeId,
    sourceHandle: edge.item.source.handleId, targetHandle: edge.item.target.handleId,
    type: "connector", zIndex: 200, data: { edge, selected: active.has(edge.item.id) },
  }));
  return <div className="projection" aria-hidden="true">
    <ReactFlow<SceneNode, SceneConnector> nodes={nodes} edges={edges} viewport={viewport}
      nodeTypes={nodeTypes} edgeTypes={edgeTypes} connectionMode={ConnectionMode.Loose}
      nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} elementsSelectable={false}
      nodesFocusable={false} edgesFocusable={false} disableKeyboardA11y autoPanOnNodeFocus={false}
      panOnDrag={false} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}
      selectionOnDrag={false} selectionKeyCode={null} multiSelectionKeyCode={null} deleteKeyCode={null}
      panActivationKeyCode={null} zoomActivationKeyCode={null} minZoom={.25} maxZoom={2} proOptions={{ hideAttribution: true }}
      preventScrolling={false} />
  </div>;
}
