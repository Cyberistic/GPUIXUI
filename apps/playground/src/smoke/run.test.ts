/**
 * Guards the smoke CLI's contract.
 *
 * The bugs these catch: an unsupported host reporting success (or crashing
 * before it can explain why), a flag typo silently running the whole suite, an
 * unknown `--only` id reporting `0/0 scenarios passed` instead of naming the
 * bad id, a `--list` that loads the binding, a scenario added with a duplicate
 * id or an uncovered capability, and a preflight message that does not tell the
 * operator what to do.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Runtime } from "@gpuixui/testing";
import { scenarioProblems, scenarios } from "../scenarios/index.js";
import { idsOf } from "../scenario-selection.js";
import {
  EXIT,
  formatUnsupported,
  parseArgs,
  runMain,
  runScenarioCli,
  usage,
  usageProblem,
  type CliDeps,
} from "./run.js";

const unsupported = new Runtime.RuntimeUnsupported({
  platform: "darwin",
  arch: "x64",
  reason: "Cannot find native binding.",
  hint: Runtime.bindingHint("darwin", "x64"),
});

const known = idsOf(scenarios);

/** A `CliDeps` whose suite and binding must never be reached. */
const guarded = () => {
  const lines: Array<string> = [];
  const errors: Array<string> = [];
  const deps: CliDeps = {
    detect: Effect.die("loaded the binding"),
    runSuite: () => Effect.die("ran the suite"),
    log: (line) => Effect.sync(() => void lines.push(line)),
    error: (line) => Effect.sync(() => void errors.push(line)),
  };
  return { deps, lines, errors };
};

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
    expect(parsed.flags.only).toEqual(["layout-flex"]);
    expect(parsed.flags.screenshots).toBe(true);
    expect(parsed.unknown).toEqual([]);
    expect(parsed.flags.artifacts).toBe("apps/playground/.artifacts");
  });

  it("accepts repeated and comma-separated --only", () => {
    const parsed = parseArgs([
      "--only",
      "layout-flex,text-entry",
      "--only",
      "input-edit",
    ]);
    expect(parsed.flags.only).toEqual([
      "layout-flex",
      "text-entry",
      "input-edit",
    ]);
    expect(parsed.unknown).toEqual([]);
  });

  it("turns --list into an explicit flag with no selection", () => {
    const parsed = parseArgs(["--list"]);
    expect(parsed.flags.list).toBe(true);
    expect(parsed.flags.only).toEqual([]);
    expect(parsed.unknown).toEqual([]);
  });

  it("collects an unknown flag rather than ignoring it", () => {
    const parsed = parseArgs(["--onlyy", "x"]);
    expect(parsed.unknown).toContain("--onlyy");
  });

  it("reads --capture as a directory that implies screenshots", () => {
    const parsed = parseArgs(["--capture", "out"]);
    expect(parsed.flags.capture).toEqual(Option.some("out"));
    expect(parsed.flags.screenshots).toBe(true);
    expect(parsed.unknown).toEqual([]);
  });

  it("reads --commit and keeps it separate from the capture directory", () => {
    const parsed = parseArgs(["--capture", "out", "--commit", "deadbee"]);
    expect(parsed.flags.capture).toEqual(Option.some("out"));
    expect(parsed.flags.commit).toEqual(Option.some("deadbee"));
  });

  it("reports a value-taking flag that has no value", () => {
    expect(parseArgs(["--artifacts"]).unknown).toContain(
      "--artifacts needs a directory",
    );
    expect(parseArgs(["--only"]).unknown).toContain(
      "--only needs a scenario id",
    );
    expect(parseArgs(["--only", " , "]).unknown).toContain(
      "--only needs a scenario id",
    );
    expect(parseArgs(["--capture"]).unknown).toContain(
      "--capture needs a directory",
    );
    expect(parseArgs(["--commit"]).unknown).toContain("--commit needs a sha");
  });
});

describe("usageProblem", () => {
  it("accepts a selection the registry knows", () => {
    expect(usageProblem(parseArgs(["--only", "layout-flex"]), known)).toEqual(
      Option.none(),
    );
  });

  it("names an unknown argument and the usage", () => {
    const problem = usageProblem(parseArgs(["--onlyy", "x"]), known);
    expect(Option.getOrUndefined(problem)?.exit).toBe(EXIT.unverified);
    expect(Option.getOrUndefined(problem)?.message).toContain(
      "unknown argument: --onlyy",
    );
    expect(Option.getOrUndefined(problem)?.message).toContain(usage);
  });

  it("names every unknown id and every known one", () => {
    const problem = usageProblem(
      parseArgs(["--only", "layout-flex,nope"]),
      known,
    );
    expect(Option.getOrUndefined(problem)?.exit).toBe(EXIT.unverified);
    expect(Option.getOrUndefined(problem)?.message).toContain(
      "unknown scenario id: nope",
    );
    expect(Option.getOrUndefined(problem)?.message).toContain("layout-flex");
  });
});

describe("runMain", () => {
  it.effect("lists every id without loading the binding", () =>
    Effect.gen(function* () {
      const { deps, lines, errors } = guarded();
      const code = yield* runMain(["--list"], deps);
      expect(code).toBe(EXIT.passed);
      expect(errors).toEqual([]);
      expect(lines).toEqual([Arr.join(known, "\n")]);
    }),
  );

  it.effect("refuses an unknown argument before the suite exists", () =>
    Effect.gen(function* () {
      const { deps, lines, errors } = guarded();
      const code = yield* runMain(["--bogus"], deps);
      expect(code).toBe(EXIT.unverified);
      expect(lines).toEqual([]);
      expect(errors.join("\n")).toContain("unknown argument: --bogus");
    }),
  );

  it.effect("refuses an unknown id before the suite exists", () =>
    Effect.gen(function* () {
      const { deps, lines, errors } = guarded();
      const code = yield* runMain(["--only", "nope"], deps);
      expect(code).toBe(EXIT.unverified);
      expect(lines).toEqual([]);
      expect(errors.join("\n")).toContain("unknown scenario id: nope");
    }),
  );

  it.effect("never runs a selection on an unsupported host", () =>
    Effect.gen(function* () {
      const lines: Array<string> = [];
      const errors: Array<string> = [];
      const code = yield* runMain(["--only", "layout-flex"], {
        detect: Effect.succeed(unsupported),
        runSuite: () => Effect.die("ran the suite"),
        log: (line) => Effect.sync(() => void lines.push(line)),
        error: (line) => Effect.sync(() => void errors.push(line)),
      });
      expect(code).toBe(EXIT.unverified);
      expect(lines).toEqual([]);
      expect(errors.join("\n")).toContain("darwin-x64");
    }),
  );
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
        runSuite: () => {
          suiteRan = true;
          return Effect.succeed(EXIT.passed);
        },
        error: () => Effect.void,
      });
      expect(code).toBe(EXIT.unverified);
      expect(suiteRan).toBe(false);
    }),
  );
});
