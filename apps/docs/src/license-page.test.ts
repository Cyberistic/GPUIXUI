import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";

/**
 * The bug guarded (plan 489): `/docs/license` said "none is written yet" while
 * `LICENSES/README.md` and `LICENSES/base-gpui.md` already recorded the
 * evidence rule and a verified reference. A reader was told the project had no
 * licence record, and nothing compared the page to the directory, so the next
 * record — or the release inventory landing — would keep the page wrong.
 *
 * `node:fs`/`node:path` are deliberate, as in `content.test.ts` and
 * `docs-checks.test.ts`: this is a browser app whose tests read the repository
 * directly, and the Effect runtime must not reach its bundle.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const licensesRoot = join(repoRoot, "LICENSES");
const pagePath = join(appRoot, "content", "docs", "license.mdx");

const page = readFileSync(pagePath, "utf8");

/** Every file under `LICENSES/`, repository-relative, sorted. */
const walk = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : [`LICENSES/${relative(licensesRoot, path)}`];
  });

const recordedFiles = Arr.sort(walk(licensesRoot), Order.String);

const section = (document: string, heading: string): string => {
  const start = document.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = document.indexOf("\n## ", start + heading.length);
  return document.slice(start, next === -1 ? undefined : next);
};

/** `LICENSES/...` paths a section names. */
const namedPaths = (document: string): ReadonlyArray<string> => [
  ...new Set(
    [...document.matchAll(/`(LICENSES\/[^`]+)`/g)].map(
      (match) => match[1] ?? "",
    ),
  ),
];

const recorded = namedPaths(section(page, "Recorded today"));
const owed = namedPaths(section(page, "Still owed before release"));

const baseGpui = readFileSync(join(licensesRoot, "base-gpui.md"), "utf8");
const baseGpuiLicence = baseGpui.match(/Licence:\s*([\w.-]+)/)?.[1] ?? "";
const baseGpuiCommit = baseGpui.match(/Commit read:\s*`(\w+)`/)?.[1] ?? "";

describe("License page", () => {
  it("names every recorded licence file", () => {
    expect(baseGpuiLicence).not.toBe("");
    expect(baseGpuiCommit).not.toBe("");
    expect(recordedFiles.length).toBeGreaterThan(0);
    expect(Arr.sort(recorded, Order.String)).toEqual(recordedFiles);
  });

  it("names only files that exist", () => {
    const missing = recorded.filter(
      (path) => !existsSync(join(repoRoot, path)),
    );
    expect(missing).toEqual([]);
  });

  it("keeps the owed list honestly owed", () => {
    expect(owed.length).toBeGreaterThan(0);
    const alreadyWritten = owed.filter((path) =>
      existsSync(join(repoRoot, path)),
    );
    expect(alreadyWritten).toEqual([]);
  });

  it("states the licence and commit its record states", () => {
    expect(page).toContain(baseGpuiLicence);
    expect(page).toContain(baseGpuiCommit);
  });

  it("no longer denies the record", () => {
    expect(/none is written|nothing is recorded yet/i.test(page)).toBe(false);
  });

  it("ships no placeholder prose", () => {
    expect(/\b(coming soon|TBD|TODO|FIXME)\b/i.test(page)).toBe(false);
  });
});
