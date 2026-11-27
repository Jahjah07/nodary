import { z } from "zod";
import { fail, inspectJson, limits, ok, type Issue, type IssueCode, type Result } from "./validation";

// DGS-05 v1, amended by CR-01. These are wire IDs rather than display names.
export const nodeTypes = [
  "flow.terminator", "flow.process", "flow.decision", "flow.input_output", "flow.document",
  "flow.data_store", "flow.subprocess", "flow.on_page_connector", "arch.user", "arch.device",
  "arch.website", "arch.application", "arch.server", "arch.database", "arch.cloud", "arch.network",
  "arch.security", "arch.identity", "arch.email", "arch.storage", "arch.api", "arch.integration",
  "general.rectangle", "general.rounded_rectangle", "general.ellipse", "general.diamond", "general.text",
  "general.note",
] as const;
export const boundaryType = "general.boundary";
export const handles = ["top", "right", "bottom", "left"] as const;
export const statusSchema = z.enum(["not_specified", "completed", "in_progress", "pending"]);
export const idSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$(?![\s\S])/);
export const colorSchema = z.string().regex(/^#[0-9A-F]{6}$(?![\s\S])/);

export function isTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$(?![\s\S])/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString() === value;
}

export const timestampSchema = z.string().superRefine((value, ctx) => {
  if (!isTimestamp(value)) ctx.addIssue({ code: "custom", message: "Expected a real UTC timestamp with milliseconds.", params: { issueCode: "INVALID_TIMESTAMP" } });
});

function text(min: number, max: number, trimmed = false) {
  return z.string().superRefine((value, ctx) => {
    let length = 0;
    for (const char of value) {
      const point = char.codePointAt(0)!;
      if (/^[\u0000-\u0008\u000B-\u001F\u007F-\u009F\uD800-\uDFFF\uFFFE\uFFFF]$/u.test(char)) {
        const codePoint = `U+${point.toString(16).toUpperCase().padStart(4, "0")}`;
        ctx.addIssue({ code: "custom", message: `Prohibited character ${codePoint}.`, params: { issueCode: "INVALID_TEXT", codePoint } });
        return;
      }
      length++;
    }
    if (length < min || length > max || (trimmed && value.trim() !== value)) {
      ctx.addIssue({ code: "custom", message: `Expected ${min}–${max} code points${trimmed ? " with no outer whitespace" : ""}.`, params: { issueCode: "INVALID_TEXT" } });
    }
  });
}

const number = (min: number, max: number) => z.number().finite().min(min).max(max);
export const positionSchema = z.strictObject({
  x: number(-limits.coordinates, limits.coordinates),
  y: number(-limits.coordinates, limits.coordinates),
});
export const sizeSchema = z.strictObject({ width: number(1, limits.size), height: number(1, limits.size) });
const lineStyle = z.enum(["solid", "dashed"]);
const textStyle = z.strictObject({ color: colorSchema, fontSize: number(8, 72), align: z.enum(["left", "center", "right"]) });
const sharedStyle = { stroke: colorSchema, strokeStyle: lineStyle, text: textStyle };
export const nodeStyleSchema = z.strictObject({ ...sharedStyle, strokeWidth: number(0, 8), fill: colorSchema });
export const groupStyleSchema = nodeStyleSchema.extend({ fillOpacity: number(0, 1) });
export const edgeStyleSchema = z.strictObject({ ...sharedStyle, strokeWidth: number(0.5, 8) });
const placed = { id: idSchema, parentId: idSchema.nullable(), position: positionSchema, size: sizeSchema };
export const nodeSchema = z.strictObject({
  ...placed, type: z.enum(nodeTypes), label: text(0, 1000), style: nodeStyleSchema, status: statusSchema,
}).superRefine((node, ctx) => {
  if (!node.type.startsWith("arch.") && node.status !== "not_specified") {
    ctx.addIssue({ code: "custom", path: ["status"], message: "This node type has no status.", params: { issueCode: "INVALID_CAPABILITY" } });
  }
});
export const groupSchema = z.strictObject({
  ...placed, type: z.literal(boundaryType), title: text(0, 200), style: groupStyleSchema,
});
const endpointSchema = z.strictObject({ nodeId: idSchema, handleId: z.enum(handles) });
export const edgeSchema = z.strictObject({
  id: idSchema, source: endpointSchema, target: endpointSchema, label: text(0, 200),
  route: z.enum(["straight", "orthogonal"]), arrows: z.enum(["none", "forward", "both"]), style: edgeStyleSchema,
});
export const settingsSchema = z.strictObject({ gridVisible: z.boolean(), snapToGrid: z.boolean(), gridSpacing: z.literal(20) });
export const viewportSchema = z.strictObject({ x: number(-4e6, 4e6), y: number(-4e6, 4e6), zoom: number(0.25, 2) });
export const documentSchema = z.strictObject({
  schemaVersion: z.literal(1), id: idSchema, title: text(1, 120, true),
  category: z.enum(["general", "flowchart", "architecture"]), createdAt: timestampSchema, updatedAt: timestampSchema,
  nodes: z.array(nodeSchema).max(limits.nodes), groups: z.array(groupSchema).max(limits.groups),
  edges: z.array(edgeSchema).max(limits.edges), settings: settingsSchema,
});
export const portableSchema = z.strictObject({ document: documentSchema, viewport: viewportSchema.nullable() });

export type Position = z.infer<typeof positionSchema>;
export type Size = z.infer<typeof sizeSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Boundary = z.infer<typeof groupSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type Viewport = z.infer<typeof viewportSchema>;
export type DiagramDocument = z.infer<typeof documentSchema>;
export type PortableDiagram = z.infer<typeof portableSchema>;

function schemaIssues(issues: readonly z.ZodIssue[]): Issue[] {
  return issues.slice(0, limits.issues).map((issue) => {
    const params = issue.code === "custom" ? issue.params : undefined;
    let code: IssueCode = "INVALID_FIELD";
    if (issue.code === "unrecognized_keys") code = "UNSUPPORTED_DATA";
    if (issue.code === "too_big" && issue.origin === "array") code = "LIMIT_EXCEEDED";
    return {
      code: (params?.issueCode as IssueCode | undefined) ?? code,
      path: issue.path.map((part) => typeof part === "symbol" ? "<symbol>" : part),
      message: params ? issue.message : "Value does not match the v1 contract.",
      ...(params?.codePoint ? { codePoint: String(params.codePoint) } : {}),
    };
  });
}

export function parseStructure(input: unknown): Result<PortableDiagram> {
  const issue = inspectJson(input);
  if (issue) return fail(issue);
  if (input && typeof input === "object" && "document" in input && input.document &&
    typeof input.document === "object" && (!Object.hasOwn(input.document, "schemaVersion") ||
      !("schemaVersion" in input.document) || input.document.schemaVersion !== 1)) {
    return fail({ code: "UNSUPPORTED_VERSION", path: ["document", "schemaVersion"], message: "Only portable schema version 1 is supported." });
  }
  const parsed = portableSchema.safeParse(input);
  return parsed.success ? ok(parsed.data) : fail(...schemaIssues(parsed.error.issues));
}
