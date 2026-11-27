import { type DiagramDocument, type Node, type PortableDiagram } from "../core/contracts";
import { componentFor } from "../core/registry";

export const sampleId = "00000000-0000-4000-8000-000000000001";
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

export function blankDiagram(id: string, title: string, category: DiagramDocument["category"], time: string): PortableDiagram {
  return {
    viewport: null,
    document: { schemaVersion: 1, id, title, category, createdAt: time, updatedAt: time,
      nodes: [], groups: [], edges: [], settings: { gridVisible: true, snapToGrid: false, gridSpacing: 20 } },
  };
}

// T-03-01 synthetic read-only graph, separate from the immutable specification fixtures.
export function sampleDiagram(): PortableDiagram {
  const sample = blankDiagram(sampleId, "Service architecture", "architecture", "2026-11-27T00:00:00.000Z");
  const frame = componentFor("general.boundary");
  if (frame.entity !== "group") throw Error("Boundary definition unavailable");
  sample.document.groups = [
    { id: id(2), type: frame.type, title: "Production environment", parentId: null, position: { x: 0, y: 0 },
      size: { width: 762, height: 416 }, style: { ...structuredClone(frame.defaultStyle), fill: "#EEF2FF", stroke: "#94A3B8", fillOpacity: .45, strokeStyle: "solid" } },
    { id: id(3), type: frame.type, title: "Application services", parentId: id(2), position: { x: 245, y: 64 },
      size: { width: 262, height: 287 }, style: { ...structuredClone(frame.defaultStyle), fill: "#FFFFFF", stroke: "#818CF8", fillOpacity: .65 } },
  ];
  const nodes: [number, Node["type"], string, number, number, number | null][] = [
    [10, "arch.user", "Client", -225, 124, null],
    [11, "arch.network", "Gateway", 29, 124, 2],
    [12, "arch.application", "Sample service", 34, 60, 3],
    [13, "arch.server", "Job worker", 34, 172, 3],
    [14, "arch.database", "Database", 553, 124, 2],
    [15, "arch.storage", "Object storage", 553, 236, 2],
  ];
  sample.document.nodes = nodes.map(([n, type, label, x, y, parent]) => {
    const component = componentFor(type);
    if (component.entity !== "node") throw Error("Node definition unavailable");
    return {
      id: id(n), type, label, parentId: parent ? id(parent) : null,
      position: { x, y }, size: { width: 176, height: 76 },
      style: { ...structuredClone(component.defaultStyle), fill: "#FFFFFF", stroke: "#94A3B8" },
      status: "not_specified",
    };
  });
  sample.document.edges = [
    { from: 10, to: 11, source: "right", target: "left", label: "HTTPS" },
    { from: 11, to: 12, source: "right", target: "left", label: "" },
    { from: 12, to: 14, source: "right", target: "left", label: "" },
    { from: 12, to: 13, source: "bottom", target: "top", label: "" },
    { from: 13, to: 15, source: "right", target: "left", label: "" },
  ].map(({ from, to, source, target, label }, index) => ({
    id: id(50 + index), label, route: "orthogonal", arrows: "forward",
    source: { nodeId: id(from), handleId: source as "right" | "bottom" },
    target: { nodeId: id(to), handleId: target as "left" | "top" },
    style: { stroke: "#64748B", strokeWidth: 1.5, strokeStyle: "solid", text: { color: "#475569", fontSize: 12, align: "center" } },
  }));
  return sample;
}
