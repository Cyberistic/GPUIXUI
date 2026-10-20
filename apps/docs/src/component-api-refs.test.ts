import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards plan 624's page section. Every host part's props table carried a bare
 * `ref?` row, and the page that owns the shared conventions never explained it.
 * The failure worth catching is a section that builds and sidesteps the two
 * facts a reader needs: what the ref receives, and how focus really works (the
 * instance has no `focus()`; the renderer does). The merged-ref include is the
 * third: without it the "last ref wins" rule is just prose.
 */
const page = readFileSync(
  fileURLToPath(new URL("../content/docs/component-api.mdx", import.meta.url)),
  "utf8",
);
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const refHelper = "packages/components/src/internal/ref.ts";

const section = (): string => {
  const start = page.indexOf("## Refs and element handles");
  const end = page.indexOf("\n## ", start + 1);
  return start === -1 ? "" : page.slice(start, end === -1 ? undefined : end);
};

describe("Component API: refs and element handles", () => {
  it("states the React-19 ref contract and the scope of it", () => {
    const body = section();
    expect(body).toContain("React 19");
    expect(body).toContain("`forwardRef`");
    expect(body).toContain("extends the runtime's `Props`");
    expect(body).toContain("`@gpuixui/primitives`");
    expect(body).toContain("exposes no `ref`");
  });

  it("renders the derived instance table once", () => {
    expect(section().match(/<ElementInstanceTable \/>/g) ?? []).toHaveLength(1);
  });

  it("says the instance has no focus method and names the real recipe", () => {
    const body = section();
    expect(body).toContain("no `focus()`");
    expect(body).toContain("useGpuix");
    expect(body).toContain("renderer?.focusElement?.(instance.id)");
  });

  it("includes the merged-ref helper from its real file", () => {
    const body = section();
    expect(body).toContain(refHelper);
    expect(existsSync(join(repoRoot, refHelper))).toBe(true);
    const helper = readFileSync(join(repoRoot, refHelper), "utf8");
    expect(helper).toContain("assign(internal, value)");
    expect(helper).toContain("assign(caller, value)");
  });

  it("ships a copyable example that imports the packages it names", () => {
    const body = section();
    expect(body).toContain("@gpuix/react");
    expect(body).toContain("@gpuixui/components/search-input");
    expect(body).toContain("@gpuixui/primitives");
    expect(body).toContain("useRef<PublicInstance | null>(null)");
  });

  it("sits between the shared host props and the keyboard contract", () => {
    const order = [...page.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    const index = order.indexOf("Refs and element handles");
    expect(order[index - 1]).toBe("Shared host props");
    expect(order[index + 1]).toBe("Keyboard");
  });
});
