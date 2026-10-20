/**
 * Guards the premises of the docking indicator's pixel checks (plan `715`).
 *
 * The bug being guarded: `docking-layout` asserted the indicator's box and its
 * authored `backgroundColor`, so a bar painted **under** the pane's tab strip or
 * body passed every check. These tests pin where the frame is sampled and what
 * the centre zone's 18 % overlay must composite to, so a hardcoded point, an
 * opaque assumption or a swapped blend cannot pass.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { getTheme } from "@gpuixui/tokens";
import {
  BESIDE_GAP,
  CENTRE_OPACITY,
  dockBarSamples,
  dockCentrePoint,
  type DockPalette,
  INSET,
} from "./dock-pixels.js";

const theme = getTheme("dark");
const palette: DockPalette = {
  primary: theme.colors.primary,
  card: theme.colors.card,
  muted: theme.colors.muted,
};

/** A parse failure becomes an impossible colour, so an expectation fails loudly. */
const rgba = (hex: string): Pixels.Rgba =>
  Option.getOrElse(
    Pixels.hexToRgba(hex),
    () => new Pixels.Rgba({ r: -1, g: -1, b: -1, a: -1 }),
  );

/** The bar the live probe holds: 4 px at the editor's right edge, full height. */
const BAR = { x: 1000, y: 120, width: 4, height: 320 } as const;
/** The editor's only tab: the strip's row follows its own box. */
const TAB = { x: 612, y: 122, width: 60, height: 22 } as const;
const GROUP = { x: 600, y: 120, width: 404, height: 320 } as const;

const inside = (
  box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  point: { readonly x: number; readonly y: number },
): boolean =>
  point.x >= box.x &&
  point.x <= box.x + box.width &&
  point.y >= box.y &&
  point.y <= box.y + box.height;

describe("dockBarSamples", () => {
  it("samples the bar at its own centre and at the strip's row", () => {
    const samples = dockBarSamples(BAR, TAB);
    expect(inside(BAR, samples.barBody.point)).toBe(true);
    expect(inside(BAR, samples.barStrip.point)).toBe(true);
    expect(samples.barBody.point.x).toBe(BAR.x + INSET);
    expect(samples.barStrip.point.y).toBe(TAB.y + TAB.height / 2);
  });

  it("samples inside the pane, clear of the bar, on the same two rows", () => {
    const samples = dockBarSamples(BAR, TAB);
    expect(samples.bodyBeside.point.x).toBe(BAR.x - BESIDE_GAP);
    expect(inside(GROUP, samples.bodyBeside.point)).toBe(true);
    expect(inside(GROUP, samples.stripBeside.point)).toBe(true);
    expect(inside(BAR, samples.bodyBeside.point)).toBe(false);
    expect(samples.bodyBeside.point.y).toBe(samples.barBody.point.y);
    expect(samples.stripBeside.point.y).toBe(samples.barStrip.point.y);
  });

  it("follows the runtime's boxes instead of a hardcoded point", () => {
    const moved = dockBarSamples(
      { ...BAR, x: BAR.x + 40 },
      { ...TAB, y: TAB.y + 10 },
    );
    const original = dockBarSamples(BAR, TAB);
    expect(moved.bodyBeside.point.x).toBe(original.bodyBeside.point.x + 40);
    expect(moved.barStrip.point.y).toBe(original.barStrip.point.y + 10);
  });
});

describe("dockCentrePoint", () => {
  it("sits inside the pane, clear of its label and border", () => {
    const point = dockCentrePoint(GROUP);
    expect(inside(GROUP, point)).toBe(true);
    expect(point.x).toBe(GROUP.x + GROUP.width / 2);
    expect(point.y).toBe(GROUP.y + GROUP.height - 40);
    expect(point.y).toBeGreaterThan(GROUP.y + 40);
  });
});

describe("the centre zone's composite", () => {
  it("is the primary token at 18 % over the body, and neither input", () => {
    const blended = Pixels.blendOver(
      rgba(palette.primary),
      CENTRE_OPACITY,
      rgba(palette.card),
    );
    expect([blended.r, blended.g, blended.b, blended.a]).toEqual([
      51, 54, 76, 255,
    ]);
    expect(blended).not.toEqual(rgba(palette.card));
    expect(blended).not.toEqual(rgba(palette.primary));
  });

  it("has three palette tokens that parse", () => {
    expect(
      Option.isSome(Pixels.hexToRgba(palette.primary)) &&
        Option.isSome(Pixels.hexToRgba(palette.card)) &&
        Option.isSome(Pixels.hexToRgba(palette.muted)),
    ).toBe(true);
    expect(new Set([palette.primary, palette.card, palette.muted]).size).toBe(
      3,
    );
  });
});
