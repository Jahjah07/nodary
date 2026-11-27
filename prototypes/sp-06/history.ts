import { item, reparent, type Graph } from "../sp-02/model";

type History = { past: Graph[]; present: Graph; future: Graph[]; generation: number };
const limit = 50;

export function history(graph: Graph): History {
  return { past: [], present: structuredClone(graph), future: [], generation: 0 };
}

function assertGraph(graph: Graph) {
  const ids = new Set([...graph.items, ...graph.edges].map(({ id }) => id));
  if (ids.size !== graph.items.length + graph.edges.length) throw Error("Duplicate ID");
  for (const node of graph.items) {
    if (![node.x, node.y, node.width, node.height].every(Number.isFinite)) throw Error("Invalid geometry");
    const visited = new Set([node.id]);
    let parent = node.parent;
    while (parent) {
      if (visited.has(parent) || visited.size > 8) throw Error("Invalid ancestry");
      visited.add(parent);
      const frame = item(graph, parent);
      if (!frame.group) throw Error("Invalid parent");
      parent = frame.parent;
    }
  }
  for (const edge of graph.edges) {
    if (edge.source === edge.target || item(graph, edge.source).group || item(graph, edge.target).group) {
      throw Error("Invalid endpoint");
    }
  }
}

export function transact(session: History, command: (graph: Graph) => Graph): History {
  const result = command(structuredClone(session.present));
  assertGraph(result);
  if (JSON.stringify(result) === JSON.stringify(session.present)) return session;
  return {
    past: [...session.past, session.present].slice(-limit),
    present: result,
    future: [],
    generation: session.generation + 1,
  };
}

export function undo(session: History): History {
  if (!session.past.length) return session;
  return { past: session.past.slice(0, -1), present: session.past.at(-1)!,
    future: [session.present, ...session.future], generation: session.generation + 1 };
}

export function redo(session: History): History {
  if (!session.future.length) return session;
  return { past: [...session.past, session.present], present: session.future[0],
    future: session.future.slice(1), generation: session.generation + 1 };
}

export function duplicate(graph: Graph, rootId: string, allocate: (id: string) => string): Graph {
  item(graph, rootId);
  const copies = new Set([rootId]);
  for (const node of graph.items) {
    let parent = node.parent;
    while (parent && !copies.has(node.id)) {
      if (parent === rootId) copies.add(node.id);
      parent = item(graph, parent).parent;
    }
  }
  const idMap = new Map([...copies].map((id) => [id, allocate(id)]));
  const next = structuredClone(graph);
  for (const node of graph.items.filter(({ id }) => copies.has(id))) {
    const root = node.id === rootId;
    next.items.push({
      ...node, id: idMap.get(node.id)!, parent: node.parent ? idMap.get(node.parent) ?? node.parent : null,
      x: node.x + (root ? 20 : 0), y: node.y + (root ? 20 : 0),
    });
  }
  for (const edge of graph.edges) {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (source && target) next.edges.push({ ...edge, id: allocate(edge.id), source, target });
  }
  return next;
}

export function deleteExplicit(graph: Graph, ids: string[]): Graph {
  const deleted = new Set(ids);
  ids.forEach((id) => item(graph, id));
  let candidate = graph;
  for (const node of graph.items) {
    if (deleted.has(node.id) || !node.parent || !deleted.has(node.parent)) continue;
    let parent: string | null = node.parent;
    while (parent && deleted.has(parent)) parent = item(graph, parent).parent;
    candidate = reparent(candidate, node.id, parent);
  }
  return {
    items: candidate.items.filter(({ id }) => !deleted.has(id)),
    edges: candidate.edges.filter(({ source, target }) => !deleted.has(source) && !deleted.has(target)),
  };
}
