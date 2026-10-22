/**
 * Guards the rule the `theme-switch-lifecycle` probe measures.
 *
 * The probe switches a window's provider between the three palettes and the
 * platform looks, then reads a role's fill off the frame and an `md` control's
 * height off the layout. This fixture is the whole premise of those checks: the
 * cycle has to reach every palette and every platform the tokens table ships, a
 * platform's density has to differ from the base one (or the height check could
 * pass on a look that was never applied), and every state's role has to be a
 * colour a captured frame can hold. Each case below fails when one of those
 * stops being true.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import {
  densityPresets,
  platformNames,
  platformStyles,
  type PlatformName,
} from "@gpuixui/tokens";
import { Pixels } from "@gpuixui/testing";
import { nextPalette, paletteIds, type PaletteId } from "../palettes.js";
import {
  THEME_CARD,
  THEME_CARD_PADDING,
  THEME_PAGE,
  THEME_PAGE_PADDING,
  THEME_SAMPLE_INSET,
  controlHeight,
  nextPlatformInCycle,
  paletteCycle,
  platformCycle,
  roleColour,
  sameColour,
  themeCardPoint,
  themeFor,
  themePagePoint,
} from "./theme-switch.js";

/** The palette the shell opens in, and the one the probe starts from. */
const FIRST_PALETTE: PaletteId = "dark";

/** The platform the shell opens in, and the one the probe starts from. */
const FIRST_PLATFORM: PlatformName = "default";

/** The ids a closed cycle reaches, starting at `first`, in visiting order. */
const cycleWalk = <A extends string>(
  first: A,
  steps: number,
  next: (step: A) => A,
): ReadonlyArray<A> => {
  const [visited] = Arr.range(1, steps).reduce<readonly [ReadonlyArray<A>, A]>(
    ([list, last]) => {
      const value = next(last);
      return [[...list, value], value];
    },
    [[first], first],
  );
  return visited;
};

/** Sorted names, so a set comparison reads as one. */
const sorted = (names: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(names, Order.String);

describe("the theme-switch fixture", () => {
  it("walks every palette exactly once before returning to the start", () => {
    const visited = cycleWalk<PaletteId>(
      FIRST_PALETTE,
      paletteIds.length,
      (palette) => nextPalette[palette],
    );
    expect(sorted([...new Set(visited)])).toEqual(sorted(paletteIds));
    expect(Arr.last(visited)).toEqual(Option.some(FIRST_PALETTE));
    expect(paletteCycle).toEqual(paletteIds);
  });

  it("walks every platform the tokens table ships exactly once", () => {
    const visited = cycleWalk<PlatformName>(
      FIRST_PLATFORM,
      platformNames.length,
      (platform) => nextPlatformInCycle[platform],
    );
    expect(sorted([...new Set(visited)])).toEqual(sorted(platformNames));
    expect(Arr.last(visited)).toEqual(Option.some(FIRST_PLATFORM));
    expect(sorted(platformCycle)).toEqual(sorted(platformNames));
  });

  it("gives each platform a density the control height can show", () => {
    const heights = Arr.map(platformCycle, (platform) =>
      controlHeight(themeFor(FIRST_PALETTE, platform)),
    );
    expect(heights).toEqual(
      Arr.map(
        platformCycle,
        (platform) =>
          densityPresets[platformStyles[platform].density].controlHeight.md,
      ),
    );
    // A look that kept the base density would make the height check unable to
    // tell a switch from a no-op: the probe's platform presses have to move.
    expect(new Set(heights).size).toBeGreaterThanOrEqual(3);
  });

  it("paints a platform palette that differs from the base one", () => {
    const base = roleColour(
      themeFor(FIRST_PALETTE, FIRST_PLATFORM),
      "background",
    );
    const differs = (colour: Option.Option<Pixels.Rgba>): boolean =>
      Option.match(base, {
        onNone: () => false,
        onSome: (reference) =>
          Option.match(colour, {
            onNone: () => false,
            onSome: (value) => !sameColour(value, reference),
          }),
      });
    const differing = Arr.filter(platformNames, (platform) =>
      differs(roleColour(themeFor(FIRST_PALETTE, platform), "background")),
    );
    expect(differing).toEqual(["darwin", "linux", "win32"]);
  });

  it("reserves a high-contrast palette while applying a look's density", () => {
    // `applyStyle`'s rule: accessibility outranks the look, so the page keeps the
    // high-contrast fill while the control takes the platform's height. The
    // probe asserts both halves after a platform press.
    const high = themeFor("high", FIRST_PLATFORM);
    const darwin = themeFor("high", "darwin");
    expect(darwin.colors.background).toBe(high.colors.background);
    expect(controlHeight(darwin)).not.toBe(controlHeight(high));
  });

  it("samples inside the padding the points claim", () => {
    const page = { x: 20, y: 30, ...THEME_PAGE };
    const card = { x: 36, y: 46, ...THEME_CARD };
    const pagePoint = themePagePoint(page);
    expect(pagePoint.x).toBeGreaterThanOrEqual(page.x + THEME_SAMPLE_INSET);
    expect(pagePoint.y).toBeGreaterThan(
      page.y + page.height - THEME_PAGE_PADDING,
    );
    expect(pagePoint.y).toBeLessThanOrEqual(
      page.y + page.height - THEME_SAMPLE_INSET,
    );

    const cardPoint = themeCardPoint(card);
    expect(cardPoint.x).toBeGreaterThan(
      card.x + card.width - THEME_CARD_PADDING,
    );
    expect(cardPoint.x).toBeLessThan(card.x + card.width);
    expect(cardPoint.y).toBe(card.y + card.height / 2);
  });

  it("names a paint-ready colour for every state the probe visits", () => {
    const states = Arr.flatMap(paletteCycle, (palette) =>
      Arr.map(platformCycle, (platform) => [palette, platform] as const),
    );
    expect(
      Arr.filter(states, ([palette, platform]) => {
        const theme = themeFor(palette, platform);
        return (
          Option.isNone(roleColour(theme, "background")) ||
          Option.isNone(roleColour(theme, "card"))
        );
      }),
    ).toEqual([]);
  });
});
