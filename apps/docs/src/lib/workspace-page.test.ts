import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

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
    expect(page).not.toContain("hit strip");
  });
});

describe("the workspace page's composition table", () => {
  it("sends each part to the section its page lives in", () => {
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

    expect([...sections].toSorted()).toEqual([
      "Components",
      "Primitives",
      "Workspace",
    ]);
    sections.forEach((section) => {
      expect(closing).toContain(section);
    });
  });
});
