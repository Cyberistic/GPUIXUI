import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/accessibility` is the cross-cutting contract every component page
 * points at, and after the 2026-10-23 page prune nothing read it: the page
 * could drop an attribute the runtime publishes, or keep promising one it
 * refuses, while every suite stayed green.
 *
 * The capability record states the closed set (`role` plus seven `aria-*`
 * attributes, and the ones the runtime has none of), and this guard holds the
 * page to that row. It is a data check, not a prose one: the page is free to
 * explain the budget in its own words, but the table and the refused list must
 * be the record's set.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/accessibility.mdx");
const record = read("docs/gpuix-capabilities.md");
const policy = read("docs/preview-strategy.md");

/** The record's row for the `aria-*` subset. */
const ariaRow =
  record
    .split("\n")
    .find((line) => line.startsWith("| `role` and the `aria-*` subset |")) ??
  "";

/** The row's detail cell; its workaround cell also names `aria-valuetext`. */
const ariaDetail = ariaRow.split("|")[3] ?? "";

const [publishedPart = "", refusedPart = ""] = ariaDetail.split("**No**");

const attributes = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/`(aria-[a-z]+)`/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

const published = attributes(publishedPart);
const refused = attributes(refusedPart);

/** The page's attribute table, one name per row of its first column. */
const table = page
  .split("\n")
  .filter((line) => line.startsWith("| `aria-") || /^\|\s*`aria-/.test(line))
  .flatMap((line) => attributes(line.split("|")[1] ?? ""));

/** The platform role each token becomes, as the record prints the pairs. */
const rolePairs = [
  ...(
    record
      .split("\n")
      .find((line) =>
        line.startsWith("| Accessibility tree (`getA11yTree()`) |"),
      ) ?? ""
  ).matchAll(/`(\w+)` → `(\w+)`/g),
].flatMap((match) =>
  match[1] === undefined || match[2] === undefined
    ? []
    : [{ token: match[1], role: match[2] }],
);

describe("the accessibility page's attribute budget", () => {
  it("publishes exactly the attributes the capability record allows", () => {
    // Bug guarded: a runtime bump that adds or drops an attribute would leave
    // the reader's table teaching the previous release.
    expect(published.length).toBeGreaterThanOrEqual(7);
    expect(table.toSorted()).toEqual(published.toSorted());
  });

  it("names every attribute the runtime refuses, and keeps it out of the table", () => {
    expect(refused.length).toBeGreaterThanOrEqual(10);

    const sentence = page.split("There is no ")[1]?.split("\n")[0] ?? "";
    const missing = refused.filter((name) => !sentence.includes(name));
    const leaked = refused.filter((name) => table.includes(name));

    expect(missing).toEqual([]);
    expect(leaked).toEqual([]);
  });

  it("names the platform role each token becomes", () => {
    expect(rolePairs.length).toBeGreaterThanOrEqual(4);

    const missing = rolePairs.filter(
      (pair) =>
        !page.includes(`\`${pair.token}\``) ||
        !page.includes(`\`${pair.role}\``),
    );

    expect(missing).toEqual([]);
  });

  it("keeps the policy naming a guard the site still carries", () => {
    expect(policy).toContain("src/lib/accessibility-page.test.ts");
    expect(read("apps/docs/src/lib/accessibility-page.test.ts")).toContain(
      "docs/gpuix-capabilities.md",
    );
  });
});
