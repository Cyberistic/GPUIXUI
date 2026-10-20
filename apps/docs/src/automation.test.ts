import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import {
  installedNativeRoot,
  installedReactDeclarations,
} from "./lib/native-declarations.testing";
import {
  appMethods,
  appSideFunctions,
  automationAbsences,
  automationCapabilities,
  automationEntryGroups,
  automationSurfaceViolations,
  clockMethods,
  locatorMethods,
  mouseMethods,
  protocolErrorCodes,
  protocolMethods,
  treeNodeFields,
} from "./lib/automation";
import { automationSearchEntry } from "./lib/automation-search";
import { generatedSearchEntries, search } from "./lib/search";
import { indexedSurfaces } from "./lib/search-docs";

/**
 * Guards the Automation page (plan 634). The bug being prevented is a runtime
 * capability with no owner: `@gpuix/native@0.10.0` ships an app driver in
 * `./automation` and the app-side switch in `./runtime`, while measured
 * 2026-10-21 `automation`, `ui automation`, `locator` and `automation tree`
 * reached the Icon page, `getByTestId`, `connectStdio` and `dragTo` returned
 * nothing, `e2e` reached Testing, and `component-pages.mdx` referred to an
 * "automation API" no page explained.
 *
 * These cases fail when the page keeps a member the runtime dropped, invents
 * one, loses an absence, or claims a run the repository never made.
 * `node:fs` is a test-only boundary import, as in `window-surface.test.ts`.
 */
const root = installedNativeRoot();
const read = (path: string): string => readFileSync(join(root, path), "utf8");

const AUTOMATION_ENTRY = read("dist/automation/index.d.ts");
const CLIENT = read("dist/automation/client.d.ts");
const PROTOCOL = read("dist/automation/protocol.d.ts");
const RUNTIME = read("dist/runtime.d.ts");
const REACT = installedReactDeclarations();

const PAGE = readFileSync(
  new URL("../content/docs/automation.mdx", import.meta.url),
  "utf8",
);
/** Prose assertions ignore the page's line wrapping. */
const PROSE = PAGE.replace(/\s+/gu, " ");
const decodeMeta = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
);
const META = decodeMeta(
  readFileSync(new URL("../content/docs/meta.json", import.meta.url), "utf8"),
);

const real = {
  automationEntry: AUTOMATION_ENTRY,
  client: CLIENT,
  protocol: PROTOCOL,
  runtime: RUNTIME,
  reactDeclarations: REACT,
};

const violations = (
  overrides: Partial<Parameters<typeof automationSurfaceViolations>[0]> = {},
): ReadonlyArray<string> =>
  automationSurfaceViolations({ ...real, ...overrides });

const withClassMethod = (
  source: string,
  className: string,
  line: string,
): string => {
  const start = source.indexOf(`export declare class ${className} `);
  if (start < 0) return source;
  const close = source.indexOf("\n}", start);
  return `${source.slice(0, close)}\n${line}${source.slice(close)}`;
};

const withProtocolMethod = (protocol: string): string =>
  protocol.replace(
    "export declare const methods: {",
    `export declare const methods: {
    readonly snapshot: {
        readonly params: z.ZodObject<{}, z.core.$strip>;
        readonly result: z.ZodObject<{}, z.core.$strip>;
    };`,
  );

describe("the automation surface agrees with the installed declarations", () => {
  it("has no violations against the real install", () => {
    expect(violations()).toEqual([]);
  });

  it("reads every derived list from the declarations", () => {
    expect(protocolMethods).toHaveLength(25);
    expect(protocolErrorCodes).toHaveLength(8);
    expect(treeNodeFields).toHaveLength(9);
    expect(automationCapabilities).toHaveLength(4);
    expect(locatorMethods).toHaveLength(17);
    expect(appMethods).toHaveLength(7);
    expect(mouseMethods).toHaveLength(6);
    expect(clockMethods).toHaveLength(4);
    expect(appSideFunctions).toHaveLength(4);
    expect(automationEntryGroups.flatMap((group) => group.rows)).toHaveLength(
      38,
    );
  });

  it("fails by name when Locator gains a method", () => {
    const broken = violations({
      client: withClassMethod(
        CLIENT,
        "Locator",
        "    getByRole(role: string): Locator;",
      ),
    });

    expect(broken).toContain("Locator: getByRole is declared but undocumented");
  });

  it("fails by name when Locator drops a documented method", () => {
    const broken = violations({
      client: CLIENT.replace("    fill(text: string): Promise<void>;\n", ""),
    });

    expect(broken).toContain("Locator: fill is documented but not declared");
  });

  it("fails by name when the protocol gains a method", () => {
    const broken = violations({ protocol: withProtocolMethod(PROTOCOL) });

    expect(broken).toContain("protocol: snapshot is declared but undocumented");
  });

  it("fails by name when an error code is added", () => {
    const broken = violations({
      protocol: PROTOCOL.replace('"Cancelled"]', '"Cancelled", "RateLimited"]'),
    });

    expect(broken).toContain(
      "error code: RateLimited is declared but undocumented",
    );
  });

  it("fails by name when the entry adds an export", () => {
    const broken = violations({
      automationEntry: `${AUTOMATION_ENTRY}\nexport { snapshot } from "./extra.js";`,
    });

    expect(broken).toContain(
      "automation entry: snapshot is declared but undocumented",
    );
  });

  it("fails by name when the runtime adds a function", () => {
    const broken = violations({
      runtime: `${RUNTIME}\nexport declare function connectSocket(): void;`,
    });

    expect(broken).toContain(
      "runtime: connectSocket is declared but undocumented",
    );
  });

  it("fails when the headless absence becomes false", () => {
    const broken = violations({
      runtime: `${RUNTIME}\ninterface LaunchOptions { headless?: boolean }`,
    });

    expect(broken).toContain(
      "a headless flag is now declared; the absence claim is stale",
    );
  });

  it("fails when the clipboard absence becomes false", () => {
    const broken = violations({
      automationEntry: `${AUTOMATION_ENTRY}\nexport { readClipboard } from "./extra.js";`,
    });

    expect(broken).toContain(
      "a clipboard method is now declared; the absence claim is stale",
    );
  });

  it("fails when React stops re-exporting the switch", () => {
    const broken = violations({ reactDeclarations: "" });

    expect(broken).toContain(
      "@gpuix/react no longer declares enableAutomation; the re-export claim is stale",
    );
  });
});

describe("the Automation page", () => {
  it("is routed after Testing", () => {
    expect(META.pages.indexOf("automation")).toBeGreaterThan(
      META.pages.indexOf("testing"),
    );
  });

  it("keeps the twelve sections the contract needs", () => {
    const headings = [...PAGE.matchAll(/^## (.+)$/gmu)].map(
      (match) => match[1],
    );

    expect(headings).toEqual([
      "What it is",
      "Turn it on in the app",
      "Connect from the test",
      "Find an element",
      "Act on it",
      "Read and wait",
      "Control time",
      "Capture frames",
      "The wire protocol",
      "What it is not",
      "Evidence on this site",
      "Related",
    ]);
  });

  it("renders the rows from the data module instead of retyping them", () => {
    const rendered = [
      "<AutomationAppSideTable />",
      '<AutomationEntryTable group="drive" />',
      "<AutomationLocatorTable />",
      "<AutomationAppTable />",
      "<AutomationMouseTable />",
      "<AutomationClockTable />",
      "<AutomationCapabilities />",
      "<AutomationProtocolTable />",
      "<AutomationProtocolErrors />",
      "<AutomationTreeNode />",
      "<AutomationAbsences />",
    ].filter((tag) => !PAGE.includes(tag));

    expect(rendered).toEqual([]);
  });

  it("renders every entry group and invents none", () => {
    const rendered = [
      ...PAGE.matchAll(/<AutomationEntryTable group="([^"]+)" \/>/gu),
    ]
      .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
      .sort();
    const declared = automationEntryGroups.map((group) => group.id).sort();

    expect(rendered).toEqual(declared);
  });

  it("states the zero-config path and the browser path", () => {
    const facts = [
      "createNativeRenderer",
      "not a TTY",
      "enableAutomation",
      "installBrowserAutomation",
      "IME_MIRROR_SELECTOR",
    ].filter((fact) => !PAGE.includes(fact));

    expect(facts).toEqual([]);
  });

  it("states the absences it claims", () => {
    const subjects = automationAbsences.map((absence) => absence.subject);

    expect(subjects).toEqual([
      "Assertions",
      "Test runner",
      "Visual diff",
      "Network or idle wait",
      "Multiple windows",
      "App log capture",
      "DOM or accessibility tree",
      "Headless mode",
      "Clipboard",
    ]);
    expect(PAGE).toContain("<AutomationAbsences />");
    expect(
      automationAbsences.map((absence) => absence.statement).join(" "),
    ).toMatch(/no headless flag/iu);
  });

  it("does not claim a run it did not make", () => {
    expect(PROSE).toContain(
      "No workspace in this repository connects to a running app over this protocol yet",
    );
    expect(PROSE).not.toMatch(/verified in the runtime|has been verified/iu);
    expect(PAGE).not.toMatch(/<NativePreview|<LiveSurface/);
  });

  it("links the five pages that own the neighbouring subjects", () => {
    const missing = [
      "/docs/testing",
      "/docs/native-testing",
      "/docs/component-api#shared-host-props",
      "/docs/accessibility",
      "/docs/selection",
    ].filter((link) => !PAGE.includes(link));

    expect(missing).toEqual([]);
  });
});

describe("automation is findable", { timeout: 120_000 }, () => {
  it("registers its generated document and its site-search row", () => {
    expect(generatedSearchEntries).toContain(automationSearchEntry);
    expect(automationSearchEntry.index.url).toBe("/docs/automation");
    expect(
      indexedSurfaces.some((surface) => surface.url === "/docs/automation"),
    ).toBe(true);
  });

  it.each([
    ["automation", "/docs/automation"],
    ["ui automation", "/docs/automation"],
    ["e2e", "/docs/automation"],
    ["end to end", "/docs/automation"],
    ["locator", "/docs/automation"],
    ["getByTestId", "/docs/automation"],
    ["connectStdio", "/docs/automation"],
    ["automation tree", "/docs/automation"],
    ["dragTo", "/docs/automation"],
    ["sse", "/docs/automation"],
    ["capture frames", "/docs/automation"],
  ])("%s reaches the page", async (query, url) => {
    const [first] = await search(query);

    expect(first?.url.startsWith(url)).toBe(true);
  });

  it.each([
    ["screenshot", "/docs/previews"],
    ["playwright", "/docs/testing"],
    ["testid", "/docs/component-api"],
    ["test id", "/docs/testing"],
    ["selection", "/docs/selection"],
  ])("%s keeps %s", async (query, url) => {
    const [first] = await search(query);

    expect(first?.url.startsWith(url)).toBe(true);
  });
});
