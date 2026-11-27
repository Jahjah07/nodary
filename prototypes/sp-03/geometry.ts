// SP-03 world geometry is independent of the canvas adapter.
export const sides = ["north", "east", "south", "west"] as const;
export type Side = typeof sides[number];
export type Point = { x: number; y: number };
export type Box = Point & { width: number; height: number };
const normals = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] } as const;

export function anchor(box: Box, side: Side): Point {
  const [nx, ny] = normals[side];
  return { x: box.x + box.width * (1 + nx) / 2, y: box.y + box.height * (1 + ny) / 2 };
}

export function route(source: Point, target: Point, from: Side, to: Side, orthogonal: boolean) {
  if (!orthogonal) return [source, target];
  const lead = (point: Point, side: Side) => {
    const [x, y] = normals[side];
    return { x: point.x + 20 * x, y: point.y + 20 * y };
  };
  const start = lead(source, from);
  const end = lead(target, to);
  const x = (start.x + end.x) / 2;
  const y = (start.y + end.y) / 2;
  const bends = normals[from][0] !== 0
    ? [{ x, y: start.y }, { x, y: end.y }]
    : [{ x: start.x, y }, { x: end.x, y }];
  return [source, start, ...bends, end, target];
}

export function viewportFor(boxes: Box[], width: number, height: number) {
  const minX = Math.min(...boxes.map((box) => box.x));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const padding = Math.min(48, width / 4, height / 4);
  const zoom = Math.max(0.25, Math.min(2, (width - 2 * padding) / (maxX - minX), (height - 2 * padding) / (maxY - minY)));
  return { x: (width - zoom * (minX + maxX)) / 2, y: (height - zoom * (minY + maxY)) / 2, zoom };
}
