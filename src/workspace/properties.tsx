import { createContext, useContext, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { propertyFields, propertyValue, type PropertyEdit, type PropertyField, type PropertyItem } from "../core/properties";
import { componentRegistry } from "../core/registry";

export type EditProperty = (edit: PropertyEdit, generation: number) => string | null;
export const DraftRegistration = createContext<((form: HTMLFormElement, resolve?: () => boolean) => void) | null>(null);
type Commit = (field: PropertyField, value: string | number, generation: number) => string | null;

const names: Record<PropertyField, string> = {
  label: "Label", fill: "Fill colour", fillOpacity: "Fill opacity", stroke: "Stroke colour", strokeWidth: "Stroke width",
  strokeStyle: "Stroke style", "text.color": "Text colour", "text.fontSize": "Font size", "text.align": "Text alignment",
  status: "Status", route: "Connector route", arrows: "Arrow direction", x: "X", y: "Y", width: "Width", height: "Height",
};
const options: Partial<Record<PropertyField, readonly (readonly [string, string])[]>> = {
  strokeStyle: [["solid", "Solid"], ["dashed", "Dashed"]],
  "text.align": [["left", "Left"], ["center", "Center"], ["right", "Right"]],
  route: [["orthogonal", "Orthogonal"], ["straight", "Straight"]],
  arrows: [["none", "None"], ["forward", "Forward"], ["both", "Both"]],
  status: Object.entries(componentRegistry.statuses).map(([key, status]) => [key, status.label] as const),
};
const colorFields = new Set<PropertyField>(["fill", "stroke", "text.color"]);
const numericFields = new Set<PropertyField>(["strokeWidth", "text.fontSize", "fillOpacity", "x", "y", "width", "height"]);
const colorPattern = /^#[0-9a-f]{6}$/i;

function Field({ field, name, current, generation, busy, commit, dismiss, autoFocus }: {
  field: PropertyField; name: string; current: string | number | undefined; generation: number; busy: boolean;
  commit: Commit; dismiss?(): void; autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState<{ value: string; generation: number }>();
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const composing = useRef(false);
  const registerDraft = useContext(DraftRegistration);
  const resolveDraft = useRef<() => boolean>(() => true);
  const dirty = !!draft;
  const initial = current === undefined ? "" : String(current);
  const value = draft?.value ?? initial;
  const color = colorFields.has(field), numeric = numericFields.has(field), multiline = field === "label";
  const choices = options[field];

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);

  function change(value: string) {
    setDraft((draft) => ({ value, generation: draft?.generation ?? generation }));
    setError("");
  }
  function cancel() {
    if (form.current) registerDraft?.(form.current);
    setDraft(undefined);
    setError("");
    dismiss?.();
  }
  function submit(value: string, version: number) {
    if (composing.current) return false;
    const raw = numeric ? value.trim() : value;
    if (numeric && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) {
      setError("Enter a finite number.");
      return false;
    }
    if (color && !colorPattern.test(raw)) {
      setError("Enter a colour as #RRGGBB.");
      return false;
    }
    const result = commit(field, numeric ? Number(raw) : color ? raw.toUpperCase() : raw, version);
    if (result) { setError(result); return false; }
    if (form.current) registerDraft?.(form.current);
    setDraft(undefined);
    setError("");
    dismiss?.();
    return true;
  }
  function blur(event: FocusEvent<HTMLFormElement>) {
    if (!draft || dismiss || event.currentTarget.contains(event.relatedTarget)) return;
    if (!submit(draft.value, draft.generation) && !composing.current) input.current?.focus({ preventScroll: true });
  }
  function key(event: KeyboardEvent<HTMLFormElement>) {
    if (event.nativeEvent.isComposing || composing.current) return;
    if (event.key === "Escape" && (draft || dismiss || error)) {
      event.preventDefault(); event.stopPropagation(); cancel();
    }
    if (event.key === "Enter" && multiline && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); submit(value, draft?.generation ?? generation);
    }
  }
  useEffect(() => {
    resolveDraft.current = () => {
      if (!draft) return true;
      if (submit(draft.value, draft.generation)) return true;
      input.current?.focus({ preventScroll: true });
      return false;
    };
  });
  useEffect(() => {
    const element = form.current;
    if (!element || !registerDraft || !dirty) return;
    registerDraft(element, () => resolveDraft.current());
    return () => registerDraft(element);
  }, [dirty, registerDraft]);
  const textProps = {
    value, placeholder: current === undefined ? "Mixed" : undefined, "aria-invalid": !!error,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(event.target.value),
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: () => { composing.current = false; },
    onKeyDown: (event: KeyboardEvent) => {
      if ((event.nativeEvent.isComposing || composing.current) && event.key === "Enter") event.preventDefault();
    },
    ref: input,
  };
  return <form ref={form} className="property-field" data-invalid={!!error}
    onSubmit={(event) => { event.preventDefault(); submit(value, draft?.generation ?? generation); }}
    onBlur={blur} onKeyDown={key}>
    <div className={color ? "property-color" : undefined}>
      <label>{name}
        {choices ? <select value={initial} disabled={busy} aria-invalid={!!error} onChange={(event) => submit(event.target.value, generation)}>
          {current === undefined && <option value="" disabled>Mixed</option>}
          {choices.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
        </select> : multiline ? <textarea {...textProps} rows={autoFocus ? 5 : 2} /> :
          <input {...textProps} inputMode={numeric ? "decimal" : "text"} autoComplete="off" spellCheck={false} />}
      </label>
      {color && <input type="color" aria-label={`Pick ${name.toLowerCase()}`} disabled={busy}
        value={colorPattern.test(value) ? value : "#000000"} onChange={(event) => change(event.target.value)} />}
    </div>
    {error && <p role="alert">{error}</p>}
    {!choices && (draft || dismiss) && <div className="property-actions">
      <button type="submit" className="button" disabled={busy}>Apply</button>
      <button type="button" className="button" onClick={cancel}>Cancel</button>
    </div>}
  </form>;
}

const fieldsInOrder: PropertyField[] = [
  "label", "status", "route", "arrows", "fill", "fillOpacity", "stroke", "strokeWidth", "strokeStyle",
  "text.color", "text.fontSize", "text.align", "x", "y", "width", "height",
];

function contrast(color: string, fill: string, opacity: number) {
  const rgb = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const luminance = (channels: number[]) => channels.map((x) => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const a = luminance(rgb(color)), b = luminance(rgb(fill).map((x) => x * opacity + 1 - opacity));
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export function PropertyControls({ items, generation, busy, onEdit }: {
  items: readonly PropertyItem[]; generation: number; busy: boolean; onEdit: EditProperty;
}) {
  const ids = items.map(({ id }) => id);
  const single = items.length === 1;
  const capabilities = items.map((item) => propertyFields(item, single));
  const field = (name: PropertyField) => {
    if (!capabilities.every((values) => values.includes(name))) return null;
    const values = items.map((item) => propertyValue(item, name));
    const item = items[0];
    return <Field key={name} field={name} name={name === "label" && "title" in item ? "Boundary title" : names[name]}
      current={values.every((value) => value === values[0]) ? values[0] : undefined} generation={generation} busy={busy}
      commit={(field, value, version) => onEdit({ ids, field, value }, version)} />;
  };
  if (!items.length) return null;
  const item = items[0];
  const lowContrast = single && "fill" in item.style &&
    contrast(item.style.text.color, item.style.fill, "fillOpacity" in item.style ? item.style.fillOpacity : 1) < 4.5;
  return <div className="property-controls" aria-label="Editable properties" key={JSON.stringify(ids)}>
    {fieldsInOrder.slice(0, 12).map(field)}
    {lowContrast && <p className="property-contrast">Low text contrast against the current fill.</p>}
    {single && "position" in item && <fieldset><legend>{item.parentId ? "Parent-relative geometry" : "World geometry"}</legend>
      {fieldsInOrder.slice(12).map(field)}
    </fieldset>}
  </div>;
}

export function LabelDialog({ item, generation, onEdit, close }: {
  item: PropertyItem; generation: number; onEdit: EditProperty; close(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="workspace-dialog" aria-labelledby="label-edit-title" onClose={close}>
    <div className="dialog-heading"><h2 id="label-edit-title">{"title" in item ? "Edit boundary title" : "Edit label"}</h2></div>
    <Field field="label" name={"title" in item ? "Boundary title" : "Label"} autoFocus generation={generation}
      current={propertyValue(item, "label")} busy={false} dismiss={() => dialog.current?.close()}
      commit={(field, value, version) => onEdit({ ids: [item.id], field, value }, version)} />
  </dialog>;
}
