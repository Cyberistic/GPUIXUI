/**
 * The fade a disabled part paints, held to the one measured share.
 *
 * The bug these guard: thirteen parts copied `opacity: disabled ? 0.5 : 1` into
 * their own style, and `TagInputChip` faded by **0.6** — a share no token names
 * and no report composites — so a change to `@gpuixui/tokens`' `disabledOpacity`
 * (the share `disabledFadeFailures` measures) would have left every disabled
 * search field, tab, menu trigger and picker painting the old value. The seam's
 * `disabledFade` is the one declaration now, and the contract side is read here
 * too: a composite field fades the page role as its own fill, so the fade only
 * means something while `disabledFadePairs` composites that fill.
 *
 * `node:fs` is a test-time repository read, the boundary `docs.test.ts` and
 * `badge-page.test.ts` already use.
 */

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

/** One source file this suite scans. */
interface Source {
  readonly file: string;
  readonly text: string;
}

/** The build output and the package-manager tree are never sources. */
const SKIPPED_DIRECTORIES: ReadonlyArray<string> = ["node_modules", "dist"];

/** Every non-test source under `src/`, read in the pass that lists it. */
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

/** A numeric opacity painted from a `disabled` branch. */
const LITERAL_FADE = /opacity:\s*[^,\n]*\bdisabled\b[^,\n]*\?\s*[\d.]+/;

/** The parts that fade while disabled, and must therefore read the share. */
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
    // The premise: the share is a design constant, not a value a part may pick.
    expect(disabledOpacity).toBeLessThan(1);
  });

  it("leaves no part with its own copy of the share", () => {
    // The scan reads more than the parts listed below, so it cannot pass by
    // finding nothing.
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
    // And the seam itself takes its number from the token package, so the guard
    // above cannot pass on a second hardcoded share.
    expect(read("internal/theme.ts")).toContain("opacity: disabledOpacity");
  });

  it("teaches the one share in the shared spec", () => {
    // The page a consumer reads instead of the source: it must name the seam,
    // the token share it stands on, the one-fade-per-control rule and this
    // suite, or the next part copies a number again.
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
    // A composite field paints the page role as its own fill; the fade is only
    // held to a floor while the contract composites that fill with both labels.
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
