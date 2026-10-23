import { readFileSync } from "node:fs";
import { retroNames, retroStyles } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/**
 * `/docs/theming` teaches the platform switch but stopped at `platformTheme`:
 * a consumer could pick a shipped look and could not author one, although the
 * mission's acceptance is that a reader takes a platform theme file, edits it
 * and ships their own look.
 *
 * The page now shows `applyStyle` over a style object and names the two tables
 * a reader copies. This guard reads the package to keep the page true: every
 * field `PlatformStyle` requires must be a key in the page's sample, the merge
 * rule the page states must be the one `applyStyle` implements, and the audit
 * the page recommends must be the exported gate.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/theming.mdx").replace(/\s+/g, " ");

const platforms = read("packages/tokens/src/platforms.ts");
const theme = read("packages/tokens/src/theme.ts");
const audit = read("packages/tokens/src/audit.ts");
const capabilities = read("docs/gpuix-capabilities.md").replace(/\s+/g, " ");

/** The fields an interface declares itself, `?` kept so required is derivable. */
const declared = (source: string, name: string): ReadonlyArray<string> => {
  const body = source.split(`interface ${name}`)[1]?.split("\n}")[0] ?? "";

  return [...body.matchAll(/readonly (\w+)(\??):/g)].flatMap((match) =>
    match[1] === undefined ? [] : [`${match[1]}${match[2] ?? ""}`],
  );
};

/** `PlatformStyle` is `PlatformType` plus its own fields. */
const styleFields = [
  ...declared(platforms, "PlatformType"),
  ...declared(platforms, "PlatformStyle"),
];

const requiredStyleFields = styleFields.filter((field) => !field.endsWith("?"));

/** The fence under a heading, so another sample on the page cannot satisfy it. */
const fenceAfter = (heading: string): string => {
  const start = page.indexOf(heading);
  const fence = page.indexOf("```tsx", start);
  const end = page.indexOf("```", fence + 7);

  return page.slice(fence + 7, end);
};

const styleSample = fenceAfter("Author a style");

describe("the theming page's platform styles", () => {
  it("names the merge function and the tables a reader copies", () => {
    // Bug guarded: the page offered only `platformTheme`, a name lookup, so
    // "start from one and change any value" had no shown route.
    expect(theme).toContain("export function applyStyle");
    expect(page).toContain("applyStyle");
    expect(styleSample).toContain("applyStyle(themes.light, acme)");
    expect(page).toContain("`platformStyles`");
    expect(page).toContain("`retroStyles`");
    expect(page).toContain("packages/tokens/src/platforms.ts");
    expect(page).toContain("packages/tokens/src/retro.ts");
  });

  it("declares every field a style must carry", () => {
    expect(requiredStyleFields.length).toBeGreaterThanOrEqual(7);

    const missing = requiredStyleFields.filter(
      (field) => !new RegExp(`\\b${field}:`).test(styleSample),
    );

    expect(missing).toEqual([]);
  });

  it("states the contrast rule the merge implements", () => {
    // A style is designed against one variant's floors, which is why a theme
    // that needs more keeps its own palette — page and source must agree.
    expect(theme).toContain("contrast === style.contrast");
    expect(page).toContain("keeps its own colours");
    expect(page).toContain("geometry and families");
  });

  it("sends a reader to the audit before shipping", () => {
    expect(audit).toContain("export function auditTheme");
    expect(page).toContain("auditTheme(brand)");
    expect(page).toContain("passed");
  });
});

describe("the theming page's look picker", () => {
  it("mounts the control the page teaches", () => {
    expect(page).toContain("### The look picker");
    expect(page).toContain("<LookPicker />");
    expect(read("apps/docs/src/components/mdx.tsx")).toContain("LookPicker");
    // The sidebar stays the mission's four platform names; the picker is the
    // page's own control, and the page has to say which is which.
    expect(page).toContain(
      "The sidebar itself offers the four platform names only",
    );
  });

  it("prints every authored look's own values", () => {
    const wrong = retroNames.flatMap((name) => {
      const style = retroStyles[name];
      const cells = [
        style.label,
        style.mono,
        `| ${style.radius.md} |`,
        `\`${style.density}\``,
      ];
      return cells
        .filter((cell) => !page.includes(cell))
        .map((cell) => `${name}: missing ${cell}`);
    });

    expect(retroNames.length).toBeGreaterThanOrEqual(3);
    expect(wrong).toEqual([]);
  });

  it("names the runtime gaps instead of drawing chrome it cannot paint", () => {
    // The plan's original list said "no inset shadows"; the record measured
    // `inset` painting, so the page must follow the record, not the plan.
    const rows = [
      ["`backdropFilter` / per-element blur", "not supported"],
      ["Multi-stop, radial, conic, repeating gradients", "not supported"],
      ["CSS `filter`, `clip-path`, blend modes, text shadow", "not supported"],
      [
        "Per-element `transform` / `rotate` / `scale` / `translate` / `skew`",
        "not supported",
      ],
    ];

    expect(
      rows.filter(
        ([row, verdict]) => !capabilities.includes(`${row} | ${verdict}`),
      ),
    ).toEqual([]);
    expect(
      [
        "`backdropFilter`",
        "multi-stop, radial or conic gradient",
        "`clip-path`",
        "`transform`",
      ].filter((word) => !page.includes(word)),
    ).toEqual([]);
    // The two the runtime does provide are not hidden.
    expect(page).toContain("Two-stop linear gradients");
    expect(page).toContain("`inset` shadows");
  });

  it("says a lookup travels in the URL and is remembered", () => {
    expect(page).toContain("`?look=luna`");
    expect(page).toContain("the store remembers it");
  });
});
