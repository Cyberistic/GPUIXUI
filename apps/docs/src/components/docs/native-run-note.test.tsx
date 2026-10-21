import { readFileSync } from "node:fs";
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
    expect(markup).toContain("browser preview is not available");
    expect(markup).toContain("packages/primitives/docs/slider.mdx");
    expect(markup).toContain("primitive");
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
