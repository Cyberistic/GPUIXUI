import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { source } from "@/lib/source";

/**
 * Guards Layouts' `## Localization and direction` (plan 607).
 *
 * The bug being prevented: `localization`, `localisation`, `i18n`,
 * `internationalization`, `translation`, `locale`, `right to left` and
 * `text direction` had no owner (measured 2026-10-20 — `i18n` reached the Date
 * picker's limitations and the rest returned nothing or Text). The page now
 * states the library's real scope, so the section, the vocabulary in its
 * summary and the pages it links cannot drift apart. Each linked page owns its
 * own limitation; this guard proves the section points at pages the site
 * serves rather than at remembered paths.
 *
 * `node:fs`/`node:path` are deliberate at this vitest boundary, like
 * `performance-page.test.ts`.
 */
const appDirectory = fileURLToPath(new URL("../../", import.meta.url));

const page = readFileSync(
  join(appDirectory, "content/docs/layouts.mdx"),
  "utf8",
);

const section = ((): string => {
  const start = page.indexOf("## Localization and direction");
  const end = page.indexOf("\n## ", start + 1);
  return start === -1 ? "" : page.slice(start, end === -1 ? undefined : end);
})();

describe("the Layouts localization section", () => {
  it("exists and names the vocabulary it owns", () => {
    expect(section).not.toBe("");
    expect(section).toContain("i18n");
    expect(section).toContain("locale");
    expect(section.toLowerCase()).toContain("right-to-left");
  });

  it("names its subject in the page summary", () => {
    const description = /^description: (.+)$/m.exec(page)?.[1] ?? "";
    expect(description.toLowerCase()).toContain("localization");
    expect(description.toLowerCase()).toContain("right-to-left");
  });

  it("links only pages the site serves", () => {
    const urls = new Set(source.getPages().map((entry) => entry.url));
    const links = [...section.matchAll(/\]\((\/docs[^)#]*)\)/g)].map(
      (match) => match[1] ?? "",
    );
    expect(links.length).toBeGreaterThan(0);
    expect(links.filter((url) => !urls.has(url))).toEqual([]);
  });
});
