import fixture from "../../tests/fixtures/benchmark/DGS-10_Reference_Benchmark_100N_150E_v1.json";
import { anchor, route, type Box, type Side } from "../sp-03/geometry";
import { xmlText } from "../sp-04/scene";

export const benchmark = fixture.document;
export type Document = typeof benchmark;
type Position = { x: number; y: number };
type Shape = {
  id: string; parentId: string | null; position: Position; size: { width: number; height: number };
  label: string; fill: string; group: boolean;
};
const side: Record<string, Side> = { top: "north", right: "east", bottom: "south", left: "west" };

export function buildScene(doc: Document, draft?: { id: string; position?: Position; width?: number }) {
  const shapes: Shape[] = [
    ...doc.groups.map((group) => ({ ...group, label: group.title, fill: group.style.fill, group: true })),
    ...doc.nodes.map((node) => ({ ...node, label: node.label, fill: node.style.fill, group: false })),
  ].map((shape) => shape.id === draft?.id ? {
    ...shape, position: draft.position ?? shape.position,
    size: { ...shape.size, width: draft.width ?? shape.size.width },
  } : shape);
  const worlds = new Map<string, Box>();
  for (const shape of shapes) {
    const parent = shape.parentId ? worlds.get(shape.parentId) : undefined;
    worlds.set(shape.id, { ...shape.size, x: (parent?.x ?? 0) + shape.position.x, y: (parent?.y ?? 0) + shape.position.y });
  }
  const links = doc.edges.map(({ id, source, target, label, route: kind }) => {
    const from = side[source.handleId];
    const to = side[target.handleId];
    const points = route(anchor(worlds.get(source.nodeId)!, from), anchor(worlds.get(target.nodeId)!, to), from, to, kind === "orthogonal");
    const path = points.map(({ x, y }, i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
    return { id, source, target, label, points, path };
  });
  return { shapes, links, worlds };
}

export function serialize(scene: ReturnType<typeof buildScene>) {
  const bounds = [...scene.worlds.values()];
  const points = scene.links.flatMap((edge) => edge.points);
  const x = Math.floor(Math.min(...bounds.map((box) => box.x), ...points.map((point) => point.x)) - 33);
  const y = Math.floor(Math.min(...bounds.map((box) => box.y), ...points.map((point) => point.y)) - 33);
  const width = Math.ceil(Math.max(...bounds.map((box) => box.x + box.width), ...points.map((point) => point.x)) + 33) - x;
  const height = Math.ceil(Math.max(...bounds.map((box) => box.y + box.height), ...points.map((point) => point.y)) + 33) - y;
  const elements = (groups: boolean) => scene.shapes.filter((shape) => shape.group === groups).map((shape) => {
    const box = scene.worlds.get(shape.id)!;
    if (!/^#[0-9a-f]{6}$/i.test(shape.fill)) throw Error("Invalid fixture fill");
    return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${shape.fill}" fill-opacity="${groups ? .3 : 1}" stroke="#334155"/><text x="${box.x + 12}" y="${box.y + 20}">${xmlText(shape.label)}</text>`;
  }).join("");
  const paths = scene.links.map((edge) => `<path d="${edge.path}" stroke="#64748b" fill="none"/>`).join("");
  return {
    width, height,
    markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/>
    <g font-family="Arial" font-size="14">${elements(true)}${paths}${elements(false)}</g></svg>`,
  };
}
