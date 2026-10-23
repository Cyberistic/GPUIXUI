import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/keyboard` documents `@gpuixui/keyboard`, and its React row named
 * `CommandRegistryProvider` and `useCommandRegistry` without the specifier they
 * live at: the root entry point exports neither, so a reader who copied the one
 * import the page showed got `does not export CommandRegistryProvider`. The
 * package has published `@gpuixui/keyboard/react` since the provider landed.
 *
 * The page now states the specifier and carries a snippet that resolves; this
 * guard reads the package's `exports` map and the values its React module
 * declares, so a new entry point or a renamed hook fails until the page names
 * it. It also holds the warning to the truth: the root index must still omit
 * the provider, because the sentence would be wrong the day it re-exported one.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 *
 * The page also teaches the six grammar helpers the root re-exports, because
 * the page named the modules and left out the half a caller actually reaches
 * for — validating a stored binding, normalising a recorded chord, rejecting a
 * modifier-only press, painting keycaps. Those cases read the export block, the
 * platform seam, the `parts: true` alias and the shipped recorder, so the page
 * cannot describe a path the package or the component does not take.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** A record, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const manifest: unknown = JSON.parse(read("packages/keyboard/package.json"));
const exportsMap =
  isRecord(manifest) && isRecord(manifest["exports"])
    ? manifest["exports"]
    : {};

/** `.` → `@gpuixui/keyboard`; `./react` → `@gpuixui/keyboard/react`. */
const entryPoints = Object.keys(exportsMap)
  .map((key) =>
    key === "." ? "@gpuixui/keyboard" : `@gpuixui/keyboard/${key.slice(2)}`,
  )
  .toSorted();

const reactValues = [
  ...read("packages/keyboard/src/react.tsx").matchAll(
    /^export (?:function|const) (\w+)/gm,
  ),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const rootEntry = read("packages/keyboard/src/index.ts");

/**
 * The grammar helpers the root re-exports, read from its own value-export
 * block — the `export type` block above it names types, not things a reader
 * calls.
 */
const grammarHelpers: ReadonlyArray<string> = (
  /export \{([^}]*)\} from "@tanstack\/hotkeys";/.exec(rootEntry)?.[1] ?? ""
)
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name !== "");

const page = read("apps/docs/content/docs/keyboard.mdx").replace(/\s+/g, " ");

describe("the keyboard page", () => {
  it("names every entry point the package publishes", () => {
    const missing = entryPoints.filter(
      (entry) => !page.includes(`\`${entry}\``),
    );

    expect(entryPoints).toEqual([
      "@gpuixui/keyboard",
      "@gpuixui/keyboard/react",
    ]);
    expect(missing).toEqual([]);
  });

  it("names every value the React module declares", () => {
    const missing = reactValues.filter((name) => !page.includes(`\`${name}\``));

    expect(reactValues.length).toBeGreaterThanOrEqual(2);
    expect(missing).toEqual([]);
  });

  it("warns that the root does not re-export them, while it does not", () => {
    // Bug guarded: the page's only snippet imported from the root.
    expect(rootEntry).not.toContain("CommandRegistryProvider");
    expect(page).toContain("does not re-export them");
    expect(page).toContain("@gpuixui/keyboard/react");
  });

  it("names every grammar helper the root re-exports", () => {
    // Bug guarded: the page taught the modules and never the six helpers the
    // root publishes from `@tanstack/hotkeys`, so a reader validating a stored
    // binding, normalising a recorded chord or testing a modifier-only press
    // had to find the dependency themselves. The list is read from the export
    // block, so a helper the package starts re-exporting fails until the page
    // teaches it.
    const missing = grammarHelpers.filter(
      (name) => !page.includes(`\`${name}\``),
    );

    expect(grammarHelpers.length).toBeGreaterThanOrEqual(6);
    expect(missing).toEqual([]);
  });

  it("says which platform each helper is handed", () => {
    // The package's own names and the grammar's are not interchangeable:
    // `toTanstackPlatform` is the seam, and `default` folds into Linux. A page
    // that showed one list for both would teach a type error.
    const platform = read("packages/keyboard/src/platform.ts");

    expect(platform).toContain('platform === "darwin" ? "mac"');
    expect(read("packages/keyboard/src/decode.ts")).toContain(
      "platform: Platform",
    );
    expect(read("packages/keyboard/src/display.ts")).toContain(
      "toTanstackPlatform(platform)",
    );
    expect(page).toContain("`darwin`, `linux`, `win32`, `default`");
    expect(page).toContain("`mac`, `windows`, `linux`");
    expect(page).toContain("`toTanstackPlatform`");
  });

  it("teaches the keycap parts the two shared renderers paint", () => {
    // `formatSymbols` is the `parts: true` alias, so each entry is one keycap,
    // in the platform's order. The claim is held to the alias and to both
    // shipped renderers that map over it.
    const shortcuts = read("packages/components/src/keyboard-shortcuts.tsx");
    const menu = read("packages/shell/src/app-menu/app-menu.tsx");

    expect(read("packages/keyboard/src/display.ts")).toContain("parts: true");
    expect(shortcuts).toContain("formatSymbols(");
    expect(menu).toContain("formatSymbols(");
    expect(page).toContain("one entry per keycap");
    expect(page).toContain("`KeyboardShortcuts`");
    expect(page).toContain("the app menu");
  });

  it("shows the recorder's own path through the helpers", () => {
    // The worked example is the shipped recorder's: decode, refuse a
    // modifier-only press, normalise, paint. Its source is the premise, so a
    // changed order fails the page rather than leaving it teaching a path the
    // component no longer takes.
    const recorder = read("packages/components/src/hotkey-recorder.tsx");
    const used = [
      "decodeGpuixEvent",
      "hasNonModifierKey",
      "normalizeHotkey",
      "formatSymbols",
      "toTanstackPlatform",
    ];

    expect(used.filter((name) => !recorder.includes(name))).toEqual([]);
    expect(recorder).toContain("if (hasNonModifierKey(chord, platform))");
    expect(recorder).toContain("normalizeHotkey(chord, platform)");
    expect(used.filter((name) => !page.includes(`\`${name}\``))).toEqual([]);
    expect(page).toContain("`HotkeyRecorder`");
    expect(page).toContain(
      "decode the press, drop a modifier-only chord, store the normalised string, paint the parts",
    );
  });
});
