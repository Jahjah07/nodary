import { BaseEdge, ConnectionMode, Handle, Position, ReactFlow, useUpdateNodeInternals, type Connection, type Edge, type EdgeProps, type Node, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import { useLayoutEffect, useRef, useState } from "react";
import { anchor, route, sides, viewportFor, type Box, type Side } from "./geometry";

const positions = { north: Position.Top, east: Position.Right, south: Position.Bottom, west: Position.Left };
const initialBoxes: Record<string, Box> = {
  alpha: { x: -140, y: -100, width: 110, height: 60 },
  beta: { x: 180, y: 70, width: 110, height: 60 },
  gamma: { x: 215, y: 240, width: 110, height: 60 },
};
type Link = { id: string; source: string; target: string; sourceHandle: Side; targetHandle: Side; orthogonal: boolean };
const initialLinks: Link[] = [
  { id: "connector", source: "alpha", target: "beta", sourceHandle: "east", targetHandle: "west", orthogonal: false },
];
type PortNode = Node<Box>;
function Ports({ id, data }: NodeProps<PortNode>) {
  const update = useUpdateNodeInternals();
  useLayoutEffect(() => update(id), [id, data.width, data.height, update]);
  return <div className="port-node" style={{ width: data.width, height: data.height }}>
    {id}
    {sides.map((side) => <Handle key={side} id={side} type="source" position={positions[side]} />)}
  </div>;
}

type RouteEdge = Edge<{ points: ReturnType<typeof route>; showLabel: boolean }>;
function RoutedEdge({ id, data }: EdgeProps<RouteEdge>) {
  const path = data!.points.map(({ x, y }, i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  return <>
    <BaseEdge id={id} path={path} interactionWidth={12} style={{ stroke: "#123c69", strokeWidth: 2 }} />
    {data!.showLabel && <text data-testid="route-label" x="-310" y="-170">Cross-system route</text>}
  </>;
}
const nodeTypes = { ports: Ports };
const edgeTypes = { routed: RoutedEdge };
const labelBounds = { x: -312, y: -189, width: 148, height: 23 };

export default function Connectors() {
  const [boxes, setBoxes] = useState(initialBoxes);
  const [links, setLinks] = useState(initialLinks);
  const [selected, setSelected] = useState<string>();
  const [notice, setNotice] = useState("");
  const flow = useRef<ReactFlowInstance<PortNode, RouteEdge>>(null);
  const surface = useRef<HTMLDivElement>(null);
  const nodes: PortNode[] = Object.entries(boxes).map(([id, data]) => ({
    id, data, type: "ports", position: { x: data.x, y: data.y },
    style: { width: data.width, height: data.height }, draggable: false,
  }));
  const edges: RouteEdge[] = links.map((link) => ({
    ...link, type: "routed", selected: link.id === selected,
    reconnectable: link.id === selected,
    data: {
      showLabel: link.id === "connector",
      points: route(anchor(boxes[link.source], link.sourceHandle), anchor(boxes[link.target], link.targetHandle),
        link.sourceHandle, link.targetHandle, link.orthogonal),
    },
  }));
  function replace(connection: Connection, old?: Link) {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (source === target || !sourceHandle || !targetHandle ||
      links.some((entry) => entry.id !== old?.id && entry.source === source && entry.target === target &&
        entry.sourceHandle === sourceHandle && entry.targetHandle === targetHandle)) {
      setNotice("Connection rejected");
      return;
    }
    const result: Link = {
      id: old?.id ?? "pointer-link", source, target, sourceHandle: sourceHandle as Side,
      targetHandle: targetHandle as Side, orthogonal: old?.orthogonal ?? true,
    };
    if (!old && links.some((entry) => entry.id === result.id)) return;
    setLinks(old ? links.map((entry) => entry.id === old.id ? result : entry) : [...links, result]);
    setNotice("Connection committed");
  }
  return <main>
    <h1>SP-03 Connections</h1>
    <button onClick={() => setBoxes({ ...boxes, alpha: { ...boxes.alpha, width: 170, height: 90 } })}>Resize alpha</button>
    <button onClick={() => setLinks(links.map((link) => ({ ...link, orthogonal: true })))}>Use orthogonal geometry</button>
    <button onClick={() => {
      const extents = [...Object.values(boxes), labelBounds, ...edges.flatMap((edge) =>
        edge.data!.points.map(({ x, y }) => ({ x: x - 2, y: y - 2, width: 4, height: 4 })))];
      void flow.current!.setViewport(viewportFor(extents, surface.current!.clientWidth, surface.current!.clientHeight));
    }}>Fit full scene</button>
    <p role="status">{notice}</p>
    <div className="canvas" ref={surface}>
      <ReactFlow<PortNode, RouteEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        defaultViewport={{ x: 400, y: 230, zoom: 1 }} connectionMode={ConnectionMode.Loose}
        onInit={(instance) => { flow.current = instance; }} onEdgeClick={(_, edge) => setSelected(edge.id)}
        isValidConnection={(candidate) => candidate.source !== candidate.target}
        onConnect={(connection) => replace(connection)} onReconnect={(edge, connection) => replace(connection, links.find((link) => link.id === edge.id))}
        onReconnectEnd={(_, _edge, _type, state) => { if (!state.isValid) setNotice("Reconnect cancelled"); }}
        deleteKeyCode={null} />
    </div>
    <pre data-testid="links">{JSON.stringify(links)}</pre>
  </main>;
}
