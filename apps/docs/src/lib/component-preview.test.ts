import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demos } from "../components/docs/demos";

/**
 * The preview registry, held to the pages that mount it.
 *
 * `<ComponentPreview name="…">` throws at render when the name is not in
 * `demos`, which a reader meets as a crashed page rather than a failed build.
 * The two lists are therefore checked from both sides: every page names a
 * registered demo, and every registered demo is named by a page. The second
 * direction is the one that rots quietly — a demo whose page was rewritten keeps
 * shipping dead code, and a renamed key leaves a page that only fails in the
 * browser.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const dir = new URL("../../content/docs/", import.meta.url);

/** Every `.mdx` the site writes, at any depth. */
const pages = (): ReadonlyArray<readonly [string, string]> =>
  readdirSync(dir, { encoding: "utf8", recursive: true })
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => [name, readFileSync(new URL(name, dir), "utf8")] as const);

/** Every demo key a page mounts, with the page it mounts from. */
const mounts = (): ReadonlyArray<readonly [string, string]> =>
  pages().flatMap(([name, body]) =>
    [...body.matchAll(/<ComponentPreview\s+name="([^"]+)"/g)].flatMap((match) =>
      match[1] === undefined ? [] : [[match[1], name] as const],
    ),
  );

describe("the component previews", () => {
  it("mount at least one demo, so the scan cannot pass on an empty set", () => {
    expect(mounts().length).toBeGreaterThanOrEqual(Object.keys(demos).length);
  });

  it("name a registered demo on every page", () => {
    const missing = mounts()
      .filter(([key]) => demos[key] === undefined)
      .map(([key, page]) => `${page}: no demo named "${key}"`);

    expect(missing).toEqual([]);
  });

  it("are mounted by a page, so no demo ships dead", () => {
    const referenced = new Set(mounts().map(([key]) => key));

    expect(Object.keys(demos).filter((key) => !referenced.has(key))).toEqual(
      [],
    );
  });

  it("carry the native source a reader copies, not an empty code tab", () => {
    const empty = Object.entries(demos)
      .filter(([, demo]) => demo.source.trim().length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });
});
