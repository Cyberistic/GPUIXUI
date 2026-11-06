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

const MAPPED: ReadonlyArray<readonly [ButtonVariant, PrimitiveVariant]> = [
  ["primary", "primary"],
  ["secondary", "secondary"],
  ["ghost", "ghost"],
  ["danger", "destructive"],
  ["link", "link"],
];

const THEMES: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

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
