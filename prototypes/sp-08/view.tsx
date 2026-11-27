import { BaseEdge, ConnectionMode, Handle, Position, ReactFlow, useNodesInitialized, type Edge, type EdgeProps, type Node, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import Dexie, { type Table } from "dexie";
import { useEffect, useRef, useState } from "react";
import { png } from "../sp-04/scene";
import { benchmark, buildScene, serialize, type Document } from "./scene";

type NodeData = { label: string; fill: string; group: boolean };
type BenchNode = Node<NodeData>;
type BenchEdge = Edge<{ path: string }>;
type Metric = "commit" | "save" | "json" | "svg" | "png";
export type BenchmarkSample = { durations: Record<Metric, number>; bytes: number; raster: [number, number] };
type Draft = { id: string; position?: { x: number; y: number }; width?: number };
const firstId = benchmark.nodes[0].id;
const params = new URLSearchParams(location.search);
const database = new Dexie(params.get("db") ?? "nodary-sp08-benchmark");
database.version(1).stores({ benchmark: "id" });
const table: Table<{ id: string; revision: number; document: Document }, string> = database.table("benchmark");
const rowId = "reference";

type Benchmark = {
  openMs: number;
  viewport(zoom: number): Promise<boolean>;
  start(): void;
  end(): number[];
  resizePreview(ms: number): Promise<void>;
  prepareHistory(): void;
  measure(): Promise<BenchmarkSample>;
};
declare global { interface Window { nodaryBenchmark?: Benchmark } }

const handles = { top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left };
const defaultViewport = { x: 1310, y: 720, zoom: 1 };

function BenchmarkNode({ data }: NodeProps<BenchNode>) {
  if (data.group) return <div className="bench-group"><span className="bench-group-grip">{data.label}</span></div>;
  return <div className="bench-node" style={{ background: data.fill }}>
    {data.label}
    {Object.entries(handles).map(([id, position]) => <Handle key={id} id={id} type="source" position={position} isConnectable={false} />)}
  </div>;
}
function BenchmarkEdge({ id, data }: EdgeProps<BenchEdge>) {
  return <BaseEdge id={id} path={data!.path} interactionWidth={12} />;
}
const nodeTypes = { bench: BenchmarkNode };
const edgeTypes = { bench: BenchmarkEdge };

function Ready({ onReady }: { onReady(): void }) {
  const ready = useNodesInitialized();
  useEffect(() => { if (ready) onReady(); }, [ready, onReady]);
  return null;
}

export default function ReferenceWorkload() {
  const [document, setDocument] = useState<Document>();
  const [draft, setDraft] = useState<Draft>();
  const [ready, setReady] = useState(false);
  const [openError, setOpenError] = useState("");
  const flow = useRef<ReactFlowInstance<BenchNode, BenchEdge>>(null);
  const frame = useRef(0);
  const intervals = useRef<number[]>([]);
  const history = useRef<Document[]>([]);
  const sequence = useRef(0);
  const current = useRef<Document>(undefined);
  const openMs = useRef(0);
  useEffect(() => {
    void table.get(rowId).then(async (existing) => {
      if (existing) return existing.document;
      await table.add({ id: rowId, revision: 0, document: benchmark });
      return benchmark;
    }).then((snapshot) => {
      current.current = snapshot;
      setDocument(snapshot);
    }).catch((error) => setOpenError(String(error)));
    return () => cancelAnimationFrame(frame.current);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.nodaryBenchmark = {
      openMs: openMs.current,
      viewport: (zoom) => flow.current!.setViewport({ x: 230 + 1060 * zoom, y: 105 + 620 * zoom, zoom }),
      start() {
        intervals.current = [];
        let previous = 0;
        function sample(timestamp: number) {
          if (previous) intervals.current.push(timestamp - previous);
          previous = timestamp;
          frame.current = requestAnimationFrame(sample);
        }
        frame.current = requestAnimationFrame(sample);
      },
      end() {
        cancelAnimationFrame(frame.current);
        return intervals.current;
      },
      resizePreview(ms) {
        return new Promise((resolve) => {
          const start = performance.now();
          function resizeFrame() {
            const elapsed = performance.now() - start;
            if (elapsed >= ms) {
              setDraft(undefined);
              resolve();
              return;
            }
            setDraft({ id: firstId, width: 180 + Math.sin(elapsed / 150) * 12 });
            requestAnimationFrame(resizeFrame);
          }
          requestAnimationFrame(resizeFrame);
        });
      },
      prepareHistory() {
        history.current = Array.from({ length: 50 }, () => structuredClone(current.current!));
      },
      async measure() {
        const durations = {} as Record<Metric, number>;
        const time = async <T,>(metric: Metric, work: () => T | Promise<T>) => {
          const start = performance.now();
          const output = await work();
          durations[metric] = performance.now() - start;
          return output;
        };
        const snapshot = await time("commit", () => {
          const previous = current.current!;
          const next = structuredClone(previous);
          next.nodes[0].position.x += sequence.current++ % 2 === 0 ? 1 : -1;
          const nodes = new Set(next.nodes.map((node) => node.id));
          const groups = new Set(next.groups.map((group) => group.id));
          if (nodes.size !== 100 || groups.size !== 2 || next.edges.length !== 150 ||
            next.nodes.some((node) => !Number.isFinite(node.position.x) || (node.parentId && !groups.has(node.parentId))) ||
            next.edges.some((edge) => !nodes.has(edge.source.nodeId) || !nodes.has(edge.target.nodeId))) {
            throw Error("Reference graph is invalid");
          }
          history.current = [...history.current, previous].slice(-50);
          current.current = next;
          setDocument(next);
          return next;
        });
        await time("save", () => database.transaction("rw", table, async () => {
          const existing = (await table.get(rowId))!;
          await table.put({ id: rowId, revision: existing.revision + 1, document: snapshot });
        }));
        await time("json", () => new Blob([JSON.stringify({ ...benchmarkEnvelope, document: snapshot })], { type: "application/json" }));
        const vector = await time("svg", () => {
          const result = serialize(buildScene(snapshot));
          return { ...result, blob: new Blob([result.markup], { type: "image/svg+xml" }) };
        });
        const raster = await time("png", () => png(vector.markup, vector.width, vector.height));
        return { durations, bytes: raster.size, raster: [vector.width * 2, vector.height * 2] };
      },
    };
    return () => { delete window.nodaryBenchmark; };
  }, [ready]);
  const scene = document ? buildScene(document, draft) : undefined;
  const nodes: BenchNode[] = scene?.shapes.map((shape) => ({
    id: shape.id, parentId: shape.parentId ?? undefined, position: shape.position, type: "bench",
    data: { label: shape.label, group: shape.group, fill: shape.fill },
    ...shape.size, measured: shape.size,
    dragHandle: shape.group ? ".bench-group-grip" : undefined,
  })) ?? [];
  const edges: BenchEdge[] = scene?.links.map((edge) => ({
    id: edge.id, source: edge.source.nodeId, target: edge.target.nodeId, sourceHandle: edge.source.handleId,
    targetHandle: edge.target.handleId, type: "bench", data: { path: edge.path },
  })) ?? [];
  return <main>
    <h1>SP-08 Reference workload</h1>
    <p role="status">{openError || (ready ? "100 nodes, 150 edges, 2 boundaries ready" : "Opening local reference document")}</p>
    <div className="benchmark-canvas">
      <ReactFlow<BenchNode, BenchEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        defaultViewport={defaultViewport} connectionMode={ConnectionMode.Loose} deleteKeyCode={null}
        minZoom={0.25} maxZoom={2}
        onInit={(instance) => { flow.current = instance; }}
        onNodesChange={(changes) => {
          const active = changes.getByType("position").find((change) => change.dragging);
          if (active?.position) setDraft({ id: active.id, position: active.position });
        }} onNodeDragStop={() => setDraft(undefined)}>
        <Ready onReady={() => {
          if (!openMs.current) openMs.current = performance.now();
          setReady(true);
        }} />
      </ReactFlow>
    </div>
  </main>;
}

const benchmarkEnvelope = { viewport: null };
