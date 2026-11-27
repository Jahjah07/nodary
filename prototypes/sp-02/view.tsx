import { ReactFlow, type Node, type ReactFlowInstance } from "@xyflow/react";
import { useRef, useState } from "react";
import { initial, move, parentFirst, reparent, resize, ungroup, world, type Graph } from "./model";

export default function Boundaries() {
  const [state, setState] = useState({ graph: initial, undo: [] as Graph[] });
  const [message, setMessage] = useState("");
  const flow = useRef<ReactFlowInstance>(null);
  const graph = state.graph;
  const nodes: Node[] = parentFirst(graph).map((node) => ({
    id: node.id, parentId: node.parent ?? undefined, position: { x: node.x, y: node.y },
    type: node.group ? "group" : "default", data: { label: node.id },
    style: { width: node.width, height: node.height },
    draggable: false, connectable: false,
  }));
  function commit(command: (graph: Graph) => Graph) {
    try {
      setState({ graph: command(graph), undo: [...state.undo, graph] });
      setMessage("");
    } catch (error) {
      setMessage(String(error));
    }
  }
  return <main>
    <h1>SP-02 Nested boundaries</h1>
    <button onClick={() => commit((g) => move(g, ["outer", "worker"], { x: 40, y: 20 }))}>Move outer and selected worker</button>
    <button onClick={() => commit((g) => reparent(g, "worker", "outer"))}>Reparent worker</button>
    <button onClick={() => commit((g) => ungroup(g, "inner"))}>Ungroup inner</button>
    <button onClick={() => commit((g) => move(g, ["worker"], { x: -140, y: -135 }))}>Expand left and top</button>
    <button onClick={() => commit((g) => move(g, ["worker"], { x: 400, y: 375 }))}>Expand right and bottom</button>
    <button onClick={() => commit((g) => resize(g, "inner", 160, 100))}>Shrink inner</button>
    <button onClick={() => commit((g) => resize(g, "inner", 190, 120))}>Resize inner to fit</button>
    <button onClick={() => commit((g) => reparent(g, "outer", "inner"))}>Attempt cyclic reparent</button>
    <button disabled={!state.undo.length} onClick={() => setState({ graph: state.undo.at(-1)!, undo: state.undo.slice(0, -1) })}>Undo</button>
    <button onClick={() => {
      const surface = document.querySelector(".react-flow")!.getBoundingClientRect();
      const position = flow.current!.screenToFlowPosition({ x: surface.left + 155, y: surface.top + 95 }, { snapToGrid: false });
      setMessage(JSON.stringify(position));
    }}>Probe client coordinate</button>
    <p role="status">{message}</p>
    <div className="canvas">
      <ReactFlow<Node> nodes={nodes} edges={graph.edges} defaultViewport={{ x: 30, y: 20, zoom: 1.25 }}
        onInit={(instance) => { flow.current = instance; }} deleteKeyCode={null} elementsSelectable={false} />
    </div>
    <pre data-testid="graph">{JSON.stringify({ ...graph, world: Object.fromEntries(graph.items.map((node) => [node.id, world(graph, node.id)])), history: state.undo.length })}</pre>
  </main>;
}
