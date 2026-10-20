import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { installedNativeDeclarations } from "./native-declarations.testing";
import { pageAliases } from "./page-aliases";
import { search } from "./search";
import { source } from "./source";
import {
  excludedTestMethods,
  excludedWindowFields,
  testElementFields,
  testMethodGroups,
  testingAbsences,
  testingViolations,
  testWindowFields,
} from "./test-surface";

/**
 * Guards plan 628. The bug: GPUix ships a consumer-facing test renderer
 * (`createTestRoot`, `TestRenderer`, `hasNativeTestRenderer`) and the site never
 * named it — measured 2026-10-20, `createTestRoot`, `hasNativeTestRenderer`,
 * `jsdom`, `playwright`, `storybook`, `fixture` and `spy` returned nothing,
 * `test renderer` reached a Hotkey input limitation and `component test` the
 * component index.
 *
 * The rows are authored in `test-surface.ts`; these tests compare them with the
 * installed declarations in both directions, prove each rule with a mutation,
 * compare the absent tools with every workspace manifest, and pin the page and
 * its search vocabulary.
 */
const appDirectory = fileURLToPath(new URL("../../", import.meta.url));
const repository = fileURLToPath(new URL("../../../../", import.meta.url));
const page = readFileSync(
  join(appDirectory, "content/docs/testing.mdx"),
  "utf8",
);
const declarations = installedNativeDeclarations().join("\n");

/**
 * Every dependency name any workspace manifest declares. `node:fs` and
 * `JSON.parse` are deliberate at this vitest boundary, as in
 * `native-testing.test.ts`; `apps/docs` imports no Effect runtime.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const declaredDependencies = (value: unknown): ReadonlyArray<string> =>
  isRecord(value)
    ? [
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
      ].flatMap((field) => {
        const group = value[field];
        return isRecord(group) ? Object.keys(group) : [];
      })
    : [];

const workspaceDependencies = (): ReadonlyArray<string> =>
  [
    join(repository, "package.json"),
    ...["apps", "packages", "examples"].flatMap((kind) =>
      readdirSync(join(repository, kind), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
          const path = join(repository, kind, entry.name, "package.json");
          return existsSync(path) ? [path] : [];
        }),
    ),
  ].flatMap((path) =>
    declaredDependencies(JSON.parse(readFileSync(path, "utf8"))),
  );

const dependencies = workspaceDependencies();

const base = {
  declarations,
  window: testWindowFields,
  excludedWindow: excludedWindowFields,
  element: testElementFields,
  groups: testMethodGroups,
  excludedMethods: excludedTestMethods,
  absences: testingAbsences,
  dependencies,
};

describe("the installed testing surface", () => {
  it("agrees with the declarations in both directions", () => {
    expect(testingViolations(base)).toEqual([]);
  });

  it("fails when a documented method is not declared", () => {
    expect(
      testingViolations({
        ...base,
        groups: [
          ...testMethodGroups,
          {
            id: "invented",
            title: "Invented",
            note: "",
            methods: [{ name: "clickOnce", summary: "Not a real method." }],
          },
        ],
      }),
    ).toContain("TestRenderer: clickOnce is documented but not declared");
  });

  it("fails when a declared method is undocumented", () => {
    expect(
      testingViolations({
        ...base,
        groups: testMethodGroups.map((group) =>
          group.id === "time"
            ? {
                ...group,
                methods: group.methods.filter(
                  (method) => method.name !== "advanceTime",
                ),
              }
            : group,
        ),
      }),
    ).toContain("TestRenderer: advanceTime is declared but undocumented");
  });

  it("fails when a method is both documented and excluded", () => {
    expect(
      testingViolations({
        ...base,
        excludedMethods: [
          ...excludedTestMethods,
          { name: "flush", owner: "Nowhere" },
        ],
      }),
    ).toContain("TestRenderer: flush is both documented and excluded");
  });

  it("fails when a window option drifts", () => {
    expect(
      testingViolations({
        ...base,
        window: testWindowFields.map((field) =>
          field.name === "dispatchEvent"
            ? { ...field, name: "dispatch" }
            : field,
        ),
      }),
    ).toEqual(
      expect.arrayContaining([
        "TestWindowOptions: dispatch is documented but not declared",
        "TestWindowOptions: dispatchEvent is declared but undocumented",
      ]),
    );
  });

  it("fails when a TestElement field drifts", () => {
    expect(
      testingViolations({
        ...base,
        element: testElementFields.map((field) =>
          field.name === "customProps" ? { ...field, name: "props" } : field,
        ),
      }),
    ).toEqual(
      expect.arrayContaining([
        "TestElement: props is documented but not declared",
        "TestElement: customProps is declared but undocumented",
      ]),
    );
  });

  it("fails when a claimed absence becomes real", () => {
    expect(
      testingViolations({
        ...base,
        absences: [
          ...testingAbsences,
          {
            subject: "Fixture",
            statement: "Not provided.",
            symbol: /StyleDesc/u,
          },
        ],
      }),
    ).toContain(
      "Fixture: the page says it is absent, but the declarations now contain StyleDesc",
    );
  });

  it("fails when a denied tool is installed", () => {
    expect(
      testingViolations({
        ...base,
        dependencies: [...dependencies, "storybook"],
      }),
    ).toContain(
      "Storybook: the workspace installs storybook, but the page says it is absent",
    );
  });
});

describe("the absent tools", () => {
  it("are absent from every workspace manifest", () => {
    const denied = testingAbsences.flatMap(
      (absence) => absence.deniedDependencies ?? [],
    );
    expect(denied.filter((name) => dependencies.includes(name))).toEqual([]);
  });
});

describe("the page", () => {
  it("mounts every table and keeps every section", () => {
    const missing = [
      "<TestWindowTable />",
      "<TestElementTable />",
      ...testMethodGroups.map((group) => `<TestMethods group="${group.id}" />`),
      "<TestMethodExclusions />",
      "<TestingAbsences />",
    ].filter((block) => !page.includes(block));
    expect(missing).toEqual([]);

    const headings = [
      "## Render a component",
      "## Finding what rendered",
      "## Driving input",
      "## Focus",
      "## Time",
      "## Scrolling",
      "## Paint and accessibility",
      "## The render loop",
      "## Members another page owns",
      "## The suite this repository runs",
      "## What is not provided",
    ].filter((heading) => !page.includes(heading));
    expect(headings).toEqual([]);
  });

  it("names its four subjects in the summary", () => {
    const description =
      page
        .slice(0, page.indexOf("\n---", 3))
        .split("\n")
        .find((line) => line.startsWith("description:"))
        ?.slice("description:".length)
        .trim()
        .slice(1, -1)
        .toLowerCase() ?? "";
    const missing = ["test renderer", "dom", "playwright", "storybook"].filter(
      (word) => !description.includes(word),
    );
    expect(missing).toEqual([]);
  });

  it("serves the page in the sidebar and the sitemap", () => {
    const urls = new Set(source.getPages().map((served) => served.url));
    expect(urls.has("/docs/testing")).toBe(true);
    const meta = readFileSync(
      join(appDirectory, "content/docs/meta.json"),
      "utf8",
    );
    expect(meta).toContain('"testing"');
  });
});

const owned: ReadonlyArray<readonly [string, string]> = [
  ["test renderer", "/docs/testing"],
  ["component test", "/docs/testing"],
  ["unit test", "/docs/testing"],
  ["createTestRoot", "/docs/testing"],
  ["hasNativeTestRenderer", "/docs/testing"],
  ["TestRenderer", "/docs/testing"],
  ["findByTestId", "/docs/testing"],
  ["nativeSimulateClick", "/docs/testing"],
  ["nativeSimulateKeystrokes", "/docs/testing"],
  ["advanceTime", "/docs/testing"],
  ["captureScreenshot", "/docs/testing"],
  ["a11y tree", "/docs/testing"],
  ["keyboard test", "/docs/testing"],
  ["jsdom", "/docs/testing"],
  ["playwright", "/docs/testing"],
  ["storybook", "/docs/testing"],
  ["testing library", "/docs/testing"],
  ["react testing library", "/docs/testing"],
  ["e2e", "/docs/testing"],
  ["mock", "/docs/testing"],
  ["mocking", "/docs/testing"],
  ["fixture", "/docs/testing"],
  ["spy", "/docs/testing"],
  ["snapshot test", "/docs/testing"],
  ["snapshot", "/docs/testing"],
  ["golden", "/docs/testing"],
  ["visual regression", "/docs/testing"],
  ["headless test", "/docs/testing"],
  ["test setup", "/docs/testing"],
  ["mocking renderer", "/docs/testing"],
];

const regressions: ReadonlyArray<readonly [string, string]> = [
  ["vitest", "/docs/contributing"],
  ["ci", "/docs/contributing"],
  ["github actions", "/docs/contributing"],
  ["screenshot", "/docs/previews"],
  ["coverage", "/docs/roadmap"],
  ["selection", "/docs/selection"],
  ["accessibility tree", "/docs/accessibility"],
  ["smoke suite", "/docs/native-testing"],
  ["transition", "/docs/theming#motion"],
];

describe("search", { timeout: 120_000 }, () => {
  it("names the testing surface from the words a reader types", async () => {
    const wrong = await Promise.all(
      owned.map(async ([query, url]) => {
        const [first] = await search(query, 2);
        return first?.url === url
          ? []
          : [`${query} → ${first?.url ?? "nothing"}`];
      }),
    );
    expect(wrong.flat()).toEqual([]);
  });

  it("keeps the words that belong to another page", async () => {
    const wrong = await Promise.all(
      regressions.map(async ([query, url]) => {
        const [first] = await search(query, 2);
        return first?.url === url
          ? []
          : [`${query} → ${first?.url ?? "nothing"}`];
      }),
    );
    expect(wrong.flat()).toEqual([]);
  });

  it("lists the page's aliases in one table block", () => {
    expect(pageAliases.get("/docs/testing")?.length ?? 0).toBeGreaterThan(20);
  });
});
