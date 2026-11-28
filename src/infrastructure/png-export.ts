import type { Size } from "../core/contracts";
import { fail, ok, type Issue, type Result } from "../core/validation";

export type PngScale = 1 | 2;
const pixelLimit = 16_777_216;
const edgeLimit = 8192;
const blobLimit = 64 * 1024 * 1024;
const problem = (code: Issue["code"], message: string): Issue => ({ code, message, path: [] });

// DGS-08 §10. Check dimensions and area before acquiring a canvas or decoding an image.
export function pngDimensions(world: Size, scale: PngScale): Result<Size> {
  const width = Math.ceil(world.width * scale), height = Math.ceil(world.height * scale);
  if ((scale !== 1 && scale !== 2) || ![width, height].every((n) => Number.isSafeInteger(n) && n > 0) ||
    width > edgeLimit || height > edgeLimit || width * height > pixelLimit) {
    return fail(problem("LIMIT_EXCEEDED", "PNG exceeds the 8,192 px edge or 16,777,216 pixel area limit."));
  }
  return ok({ width, height });
}

let active = false;
export const visualExportBusy = () => active;

export function rasterizePng(svg: string, pixels: Size, signal?: AbortSignal, timeout = 30_000): Promise<Result<Blob>> {
  const dimensions = pngDimensions(pixels, 1);
  if (!dimensions.ok || !Number.isInteger(pixels.width) || !Number.isInteger(pixels.height)) {
    return Promise.resolve(fail(problem("LIMIT_EXCEEDED", "The raster dimensions are outside the PNG limits.")));
  }
  if (active) return Promise.resolve(fail(problem("EXPORT_FAILED", "A previous visual export is still finishing.")));
  const cancelled = problem("EXPORT_CANCELLED", "Export cancelled.");
  if (signal?.aborted) return Promise.resolve(fail(cancelled));
  active = true;
  let stopped: Issue | undefined;
  let abortDecode: (() => void) | undefined;
  let finish: (result: Result<Blob>) => void;
  const interruption = new Promise<Result<Blob>>((resolve) => { finish = resolve; });
  function stop(issue: Issue) {
    stopped ??= issue;
    finish(fail(stopped));
    abortDecode?.();
  }
  const timer = setTimeout(() => stop(problem("EXPORT_TIMEOUT", "PNG generation timed out. Try 1×, SVG or editable JSON.")), timeout);
  const abort = () => stop(cancelled);
  signal?.addEventListener("abort", abort, { once: true });
  const work = (async (): Promise<Result<Blob>> => {
    let url: string | undefined;
    let image: HTMLImageElement | undefined;
    let canvas: HTMLCanvasElement | undefined;
    try {
      url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      image = new Image();
      image.src = url;
      abortDecode = () => image?.removeAttribute("src");
      try { await image.decode(); }
      catch { return fail(stopped ?? problem("EXPORT_FAILED", "The browser could not decode the SVG scene for PNG.")); }
      abortDecode = undefined;
      if (stopped) return fail(stopped);
      if (image.naturalWidth !== pixels.width || image.naturalHeight !== pixels.height) {
        return fail(problem("EXPORT_FAILED", "The decoded SVG dimensions did not match the requested PNG."));
      }
      canvas = document.createElement("canvas");
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      const context = canvas.getContext("2d");
      if (!context || canvas.width !== pixels.width || canvas.height !== pixels.height) {
        return fail(problem("EXPORT_FAILED", "The browser could not allocate the PNG canvas."));
      }
      context.drawImage(image, 0, 0, pixels.width, pixels.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, "image/png"));
      if (stopped) return fail(stopped);
      if (!blob?.size || blob.type !== "image/png") return fail(problem("EXPORT_FAILED", "The browser could not encode the PNG."));
      if (blob.size > blobLimit) return fail(problem("LIMIT_EXCEEDED", "The PNG exceeds the 64 MiB output limit."));
      return ok(blob);
    } catch {
      return fail(stopped ?? problem("EXPORT_FAILED", "The browser could not generate the PNG. Try SVG or editable JSON."));
    } finally {
      abortDecode = undefined;
      if (image) image.removeAttribute("src");
      if (url) URL.revokeObjectURL(url);
      if (canvas) canvas.width = canvas.height = 0;
      active = false;
    }
  })();
  return Promise.race([work, interruption]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  });
}
