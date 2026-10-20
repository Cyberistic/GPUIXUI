import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { search } from "./search";

/**
 * Guards plan 614: the site had no page that owned the phrase `design system`,
 * so ⌘K answered it with a text area's limitation, although `/docs/theming`
 * renders the identity, roles and scales the repository's design-system
 * document describes. The page now states the identity and links the four
 * layers, and an exact alias names it.
 *
 * The test fails when the identity paragraph is removed, when the design-system
 * subject drops out of the frontmatter, when a layer link points at a page that
 * is not the owner, or when the alias stops reaching the page.
 *
 * `readFileSync` is deliberate: `apps/docs` has no Effect runtime and its bundle
 * must not import `effect`; every content guard reads repository files the same
 * way (`motion-truth.test.ts`, `deployment-page.test.ts`).
 */
const page = readFileSync(
  fileURLToPath(new URL("../../content/docs/theming.mdx", import.meta.url)),
  "utf8",
);

const prose = page.replace(/\s+/g, " ");

const LAYERS = [
  ["/docs/typography", "the type scale"],
  ["/docs/styling", "the `style` prop"],
  ["/docs/component-api", "the shared part contract"],
  ["/docs/tokens-api", "the typed surface"],
] as const;

describe("the design-system subject on Theming", () => {
  it("states the identity and names the subject", () => {
    expect(prose).toContain("graphite and iris");
    expect(prose).toContain("design system");
    expect(page).toContain('description: "The GPUIXUI design system:');
  });

  it("links the page that owns each layer", () => {
    const missing = LAYERS.filter(
      ([url, label]) => !prose.includes(`](${url})`) || !prose.includes(label),
    ).map(([url]) => url);
    expect(missing).toEqual([]);
  });

  it(
    "reaches Theming from the phrase a reader types",
    { timeout: 120_000 },
    async () => {
      const [first] = await search("design system");
      expect(first?.url).toBe("/docs/theming");
    },
  );
});
