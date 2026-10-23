/**
 * `QrCode` — the symbol it paints, the box it reserves and the refusal it owes
 * a value that does not fit.
 *
 * The bug guarded: the component must paint the encoder's own matrix as one
 * tinted `<svg>` mask with the quiet zone inside the viewBox, never a themed
 * approximation of a QR code — a symbol whose modules are clipped or whose
 * paper follows a dark theme cannot be scanned. The over-long case must name
 * the capacity instead of painting a truncated (unreadable) symbol.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { encodeQr, qrByteCapacity, QrSymbol } from "./qr/encode.js";
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
});
