import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const rowSource = read("./row.tsx");
const page = read("../../docs/tree-view.mdx");
describe("the tree page's pointer rule and shipped forms", () => {
  it("derives the press over the wash each row replaces", () => {
    expect(rowSource).toContain('pointerWash(theme, "active", "accent")');
    expect(rowSource).toContain('pointerWash(theme, "active", "hover")');
    expect(rowSource).toContain("hover: { backgroundColor: hoverFill }");
    expect(rowSource).toContain("active: { backgroundColor: pressFill }");
  });

  it("names the windowed tree instead of claiming the plain one virtualizes", () => {
    expect(page).toContain("`VirtualTree`");
    expect(page).not.toContain("does not virtualize itself");
  });
});
