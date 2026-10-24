/**
 * The label role of this package's action vocabulary.
 *
 * `actionOnColor` tints a glyph, a busy mark or an effect's wash painted over an
 * action, so it has to be the role the action's own label paints. The adapter
 * used to answer with its own `Match` over `theme.colors.*` — a second role
 * table beside the primitives' variant table — so a variant whose label moved
 * there would keep the retired colour here, and a chevron on a filled control
 * would quietly lose its contrast. It reads the primitive's table now.
 *
 * `node:fs` is a test-time repository read, the boundary `button-edge.test.ts`
 * and `inventory.test.ts` already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  actionOnColor as primitiveActionOnColor,
  type ButtonVariant as PrimitiveVariant,
} from "@gpuixui/primitives/button";
import { darkTheme, lightTheme, type Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { actionOnColor, type ButtonVariant } from "./internal/button.js";

const adapter = (): string =>
  readFileSync(
    fileURLToPath(new URL("./internal/button.tsx", import.meta.url)),
    "utf8",
  );

/** This package's look names and the primitive's variant each stands for. */
const MAPPED: ReadonlyArray<readonly [ButtonVariant, PrimitiveVariant]> = [
  ["primary", "primary"],
  ["secondary", "secondary"],
  ["ghost", "ghost"],
  ["danger", "destructive"],
];

const THEMES: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

/** Every look that answers with a different role than the primitive's. */
const mismatches = (): ReadonlyArray<string> =>
  Arr.flatMap(THEMES, ([themeName, theme]) =>
    Arr.flatMap(MAPPED, ([look, variant]) => {
      const painted = actionOnColor(theme, look);
      const wanted = primitiveActionOnColor(theme, variant);
      return painted === wanted
        ? []
        : [`${themeName} ${look}: ${painted}, the primitive paints ${wanted}`];
    }),
  );

describe("the action's label role", () => {
  it("answers with the primitive's table for every look", () => {
    expect(mismatches()).toEqual([]);
  });

  it("paints a stored look name the table does not carry as the documented default", () => {
    // A variant is a stored choice as often as a literal, so a name this release
    // does not ship reaches the adapter at runtime. The table read threw a
    // `TypeError` before; the documented default is `secondary`.
    Arr.forEach(THEMES, ([themeName, theme]) => {
      // @ts-expect-error — a variant a store wrote, not the union the props declare.
      const painted = actionOnColor(theme, "tertiary");
      expect(
        `${themeName}: ${painted}`,
        `${themeName}: a stored look name paints the default`,
      ).toBe(`${themeName}: ${primitiveActionOnColor(theme, "secondary")}`);
    });
  });

  it("keeps no second role table of its own", () => {
    const source = adapter();
    expect(source).toContain("actionOnColor as primitiveActionOnColor");
    expect(source).toContain(
      "primitiveActionOnColor(theme, lookOf(variant).variant)",
    );
    expect(source).not.toContain("Match.value(variant)");
    Arr.forEach(
      ["primaryForeground", "secondaryForeground", "destructiveForeground"],
      (role) => {
        expect(source, role).not.toContain(`theme.colors.${role}`);
      },
    );
  });
});
