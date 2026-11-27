"use client";

import { ConnectionMode, EdgeLabelRenderer, Handle, Position as Port, ReactFlow, type Edge as FlowEdge, type EdgeProps, type Node as FlowNode, type NodeProps } from "@xyflow/react";
import type { Boundary, Node, Position, Viewport } from "../core/contracts";
import type { Immutable } from "../core/immutable";
import { diagramFont, visualOf } from "../core/visual";
import { dashPattern } from "../core/routes";
import { ComponentGraphic } from "./component-graphic";
import type { Scene } from "./scene";
import "@xyflow/react/dist/style.css";

type SceneNode = FlowNode<{ item: Immutable<Node | Boundary>; selected: boolean; label: Scene["nodes"][number]["label"] }>;
type SceneConnector = FlowEdge<{ edge: Scene["edges"][number]; selected: boolean }>;
const ports = { top: Port.Top, right: Port.Right, bottom: Port.Bottom, left: Port.Left };
function DiagramObject({ data }: NodeProps<SceneNode>) {
  const { item, selected } = data;
  return <>
    <ComponentGraphic item={item} selected={selected} label={data.label} />
    {visualOf(item).anchors.map(({ id, position }) => <Handle className="projection-port" key={id} id={id}
      type="source" position={ports[id]} isConnectable={false}
      style={{ left: position.x, top: position.y, right: "auto", bottom: "auto", transform: "translate(-50%, -50%)" }} />)}
  </>;
}

const poly = (points: Position[]) => points.map(({ x, y }) => `${x},${y}`).join(" ");
export function Connector({ data }: Pick<EdgeProps<SceneConnector>, "data">) {
  const { edge, selected } = data!;
  const { style } = edge.item;
  const label = edge.label;
  return <>
    {selected && <polyline points={poly(edge.points)} fill="none" stroke="#818CF8" strokeOpacity={.5}
      strokeWidth={style.strokeWidth + 5} strokeLinejoin="round" />}
    <polyline className="connection-line" data-edge-id={edge.item.id} data-route={edge.item.route}
      data-source={edge.item.source.nodeId} data-target={edge.item.target.nodeId}
      data-source-handle={edge.item.source.handleId} data-target-handle={edge.item.target.handleId}
      points={poly(edge.line)} fill="none" stroke={style.stroke} strokeWidth={style.strokeWidth}
      strokeDasharray={dashPattern(style)?.join(" ")} strokeLinejoin="round" strokeLinecap="round" data-selected={selected} />
    {edge.arrows.map((arrow, i) => <polygon key={i} data-edge-arrow={edge.item.id} points={poly(arrow)} fill={style.stroke} />)}
    {label && <EdgeLabelRenderer><svg className="diagram-edge-label" data-selected={selected} style={{
      left: label.box.x, top: label.box.y, width: label.box.width, height: label.box.height,
    }} viewBox={`0 0 ${label.box.width} ${label.box.height}`}>
      <rect width={label.box.width} height={label.box.height} fill="white" />
      <text fill={style.text.color} fontSize={style.text.fontSize} fontFamily={diagramFont}
        xmlSpace="preserve">
        {label.placements.map((line, i) => <tspan key={i} x={line.x} y={line.y}>{line.text}</tspan>)}
      </text>
    </svg></EdgeLabelRenderer>}
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
    data: { item: entry.item, selected: active.has(entry.item.id), label: entry.label },
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
