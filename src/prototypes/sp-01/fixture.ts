// DGS-03 SP-01 uses a synthetic ID and a short identifier for the phase prompt.
const fixtureId = "00000000-0000-4000-8000-000000000001";

export const fixtureEditorHref = `/editor/?id=${fixtureId}`;

export function isSampleFixture(id: string | null): boolean {
  return id === fixtureId || id === "fixture";
}
