/**
 * The package's page contract.
 *
 * Fifteen of the thirty-nine Tier 2 pages shipped no prop documentation at all —
 * no `## API` heading and no table — although `docs/component-api.md` is the
 * shared spec and MISSION requires API docs on every component page. The docs
 * site only rendered the gap, so nothing failed. This suite holds every page to
 * the minimum a consumer who copies the component needs: frontmatter, a runnable
 * import, an `## API` section whose table names parts and their props, the
 * siblings a reader goes on to, and the MDX the site that mounts these pages
 * can actually compile.
 *
 * The last two are the site-side rules the package owns anyway: a page with no
 * `## Related` section left the reader on the only page for the component
 * (the message scroller was the one), and a page whose frontmatter a YAML
 * parser rejects or whose prose carries a raw `<tag>` fails the whole
 * collection at build time — one page takes every other page with it.
 *
 * `node:fs` is a test-time repository read, the boundary `inventory.test.ts` and
 * `docs-counts.test.ts` already use.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const docsDir = new URL("../docs/", import.meta.url);
const pages = Arr.filter(readdirSync(docsDir), Str.endsWith(".mdx"));

const read = (page: string): string =>
  readFileSync(fileURLToPath(new URL(page, docsDir)), "utf8");

/** The text under one `## ` heading, `None` when the page has no such heading. */
const section = (source: string, heading: string): string | undefined => {
  const start = source.indexOf(`\n${heading}\n`);
  if (start < 0) return undefined;
  const rest = source.slice(start + heading.length + 2);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

/** The header and body rows of the first table in a section. */
const table = (
  source: string,
):
  | {
      readonly cells: number;
      readonly rows: ReadonlyArray<string>;
    }
  | undefined => {
  const lines = source.split("\n");
  const headerIndex = lines.findIndex(
    (line, index) =>
      line.startsWith("|") &&
      /\/?\s*(Part|Prop)/i.test(line) &&
      (lines[index + 1] ?? "").startsWith("|"),
  );
  if (headerIndex < 0) return undefined;

  const cells = cellsOf(lines[headerIndex] ?? "");
  const rows = Arr.takeWhile(Arr.drop(lines, headerIndex + 2), (line) =>
    line.startsWith("|"),
  );
  return { cells: Arr.length(cells), rows };
};

/** The cells of one table line; an escaped `\|` is text, not a column. */
const cellsOf = (line: string): ReadonlyArray<string> =>
  Arr.map(line.split(/(?<!\\)\|/).slice(1, -1), (cell) => cell.trim());

/** A plain YAML scalar may not begin with one of these. */
const YAML_RESERVED = /^[`@*&[\]{}>|%#]/;

/** The frontmatter block of a page, without its fences. */
const frontmatter = (source: string): string =>
  /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";

/** The prose of a page: no frontmatter, no fenced blocks, no inline code. */
const prose = (source: string): string =>
  source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "");

/** Whether a page compiles as MDX: quoted frontmatter, no raw tag in prose. */
const mdxProblems = (page: string, source: string): ReadonlyArray<string> => {
  const head = frontmatter(source);

  const missing =
    /^title: .+/m.test(head) && /^description: .+/m.test(head)
      ? []
      : [`${page}: no title or description`];

  const unquoted = Arr.flatMap(head.split("\n"), (line) => {
    const [, value = ""] = /^[a-z]+:\s*(.*)$/.exec(line) ?? [];
    const quoted = value.startsWith('"') || value.startsWith("'");
    return YAML_RESERVED.test(value) && !quoted ? [`${page}: ${value}`] : [];
  });

  const jsx = Arr.map(
    Arr.filter(
      prose(source).split("\n"),
      (line) => /<[A-Za-z/]/.test(line) && !line.includes("<ComponentPreview"),
    ),
    (line) => `${page}: ${line.trim()}`,
  );

  return [...missing, ...unquoted, ...jsx];
};

describe("component pages", () => {
  it("has a page for every component and a title and description on each", () => {
    const problems = Arr.flatMap(pages, (page) => {
      const source = read(page);
      const missing = Arr.filter(
        ["title:", "description:"],
        (field) =>
          !source.startsWith(`---\n`) || !source.includes(`\n${field} `),
      );
      return missing.length === 0
        ? []
        : [`${page}: frontmatter lacks ${Arr.join(missing, ", ")}`];
    });

    expect(problems).toEqual([]);
  });

  it("shows an import a reader can copy", () => {
    const problems = Arr.filter(
      pages,
      (page) => !read(page).includes("@gpuixui/components"),
    ).map((page) => `${page}: no @gpuixui/components import`);

    expect(problems).toEqual([]);
  });

  it("documents the parts and props of every component", () => {
    const problems = Arr.flatMap(pages, (page) => {
      const api = section(read(page), "## API");
      if (api === undefined) return [`${page}: no ## API section`];

      const found = table(api);
      if (found === undefined) {
        return [`${page}: ## API has no table headed Part or Prop`];
      }
      if (found.rows.length === 0) {
        return [`${page}: ## API table has no rows`];
      }

      return Arr.flatMap(found.rows, (row) => {
        const cells = cellsOf(row);
        const named = (cells[0] ?? "").includes("`");
        if (cells.length !== found.cells) {
          return [
            `${page}: API row has ${cells.length} cells, the header has ${found.cells}`,
          ];
        }
        return named ? [] : [`${page}: API row does not name a part or prop`];
      });
    });

    expect(problems).toEqual([]);
  });

  it("compiles as MDX for the site that mounts it", () => {
    const problems = Arr.flatMap(pages, (page) =>
      mdxProblems(page, read(page)),
    );

    expect(problems).toEqual([]);
  });

  it("reads the pages it is meant to check", () => {
    expect(pages.length).toBeGreaterThanOrEqual(39);
  });
});

/** The playground's own record of what each live probe measured. */
const playgroundReadme = readFileSync(
  fileURLToPath(new URL("../../../apps/playground/README.md", import.meta.url)),
  "utf8",
);

describe("the selection chord the list page teaches", () => {
  // The contract a file list, tree or grid would otherwise reimplement: a range
  // press extends from the anchor and keeps it, a plain or toggle press moves it.
  // A window measured the rule with real chorded clicks, so the page has to
  // point at that measurement instead of asserting a rule nobody drove.
  const probe = "modifier-select-lifecycle";
  const selection = section(read("list.mdx"), "## Selection") ?? "";

  it("states the anchor rule a composed grid would otherwise reimplement", () => {
    expect(selection).toMatch(/keeps the anchor/i);
    expect(selection).toMatch(/moves it/i);
  });

  it("cites the window that measured the chord", () => {
    expect(selection).toContain(probe);
    expect(playgroundReadme).toMatch(new RegExp(`^#{1,4} \`${probe}\``, "m"));
  });
});

/** The repository root, for the playground reads below. */
const repoFile = (relative: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../../${relative}`, import.meta.url)),
    "utf8",
  );

describe("the trail a narrow pane needs", () => {
  // The shipped list is `flex-wrap`, so an unbudgeted trail grows a second row
  // instead of clipping. A window drove the shipped trail at two widths and the
  // app's own budgeted trail beside it; the page has to teach what that measured
  // — the wrapping, the budget's source and the trigger the app must compose —
  // because a consumer who reads only the component's props would plan a toolbar
  // around a clipping fallback that does not exist.
  const probe = "breadcrumb-navigation-lifecycle";
  const rules =
    section(read("breadcrumb.mdx"), "## A trail in a narrow pane") ?? "";
  const middle =
    section(read("breadcrumb.mdx"), "## Reaching the hidden middle") ?? "";
  const fixture = repoFile("apps/playground/src/live/breadcrumb-navigation.ts");

  /** One number the fixture declares, so the page cannot print its own. */
  const fixtureNumber = (name: string): number => {
    const match = new RegExp(`${name}\\s*[:=]\\s*(\\d+)`).exec(fixture);
    if (match?.[1] === undefined) {
      throw new Error(
        `apps/playground/src/live/breadcrumb-navigation.ts: no ${name}`,
      );
    }
    return Number(match[1]);
  };

  it("warns that an unbudgeted trail wraps instead of clipping", () => {
    expect(rules).toMatch(/`flex-wrap`/);
    expect(rules).toMatch(/wraps? instead of clipping/i);
    // The two rows the window painted, and that there is nothing to fall back on.
    expect(rules).toMatch(/16px rows?[^.]*36px/);
    expect(rules).toMatch(/no clipping fallback/i);
  });

  it("derives the budget from the pane's report, not a constant", () => {
    const narrow = fixtureNumber("narrow");
    const entry = fixtureNumber("BREADCRUMB_ENTRY_WIDTH");
    const budget = Math.max(3, Math.floor(narrow / entry));

    expect(rules).toContain("`onLayout`");
    expect(rules).toContain(`w=${narrow} budget=${budget}`);
    expect(rules).toMatch(/one row/i);
    // The row the budgeted trail painted: its trigger's own height.
    expect(rules).toMatch(/28px/);
  });

  it("says the shipped middle is decorative and the app composes the trigger", () => {
    expect(middle).toMatch(/decorative/i);
    expect(middle).toMatch(/second tab stop/i);
    expect(middle).toMatch(/focus stop/i);
    expect(middle).toMatch(/unpaints/i);
  });

  it("cites the window that measured the trail, with its check count", () => {
    const page = `${rules}\n${middle}`;
    const checks = fixtureNumber("BREADCRUMB_CHECKS");
    expect(page).toContain(probe);
    expect(page).toContain(`${checks} checks`);
    expect(page).toContain("apps/playground/src/live/breadcrumb-navigation.ts");
  });

  it("keeps the measured numbers on the playground's section", () => {
    // The page quotes the record, so the record must still print them; the
    // playground's own suite holds the record to the probe.
    const narrow = fixtureNumber("narrow");
    const entry = fixtureNumber("BREADCRUMB_ENTRY_WIDTH");
    expect(playgroundReadme).toMatch(
      new RegExp(`^### \`${probe}\` — measured on 0\\.11\\.0 here`, "m"),
    );
    expect(playgroundReadme).toContain(
      `w=${narrow} budget=${Math.max(3, Math.floor(narrow / entry))}`,
    );
    expect(playgroundReadme).toContain("**36**");
    expect(playgroundReadme).toContain("**28**");
  });
});

/** The capability record a page's accessibility claim is derived from. */
const capabilityRecord = readFileSync(
  fileURLToPath(
    new URL("../../../docs/gpuix-capabilities.md", import.meta.url),
  ),
  "utf8",
);

describe("the announcement an alert page may promise", () => {
  it("rests on the record's verdict, not on a screen reader's behaviour", () => {
    const verdict = pipe(
      Arr.findFirst(capabilityRecord.split("\n"), (line) =>
        line.startsWith("| Live regions"),
      ),
      Option.match({
        onNone: () => "",
        onSome: (row) => row,
      }),
    );
    // The page's sentence is only true while the runtime publishes no live
    // region; when that changes, both the page and this case must move.
    expect(
      verdict,
      "docs/gpuix-capabilities.md no longer records Live regions as unsupported",
    ).toContain("not supported");
    expect(verdict).toContain("aria-live");
  });

  it("calls the role a marker and names the gap", () => {
    const page = read("alert.mdx");
    // The retracted claim: `role="alert"` is a role, not a live region.
    expect(page).not.toContain("a live region, announced when it appears");
    expect(page).toContain("marker");
    expect(page).toMatch(/no\s+`aria-live`/);
  });

  it("tells the reader what to do instead", () => {
    // No mechanism means the copy has to carry the change, or the focus does.
    expect(read("alert.mdx")).toContain("move the focus");
  });
});
