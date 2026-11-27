import { z } from "zod";
import definitions from "../../docs/03-design/references/DGS-06_Component_Registry_v1.json";
import {
  boundaryType, colorSchema, edgeSchema, groupStyleSchema, handles, nodeStyleSchema, nodeTypes, sizeSchema, statusSchema,
} from "./contracts";
import { freeze, type Immutable } from "./immutable";

// DGS-06 trusted definitions. No portable document can inject a registry entry.
const fields = ["fill", "stroke", "strokeWidth", "strokeStyle", "text.color", "text.fontSize", "text.align", "fillOpacity"] as const;
const shared = {
  displayName: z.string().min(1), defaultSize: sizeSchema, minSize: sizeSchema,
  allowedHandles: z.array(z.enum(handles)), supportsStatus: z.boolean(), resizable: z.boolean(),
  editableStyleFields: z.array(z.enum(fields)), primitiveKey: z.string().min(1), iconKey: z.string().nullable(),
  textRegionKey: z.string().min(1), aspectRatio: z.number().positive().nullable(),
};
const registrySchema = z.strictObject({
  registryVersion: z.literal(1), diagramSchemaVersion: z.literal(1), description: z.string(),
  components: z.array(z.discriminatedUnion("entity", [
    z.strictObject({ ...shared, entity: z.literal("node"), type: z.enum(nodeTypes), defaultLabel: z.string(), defaultStyle: nodeStyleSchema }),
    z.strictObject({ ...shared, entity: z.literal("group"), type: z.literal(boundaryType), defaultTitle: z.string(), defaultStyle: groupStyleSchema }),
  ])),
  edgeDefaults: edgeSchema.pick({ label: true, route: true, arrows: true, style: true }),
  statuses: z.record(statusSchema, z.strictObject({ label: z.string(), marker: colorSchema, text: colorSchema, visible: z.boolean() })),
});

export type Component = z.infer<typeof registrySchema>["components"][number];
const registry = registrySchema.parse(definitions);
const expected = new Set<string>([...nodeTypes, boundaryType]);
for (const component of registry.components) {
  const { minSize: min, defaultSize: size, aspectRatio, allowedHandles } = component;
  const expectedHandles = component.entity === "group" || component.type === "general.text" || component.type === "general.note" ? 0 : handles.length;
  if (!expected.delete(component.type) || size.width < min.width || size.height < min.height ||
    (aspectRatio !== null && Math.abs(size.width / size.height - aspectRatio) > 1e-6) ||
    allowedHandles.length !== expectedHandles || new Set(allowedHandles).size !== expectedHandles ||
    component.supportsStatus !== component.type.startsWith("arch.")) {
    throw Error(`Invalid trusted DGS-06 definition for ${component.type}`);
  }
}
if (expected.size) throw Error("Incomplete trusted DGS-06 registry");

export const componentRegistry = freeze(registry);
const components = new Map(componentRegistry.components.map((component) => [component.type, component]));
export function componentFor(type: Component["type"]): Immutable<Component> {
  return components.get(type)!;
}
