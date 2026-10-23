import { describe, expect, it } from "vitest";
import {
  namedImports,
  publishedNames,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";

/**
 * `/docs/keyboard` is the only page that documents `@gpuixui/keyboard`, and the
 * package is a dependency of the components rather than of the docs app — so
 * nothing in the build would notice if the page taught a name the package no
 * longer exports, or a limit the measured runtime no longer has.
 *
 * The page is held to three sources: the package's entry point (a new export
 * must be documented and every snippet must resolve), the capability record's
 * measured rows (no global shortcut, the focused element seeing a key first, and
 * a `Tab` traversal that runs **no** `onFocus`), and the adapter's own source
 * (the physical-binding limit follows from the decode, not from a preference).
 */

const page = readRepo("apps/docs/content/docs/keyboard.mdx");
const record = readRepo("docs/gpuix-capabilities.md");
const decode = readRepo("packages/keyboard/src/decode.ts");
const index = readRepo("packages/keyboard/src/index.ts");

/**
 * The value names the package's own modules export, in declaration order.
 * Re-exports from `@tanstack/hotkeys` are the dependency's surface, documented
 * by naming the dependency rather than by listing its functions here.
 */
const ownValueExports = (): ReadonlyArray<string> =>
  [...index.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*"\.\/[^"]+"/g)]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map((name) => name.trim())
    .filter((name) => name !== "" && !name.startsWith("type "));

describe("the keyboard page", () => {
  it("resolves every import it prints against the package's own exports", () => {
    const imports = namedImports(typescriptSnippets(page));

    // The scan has to have seen the snippets, or the assertion below is empty.
    expect(imports.length).toBeGreaterThanOrEqual(4);
    expect(unresolvedImports(imports, publishedNames())).toEqual([]);
  });

  it("documents every value the package's own modules export", () => {
    // A new export is a new capability, and this page is the only place a reader
    // can find it: an undocumented one would be invisible without being absent.
    const names = ownValueExports();
    expect(names).toContain("decodeGpuixEvent");
    expect(names).toContain("makeCommandRegistry");

    const undocumented = names.filter((name) => !page.includes(name));
    expect(
      undocumented,
      "the page does not name these exports of @gpuixui/keyboard",
    ).toEqual([]);
  });

  it("states the measured limits a shortcut has to design around", () => {
    // These are runtime facts, not package choices, so the page is held to the
    // record's measured rows rather than to the sentence it prints. The focus
    // row is the one that flipped twice: three clean window runs on 2026-10-22
    // read the traversal's `onFocus` counter at `focuses=0`, so the page must
    // not promise a focus-only surface.
    expect(record).toContain("| Global / system shortcut | not supported |");
    expect(page).toContain("No global or system shortcut");
    expect(page).toContain("own handler runs first");
    expect(page).toContain("A `Tab` traversal runs no `onFocus`");
    expect(page).toContain("first\n  arrow after");
    expect(page).not.toContain("traversal runs React's `onFocus`");
    expect(page).not.toContain("traversal now runs `onFocus`");
    expect(record).toContain("focuses=0");
    expect(page).toContain("/docs/runtime#measured-in-a-window");
  });

  it("says a focus past a pane's fold is not revealed, as the window measured it", () => {
    // A shortcut author reads these limits before assuming Tab shows the reader
    // where it went. `focus-reveal-lifecycle` measured the pane's offset staying
    // at `0` with its ninth row focused, so the page owes both the gap and the
    // roving alternative, and the lane page it hands off to.
    expect(record).toContain("Focus reveal in a scroller");
    expect(record).toContain("focus-reveal-lifecycle");
    expect(page).toContain("A focus past a pane's fold is not shown");
    expect(page).toContain("focus-reveal-lifecycle");
    expect(page).toContain("200 points below the fold");
    expect(page).toContain("/docs/workspace");
  });

  it("explains the physical-binding limit from the adapter, not from taste", () => {
    // The claim is true because the decode reads `key` and never `keyChar`, and
    // there is no `code` in a GPUix event. If the adapter changed, the page
    // would be teaching a limit that is gone.
    expect(decode).toContain("never\n * touches `keyChar`");
    expect(page).toContain(
      "physical bindings (`Mod+[KeyS]`) parse but can\nnever match",
    );
  });
});
