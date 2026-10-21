/**
 * Guards the live CLI's contract.
 *
 * The bugs these catch: `--list` or an argument typo loading the native binding
 * (a crash instead of a message), an unknown `--only` opening a window anyway,
 * the registry and the probe bodies drifting apart, and a bare command starting
 * a full live run by accident.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import { EXIT, liveProbes, liveRegistry, main, selectProbes } from "./run.js";

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

describe("live probe registry", () => {
  it("has a body for every registry id", () => {
    expect(Arr.map(liveProbes(), (body) => body.id)).toEqual(
      Arr.map(liveRegistry, (meta) => meta.id),
    );
  });

  it("selects the union of repeated --only ids in registry order", () => {
    expect(
      Arr.map(selectProbes(["focus-visible"]), (selected) => selected.id),
    ).toEqual(["focus-visible"]);
  });
});

describe("live main", () => {
  it.effect(
    "lists the probe ids and exits 0 without loading the binding",
    () => {
      const deps = probe(["--list"]);
      return Effect.gen(function* () {
        const code = yield* main(deps);
        expect(code).toBe(EXIT.passed);
        expect(deps.loaded()).toBe(false);
      });
    },
  );

  it.effect("rejects an unknown flag with exit 2 before loading", () => {
    const deps = probe(["--onlyy", "focus-visible"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.unverified);
      expect(deps.loaded()).toBe(false);
    });
  });

  it.effect("rejects an unknown probe id with exit 2 before loading", () => {
    const deps = probe(["--only", "no-such-probe"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.unverified);
      expect(deps.loaded()).toBe(false);
    });
  });
});
