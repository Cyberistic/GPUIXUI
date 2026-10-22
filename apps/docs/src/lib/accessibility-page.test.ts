import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/accessibility` is the consumer contract for the runtime's ARIA subset.
 *
 * Every claim on it is also written somewhere the code owns — the installed
 * typings publish the attribute set, `docs/gpuix-capabilities.md` refuses the
 * rest, `@gpuixui/primitives` implements the label rule, `@gpuixui/tokens` the
 * focus ring, the playground the two probes — and nothing compared them. A
 * runtime bump that published an eighth attribute, a capability row that gained
 * a refusal, or a renamed helper would leave the page teaching the previous
 * budget while the site stayed green, which is the one page a reader consults
 * before deciding what a screen reader will hear.
 *
 * The page is prose, so the assertions are tokens and short phrases rather than
 * whole sentences: a rewrite is allowed, a changed fact is not.
 *
 * The reads are a test-time boundary — the same one `docs.test.ts` and
 * `package-page-template.test.ts` use — because the sources being compared are
 * files in the repository, not server responses.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The page with its line breaks collapsed, so a phrase can span a wrap. */
const page = read("apps/docs/content/docs/accessibility.mdx").replace(
  /\s+/g,
  " ",
);

const record = read("docs/gpuix-capabilities.md");

const numberWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
] as const;

/** The `aria-*` attributes the pinned typings declare on a host element. */
const published = [
  ...new Set(
    [
      ...read("apps/docs/node_modules/@gpuix/native/dist/host.d.ts").matchAll(
        /"aria-([a-z]+)"\?:/g,
      ),
    ].flatMap((match) => (match[1] === undefined ? [] : [`aria-${match[1]}`])),
  ),
].toSorted();

/** The attributes the capability record's aria row says the runtime refuses. */
const refused = (() => {
  const row = record
    .split("\n")
    .find((line) => line.startsWith("| `role` and the `aria-*` subset"));
  const evidence = (row ?? "").split("|")[3] ?? "";
  const afterNo = evidence.slice(evidence.indexOf("**No**"));
  return [
    ...new Set(
      [...afterNo.matchAll(/`(aria-[a-z]+)`/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    ),
  ].toSorted();
})();

/** True when the page prints `name` as code. */
const prints = (name: string): boolean => page.includes(`\`${name}\``);

describe("the accessibility page", () => {
  it("names every attribute the pinned typings publish", () => {
    // A floor, so a scan that stopped matching cannot pass.
    expect(published.length).toBeGreaterThanOrEqual(7);
    expect(published.filter((name) => !prints(name))).toEqual([]);

    const count = numberWords[published.length] ?? `${published.length}`;
    expect(page).toContain(`exactly ${count} \`aria-*\` attributes`);
  });

  it("names every attribute the runtime refuses, and keeps the two sets apart", () => {
    expect(refused.length).toBeGreaterThanOrEqual(12);
    expect(refused.filter((name) => published.includes(name))).toEqual([]);
    expect(refused.filter((name) => !prints(name))).toEqual([]);
  });

  it("states the label rule the primitives implement", () => {
    const label = read("packages/primitives/src/components/Label.tsx");
    const a11y = read("packages/primitives/src/core/a11y.ts");

    expect(label).toContain("export const labelledBy");
    expect(label).toContain("no `aria-labelledby`");
    expect(a11y).toContain("export const accessibleName");

    expect(prints("labelledBy")).toBe(true);
    expect(prints("accessibleName")).toBe(true);
    expect(page).toContain(
      "A visible `Label` beside a control is **not** associated",
    );
  });

  it("cites the probe that measured the tree and the channel that cannot prove it", () => {
    expect(read("apps/playground/src/scenarios/registry.ts")).toContain(
      'id: "a11y-tree"',
    );
    expect(record).toContain("`a11y-tree`");

    const missing = [
      "a11y-tree",
      "getA11yTree()",
      "Smoke.A11yTree",
      "Native.createTestHost",
      "host.a11yTree()",
    ].filter((name) => !prints(name));
    expect(missing).toEqual([]);

    expect(page).toContain("automation protocol has no accessibility verb");
    expect(page).toContain(
      "nub apps/playground/dist/smoke/run.js --only a11y-tree",
    );
  });

  it("states the focus rule the packages ship", () => {
    expect(read("packages/tokens/src/styles.ts")).toContain(
      "export function keyboardFocusRing",
    );
    expect(read("packages/tokens/src/styles.ts")).toContain("focusVisible");
    expect(read("packages/tokens/src/focus-dim.ts")).toContain(
      "export const keyboardFocusDimOpacity = 0.4",
    );
    expect(read("apps/playground/src/live/registry.ts")).toContain(
      'id: "filled-action-dim"',
    );

    const missing = [
      "keyboardFocusRing(theme)",
      "focusVisible",
      "focusRing(theme)",
      "keyboardFocusDimOpacity",
      "keyboardFocusDim: false",
      "renderer.focusElement",
      "filled-action-dim",
    ].filter((name) => !prints(name));
    expect(missing).toEqual([]);

    // The exemption is the half a reader gets wrong: the dim skips a field.
    expect(page).toContain("A focused `input` or `textarea` dims nothing");
  });

  it("keeps the announcement gap on the pages that document it", () => {
    const named = ["toast", "countdown", "message-scroller"];
    const silent = named.filter(
      (name) =>
        !read(`packages/components/docs/${name}.mdx`).includes("aria-live"),
    );
    expect(silent, "a page stopped documenting the live-region gap").toEqual(
      [],
    );

    const unlinked = named.filter(
      (name) => !page.includes(`](/docs/components/${name})`),
    );
    expect(unlinked).toEqual([]);
    expect(page).toContain("is **not** announced");
  });

  it("is in the sidebar and linked from the pages it belongs to", () => {
    expect(read("apps/docs/content/docs/meta.json")).toContain(
      '"accessibility"',
    );
    const unlinked = ["runtime", "testing"].filter(
      (path) =>
        !read(`apps/docs/content/docs/${path}.mdx`).includes(
          "](/docs/accessibility)",
        ),
    );
    expect(unlinked).toEqual([]);
  });
});
