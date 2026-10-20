import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import {
  installedNativeDeclarations,
  installedNativeRoot,
  installedReactDeclarations,
  packageSources,
} from "./lib/native-declarations.testing";
import {
  classMemberNames,
  updateFormats,
  updaterAbsences,
  updaterGroups,
  updaterSurfaceViolations,
} from "./lib/updater";
import { updaterSearchEntry } from "./lib/updater-search";
import { generatedSearchEntries, search } from "./lib/search";

/**
 * Guards the Auto-update page (plan 633). The bug being prevented is a whole
 * runtime capability with no documentation and a page that denied it: measured
 * 2026-10-21 at `2cdf9a01`, `@gpuix/native@0.10.0` declares `checkUpdate`,
 * `AvailableUpdate` and `CheckUpdateOptions`, while `deployment.mdx` said
 * "auto-update [is] not implemented or documented in this repository" and
 * `updater`, `auto update`, `checkUpdate`, `relaunch`, `nsis`, `appimage` and
 * `wix` reached Testing, a text-area limitation or nothing at all.
 *
 * These cases fail when the page keeps a member the runtime dropped, invents a
 * member, loses the feed contract, stops calling the install path unverified,
 * or when Deployment starts denying the capability again. `node:fs` is a
 * test-only boundary import, as in `window-surface.test.ts`: the docs bundle
 * must never import the native runtime.
 */
const source = (path: string): string =>
  readFileSync(new URL(`../content/docs/${path}`, import.meta.url), "utf8");

const TABLES = readFileSync(
  new URL("./components/updater-tables.tsx", import.meta.url),
  "utf8",
);

const UPDATE_PAGE = source("updates.mdx");
const DEPLOYMENT_PAGE = source("deployment.mdx");
const decodeMeta = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
);
const META = decodeMeta(source("meta.json"));

const DECLARATIONS = installedNativeDeclarations().join("\n");
const BROWSER_ENTRY = readFileSync(
  join(installedNativeRoot(), "browser.mjs"),
  "utf8",
);
const BROWSER_EXPORTS = [...BROWSER_ENTRY.matchAll(/export\s*\{([^}]*)\}/gu)]
  .flatMap((match) => (match[1] ?? "").split(","))
  .map((name) => name.trim())
  .filter((name) => name.length > 0);

const realInput = {
  declarations: DECLARATIONS,
  reactDeclarations: installedReactDeclarations(),
  browserExports: BROWSER_EXPORTS,
  packageSource: packageSources().join("\n"),
};

const violations = (
  overrides: Partial<Parameters<typeof updaterSurfaceViolations>[0]> = {},
): ReadonlyArray<string> =>
  updaterSurfaceViolations({ ...realInput, ...overrides });

/** Add a line inside one declared interface body. */
const withField = (
  declarations: string,
  interfaceName: string,
  line: string,
): string => {
  const start = declarations.indexOf(`export interface ${interfaceName} {`);
  if (start < 0) return declarations;
  const close = declarations.indexOf("\n}", start);
  return `${declarations.slice(0, close)}\n  ${line}${declarations.slice(close)}`;
};

/** Add a member inside the declared `AvailableUpdate` class. */
const withMember = (declarations: string, line: string): string => {
  const start = declarations.indexOf("export declare class AvailableUpdate ");
  const close = declarations.indexOf("\n}", start);
  return `${declarations.slice(0, close)}\n  ${line}${declarations.slice(close)}`;
};

describe("the updater surface agrees with the installed declarations", () => {
  it("has no violations against the real install", () => {
    expect(violations()).toEqual([]);
  });

  it("reads the class members and the interface fields", () => {
    expect(classMemberNames(DECLARATIONS, "AvailableUpdate")).toEqual([
      "currentVersion",
      "version",
      "notes",
      "date",
      "downloadUrl",
      "format",
      "downloadAndInstall",
    ]);
  });

  it("fails by name when the runtime adds a member", () => {
    const broken = violations({
      declarations: withMember(DECLARATIONS, "get size(): number"),
    });

    expect(broken).toContain(
      "AvailableUpdate: size is declared but undocumented",
    );
  });

  it("fails by name when the runtime drops a documented member", () => {
    const broken = violations({
      declarations: DECLARATIONS.replace(
        "  /** Release notes, if the feed sent `notes`. */\n  get notes(): string | null\n",
        "",
      ),
    });

    expect(broken).toContain(
      "AvailableUpdate: notes is documented but not declared",
    );
  });

  it("fails by name when a check option is added", () => {
    const broken = violations({
      declarations: withField(
        DECLARATIONS,
        "CheckUpdateOptions",
        "channel?: string",
      ),
    });

    expect(broken).toContain(
      "CheckUpdateOptions: channel is declared but undocumented",
    );
  });

  it("fails by value when the packager gains a format", () => {
    const broken = violations({
      declarations: DECLARATIONS.replace(
        "`app`, `appimage`, `nsis`, or `wix`",
        "`app`, `appimage`, `nsis`, `wix`, or `msi`",
      ),
    });

    expect(broken).toContain("format: msi is declared but undocumented");
  });

  it("fails when @gpuix/react starts exporting the updater", () => {
    const broken = violations({
      reactDeclarations: `${realInput.reactDeclarations}\nexport declare function checkUpdate(): void;`,
    });

    expect(broken).toEqual([
      "@gpuix/react now declares updater names; the no-wrapper claim is stale",
    ]);
  });

  it("fails when the browser entry starts exporting the updater", () => {
    const broken = violations({
      browserExports: [...BROWSER_EXPORTS, "checkUpdate"],
    });

    expect(broken).toContain("the browser entry now exports checkUpdate");
  });

  it("fails when a workspace package starts shipping update UI", () => {
    const broken = violations({
      packageSource: `${realInput.packageSource}\nconst update = checkUpdate("1.0.0");`,
    });

    expect(broken).toContain(
      "a workspace package references the updater; the no-update-UI claim is stale",
    );
  });

  it("fails when a stated absence becomes a declared option", () => {
    const broken = violations({
      declarations: withField(
        DECLARATIONS,
        "CheckUpdateOptions",
        "delta?: boolean",
      ),
    });

    expect(broken).toContain(
      "delta is a declared option, so the no-delta claim is stale",
    );
  });
});

describe("the Auto-update page", () => {
  it("is routed after Deployment", () => {
    const at = META.pages.indexOf("updates");

    expect(at).toBeGreaterThan(META.pages.indexOf("deployment"));
  });

  it("keeps the five sections the contract needs", () => {
    const headings = [...UPDATE_PAGE.matchAll(/^## (.+)$/gmu)].map(
      (match) => match[1],
    );

    expect(headings).toEqual([
      "What the runtime ships",
      "Check, confirm, install",
      "What the library does not provide",
      "What is not verified",
      "Related",
    ]);
  });

  it("renders the rows from the data module instead of retyping them", () => {
    expect(UPDATE_PAGE).toContain("<UpdaterTables />");
    expect(UPDATE_PAGE).toContain("<UpdaterAbsences />");
    expect(TABLES).toContain("updaterGroups");
    expect(TABLES).toContain("updateFormats");
    expect(TABLES).toContain("updaterAbsences");
    expect(updateFormats).toHaveLength(4);
    expect(updaterGroups.length).toBe(3);
    expect(updaterAbsences.map((absence) => absence.subject)).toContain(
      "Packaging pipeline",
    );
  });

  it("states the feed contract the declarations describe", () => {
    const missing = [
      "checkUpdate(currentVersion, options)",
      "{{current_version}}",
      "pubkey",
      "cargo packager signer generate",
      "downloadAndInstall()",
      "does **not** relaunch",
    ].filter((fact) => !UPDATE_PAGE.includes(fact));

    expect(missing).toEqual([]);
  });

  it("does not claim a run it did not make", () => {
    expect(UPDATE_PAGE).toContain(
      "No packaged application is built, signed or run in this repository",
    );
    expect(UPDATE_PAGE).not.toMatch(
      /<NativePreview|<PreviewSurface|<LiveSurface/,
    );
    expect(UPDATE_PAGE).not.toMatch(
      /has been verified|verified in the runtime/iu,
    );
  });

  it("is the only page that owns the install path", () => {
    expect(DEPLOYMENT_PAGE).toContain("/docs/updates");
    expect(DEPLOYMENT_PAGE).not.toMatch(/auto-update[^.]*not implemented/iu);
  });
});

describe("the updater is findable", { timeout: 120_000 }, () => {
  it("registers its generated document", () => {
    expect(generatedSearchEntries).toContain(updaterSearchEntry);
    expect(updaterSearchEntry.index.url).toBe("/docs/updates");
  });

  it.each([
    ["updater", "/docs/updates"],
    ["auto update", "/docs/updates"],
    ["check for updates", "/docs/updates"],
    ["checkUpdate", "/docs/updates"],
    ["downloadAndInstall", "/docs/updates"],
    ["relaunch", "/docs/updates"],
    ["nsis", "/docs/updates"],
  ])("%s reaches the page", async (query, url) => {
    const [first] = await search(query);

    expect(first?.url).toBe(url);
  });

  it("keeps a library upgrade on Installation", async () => {
    const [first] = await search("upgrade");

    expect(first?.url).toBe("/docs/installation");
  });
});
