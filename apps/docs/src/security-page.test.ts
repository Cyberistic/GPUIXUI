import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { PLATFORM_STORAGE_KEY } from "@/platform/platform";

/**
 * The bug guarded (plan 619): the site answered installation, capabilities,
 * performance, deployment and licensing, but `security`, `privacy`, `telemetry`,
 * `cookies` and `vulnerability` returned nothing, and `security policy` reached
 * a Timeline limitation. A reader could not learn whether the library calls
 * home, writes storage or runs remote code — and nothing compared such a page
 * with the repository, so a claim could outlive the code it described.
 *
 * Each test reads the real sources and requires the page to state the measured
 * fact. The claims fail in both directions: a new `fetch` in a package fails the
 * empty scan, and deleting the matching sentence fails the text assertion. A
 * committed `SECURITY.md` flips the policy test, exactly as plan 617's licence
 * guard does.
 *
 * `node:fs`/`node:path` are deliberate, as in `license-page.test.ts`: this is a
 * browser app whose tests read the repository directly, and the Effect runtime
 * must not reach its bundle.
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const appRoot = join(repoRoot, "apps", "docs");

const read = (path: string): string =>
  readFileSync(join(repoRoot, path), "utf8");

const page = read("apps/docs/content/docs/security.mdx");

/** Prose wraps; compare sentences with their line breaks collapsed. */
const prose = page.replace(/\s+/g, " ");

const PACKAGE_SOURCES = [
  "packages/tokens/src",
  "packages/primitives/src",
  "packages/components/src",
  "packages/icons/src",
];

const isSource = (name: string): boolean =>
  /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name);

interface SourceFile {
  readonly path: string;
  readonly text: string;
}

/** Every shipped TypeScript source under the four library packages. */
const librarySources: ReadonlyArray<SourceFile> = PACKAGE_SOURCES.flatMap(
  (directory) =>
    readdirSync(join(repoRoot, directory), {
      recursive: true,
      encoding: "utf8",
    })
      .filter(isSource)
      .map((name) => {
        const path = `${directory}/${name}`;
        return { path, text: read(path) };
      }),
);

/** Every non-test TypeScript source in the docs app. */
const appSources: ReadonlyArray<SourceFile> = readdirSync(
  join(appRoot, "src"),
  { recursive: true, encoding: "utf8" },
)
  .filter(isSource)
  .map((name) => {
    const path = `apps/docs/src/${name}`;
    return { path, text: readFileSync(join(appRoot, "src", name), "utf8") };
  });

const matching = (
  sources: ReadonlyArray<SourceFile>,
  pattern: RegExp,
): ReadonlyArray<string> =>
  Arr.sort(
    sources
      .filter((source) => pattern.test(source.text))
      .map((source) => source.path),
    Order.String,
  );

const network = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource/;
const appFetch = /\bfetch\s*\(/;
const storage =
  /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\.cookie/;
const dynamicCode =
  /\beval\s*\(|new Function\s*\(|dangerouslySetInnerHTML|\.innerHTML\s*=/;
const analytics =
  /\bgtag\s*\(|googletagmanager|plausible\.io|plausible-tracker|window\.plausible|umami\.is|posthog|segment\.io|analytics\.segment|\bsentry\b|mixpanel|matomo|hotjar/i;
const cookies = /document\.cookie/;

const Manifest = Schema.Struct({
  dependencies: Schema.OptionFromOptionalKey(
    Schema.Record(Schema.String, Schema.String),
  ),
  devDependencies: Schema.OptionFromOptionalKey(
    Schema.Record(Schema.String, Schema.String),
  ),
});
const decodeManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(Manifest),
);

const manifest = decodeManifest(read("apps/docs/package.json"));

const dependencyNames = Arr.sort(
  [
    ...Object.keys(Option.getOrElse(manifest.dependencies, () => ({}))),
    ...Object.keys(Option.getOrElse(manifest.devDependencies, () => ({}))),
  ],
  Order.String,
);

const ANALYTICS_PACKAGES = [
  "@vercel/analytics",
  "posthog-js",
  "plausible-tracker",
  "react-ga",
  "mixpanel-browser",
  "matomo",
  "hotjar",
];

const POLICY_FILES = ["SECURITY.md", ".github/SECURITY.md", "docs/SECURITY.md"];
const committedPolicy = POLICY_FILES.filter((path) =>
  existsSync(join(repoRoot, path)),
);

const sidebar = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
)(read("apps/docs/content/docs/meta.json")).pages;

const liveSurface = read("apps/docs/src/components/preview/live-surface.tsx");

describe("security and privacy page", () => {
  it("claims no network calls only while the packages make none", () => {
    expect(matching(librarySources, network)).toEqual([]);
    expect(prose).toContain("make no network requests");
  });

  it("claims no storage only while the packages write none", () => {
    expect(matching(librarySources, storage)).toEqual([]);
    expect(prose).toContain("write nothing to storage");
  });

  it("claims no dynamic code only while the packages run none", () => {
    expect(matching(librarySources, dynamicCode)).toEqual([]);
    expect(prose).toContain("run no remote or dynamic code");
  });

  it("states the native trust boundary without claiming a sandbox", () => {
    expect(prose).toContain(
      "There is no sandbox between the library and the rest of your application",
    );
  });

  it("declares no analytics dependency or client in the docs app", () => {
    expect(
      dependencyNames.filter((name) => ANALYTICS_PACKAGES.includes(name)),
    ).toEqual([]);
    expect(matching(appSources, analytics)).toEqual([]);
    expect(prose).toContain("no analytics");
  });

  it("sets no cookies from the site's own code", () => {
    expect(matching(appSources, cookies)).toEqual([]);
    expect(prose).toContain("Its own code sets no cookies");
  });

  it("names the platform storage key it really writes", () => {
    expect(PLATFORM_STORAGE_KEY).toBe("gpuixui:platform");
    expect(page).toContain(PLATFORM_STORAGE_KEY);
  });

  it("names the only runtime fetch and the search route", () => {
    expect(
      matching(appSources, appFetch).filter(
        (path) => path !== "apps/docs/src/components/preview/live-surface.tsx",
      ),
    ).toEqual([]);
    expect(liveSurface).toContain('method: "HEAD"');
    expect(read("apps/docs/src/routes/api/search.ts")).toContain(
      '"/api/search"',
    );
    expect(prose).toContain("/api/search");
    expect(prose).toContain("HEAD");
  });

  it("names the sandbox the live surface really uses", () => {
    expect(liveSurface).toContain('sandbox="allow-scripts allow-same-origin"');
    expect(page).toContain('sandbox="allow-scripts allow-same-origin"');
  });

  it("states the policy absence until a policy is committed", () => {
    const statesAbsence = prose.includes("No security policy is committed");
    expect(statesAbsence).toBe(committedPolicy.length === 0);
    expect(committedPolicy.filter((path) => !page.includes(path))).toEqual([]);
  });

  it("is ordered directly after Troubleshooting", () => {
    const troubleshooting = sidebar.indexOf("troubleshooting");
    expect(troubleshooting).toBeGreaterThan(-1);
    expect(sidebar[troubleshooting + 1]).toBe("security");
  });
});
