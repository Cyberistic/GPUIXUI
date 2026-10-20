/**
 * Guards the premises of the modal-veil pixel checks (plan `791`).
 *
 * The bug being guarded: the shipped `Dialog`/`Drawer` backdrop is named by no
 * scenario, so a transparent or surface-sized veil passes the suite. These tests
 * pin the composite the frame asserts (veil alpha over each page role), that a
 * negligible alpha cannot pass as a visible scrim, that the surface stays
 * distinct from the veiled page, and that a role collision is refused before a
 * frame is sampled. Each can fail: ignore the alpha, swap the arguments, or
 * collapse two roles.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { ThemeColors } from "@gpuixui/tokens";
import { palettes } from "../palettes.js";
import {
  ANCHORED_LAYER_BASE,
  distinctScrimRoles,
  routesDiffer,
  scrimFixtures,
  surfaceStandsOut,
  veiled,
  veilIsVisible,
} from "./scrim-pixels.js";

const TOLERANCE = 2;

const rgba = (hex: string): Pixels.Rgba => {
  const parsed = Pixels.hexToRgba(hex);
  if (Option.isNone(parsed)) {
    throw new Error(`unparseable test colour ${hex}`);
  }
  return parsed.value;
};

describe("veiled", () => {
  it("composites the dark veil over the page's primary role", () => {
    const dimmed = veiled(rgba("#000000A6"), rgba("#A7A9FF"));
    expect([dimmed.r, dimmed.g, dimmed.b]).toEqual([0x3a, 0x3b, 0x59]);
  });

  it("composites the same veil over the second page role", () => {
    const dimmed = veiled(rgba("#000000A6"), rgba("#3BC97F"));
    expect([dimmed.r, dimmed.g, dimmed.b]).toEqual([0x15, 0x46, 0x2c]);
  });

  it("leaves the page alone at zero alpha and becomes the veil at full", () => {
    const page = rgba("#A7A9FF");
    expect(Pixels.rgbaNear(veiled(rgba("#00000000"), page), page, 0)).toBe(
      true,
    );
    expect(
      Pixels.rgbaNear(veiled(rgba("#000000FF"), page), rgba("#000000"), 0),
    ).toBe(true);
  });

  it("is not symmetric, so swapped arguments cannot pass", () => {
    const dimmed = veiled(rgba("#000000A6"), rgba("#A7A9FF"));
    const swapped = veiled(rgba("#A7A9FFA6"), rgba("#000000"));
    expect(Pixels.rgbaNear(dimmed, swapped, TOLERANCE)).toBe(false);
  });
});

describe("veilIsVisible", () => {
  it("accepts the palette's alpha and rejects a negligible one", () => {
    const page = rgba("#A7A9FF");
    expect(veilIsVisible(rgba("#000000A6"), page, TOLERANCE)).toBe(true);
    expect(veilIsVisible(rgba("#00000002"), page, TOLERANCE)).toBe(false);
  });
});

describe("ANCHORED_LAYER_BASE", () => {
  it("is the measured neutral plane, and the veil darkens it to #090909", () => {
    expect(ANCHORED_LAYER_BASE).toBe("#1A1A1A");
    const plane = veiled(rgba("#000000A6"), rgba(ANCHORED_LAYER_BASE));
    expect([plane.r, plane.g, plane.b]).toEqual([0x09, 0x09, 0x09]);
  });
});

describe("routesDiffer", () => {
  it("separates the anchored plane from the in-window page composite", () => {
    expect(
      routesDiffer(
        rgba("#000000A6"),
        rgba(ANCHORED_LAYER_BASE),
        rgba("#A7A9FF"),
        TOLERANCE,
      ),
    ).toBe(true);
  });

  it("refuses a base that is the page colour, which would hide the route", () => {
    expect(
      routesDiffer(
        rgba("#000000A6"),
        rgba("#A7A9FF"),
        rgba("#A7A9FF"),
        TOLERANCE,
      ),
    ).toBe(false);
  });
});

describe("surfaceStandsOut", () => {
  it("keeps the modal surface away from the veiled page", () => {
    expect(
      surfaceStandsOut(
        rgba("#000000A6"),
        rgba("#A7A9FF"),
        rgba("#222730"),
        TOLERANCE,
      ),
    ).toBe(true);
  });

  it("rejects a surface that is the veiled page colour", () => {
    expect(
      surfaceStandsOut(
        rgba("#000000A6"),
        rgba("#A7A9FF"),
        veiled(rgba("#000000A6"), rgba("#A7A9FF")),
        TOLERANCE,
      ),
    ).toBe(false);
  });
});

describe("distinctScrimRoles", () => {
  it("accepts the dark palette's four painted roles", () => {
    expect(distinctScrimRoles(scrimFixtures(palettes.dark.colors))).toBe(true);
  });

  it("refuses a palette where two painted roles collide", () => {
    const fixtures = scrimFixtures(palettes.dark.colors);
    expect(distinctScrimRoles({ ...fixtures, second: fixtures.page })).toBe(
      false,
    );
  });
});

describe("scrimFixtures", () => {
  it("maps every role from the palette it is given, not from literals", () => {
    const colors: ThemeColors = {
      ...palettes.dark.colors,
      primary: "#010203",
      success: "#040506",
      popover: "#070809",
      overlay: "#0A0B0C99",
      background: "#0D0E0F",
    };
    expect(scrimFixtures(colors)).toEqual({
      page: "#010203",
      second: "#040506",
      modal: "#070809",
      veil: "#0A0B0C99",
      stage: "#0D0E0F",
    });
  });
});
