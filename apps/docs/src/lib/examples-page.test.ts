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
 *
 * It also has to say how to run what it lists. It once said the components'
 * examples were "not mounted in the playground yet — that registry is a tracked
 * task in TODO.md" long after `examples-mount` mounted all of them, so every
 * command below is resolved to the manifest or the scenario registry on disk.
 */

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");
const page = read("apps/docs/content/docs/examples.mdx");
const sidebar = sidebarPages(new URL("../../", import.meta.url));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const manifest = (path: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(read(path));
  if (!isRecord(parsed)) throw new Error(`${path} is not a manifest`);
  return parsed;
};

/** The body of a script a workspace manifest declares. */
const scriptFor = (manifestPath: string, name: string): string | undefined => {
  const scripts = manifest(manifestPath).scripts;
  if (!isRecord(scripts)) return undefined;
  const body = scripts[name];
  return typeof body === "string" ? body : undefined;
};

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
  });

  it("runs the components' examples through the scenario that mounts them", () => {
    const playground = manifest("apps/playground/package.json");

    // The command's package filter, its build script and the entry point it
    // runs are read from the app rather than retyped here.
    expect(page).toContain(`--filter ${String(playground.name)} build`);
    expect(scriptFor("apps/playground/package.json", "build")).toBeDefined();
    expect(scriptFor("apps/playground/package.json", "smoke")).toContain(
      "dist/smoke/run.js",
    );
    expect(page).toContain("apps/playground/dist/smoke/run.js");
    expect(page).toContain("--only examples-mount");

    // An id the registry does not carry, or one `index.ts` attaches no view to,
    // makes the printed command a no-op.
    expect(read("apps/playground/src/scenarios/registry.ts")).toContain(
      'id: "examples-mount"',
    );
    expect(read("apps/playground/src/scenarios/index.ts")).toContain(
      '"examples-mount":',
    );

    // The sentence this guard exists for.
    expect(page).not.toContain("not mounted");
  });

  it("sends the reader to the record that proves the scenario ran", () => {
    expect(read("apps/playground/README.md")).toContain(
      "## The example gallery",
    );
    expect(page).toContain("apps/playground/README.md");
  });

  it("keeps the preview policy on the command the page prints", () => {
    // The policy told a contributor the components' examples were "the
    // copy-target for their pages and have no runtime registry yet — that is a
    // tracked task", and kept saying it after `examples-mount` mounted all of
    // them and after this page was corrected. The policy is read before a page
    // is written, so it is held to the same registry as the page.
    const policy = read("docs/preview-strategy.md");

    expect(policy).not.toContain("no runtime registry");
    expect(policy).toContain("examples-mount");
    expect(policy).toContain("The example gallery");
    expect(policy).toContain("runtime/examples.runtime.test.tsx");
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
