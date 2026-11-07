import { darkTheme, lightTheme, contrastRatio } from "@gpuixui/tokens";
import { Effect, Layer } from "effect";
import * as Option from "effect/Option";
import { ChildProcessSpawner } from "effect/process";
import { describe, expect, it } from "vitest";
import { readAppearance } from "./appearance.js";
import {
  accentColor,
  appearanceOverrides,
  decodeAppearance,
  type SystemAppearance,
} from "./logic.js";

const defaults = (answers: Readonly<Record<string, string>>) =>
  Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, {
    ...ChildProcessSpawner.make(() => Effect.die("only `string` is read")),
    string: (command) =>
      Effect.succeed(
        answers["args" in command ? (command.args[2] ?? "") : ""] ?? "",
      ),
  });

const read = (answers: Readonly<Record<string, string>>) =>
  Effect.runPromise(readAppearance.pipe(Effect.provide(defaults(answers))));

describe("reading the appearance", () => {
  it("reads this Mac's dark mode and purple accent", async () => {
    const appearance = await read({
      AppleInterfaceStyle: "Dark\n",
      AppleAccentColor: "4\n",
    });
    expect(appearance.mode).toBe("dark");
    expect(Option.getOrNull(appearance.accent)).toBe(4);
    expect(appearance.reduceTransparency).toBe(false);
  });

  it("reads an unset interface style as light, not a failure", async () => {
    expect((await read({})).mode).toBe("light");
  });

  it("reads Reduce Transparency when it is on", async () => {
    expect((await read({ reduceTransparency: "1" })).reduceTransparency).toBe(
      true,
    );
  });
});

describe("the accent", () => {
  it("maps AppKit's integers to their light and dark colours", () => {
    expect(Option.getOrNull(accentColor(Option.some(0), "light"))).toBe(
      "#FF3B30",
    );
    expect(Option.getOrNull(accentColor(Option.some(1), "dark"))).toBe(
      "#FF9F0A",
    );
    expect(Option.getOrNull(accentColor(Option.some(4), "dark"))).toBe(
      "#BF5AF2",
    );
  });

  it("keeps the theme's primary for an unset or unknown accent", () => {
    expect(Option.isNone(accentColor(Option.none(), "light"))).toBe(true);
    expect(Option.isNone(accentColor(Option.some(5), "light"))).toBe(true);
    expect(
      Option.isNone(
        decodeAppearance({
          interfaceStyle: "",
          accent: "blue",
          reduceTransparency: "",
        }).accent,
      ),
    ).toBe(true);
  });
});

describe("the theme edit", () => {
  const purple: SystemAppearance = {
    mode: "dark",
    accent: Option.some(4),
    reduceTransparency: false,
  };

  it("repaints primary, ring and selection with the accent", () => {
    const colors = appearanceOverrides(purple, darkTheme).colors;
    expect(colors?.primary).toBe("#BF5AF2");
    expect(colors?.ring).toBe("#BF5AF2");
    expect(colors?.selection).toBe("#BF5AF23D");
  });

  it("chooses the ink that reads on a light accent", () => {
    const yellow = {
      ...purple,
      mode: "light" as const,
      accent: Option.some(2),
    };
    const colors = appearanceOverrides(yellow, lightTheme).colors;
    expect(colors?.primaryForeground).toBe("#000000");
    expect(
      contrastRatio(colors?.primaryForeground, colors?.primary),
    ).toBeGreaterThan(4.5);
  });

  it("passes Reduce Transparency to the theme", () => {
    expect(
      appearanceOverrides({ ...purple, reduceTransparency: true }, darkTheme)
        .reduceTransparency,
    ).toBe(true);
  });
});
