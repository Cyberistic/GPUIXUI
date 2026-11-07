import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import {
  EXIT,
  hostLabel,
  liveProbes,
  liveRegistry,
  main,
  selectProbes,
} from "./run.js";

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

  it.effect("reports a typo beside --list instead of printing over it", () => {
    const deps = probe(["--list", "--onlyy", "focus-visible"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.unverified);
      expect(deps.loaded()).toBe(false);
    });
  });

  it.effect("rejects an unknown probe id beside --list", () => {
    const deps = probe(["--list", "--only", "no-such-probe"]);
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

  it.effect(
    "rejects a backdrop that is not a mode before loading a window",
    () => {
      const deps = probe(["--window-background", "glassy"]);
      return Effect.gen(function* () {
        const code = yield* main(deps);
        expect(code).toBe(EXIT.unverified);
        expect(deps.loaded()).toBe(false);
      });
    },
  );

  it.effect("accepts a declared backdrop mode", () => {
    const deps = probe(["--list", "--window-background", "blurred"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.passed);
      expect(deps.loaded()).toBe(false);
    });
  });

  it.effect("rejects a titlebar that is not a mode before loading", () => {
    const deps = probe(["--titlebar", "glassy"]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.unverified);
      expect(deps.loaded()).toBe(false);
    });
  });

  it.effect("accepts the titlebar modes beside a backdrop flag", () => {
    const deps = probe([
      "--list",
      "--window-background",
      "transparent",
      "--titlebar",
      "transparent",
    ]);
    return Effect.gen(function* () {
      const code = yield* main(deps);
      expect(code).toBe(EXIT.passed);
      expect(deps.loaded()).toBe(false);
    });
  });
});

describe("the live report's host line", () => {
  it("names the window's backdrop, so a report says which window it came from", () => {
    expect(hostLabel("transparent")).toContain("window-background transparent");
    expect(hostLabel("opaque")).toContain("window-background opaque");
    expect(hostLabel("blurred")).toContain(
      `gpuix live window ${process.platform}-${process.arch} @gpuix/native 0.11.0`,
    );
  });

  it("names a transparent titlebar and leaves the default line alone", () => {
    expect(hostLabel("opaque", "transparent")).toBe(
      hostLabel("opaque").replace("opaque)", "opaque, titlebar transparent)"),
    );
    expect(hostLabel("opaque", "default")).toBe(hostLabel("opaque"));
  });
});
