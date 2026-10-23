import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The Command menu page states the keys the palette reads.
 *
 * The shipped palette is the site's one "⌘K" surface, and its keyboard
 * contract lives only in `command-menu.tsx`: the search field keeps the focus
 * while the highlight moves, the arrows (and `Ctrl+N`/`Ctrl+P`) step it, Home
 * and End jump, Enter runs the active row and Escape goes to the dismiss layer.
 * The curated page documented the parts, the props and three ARIA facts and
 * named no key at all, so a reader building a palette could not tell how it is
 * driven. The keys are derived from the handler here, so a palette that gains
 * or loses one fails until the page follows.
 *
 * Synchronous reads: this is a test boundary, like the site's other page
 * guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const source = read("packages/components/src/command-menu.tsx");
const page = read("apps/docs/content/docs/components/command-menu.mdx");

/** A key helper the handler reads, and the words the page names it by. */
interface Binding {
  readonly helper: string;
  readonly words: ReadonlyArray<string>;
}

const bindings: ReadonlyArray<Binding> = [
  { helper: "isDown", words: ["↓", "Ctrl+N"] },
  { helper: "isUp", words: ["↑", "Ctrl+P"] },
  { helper: "isFirst", words: ["Home"] },
  { helper: "isLast", words: ["End"] },
  { helper: "isDismiss", words: ["Escape"] },
];

/** The body of the palette's key handler. */
const handler =
  /const handleKeyDown = [\s\S]*?\n {2}\};/.exec(source)?.[0] ?? "";

describe("the Command menu page's keys", () => {
  it("reads the handler it documents", () => {
    // The premise: the page's claims are only as good as this read.
    expect(handler).toContain('step({ _tag: "Move", delta: 1 })');
    expect(
      bindings.filter(({ helper }) => !handler.includes(`${helper}(event)`)),
    ).toEqual([]);
    // Enter is the field's submit, not a key the handler names.
    expect(source).toContain("onSubmit={runActive}");
  });

  it("names every key the handler reads, and the focus that stays put", () => {
    const unstated = bindings
      .filter(({ words }) => words.some((word) => !page.includes(word)))
      .map(({ helper }) => helper);

    expect(unstated).toEqual([]);
    expect(page).toContain("Enter");
    expect(page).toContain("keeps the focus");
  });
});
