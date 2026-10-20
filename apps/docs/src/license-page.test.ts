import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

/**
 * The bug guarded (plan 489): `/docs/license` said "none is written yet" while
 * `LICENSES/README.md` and `LICENSES/base-gpui.md` already recorded the
 * evidence rule and a verified reference. A reader was told the project had no
 * licence record, and nothing compared the page to the directory, so the next
 * record — or the release inventory landing — would keep the page wrong.
 *
 * The second bug guarded (plan 617): the page answered which licences the
 * *references* carry but never whether the library itself is licensed. The
 * repository has no root `LICENSE` and no manifest `license` field, so a
 * consumer could not learn that no terms are published. The status test below
 * reads the repository in both directions: it fails while a declared licence
 * exists and the page still says none, and it fails when the section is removed.
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

/** A licence the library itself declares: a root file or a manifest field. */
const licenceFileName = /^(?:licen[cs]e|copying|unlicense)(?:\..*)?$/i;

const Manifest = Schema.Struct({
  license: Schema.OptionFromOptionalKey(Schema.String),
});
const decodeManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(Manifest),
);

const workspaceManifests = (): ReadonlyArray<string> =>
  [
    join(repoRoot, "package.json"),
    ...["apps", "packages", "examples"]
      .filter((group) => existsSync(join(repoRoot, group)))
      .flatMap((group) =>
        readdirSync(join(repoRoot, group), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => join(repoRoot, group, entry.name, "package.json")),
      ),
  ].filter(existsSync);

const declaredLibraryLicences = (): ReadonlyArray<string> => [
  ...readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && licenceFileName.test(entry.name))
    .map((entry) => entry.name),
  ...workspaceManifests().flatMap((path) =>
    Option.match(decodeManifest(readFileSync(path, "utf8")).license, {
      onNone: () => [],
      onSome: (licence) => [licence],
    }),
  ),
];

const declared = declaredLibraryLicences();

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

  /**
   * Both directions of the library's own licence (plan 617). The page may say
   * "no licence has been declared" only while that is true; a root `LICENSE` or
   * a manifest `license` field makes the sentence false, and removing the
   * sentence while no licence exists removes the only answer a consumer has.
   */
  it("states the library's own licence status", () => {
    const pageSaysUndeclared = page.includes(
      "No licence has been declared for the library itself",
    );
    expect(pageSaysUndeclared).toBe(declared.length === 0);
  });

  it("names every licence the library declares", () => {
    const unnamed = declared.filter((licence) => !page.includes(licence));
    expect(unnamed).toEqual([]);
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
