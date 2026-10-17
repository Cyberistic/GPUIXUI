/**
 * Guards the preflight's contract.
 *
 * The bug this host has is "the native binding does not load", and
 * `detectRuntime` must report it as data. If it rethrew, dropped the loader's
 * message, or answered `RuntimeReady` on a rejected load, the smoke CLI would
 * crash before it could explain why, and `COMPONENTS.md` would learn nothing.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { RuntimeStatus, bindingHint, detectRuntime } from "./runtime.js";

describe("detectRuntime", () => {
  it.effect("reports RuntimeUnsupported when the loader rejects", () =>
    Effect.gen(function* () {
      const status = yield* detectRuntime({
        platform: "darwin",
        arch: "x64",
        load: () =>
          Promise.reject(new Error("Cannot find native binding.\nmore detail")),
      });
      if (!RuntimeStatus.guards.RuntimeUnsupported(status)) {
        return yield* Effect.die("expected RuntimeUnsupported");
      }
      expect(status.platform).toBe("darwin");
      expect(status.arch).toBe("x64");
      expect(status.reason).toBe("Cannot find native binding.");
      expect(status.hint).toContain("darwin-arm64");
    }),
  );

  it.effect("reports RuntimeReady when the loader resolves", () =>
    Effect.gen(function* () {
      const status = yield* detectRuntime({
        platform: "win32",
        arch: "arm64",
        load: () => Promise.resolve({ hasNativeTestRenderer: true }),
      });
      if (!RuntimeStatus.guards.RuntimeReady(status)) {
        return yield* Effect.die("expected RuntimeReady");
      }
      expect(status.platform).toBe("win32");
      expect(status.arch).toBe("arm64");
      expect(status.detail.length).toBeGreaterThan(0);
    }),
  );

  it.effect("keeps a non-Error rejection actionable", () =>
    Effect.gen(function* () {
      const status = yield* detectRuntime({
        platform: "linux",
        arch: "x64",
        load: () => Promise.reject("nope"),
      });
      if (!RuntimeStatus.guards.RuntimeUnsupported(status)) {
        return yield* Effect.die("expected RuntimeUnsupported");
      }
      expect(status.reason).toContain("without an Error");
      expect(status.hint).toContain("TestRenderer");
    }),
  );
});

describe("bindingHint", () => {
  it("names the TestRenderer limitation on linux/x64", () => {
    expect(bindingHint("linux", "x64")).toContain("TestRenderer");
  });

  it("does not call darwin/arm64 unsupported", () => {
    const hint = bindingHint("darwin", "arm64");
    expect(hint).toContain("reinstall");
    expect(hint).not.toContain("no published binding");
  });

  it("lists the published targets for a target with none", () => {
    expect(bindingHint("freebsd", "x64")).toContain("napi.targets");
  });
});
