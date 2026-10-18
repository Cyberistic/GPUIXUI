/**
 * Guards the smoke CLI's contract.
 *
 * The bugs these catch: an unsupported host reporting success (or crashing
 * before it can explain why), a flag typo silently running the wrong set, a
 * scenario added with a duplicate id or an uncovered capability, and a
 * preflight message that does not tell the operator what to do.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Runtime } from "@gpuixui/testing";
import { scenarioProblems, scenarios } from "../scenarios/index.js";
import { EXIT, formatUnsupported, parseArgs, runScenarioCli } from "./run.js";

const unsupported = new Runtime.RuntimeUnsupported({
  platform: "darwin",
  arch: "x64",
  reason: "Cannot find native binding.",
  hint: Runtime.bindingHint("darwin", "x64"),
});

describe("formatUnsupported", () => {
  it("names the platform, arch, loader message and remedy", () => {
    const text = formatUnsupported(unsupported);
    expect(text).toContain("darwin-x64");
    expect(text).toContain("Cannot find native binding.");
    expect(text).toContain("darwin-arm64");
  });
});

describe("parseArgs", () => {
  it("reads --only with its value, and boolean flags", () => {
    const parsed = parseArgs(["--only", "layout-flex", "--screenshots"]);
    expect(Option.getOrUndefined(parsed.flags.only)).toBe("layout-flex");
    expect(parsed.flags.screenshots).toBe(true);
    expect(parsed.unknown).toEqual([]);
    expect(parsed.flags.artifacts).toBe("apps/playground/.artifacts");
  });

  it("collects an unknown flag rather than ignoring it", () => {
    const parsed = parseArgs(["--onlyy", "x"]);
    expect(parsed.unknown).toContain("--onlyy");
  });

  it("reports a value-taking flag that has no value", () => {
    expect(parseArgs(["--artifacts"]).unknown).toContain(
      "--artifacts needs a directory",
    );
  });
});

describe("scenarioProblems", () => {
  it("accepts the real registry, including the Tier 3/4 probes", () => {
    expect(scenarioProblems(scenarios)).toEqual([]);
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toEqual(
      expect.arrayContaining(["table", "workspace", "motion"]),
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "roving-focus",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "virtualized-tree",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "scroll-into-view",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "workspace-restore",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toEqual(
      expect.arrayContaining([
        "select",
        "combobox",
        "tooltip",
        "a11y",
        "content",
        "drag",
        "selection",
        "menu",
        "components",
        "search",
      ]),
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "primitives-actions",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "theme-platform",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "search-highlights",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "drag-autoscroll",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "list-reorder",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toContain(
      "reorder",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "tree-reorder",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toContain(
      "tree-reorder",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain("menu-bar");
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toContain(
      "menubar",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "tab-strip-overflow",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "tab-strip-focus",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "panel-nested",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "command-palette",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toEqual(
      expect.arrayContaining(["command"]),
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "workspace-panes",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "grid-wide-table",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toContain(
      "grid",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.id)).toContain(
      "data-grid-virtual",
    );
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toContain(
      "data-grid",
    );
  });

  it("flags duplicated ids", () => {
    expect(scenarioProblems(Arr.appendAll(scenarios, scenarios))).toContain(
      "scenario ids are not unique",
    );
  });

  it("flags a core capability with no scenario", () => {
    const missing = Arr.filter(
      scenarios,
      (scenario) => scenario.capability !== "focus",
    );
    expect(scenarioProblems(missing)).toContain('no scenario covers "focus"');
  });
});

describe("runScenarioCli", () => {
  it.effect("exits 2 and runs nothing on an unsupported host", () =>
    Effect.gen(function* () {
      let suiteRan = false;
      const code = yield* runScenarioCli({
        detect: Effect.succeed(unsupported),
        runSuite: Effect.sync(() => {
          suiteRan = true;
          return EXIT.passed;
        }),
      });
      expect(code).toBe(EXIT.unverified);
      expect(suiteRan).toBe(false);
    }),
  );
});
