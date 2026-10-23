import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  absentAriaClaims,
  ariaNames,
  readAriaBudget,
} from "./aria-budget.test-util";

/**
 * The pinned runtime publishes exactly seven `aria-*` attributes, and the
 * capability record, `/docs/accessibility` and the component pages all state
 * that closed set.
 *
 * Nothing read the typings themselves, so a `@gpuix/native` bump that published
 * an eighth attribute would leave the record refusing it and a page teaching
 * "No `aria-…`" for a state a control can now announce — the same false claim
 * the pages spent this lane's passes retracting.
 *
 * The pages read are the ones the site serves: the curated component pages and
 * every `packages/*` docs directory it mounts. The reads are synchronous
 * because this is a test boundary, like the rest of the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const record = read("docs/gpuix-capabilities.md");
const policy = read("docs/preview-strategy.md");
const budget = readAriaBudget(record);

/**
 * The attributes the installed host props declare.
 *
 * Read from the package's own typings rather than from the record, because the
 * record is the surface being held. `apps/docs` depends on the package, so the
 * path resolves through its own `node_modules`. The host and the virtual-list
 * props declare the same set, so it is read once.
 */
const declared = [
  ...new Set(
    [
      ...read("apps/docs/node_modules/@gpuix/native/dist/host.d.ts").matchAll(
        /^\s*"(aria-[a-z]+)"\?:/gm,
      ),
    ].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
  ),
];

/** Every page the site serves a component's limits on, by its path. */
const pages = [
  ...readdirSync(new URL("apps/docs/content/docs/components/", root))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .map((name) => `apps/docs/content/docs/components/${name}`),
  ...readdirSync(new URL("packages/", root)).flatMap((pkg) => {
    const dir = `packages/${pkg}/docs`;
    return existsSync(new URL(`${dir}/`, root))
      ? readdirSync(new URL(`${dir}/`, root))
          .filter((name) => name.endsWith(".mdx"))
          .map((name) => `${dir}/${name}`)
      : [];
  }),
];

const claims = pages.map((path) => ({
  path,
  absent: absentAriaClaims(read(path)),
}));

describe("the runtime's aria budget", () => {
  it("declares exactly the attributes the capability record publishes", () => {
    // Bug guarded: a runtime bump that adds or drops an attribute, with the
    // record left as the previous release printed it.
    expect(declared.length).toBeGreaterThanOrEqual(7);
    expect(budget.published.toSorted()).toEqual(declared.toSorted());
  });

  it("keeps every attribute the record refuses out of the runtime's declarations", () => {
    // The refused half is a list, not a filter, so it can only be right while
    // the typings have none of it.
    expect(budget.refused.length).toBeGreaterThanOrEqual(10);
    expect(budget.refused.filter((name) => declared.includes(name))).toEqual(
      [],
    );
  });

  it("does not let a page claim an absence the runtime publishes", () => {
    // Bug guarded: a page's limitation is the only place a reader learns which
    // state a control cannot announce, so a claim the runtime contradicts is
    // worse than no claim at all.
    expect(
      claims.flatMap(({ absent }) => absent).length,
    ).toBeGreaterThanOrEqual(60);
    expect(
      claims.flatMap(({ path, absent }) =>
        absent
          .filter((name) => declared.includes(name))
          .map((name) => `${path}: claims the runtime has no ${name}`),
      ),
    ).toEqual([]);
  });

  it("leaves the policy naming the guard", () => {
    expect(policy).toContain("src/lib/aria-budget.test.ts");
    expect(policy).toContain("docs/gpuix-capabilities.md");
  });
});

describe("the accessibility page's attribute budget", () => {
  it("reads the record's own row rather than a second list", () => {
    // The page's guard and this one share one parser, so a row that moves
    // cannot leave two readers disagreeing about what the record says.
    const page = read("apps/docs/content/docs/accessibility.mdx");
    const table = page
      .split("\n")
      .filter((line) => /^\|\s*`aria-/.test(line))
      .flatMap((line) => ariaNames(line.split("|")[1] ?? ""));

    expect(table.toSorted()).toEqual(budget.published.toSorted());
  });
});
