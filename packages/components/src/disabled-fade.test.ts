import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  contrastFloors,
  disabledFadeFailures,
  disabledFadePairs,
  disabledOpacity,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { darkTheme, disabledFade, lightTheme } from "./internal/theme.js";

const sourceRoot = fileURLToPath(new URL("./", import.meta.url));

const read = (path: string): string =>
  readFileSync(`${sourceRoot}${path}`, "utf8");

interface Source {
  readonly file: string;
  readonly text: string;
}

const SKIPPED_DIRECTORIES: ReadonlyArray<string> = ["node_modules", "dist"];

const walk = (directory: string, prefix: string): ReadonlyArray<Source> =>
  Arr.flatten(
    Arr.map(
      readdirSync(directory, { withFileTypes: true }),
      (entry): ReadonlyArray<Source> => {
        const file = `${prefix}${entry.name}`;
        if (entry.isDirectory()) {
          return Arr.contains(SKIPPED_DIRECTORIES, entry.name)
            ? []
            : walk(`${directory}${entry.name}/`, `${file}/`);
        }
        return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")
          ? [{ file, text: read(file) }]
          : [];
      },
    ),
  );

const sources = walk(sourceRoot, "");

const LITERAL_FADE = /opacity:\s*[^,\n]*\bdisabled\b[^,\n]*\?\s*[\d.]+/;

const FADING_PARTS: ReadonlyArray<string> = [
  "accordion.tsx",
  "collapsible.tsx",
  "color-picker.tsx",
  "combobox.tsx",
  "context-menu.tsx",
  "hotkey-recorder.tsx",
  "inline-edit.tsx",
  "mention-input.tsx",
  "search-input.tsx",
  "tabs.tsx",
  "tag-input.tsx",
  "time-picker.tsx",
];

describe("the disabled fade", () => {
  it("paints the measured share, and nothing while the part can act", () => {
    expect(disabledFade(false)).toBeUndefined();
    expect(disabledFade(true)).toEqual({ opacity: disabledOpacity });

    expect(disabledOpacity).toBeLessThan(1);
  });

  it("leaves no part with its own copy of the share", () => {
    expect(Arr.length(sources)).toBeGreaterThan(100);
    const offenders = Arr.map(
      Arr.filter(sources, ({ text }) => LITERAL_FADE.test(text)),
      ({ file }) => file,
    );

    expect(offenders).toEqual([]);
  });

  it("fades every part that declares a disabled state through the seam", () => {
    const missing = Arr.filter(
      FADING_PARTS,
      (file) => !read(file).includes("disabledFade("),
    );

    expect(missing).toEqual([]);

    expect(read("internal/theme.ts")).toContain("opacity: disabledOpacity");
  });

  it("teaches the one share in the shared spec", () => {
    const spec = readFileSync(
      fileURLToPath(new URL("../../../docs/component-api.md", import.meta.url)),
      "utf8",
    );

    expect(spec).toContain("disabledFade(disabled)");
    expect(spec).toContain("`disabledOpacity`");
    expect(spec).toContain("One fade per control");
    expect(spec).toContain("src/disabled-fade.test.ts");
  });

  it("measures the fill a composite field fades", () => {
    const placements = Arr.flatMap(["input", "background"] as const, (fill) =>
      Arr.map(["inputForeground", "placeholder"] as const, (label) => ({
        fill,
        label,
        over: "background",
      })),
    );

    Arr.forEach(placements, (placement) =>
      expect(disabledFadePairs).toContainEqual(placement),
    );
    Arr.forEach([lightTheme, darkTheme], (theme) =>
      expect(disabledFadeFailures(theme)).toEqual([]),
    );
    expect(contrastFloors.disabled).toBeGreaterThan(1);
  });
});
