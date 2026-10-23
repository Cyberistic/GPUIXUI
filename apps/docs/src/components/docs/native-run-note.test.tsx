import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NativeRunNote,
  playgroundCommand,
  playgroundHref,
  playgroundScript,
} from "./native-run-note";

/**
 * The note above a package page is the only instruction a reader of the 68
 * package pages gets for seeing the real component: the site cannot render it,
 * so the note has to name a command that exists and a page that explains it.
 *
 * Both halves had drifted before: the note said "run it natively in
 * apps/playground" with no command, and `docs/preview-strategy.md` claimed the
 * note named the example file. A wrong command is worse than none, so the
 * script name is read from the root manifest rather than trusted here.
 */

const root = new URL("../../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The body of a root-manifest script, or `undefined` when none declares it. */
const scriptFor = (name: string): string | undefined => {
  const manifest: unknown = JSON.parse(read("package.json"));
  if (!isRecord(manifest) || !isRecord(manifest.scripts)) return undefined;
  const body = manifest.scripts[name];
  return typeof body === "string" ? body : undefined;
};

const markupFor = (kind: string, path: string): string =>
  renderToStaticMarkup(<NativeRunNote kind={kind} path={path} />);

describe("the native playground note", () => {
  it("quotes a script the root manifest declares, and no other", () => {
    expect(scriptFor(playgroundScript)).toContain("playground");
    expect(playgroundCommand).toBe(`nub run ${playgroundScript}`);
  });

  it("renders the command, the run instructions and the file it came from", () => {
    const markup = markupFor(
      "primitive",
      "packages/primitives/docs/slider.mdx",
    );

    expect(markup).toContain(playgroundCommand);
    expect(markup).toContain(playgroundHref);
    expect(markup).toContain("browser approximation");
    expect(markup).toContain("packages/primitives/docs/slider.mdx");
    expect(markup).toContain("primitive");
  });

  it("does not deny the preview the page it sits above draws", () => {
    // The note said "A browser preview is not available for this component"
    // directly above a `<ComponentPreview>` the page's own Markdown mounts, so
    // one page made two opposite claims about the same drawing. The pages it
    // sits above are where that absolute was false; the lanes with no demo are
    // where it was true, which is why the note now says "any" preview instead
    // of claiming none.
    const markup = markupFor("component", "packages/components/docs/list.mdx");
    expect(markup).toContain("A Preview tab, where the page has one");
    expect(markup).not.toContain("browser preview is not available");

    const previewPages = (dir: string): number =>
      readdirSync(new URL(dir, root))
        .filter((name) => name.endsWith(".mdx"))
        .filter((name) => read(`${dir}/${name}`).includes("<ComponentPreview"))
        .length;

    expect(previewPages("packages/components/docs")).toBeGreaterThanOrEqual(70);
    expect(previewPages("packages/primitives/docs")).toBeGreaterThanOrEqual(25);
    // A lane with no demo still needs the note's wording to be true.
    expect(previewPages("packages/dock/docs")).toBe(0);

    // ...and the frame draws the note and the page body that mounts it.
    const view = read("apps/docs/src/lib/docs-view.tsx");
    const mdx = read("apps/docs/src/components/mdx.tsx");
    // The package frame, not the site one: the note has to precede the body
    // the body's own `<ComponentPreview>` is compiled into.
    const packageFrame = view.slice(view.indexOf("function PackageContent"));
    expect(packageFrame.indexOf("<NativeRunNote")).toBeLessThan(
      packageFrame.indexOf("<MDX components={mdxComponents} />"),
    );
    expect(mdx).toContain("ComponentPreview");

    // The policy and the index have to say both, or the next page follows the
    // old rule.
    const policy = read("docs/preview-strategy.md");
    expect(policy).toContain("that page's preview is **strategy 3**");
    expect(policy).toContain("The lanes with no demo");
    expect(policy).not.toContain("Those pages are **strategy 4**");

    const index = read("apps/docs/content/docs/components/index.mdx");
    expect(index).toContain("A component or primitive page mounts");
    expect(index).toContain("a browser approximation, labelled as one");
    expect(index).not.toContain("a browser preview is not available");
  });

  it("points at a heading the installation page actually has", () => {
    const installation = read("apps/docs/content/docs/installation.mdx");

    expect(installation).toContain("## Run the playground");
    expect(playgroundHref).toBe("/docs/installation#run-the-playground");
    expect(installation).toContain(playgroundCommand);
  });

  it("is the note every package page mounts", () => {
    const view = read("apps/docs/src/lib/docs-view.tsx");

    // The page frame is the one mount point, so a note written inline again
    // would be a second instruction nothing holds to the manifest.
    expect(view).toContain("<NativeRunNote");
    expect(view).not.toContain("run it natively in");
  });
});
