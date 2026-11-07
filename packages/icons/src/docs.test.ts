import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as R from "effect/Record";
import * as Tokens from "@gpuixui/tokens";
import { ICON_NAMES } from "./names.js";
import { FALLBACK_ICON, iconMarkup, icons } from "./registry.js";
import { ICON_SIZES, iconPixels } from "./sizes.js";

const page = readFileSync(new URL("../docs/icon.mdx", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const iconSource = readFileSync(new URL("./Icon.tsx", import.meta.url), "utf8");
const lucideRecord = readFileSync(
  new URL("../../../.agents/slop/LICENSES/lucide.md", import.meta.url),
  "utf8",
);

const frontmatter = (field: string): Option.Option<string> =>
  Option.fromNullishOr(new RegExp(`^${field}: (.+)$`, "m").exec(page)?.[1]);

const section = (heading: string): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(page.split(/^## /m), (part) =>
        part.startsWith(`${heading}\n`),
      ),
      (part) => part.slice(heading.length + 1),
    ),
    () => expect.fail(`the page has no "${heading}" section`),
  );

describe("the icon page", () => {
  it("prints the size of the set it documents", () => {
    const description = Option.getOrElse(frontmatter("description"), () =>
      expect.fail("the page has no description"),
    );
    expect(description).toContain(`${ICON_NAMES.length} monochrome icons`);
  });

  it("prints each size step at the scale's pixel value", () => {
    const sizes = readme.slice(readme.indexOf("## Sizes"));
    Arr.forEach(R.toEntries(ICON_SIZES), ([step, pixels]) => {
      expect(sizes, step).toContain(`\`${step}\` ${pixels}`);
    });
  });

  it("teaches the answer a stored size name gets", () => {
    const api = section("API");
    expect({
      resolvesToDefault: api.includes("resolves to `md`"),
      readmeTeaches: /name the scale\s+does not carry/.test(readme),
      unknownName: iconPixels("huge"),
      defaultStep: ICON_SIZES.md,
    }).toEqual({
      resolvesToDefault: true,
      readmeTeaches: true,
      unknownName: ICON_SIZES.md,
      defaultStep: ICON_SIZES.md,
    });
  });

  it("teaches the answer a stored name gets", () => {
    expect({
      pageTeaches: section("API").includes("paints the `help` mark"),
      readmeTeaches: /answers the `help` mark/.test(readme),
      unknownName: iconMarkup("floppy"),
      placeholder: icons[FALLBACK_ICON],
    }).toEqual({
      pageTeaches: true,
      readmeTeaches: true,
      unknownName: icons[FALLBACK_ICON],
      placeholder: icons[FALLBACK_ICON],
    });
  });

  it("documents every prop IconProps declares", () => {
    const declared = Arr.filterMap(
      Arr.fromIterable(
        (
          /export interface IconProps \{([\s\S]*?)\n\}/.exec(iconSource)?.[1] ??
          ""
        ).matchAll(
          /(?:readonly\s+|^[ \t]*)(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/gm,
        ),
      ),
      (match) => {
        const name = match[1] ?? match[2];
        return name === undefined ? Result.failVoid : Result.succeed(name);
      },
    );
    const api = section("API");
    const cells = Arr.map(
      Arr.filter(api.split("\n"), (line) => line.startsWith("|")),
      (line) => /^\|\s*([^|]*)/.exec(line)?.[1] ?? "",
    );
    const documented = new Set(
      Arr.flatMap(cells, (cell) =>
        Arr.map([...cell.matchAll(/`([^`]+)`/g)], (match) => match[1] ?? ""),
      ),
    );
    expect(Arr.length(declared)).toBeGreaterThan(0);
    expect(
      Arr.filter(declared, (name) => !documented.has(name)),
      "props IconProps declares that the API table does not document",
    ).toEqual([]);
  });

  it("cites a provenance record that carries both notices", () => {
    expect(readme).toContain(".agents/slop/LICENSES/lucide.md");
    expect(lucideRecord).toContain("lucide-static` `1.61.0`");
    expect(lucideRecord).toContain("## ISC License");
    expect(lucideRecord).toContain("Lucide Icons and Contributors");
    expect(lucideRecord).toContain(
      "## MIT License (for the icons derived from Feather)",
    );
    expect(lucideRecord).toContain("Cole Bemis");
  });
});

describe("the icons README", () => {
  it("cites the provenance record instead of claiming nothing is copied", () => {
    expect(readme).toContain(".agents/slop/LICENSES/lucide.md");
    expect(readme).not.toContain("copied verbatim");
  });

  it("imports only names @gpuixui/tokens exports", () => {
    const names = Arr.flatMap(
      [...readme.matchAll(/import\s+\{([^}]*)\}\s+from\s+"@gpuixui\/tokens"/g)],
      (match) =>
        Arr.filter(
          Arr.map((match[1] ?? "").split(","), (name) => name.trim()),
          (name) => name !== "",
        ),
    );
    expect(Arr.length(names)).toBeGreaterThan(0);
    expect(
      Arr.filter(names, (name) => !(name in Tokens)),
      "names the README imports that the package does not export",
    ).toEqual([]);
  });

  it("teaches the plural role path the theme it names actually has", () => {
    const source = `${readme}\n${iconSource}`;
    expect(source).not.toMatch(/\.color\./);
    const roles = Arr.flatMap(
      [...readme.matchAll(/\.colors\.([A-Za-z]+)/g)],
      (match) => (match[1] === undefined ? [] : [match[1]]),
    );
    expect(Arr.length(roles)).toBeGreaterThan(0);
    expect(
      Arr.filter(roles, (role) => !Arr.contains(Tokens.colorRoles, role)),
      "role paths the README uses that no theme carries",
    ).toEqual([]);
  });
});
