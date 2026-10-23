/**
 * `QrCode` — the symbol it paints, the box it reserves and the refusal it owes
 * a value that does not fit.
 *
 * The bug guarded: the component must paint the encoder's own matrix as one
 * tinted `<svg>` mask with the quiet zone inside the viewBox, never a themed
 * approximation of a QR code — a symbol whose modules are clipped or whose
 * paper follows a dark theme cannot be scanned. The over-long case must name
 * the capacity instead of painting a truncated (unreadable) symbol, announce
 * that refusal rather than an image of a symbol that is not painted, and keep
 * the box its caller reserved so the page does not jump as a value grows.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { encodeQr, qrByteCapacity, QrSymbol } from "./qr/encode.js";
import type { QrLevel } from "./qr/encode.js";
import {
  QR_INK,
  QR_PAPER,
  qrOverflowMessage,
  renderQrCode,
} from "./qr-code.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  findByTestId,
  hostProp,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const render = (props: object = {}) =>
  renderQrCode(
    { value: "Hello, World!", testId: "qr", label: "Docs QR", ...props },
    lightTheme,
  );

const svgOf = (root: ReturnType<typeof render>) =>
  expectSome(findByTestId(root, "qr-code-svg"));

const sourceOf = (root: ReturnType<typeof render>): string =>
  String(expectSome(hostProp(svgOf(root), "source")));

const darkModules = (
  value: string,
  level: "L" | "M" | "Q" | "H" = "M",
): number => {
  const symbol = encodeQr(value, { level });
  if (!(symbol instanceof QrSymbol)) return expect.fail("no symbol");
  return symbol.matrix.reduce(
    (total, row) => total + row.filter((dark) => dark).length,
    0,
  );
};

describe("QrCode", () => {
  it("paints one tinted svg mask on scanner paper", () => {
    const root = render();
    expect(expectSome(hostTag(root))).toBe("div");
    expect(expectSome(elementProp(root, "role"))).toBe("img");
    expect(expectSome(elementProp(root, "aria-label"))).toBe("Docs QR");
    expect(expectSome(hostStyleString(root, "backgroundColor"))).toBe(QR_PAPER);
    const svg = svgOf(root);
    expect(expectSome(hostTag(svg))).toBe("svg");
    expect(expectSome(hostStyleString(svg, "color"))).toBe(QR_INK);
    expect(expectSome(hostProp(svg, "style"))).toMatchObject({ width: 145 });
  });

  it("reads a blank name as the default, never an unnamed image", () => {
    // The bug guarded: a stored blank label published `role="img"` with an
    // empty name, so assistive technology met an image that said nothing.
    Arr.forEach(["", "   "], (label) => {
      const root = render({ label });
      expect(expectSome(elementProp(root, "aria-label"))).toBe("QR code");
    });
  });

  it("reads a value that is not text as nothing, never the word null", () => {
    // The bug guarded: `TextEncoder` stringifies whatever it is handed, so a
    // value restored from storage as `null` encoded the four bytes of "null" —
    // a symbol a scanner reads back as a payload the record never carried.
    const stored = render({ value: null as unknown as string });
    const empty = render({ value: "" });
    expect(sourceOf(stored)).toBe(sourceOf(empty));
    expect(sourceOf(stored)).not.toBe(sourceOf(render({ value: "null" })));
  });

  it("carries every dark module and the four-module quiet zone", () => {
    const source = sourceOf(render());
    expect(source).toContain('viewBox="0 0 29 29"');
    expect(source.match(/M/g) ?? []).toHaveLength(darkModules("Hello, World!"));
    expect(source).toContain('fill="#000"');
  });

  it("reserves the module-aligned box, never the raw side", () => {
    const root = render({ size: 160 });
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      width: 145,
      height: 145,
    });
  });

  it("keeps a box smaller than the module grid at the caller's side", () => {
    // The bug guarded: a thumbnail grid that reserved 20 points for a 29-cell
    // symbol was painted a 29-point frame, so the symbol overflowed its box.
    const root = render({ size: 20 });
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      width: 20,
      height: 20,
    });
    expect(expectSome(hostProp(svgOf(root), "style"))).toMatchObject({
      width: 20,
      height: 20,
    });
  });

  it("reads a stored level the union does not name as the default", () => {
    // The bug guarded: a stored level reached the encoder's block table as an
    // unknown name and threw out of the render; the boundary reads it as `M`.
    const stored = "X" as QrLevel;
    expect(sourceOf(render({ level: stored }))).toBe(sourceOf(render()));
  });

  it("paints the level's own symbol, not the smallest one", () => {
    const value = "a".repeat(qrByteCapacity(1, "L"));
    const high = encodeQr(value, { level: "H" });
    if (!(high instanceof QrSymbol)) return expect.fail("no symbol");
    const cells = high.modules + 8;
    expect(sourceOf(render({ value, level: "L" }))).toContain(
      'viewBox="0 0 29 29"',
    );
    expect(sourceOf(render({ value, level: "H" }))).toContain(
      `viewBox="0 0 ${cells} ${cells}"`,
    );
    expect(cells).toBeGreaterThan(29);
  });

  it("drops the quiet zone and its box when the caller asks", () => {
    const root = render({ quietZone: 0 });
    expect(sourceOf(root)).toContain('viewBox="0 0 21 21"');
    expect(expectSome(hostProp(svgOf(root), "style"))).toMatchObject({
      width: 147,
    });
  });

  it("names the capacity of a value that does not fit", () => {
    const capacity = qrByteCapacity(10, "M");
    const root = render({ value: "y".repeat(capacity + 1) });
    expect(expectSome(hostTag(root))).toBe("div");
    expect(Option.isNone(findByTestId(root, "qr-code-svg"))).toBe(true);
    expect(expectSome(hostStyleString(root, "borderColor"))).toBe(
      lightTheme.colors.destructive,
    );
    const text = elementChildren(root)[0];
    expect(text).toBeDefined();
    if (text === undefined) return;
    expect(expectSome(elementProp(text, "children"))).toBe(
      qrOverflowMessage(capacity + 1, capacity),
    );
  });

  it("announces the refusal as an alert, not as an image", () => {
    // The bug guarded: the overflow box carried `role="img"` and the symbol's
    // label, so assistive technology heard "QR code" for a state whose visible
    // text is the capacity refusal — the one thing the reader needs.
    const capacity = qrByteCapacity(10, "M");
    const root = render({ value: "y".repeat(capacity + 1), label: "Docs QR" });
    expect(expectSome(elementProp(root, "role"))).toBe("alert");
    expect(Option.isNone(elementProp(root, "aria-label"))).toBe(true);
  });

  it("keeps the box the caller reserved in the overflow state", () => {
    const capacity = qrByteCapacity(10, "M");
    const root = render({
      value: "y".repeat(capacity + 1),
      style: { width: 240, height: 90 },
    });
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      width: 240,
      height: 90,
    });
  });

  it("keeps the square the caller asked for in the overflow state", () => {
    // The bug guarded: `size` is how a thumbnail grid reserves a cell, and the
    // refusal ignored it, so the box collapsed to its message while the symbol
    // it replaced had held a square. The refusal reserves the same square.
    const capacity = qrByteCapacity(10, "M");
    const root = render({
      value: "y".repeat(capacity + 1),
      size: 240,
    });
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      minWidth: 240,
      minHeight: 240,
    });
  });

  it("reads a size it cannot lay out as the default in the overflow state", () => {
    const capacity = qrByteCapacity(10, "M");
    const root = render({
      value: "y".repeat(capacity + 1),
      size: Number.NaN,
    });
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      minWidth: 160,
      minHeight: 160,
    });
  });

  it("reads a stored quiet zone it cannot lay out as the default", () => {
    const root = render({ quietZone: Number.NaN });
    expect(sourceOf(root)).toContain('viewBox="0 0 29 29"');
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      width: 145,
      height: 145,
    });
  });

  it("reads a negative quiet zone as the default, not as no quiet zone", () => {
    const root = render({ quietZone: -4 });
    expect(sourceOf(root)).toContain('viewBox="0 0 29 29"');
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      width: 145,
      height: 145,
    });
  });
});
