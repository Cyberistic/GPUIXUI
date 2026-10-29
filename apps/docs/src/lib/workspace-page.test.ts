import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";

/**
 * The workspace page's divider sentence.
 *
 * The page described the split divider as "a 16px hit strip", while
 * `@gpuixui/dock` defines a **6px** `DIVIDER_WIDTH` and a **16px**
 * `DIVIDER_STEP`: the number the page printed is how far one arrow key moves a
 * focused divider, not the box a pointer presses. A reader sizing a layout to
 * the sentence reserved the wrong strip, and the guard that already holds the
 * drawing to `DIVIDER_WIDTH` (`dock-preview.test.ts`) never read the prose.
 *
 * The same page then said "each part's page is under Components" while its own
 * composition table links six parts to the Workspace collection, so the closing
 * sentence is held to the sections its links resolve to.
 *
 * The constants are read from the package rather than retyped, so a thickness
 * or step change fails the page until it follows.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** A numeric constant `packages/dock/src/logic.ts` exports. */
const constant = (name: string): number => {
  const match = new RegExp(`export const ${name} = (\\d+(?:\\.\\d+)?);`).exec(
    read("packages/dock/src/logic.ts"),
  );
  const value = match?.[1];
  if (value === undefined) {
    throw new Error(`packages/dock/src/logic.ts: no ${name}`);
  }
  return Number(value);
};

const page = read("apps/docs/content/docs/workspace/index.mdx").replace(
  /\s+/g,
  " ",
);

/** The sidebar section a linked docs URL belongs to. */
const sectionOf = (url: string): string | undefined =>
  packageCollections.find(
    (collection) =>
      url === collection.route || url.startsWith(`${collection.route}/`),
  )?.section;

describe("the workspace page's split divider", () => {
  it("prints the thickness the package draws and the step a key moves", () => {
    expect(page).toContain(`${constant("DIVIDER_WIDTH")}px box`);
    expect(page).toContain(`steps ${constant("DIVIDER_STEP")}px`);
    expect(page).toContain("aria-valuetext");
  });

  it("does not call the arrow step the strip a pointer presses", () => {
    // Bug guarded: "a 16px hit strip" taught the step as the divider's width.
    expect(page).not.toContain("hit strip");
  });
});

describe("the workspace page's composition table", () => {
  it("sends each part to the section its page lives in", () => {
    // Bug guarded: the closing sentence said every part was under Components
    // while the table links six dock and shell pages in the Workspace section.
    const sources = [...page.matchAll(/\]\((\/[^)#]+)\)/g)].flatMap(
      (match) => match[1] ?? [],
    );
    const sections = new Set(
      sources.flatMap((url) => {
        const section = sectionOf(url);
        return section === undefined ? [] : [section];
      }),
    );
    const closing = page.split("The frames themselves are on").at(1) ?? "";

    expect([...sections].toSorted()).toEqual(["Components", "Workspace"]);
    sections.forEach((section) => {
      expect(closing).toContain(section);
    });
  });
});
