export type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;

export function freeze<T>(value: T): Immutable<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value as Immutable<T>;
}
