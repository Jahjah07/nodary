// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { rasterizePng, visualExportBusy } from "../../src/infrastructure/png-export";

const size = { width: 200, height: 100 };
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"/>';
function environment() {
  const clear = vi.fn(), revoke = vi.fn(), decode = vi.fn(async () => {});
  vi.stubGlobal("Image", class {
    naturalWidth = size.width;
    naturalHeight = size.height;
    decode = decode;
    removeAttribute = clear;
  });
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:png-fixture"), revokeObjectURL: revoke });
  const drawImage = vi.fn();
  const get = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  const blob = new Blob(["png"], { type: "image/png" });
  const encode = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((done) => { done(blob); });
  return { clear, revoke, decode, get, drawImage, encode, blob };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

test("PE-35/36 rejects invalid dimensions before allocation and releases resources after native failures", async () => {
  const browser = environment();
  expect(await rasterizePng(svg, { width: 1, height: 8193 })).toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED" }] });
  expect(await rasterizePng(svg, { width: 200.5, height: 100 })).toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED" }] });
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  browser.decode.mockRejectedValueOnce(Error("injected decode failure"));
  expect(await rasterizePng(svg, size)).toMatchObject({ ok: false, issues: [{ message: expect.stringContaining("decode") }] });
  expect(browser.get).not.toHaveBeenCalled();
  browser.get.mockReturnValueOnce(null);
  expect(await rasterizePng(svg, size)).toMatchObject({ ok: false, issues: [{ message: expect.stringContaining("canvas") }] });
  const first = browser.get.mock.contexts[0] as HTMLCanvasElement;
  expect([first.width, first.height]).toEqual([0, 0]);
  browser.encode.mockImplementationOnce((callback) => callback(null));
  expect(await rasterizePng(svg, size)).toMatchObject({ ok: false, issues: [{ message: expect.stringContaining("encode") }] });
  browser.encode.mockImplementationOnce(() => { throw Error("injected encode failure"); });
  expect(await rasterizePng(svg, size)).toMatchObject({ ok: false, issues: [{ code: "EXPORT_FAILED" }] });
  browser.encode.mockImplementationOnce((callback) => callback(new Blob(["not png"], { type: "text/plain" })));
  expect(await rasterizePng(svg, size)).toMatchObject({ ok: false, issues: [{ code: "EXPORT_FAILED" }] });
  const oversized = new Blob(["png"], { type: "image/png" });
  Object.defineProperty(oversized, "size", { value: (64 * 1024 * 1024) + 1 });
  browser.encode.mockImplementationOnce((callback) => callback(oversized));
  expect(await rasterizePng(svg, size)).toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED" }] });
  expect(await rasterizePng(svg, size)).toEqual({ ok: true, value: browser.blob });
  expect(browser.revoke).toHaveBeenCalledTimes(7);
  expect(browser.clear).toHaveBeenCalledTimes(7);
  expect(visualExportBusy()).toBe(false);
});

test("PE-35/36 timeout and cancellation ignore stale results and keep the allocation lock until native settlement", async () => {
  vi.useFakeTimers();
  const browser = environment();
  let settle!: BlobCallback;
  browser.encode.mockImplementationOnce((callback) => { settle = callback; });
  const timed = rasterizePng(svg, size, undefined, 20);
  await vi.advanceTimersByTimeAsync(20);
  expect(await timed).toMatchObject({ ok: false, issues: [{ code: "EXPORT_TIMEOUT" }] });
  expect(visualExportBusy()).toBe(true);
  expect((await rasterizePng(svg, size)).ok).toBe(false);
  expect(browser.revoke).not.toHaveBeenCalled();
  settle(browser.blob);
  await vi.advanceTimersByTimeAsync(0);
  expect(visualExportBusy()).toBe(false);
  expect(browser.revoke).toHaveBeenCalledOnce();
  const controller = new AbortController();
  browser.encode.mockImplementationOnce((callback) => { settle = callback; });
  const cancelled = rasterizePng(svg, size, controller.signal);
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  expect(await cancelled).toMatchObject({ ok: false, issues: [{ code: "EXPORT_CANCELLED" }] });
  expect(visualExportBusy()).toBe(true);
  settle(browser.blob);
  await vi.advanceTimersByTimeAsync(0);
  expect(visualExportBusy()).toBe(false);
  expect(browser.revoke).toHaveBeenCalledTimes(2);
});
