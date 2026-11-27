import { expect, test } from "vitest";
import { pngDimensions, svg, xmlText } from "../../prototypes/sp-04/scene";

test("SP-04 preserves safe Unicode and escapes XML text without stripping data", () => {
  expect(xmlText("<& > \n\t\u{1f680}")).toBe("&lt;&amp; &gt; \n\t\u{1f680}");
  for (const invalid of ["\0", "\r", "\u0081", "\ufffe", "\uffff", "\ud800", "\udc00"]) {
    expect(() => xmlText(invalid)).toThrow("Unsupported text character");
  }
});

test("SP-04 checks SVG and PNG dimensions before allocating raster memory", () => {
  expect(pngDimensions(4096, 2048, 1)).toEqual({ width: 4096, height: 2048 });
  expect(pngDimensions(2048, 2048, 2)).toEqual({ width: 4096, height: 4096 });
  expect(() => pngDimensions(4096, 2048, 2)).toThrow("raster budget");
  expect(() => pngDimensions(4097, 1, 2)).toThrow("raster budget");
  expect(() => svg("small", 2_100_001)).toThrow("dimension limit");
  expect(() => svg("small", Infinity)).toThrow("dimension limit");
});
