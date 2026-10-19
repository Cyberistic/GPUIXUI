/**
 * Guards the smoke CLI's contract.
 *
 * The bugs these catch: an unsupported host reporting success (or crashing
 * before it can explain why), `--list` or a flag typo silently running the
 * whole suite, an unknown `--only` running zero scenarios and reporting a
 * pass, a scenario added with a duplicate id or an uncovered capability, and a
 * preflight message that does not tell the operator what to do.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Runtime } from "@gpuixui/testing";
import {
  scenarioProblems,
  scenarios,
  selectScenarios,
} from "../scenarios/index.js";
import {
  EXIT,
  formatMissing,
  formatUnsupported,
  idsOf,
  main,
  parseArgs,
  runScenarioCli,
  usage,
} from "./run.js";

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

  it("turns --list into an explicit flag", () => {
    const parsed = parseArgs(["--list"]);
    expect(parsed.flags.list).toBe(true);
    expect(parsed.flags.only).toEqual(Option.none());
    expect(parsed.unknown).toEqual([]);
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

  it("selects exactly the scenario named by --only", () => {
    const parsed = parseArgs(["--only", "layout-flex"]);
    expect(
      Arr.map(
        selectScenarios(scenarios, parsed.flags.only),
        (scenario) => scenario.id,
      ),
    ).toEqual(["layout-flex"]);
  });

  it("makes an unknown --only an empty selection, not a silent pass", () => {
    const parsed = parseArgs(["--only", "no-such-scenario"]);
    expect(Option.isSome(parsed.flags.only)).toBe(true);
    expect(selectScenarios(scenarios, parsed.flags.only)).toEqual([]);
  });

  it("parses a bare run as every scenario with no unknown tokens", () => {
    const parsed = parseArgs([]);
    expect(parsed.flags).toEqual({
      json: false,
      screenshots: false,
      list: false,
      only: Option.none(),
      artifacts: "apps/playground/.artifacts",
    });
    expect(parsed.unknown).toEqual([]);
  });
});

describe("formatMissing", () => {
  it("names the bad id and every valid id", () => {
    const message = formatMissing("no-such-scenario", idsOf(scenarios));
    expect(message).toContain("no-such-scenario");
    expect(message).toContain("layout-flex");
  });

  it("documents --list and --only in usage", () => {
    expect(usage).toContain("--list");
    expect(usage).toContain("--only <scenario-id>");
  });
});

describe("scenarioProblems", () => {
  it("accepts the real registry, including the Tier 3/4 probes", () => {
    expect(scenarioProblems(scenarios)).toEqual([]);
    expect(Arr.map(scenarios, (scenario) => scenario.capability)).toEqual(
      expect.arrayContaining(["table", "workspace"]),
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

describe("main", () => {
  const probe = (argv: ReadonlyArray<string>) => {
    let loaded = false;
    return {
      argv,
      load: () => {
        loaded = true;
        return Promise.reject("the binding must not load");
      },
      loaded: () => loaded,
    };
  };

  it.effect("lists the ids and exits 0 without loading the binding", () => {
    const deps = probe(["--list"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.passed);
      expect(deps.loaded()).toBe(false);
    });
  });

  it.effect("rejects an unknown flag with exit 2 before loading", () => {
    const deps = probe(["--onlyy", "layout-flex"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.unverified);
      expect(deps.loaded()).toBe(false);
    });
  });

  it.effect("rejects an unknown --only with exit 2 before loading", () => {
    const deps = probe(["--only", "no-such-scenario"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.unverified);
      expect(deps.loaded()).toBe(false);
    });
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
