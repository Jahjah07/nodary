import { isTimestamp, viewportSchema, type DiagramDocument, type Viewport } from "./contracts";
import { parsePortable } from "./graph";
import { freeze, type Immutable } from "./immutable";
import { fail, inspectJson, ok, type Issue, type Result } from "./validation";

type Graph = Pick<DiagramDocument, "nodes" | "groups" | "edges">;
type StateFields = {
  document: DiagramDocument;
  generation: number;
  view: { viewport: Viewport | null; selection: readonly string[] };
  history: { past: Graph[]; future: Graph[] };
};
export type CommandState = Immutable<StateFields>;
export type Outcome =
  | { status: "committed" | "noop"; state: CommandState }
  | { status: "rejected"; state: CommandState; issues: readonly Issue[] };

const historyLimit = 50;
const graphOf = ({ nodes, groups, edges }: Immutable<Graph>) => ({ nodes, groups, edges });
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const reject = (state: CommandState, issues: readonly Issue[]): Outcome => ({ status: "rejected", state, issues });
const commandError = (message: string): Issue => ({ code: "COMMAND_FAILED", path: [], message });

function selection(document: Immutable<DiagramDocument>, selected: readonly string[]): string[] {
  const available = new Set([...document.nodes, ...document.groups, ...document.edges].map(({ id }) => id));
  return [...new Set(selected)].filter((id) => available.has(id));
}

export function openCommandState(input: unknown): Result<CommandState> {
  const parsed = parsePortable(input);
  if (!parsed.ok) return parsed;
  return ok(freeze({
    document: parsed.value.document, generation: 0,
    view: { viewport: parsed.value.viewport, selection: [] },
    history: { past: [], future: [] },
  }));
}

export function setViewport(state: CommandState, viewport: Viewport | null): Result<CommandState> {
  const issue = inspectJson(viewport, ["viewport"]);
  if (issue) return fail(issue);
  const parsed = viewportSchema.nullable().safeParse(viewport);
  if (!parsed.success) return fail({ code: "INVALID_FIELD", path: ["viewport"], message: "Viewport exceeds v1 limits." });
  return ok(same(parsed.data, state.view.viewport) ? state : freeze({
    ...state, view: { ...state.view, viewport: parsed.data },
  }));
}

export function setSelection(state: CommandState, ids: readonly string[]): CommandState {
  const selected = selection(state.document, ids);
  return same(selected, state.view.selection) ? state : freeze({
    ...state, view: { ...state.view, selection: selected },
  });
}

export type CommandHandlers<Payloads extends object> = {
  [K in keyof Payloads]: (draft: DiagramDocument, payload: Payloads[K]) => Result<void>;
};

type Command<Payloads extends object, K extends keyof Payloads> = {
  type: K;
  payload: Payloads[K];
  expectedGeneration?: number;
};

// DGS-05 §11 and DGS-07. Prepare disposable candidates, then publish an immutable transaction.
export function createDispatcher<Payloads extends object>(handlers: CommandHandlers<Payloads>, now: () => string) {
  function prepare<K extends keyof Payloads>(state: CommandState, command: Command<Payloads, K>): Result<DiagramDocument> {
    if (command.expectedGeneration !== undefined && command.expectedGeneration !== state.generation) {
      return fail({ code: "STALE_GENERATION", path: [], message: "The document changed after this edit began." });
    }
    const draft = structuredClone(state.document) as DiagramDocument;
    try {
      const result = handlers[command.type](draft, command.payload);
      if (!result.ok) return result;
    } catch {
      return fail(commandError("Command could not produce a candidate."));
    }
    const previous = state.document;
    if (draft.id !== previous.id || draft.schemaVersion !== previous.schemaVersion ||
      draft.createdAt !== previous.createdAt || draft.updatedAt !== previous.updatedAt) {
      return fail(commandError("Command modified document identity or lifecycle metadata."));
    }
    const parsed = parsePortable({ document: draft, viewport: state.view.viewport });
    return parsed.ok ? ok(parsed.value.document) : parsed;
  }

  function publish(state: CommandState, candidate: Immutable<DiagramDocument>, history: CommandState["history"]): Outcome {
    let time: string;
    try {
      time = now();
    } catch {
      return reject(state, [commandError("Clock could not produce a timestamp.")]);
    }
    if (!isTimestamp(time) || !Number.isSafeInteger(state.generation + 1)) {
      return reject(state, [commandError("Invalid clock or exhausted edit generation.")]);
    }
    const document = { ...candidate, updatedAt: time < state.document.updatedAt ? state.document.updatedAt : time };
    return { status: "committed", state: freeze({
      document, generation: state.generation + 1, history,
      view: { ...state.view, selection: selection(document, state.view.selection) },
    }) };
  }

  function dispatch<K extends keyof Payloads>(state: CommandState, command: Command<Payloads, K>): Outcome {
    const result = prepare(state, command);
    if (!result.ok) return reject(state, result.issues);
    if (same(result.value, state.document)) return { status: "noop", state };
    const graphChanged = !same(graphOf(result.value), graphOf(state.document));
    const history = graphChanged ? {
      past: [...state.history.past, graphOf(state.document)].slice(-historyLimit), future: [],
    } : state.history;
    return publish(state, result.value, history);
  }

  function undo(state: CommandState): Outcome {
    const graph = state.history.past.at(-1);
    if (!graph) return { status: "noop", state };
    const result = parsePortable({ document: { ...state.document, ...graph }, viewport: state.view.viewport });
    if (!result.ok) return reject(state, result.issues);
    return publish(state, result.value.document, {
      past: state.history.past.slice(0, -1), future: [graphOf(state.document), ...state.history.future],
    });
  }

  function redo(state: CommandState): Outcome {
    const graph = state.history.future[0];
    if (!graph) return { status: "noop", state };
    const result = parsePortable({ document: { ...state.document, ...graph }, viewport: state.view.viewport });
    if (!result.ok) return reject(state, result.issues);
    return publish(state, result.value.document, {
      past: [...state.history.past, graphOf(state.document)], future: state.history.future.slice(1),
    });
  }

  function preview<K extends keyof Payloads>(state: CommandState, command: Command<Payloads, K>): Result<Immutable<DiagramDocument>> {
    const result = prepare(state, command);
    return result.ok ? ok(freeze(result.value)) : result;
  }

  return { dispatch, undo, redo, preview };
}
