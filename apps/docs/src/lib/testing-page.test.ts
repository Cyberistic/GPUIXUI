import { describe, expect, it } from "vitest";
import {
  namedImports,
  publishedNames,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";

/**
 * `/docs/testing` is the only page that documents `@gpuixui/testing`. The
 * package is not a dependency of the docs app, so nothing in the build would
 * notice if the page taught a namespace the package no longer projects, listed
 * a host verb the adapter does not have (or missed one it gained), printed a
 * command its manifest does not declare, or promised the harness returns the
 * exit code the playground owns.
 *
 * The page is held to the package's own source: the entry's namespaces, the two
 * host interfaces, the assertion set, the manifests' scripts, the runner's exit
 * codes and the sidebar it lives in.
 *
 * The capability rule is held to the runner for the same reason. The page said
 * a capability is `verified` "when every scenario covering it passed" and
 * `unverified` "when none ran", which was the rule before `capabilityStatuses`
 * graded from the registry a run selected out of: a `--only` run that sampled
 * one probe prints `unverified`, and a capability the run never touched gets no
 * line at all. A reader who ran one probe read a green line as a capability
 * total, so the old sentence is the regression these cases guard.
 *
 * The window `key` row is held to `otp-keys-lifecycle` too. It said only that
 * the verb sends a key down, so a probe author could plan a `Backspace` the
 * automation runs no native edit for and read the refusal as a defect. The
 * page must state both the insertion and the missing edit, and the filled
 * `OTPField` cell that refuses to delete twice, or the next window probe
 * plans a deletion it cannot drive.
 */

/** True when the value is a plain object, the shape a manifest or a meta file has. */
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A repository JSON file, read as unknown.
 *
 * These are tracked manifests read by a Node-side guard, so the value is parsed
 * here and narrowed by the predicates below; no JSON reaches the site.
 */
const readJson = (path: string): unknown => JSON.parse(readRepo(path));

/** The scripts a manifest declares, or an empty map for a malformed manifest. */
const scriptsOf = (path: string): Readonly<Record<string, string>> => {
  const manifest = readJson(path);
  const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
  if (!isRecord(scripts)) return {};
  return Object.fromEntries(
    Object.entries(scripts).flatMap(([name, body]) =>
      typeof body === "string" ? [[name, body]] : [],
    ),
  );
};

/** The ordered page ids a Fumadocs `meta.json` lists, separators included. */
const sidebarPages = (path: string): ReadonlyArray<string> => {
  const meta = readJson(path);
  const pages = isRecord(meta) ? meta["pages"] : undefined;
  return Array.isArray(pages)
    ? pages.flatMap((page) => (typeof page === "string" ? [page] : []))
    : [];
};

const page = readRepo("apps/docs/content/docs/testing.mdx");
/** The page's prose with wrapping flattened, so a claim is not split by a line break. */
const pageText = page.replace(/\s+/g, " ");
const entry = readRepo("packages/testing/src/index.ts");
const smoke = readRepo("packages/testing/src/smoke.ts");
const report = readRepo("packages/testing/src/report.ts");
const readme = readRepo("packages/testing/README.md");
const pixels = readRepo("packages/testing/src/pixels.ts");
const runner = readRepo("apps/playground/src/smoke/run.ts");

/**
 * True when the page gives `name` a row of its own.
 *
 * A table row, not a passing mention: a verb named only inside a sentence is a
 * verb a reader cannot look up, and the sentence that mentions it can outlive
 * the row it replaced.
 */
const hasRow = (name: string): boolean => page.includes(`| \`${name}\` |`);

/** The page's table row for `name`, or an empty string when it has none. */
const rowOf = (name: string): string =>
  page.split("\n").find((line) => line.startsWith(`| \`${name}\` |`)) ?? "";

/** The names `pixels.ts` exports, which is what the `Pixels` namespace holds. */
const pixelExports = (): ReadonlyArray<string> =>
  [
    ...pixels.matchAll(/^export (?:class|const|function) ([A-Za-z0-9_]+)/gm),
  ].map((match) => match[1] ?? "");

/** The page's paint section, from its heading to the next one. */
const paintSection = (): string => {
  const start = pageText.indexOf("## Reading a frame");
  const end = pageText.indexOf("## Replaying a runtime");
  return start < 0 || end < start ? "" : pageText.slice(start, end);
};

/** The page's window table, from its heading to the report section. */
const windowSection = (): string => {
  const start = page.indexOf("### In a window");
  const end = page.indexOf("## The report");
  return start < 0 || end < start ? "" : page.slice(start, end);
};

/** The page's report section, from its heading to the next one. */
const reportSection = (): string => {
  const start = pageText.indexOf("## The report");
  const end = pageText.indexOf("## Running a suite");
  return start < 0 || end < start ? "" : pageText.slice(start, end);
};

/** The namespaces `export * as …` projects from the package root. */
const namespaces = (): ReadonlyArray<string> =>
  [...entry.matchAll(/^export \* as ([A-Za-z0-9_]+) from/gm)].map(
    (match) => match[1] ?? "",
  );

/**
 * The members of one interface in `smoke.ts`.
 *
 * Optional (`readonly blur?:`) members count: the window-only verbs are all
 * optional, and a guard that skipped the `?` let five of them ship with no row
 * — the hole this case was written for.
 */
const interfaceVerbs = (name: string): ReadonlyArray<string> => {
  const start = smoke.indexOf(`export interface ${name}`);
  const body = smoke.slice(start, smoke.indexOf("\n}", start));
  return [...body.matchAll(/readonly\s+([A-Za-z0-9_]+)\??\s*:/g)].map(
    (match) => match[1] ?? "",
  );
};

/** The page's report table rows: the code and the exporter it names. */
const printedExitCodes = (): ReadonlyMap<string, string> =>
  new Map(
    [...page.matchAll(/^\| `(\d)` \| (.+?) \| /gm)].map((match) => [
      match[1] ?? "",
      match[2] ?? "",
    ]),
  );

/** The exit codes the playground's runner declares. */
const runnerExitCodes = (): ReadonlyMap<string, string> =>
  new Map(
    [...runner.matchAll(/\b(passed|failed|unverified): (\d+)/g)].map(
      (match) => [match[2] ?? "", match[1] ?? ""],
    ),
  );

/** The `nub run --filter <package> <script>` commands the page prints. */
const printedCommands = (): ReadonlyArray<{
  readonly packageName: string;
  readonly script: string;
}> =>
  [...page.matchAll(/nub run --filter (\S+) (\S+)/g)].map((match) => ({
    packageName: match[1] ?? "",
    script: (match[2] ?? "").replace(/[;)]?$/, ""),
  }));

/** The manifest a `--filter` name resolves to. */
const manifestOf = (packageName: string): string =>
  packageName === "playground"
    ? "apps/playground/package.json"
    : `packages/${packageName.replace(/^@gpuixui\//, "")}/package.json`;

describe("the testing page", () => {
  it("projects every namespace the package's entry does", () => {
    const projected = namespaces();
    // A floor, so a scan that stopped matching cannot pass.
    expect(projected.length).toBeGreaterThanOrEqual(6);
    expect(projected).toContain("Smoke");

    const undocumented = projected.filter((name) => !hasRow(name));
    expect(
      undocumented,
      "the page does not name these namespaces of @gpuixui/testing",
    ).toEqual([]);
  });

  it("documents every verb of the offscreen host", () => {
    // A verb is the only way a scenario reads a rendered fact: one the page
    // omits is a capability a contributor cannot discover.
    const verbs = interfaceVerbs("SmokeHost");
    expect(verbs.length).toBeGreaterThanOrEqual(21);
    expect(verbs).toContain("dragSelect");
    expect(verbs).toContain("paintedStyle");

    expect(verbs.filter((verb) => !hasRow(verb))).toEqual([]);
  });

  it("documents every verb of the window host", () => {
    const verbs = interfaceVerbs("AsyncSmokeHost");
    expect(verbs.length).toBeGreaterThanOrEqual(24);
    expect(verbs).toContain("keyUp");
    expect(verbs).toContain("pixels");

    expect(verbs.filter((verb) => !hasRow(verb))).toEqual([]);
  });

  it("names the window-only verbs that are optional in the host", () => {
    // The five verbs a synchronous host has no surface for are declared with a
    // `?`, and the guard above read only the required members: a probe author
    // could not look up the clock, the activation or the renderer's blur.
    const verbs = interfaceVerbs("AsyncSmokeHost");
    const optional = [
      "activateWindow",
      "blur",
      "clockPause",
      "clockFastForward",
      "clockResume",
    ];

    expect(optional.filter((verb) => !verbs.includes(verb))).toEqual([]);
    expect(optional.filter((verb) => !hasRow(verb))).toEqual([]);
    expect(pageText).toContain("Five verbs are optional");
  });

  it("states the focus pair a live window does not deliver", () => {
    // `blur-delivery-lifecycle` measured that no route delivers the pair in
    // this automation window, because it never becomes active — so a probe
    // that reads "the traversal skips onFocus" would plan a blur commit the
    // harness cannot prove.
    expect(pageText).toContain("`blur-delivery-lifecycle`");
    expect(pageText).toContain("**no** `onFocus`/`onBlur`");
    expect(pageText).toContain("`activateWindow()` did not make");
    expect(pageText).toContain("`editor-overlay`");
    expect(pageText).toContain("cannot prove a blur commit");
    expect(pageText).toContain("`a11yTree`");
    expect(pageText).toContain("`focus-traversal`");

    // The probe and the fixture the sentence rests on still measure it.
    const fixture = readRepo("apps/playground/src/live/blur-delivery.ts");
    expect(fixture).toContain(
      "a window whose app never activates delivers none",
    );
    expect(
      readRepo("apps/playground/src/live/blur-delivery-probe.tsx"),
    ).toContain("activateWindow");
    expect(readRepo("apps/playground/README.md")).toContain(
      "this window never becomes active",
    );
  });

  it("prints every assertion a scenario writes", () => {
    const assertions = interfaceVerbs("Assertions");
    expect(assertions.length).toBeGreaterThanOrEqual(5);
    expect(assertions).toContain("expectSome");

    expect(assertions.filter((assertion) => !hasRow(assertion))).toEqual([]);
  });

  it("documents every export the Pixels namespace projects", () => {
    // The row is the namespace's index: a verb that landed without it is a
    // paint reader a probe author cannot find.
    const names = pixelExports();
    expect(names.length).toBeGreaterThanOrEqual(10);
    expect(names).toContain("countDifferingPixels");

    const row = rowOf("Pixels");
    expect(row, "the page has no Pixels row").not.toBe("");
    expect(names.filter((name) => !row.includes(`\`${name}\``))).toEqual([]);
  });

  it("teaches the comparison verbs by the answers the source returns", () => {
    // A probe compares two crops of one box, so the two rules it depends on are
    // read from the implementation: the clamp, and a different shape reading as
    // `null` rather than "nothing changed".
    expect(pixels).toContain("Math.max(region.x, 0)");
    expect(pixels).toContain(
      "if (left.width !== right.width || left.height !== right.height) return null;",
    );

    const section = paintSection();
    expect(section, "the page has no paint section").not.toBe("");
    expect(section).toContain("clamps it to the frame");
    expect(section).toContain("not the same shape");
    expect(section).toContain("`editor-overlay`");
  });

  it("states the edit a named key does not run", () => {
    // `otp-keys-lifecycle` measured the other half of the verb: the automation
    // inserts a printable character but runs no native text edit for a named
    // key, so the platform's Backspace/Delete cannot be driven from a window.
    // The shipped OTPField turns that into a refusal rather than a wrong edit,
    // and the offscreen runtime suite proves the single-delete guard. A page
    // that says only "a key down" sends a probe author after a deletion it
    // cannot drive.
    const probe = readRepo("apps/playground/src/live/scenarios.tsx");
    expect(probe).toContain(
      '"a window\'s automation Backspace runs no native edit"',
    );
    expect(probe).toContain('"the key-up of a filled cell deletes nothing"');

    const row =
      windowSection()
        .split("\n")
        .find((line) => line.startsWith("| `key` |")) ?? "";
    expect(row, "the window table has no key row").not.toBe("");
    expect(row).toContain("**down**");
    expect(row).toContain("no native text edit");

    expect(pageText).toContain("cannot be driven");
    expect(pageText).toContain("`OTPField`");
    expect(pageText).toContain("`otp-keys-lifecycle`");
    expect(pageText).toContain(
      "packages/primitives/runtime/otp.runtime.test.tsx",
    );
  });

  it("states the chord a modified press sends, and the count it cannot send", () => {
    // `clickWith` sends the held modifier set, which no other verb can, and the
    // `modifier-select-lifecycle` probe measured both halves a probe author
    // plans around: the payload's four flags rather than only the chord, and a
    // protocol that hard-codes `click_count: 1`, so a double press cannot be
    // synthesized. A page that lists the verb without either sends the next
    // probe after a range it cannot prove or a count no window can send.
    const probe = readRepo("apps/playground/src/live/scenarios.tsx");
    expect(probe).toContain('"shift extends the selection from the anchor"');
    expect(probe).toContain(
      '"a range after a plain press starts at that press, not at the last toggle"',
    );
    expect(probe).toContain(
      '"a second press on the same row still reports one click"',
    );

    const row = rowOf("clickWith");
    expect(row, "the window table has no clickWith row").not.toBe("");
    expect(row).toContain("shift");
    expect(row).toContain("cmd-shift");

    expect(pageText).toContain("`modifier-select-lifecycle`");
    expect(pageText).toContain("four flags");
    expect(pageText).toContain("`click_count: 1`");
    expect(pageText).toContain("`Smoke.formatModifiers`");
  });

  it("resolves every import it prints against the package's own exports", () => {
    const imports = namedImports(typescriptSnippets(page));
    // Every snippet on the page imports the harness, or the scan missed them.
    expect(imports.length).toBeGreaterThanOrEqual(4);
    expect(unresolvedImports(imports, publishedNames())).toEqual([]);
  });

  it("teaches commands the manifests actually declare", () => {
    const commands = printedCommands();
    expect(commands.length).toBeGreaterThanOrEqual(3);

    const unresolved = commands.filter(
      ({ packageName, script }) =>
        scriptsOf(manifestOf(packageName))[script] === undefined,
    );
    expect(unresolved).toEqual([]);

    // The smoke command is the script that builds and runs the headless runner.
    expect(scriptsOf("apps/playground/package.json")["smoke"]).toContain(
      "dist/smoke/run.js",
    );
  });

  it("prints the exit codes the runner declares, with their owner", () => {
    // `@gpuixui/testing` answers 0 or 1; the unverified code belongs to the app.
    const declared = runnerExitCodes();
    expect([...declared.keys()].toSorted()).toEqual(["0", "1", "2"]);

    const printed = printedExitCodes();
    expect([...printed.keys()].toSorted()).toEqual([...declared.keys()]);
    expect(printed.get("0")).toContain("Report.exitCode");
    expect(printed.get("1")).toContain("Report.exitCode");
    expect(printed.get("2")).toContain("runner");

    // The report module really does answer only the first two.
    expect(report).toContain("): 0 | 1 =>");
  });

  it("states the capability rule the runner applies, not the one it replaced", () => {
    // The verdict is drawn from the registry the run selected out of, so a
    // scoped run cannot claim a total it never measured. The three source
    // claims are the ones the page's bullets paraphrase.
    expect(smoke).toContain("export const capabilityStatuses = (");
    expect(smoke).toContain(
      'Arr.length(ran) === count ? "verified" : "unverified"',
    );
    expect(smoke).toContain(
      "if (Arr.length(ran) === 0) return Option.none<CapabilityResult>();",
    );

    const section = reportSection();
    expect(section, "the page has no report section").not.toBe("");
    expect(section).toContain(
      "every scenario the registry declares for that capability",
    );
    expect(section).toContain("**sampled**");
    expect(section).toContain("no line at all");
    expect(section).toContain("never touched the capability");

    // The rule this page shipped before the runner declared its scope: a
    // scoped run's probe is exactly the case it got wrong.
    expect(section).not.toContain("`unverified` when none ran");
  });

  it("names the verdict seam a runner outside this repo needs", () => {
    // `runScenarios` only knows the declaration when the caller passes it, so
    // the seam is public: a page that documents the verdict without the three
    // names leaves a runner unable to reproduce it.
    const seam = ["Coverage", "coverageOf", "capabilityStatuses"];

    expect(smoke).toContain("export interface Coverage");
    expect(smoke).toContain("export const coverageOf = (");
    expect(smoke).toContain("export const capabilityStatuses = (");
    expect(smoke).toContain("readonly coverage?: ReadonlyArray<Coverage>;");

    const missingRows = seam.filter((name) => !hasRow(name));
    expect(
      missingRows,
      "the page's export table does not carry the verdict seam",
    ).toEqual([]);

    // The package's own record lists the same seam; the two cannot diverge.
    const smokeRow =
      readme.split("\n").find((line) => line.startsWith("| `Smoke`")) ?? "";
    expect(
      seam.filter((name) => !smokeRow.includes(`\`${name}`)),
      "the package README no longer lists the verdict seam",
    ).toEqual([]);
  });

  it("prints the note a scoped run appends to its summary", () => {
    // `formatReport` adds the note so `unverified` beside a green probe is not
    // read as a red line. The page quotes it verbatim, so the wording is read
    // from the formatter rather than retyped here. The slice is taken by index
    // rather than by a regex literal containing a quote: `scripts/check-tests.ts`
    // loses its string state on that shape and reports this case as assertionless.
    const marker = " (unverified: ";
    const at = report.indexOf(marker);
    const end = at === -1 ? -1 : report.indexOf(")", at + marker.length);
    const note =
      at === -1 || end === -1 ? undefined : report.slice(at + 1, end + 1);
    expect(
      note,
      "formatReport no longer explains an unverified capability",
    ).toBeDefined();
    expect(pageText).toContain(note ?? "\u0000");
    expect(report).toContain(
      "const summary = (report: SmokeReport): string =>",
    );
    expect(pageText).toContain("`formatReport` appends");
  });

  it("says the harness is workspace-internal only while the package is", () => {
    const manifest = readJson("packages/testing/package.json");
    const isPrivate = isRecord(manifest) && manifest["private"] === true;
    expect(isPrivate).toBe(pageText.includes("workspace-internal"));
  });

  it("sits in the Contributing section of the sidebar", () => {
    const pages = sidebarPages("apps/docs/content/docs/meta.json");
    const section = pages.indexOf("---Contributing---");

    expect(section).toBeGreaterThanOrEqual(0);
    expect(pages.indexOf("testing")).toBeGreaterThan(section);
    expect(pages.indexOf("testing")).toBeLessThan(pages.indexOf("license"));
  });
});
