import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { examples } from "./examples-data";
import { sidebarPages } from "./sidebar-pages.test-util";

/**
 * The examples page.
 *
 * It is the only place a reader can see every shipped example, and Fumadocs
 * silently omits a page that is not in the sidebar — nothing in the build
 * notices. So the page must exist with its frontmatter, mount the generated
 * registry instead of listing files, and sit under Reference before the API
 * reference.
 */

const dir = new URL("../../content/docs/", import.meta.url);
const page = readFileSync(new URL("examples.mdx", dir), "utf8");
const sidebar = sidebarPages(new URL("../../", import.meta.url));

describe("the examples page", () => {
  it("has a title and a one-sentence description", () => {
    expect(page.startsWith("---\n")).toBe(true);
    expect(page).toContain("title: Examples\n");
    expect(/^description: .+$/m.test(page)).toBe(true);
  });

  it("mounts the generated registry instead of listing files", () => {
    expect(page).toContain("<ExamplesIndex />");
    expect(examples.filter((entry) => page.includes(entry.file))).toEqual([]);
  });

  it("names the example files as its source of truth", () => {
    expect(page).toContain("packages/*/examples/*.example.tsx");
    expect(page).toContain("TODO.md");
  });

  it("sits under Reference, before the API reference", () => {
    const position = sidebar.indexOf("examples");
    expect(position).toBeGreaterThan(0);
    expect(sidebar[position - 1]).toBe("---Reference---");
    expect(sidebar[position + 1]).toBe("reference");
  });

  it("is honest about what the source is and how to run it", () => {
    expect(page).toContain("GPUix modules, not browser components");
    expect(page).toContain("nub run --filter @gpuixui/primitives test:runtime");
  });
});
