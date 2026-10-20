/**
 * Guards the binding fingerprint — plans `529` and `811`.
 *
 * The suite once claimed `verified 0.10.0` while running a binding built from
 * GPUix `main`, so a scenario that only exercises 0.10.0 could pass on code a
 * consumer cannot install. Plan `529` made the run refuse such an artifact.
 *
 * A second blind spot is guarded here: a binding rebuilt with **this repo's own**
 * `zIndex` patch carries a runtime extension the published package cannot type
 * or install, yet the fingerprint returned `None` and the run still printed the
 * release pin. These tests fail if the extension detector stops finding
 * `zIndex`, if it fires on a clean release artifact or another pinned version,
 * or if `artifactIssue` loses either reason (main-only first, extension second).
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import {
  BindingPin,
  artifactIssue,
  describeBinding,
  extensionIssue,
  fingerprintIssue,
} from "./binding.js";

const release = (version = "0.10.0"): BindingPin =>
  new BindingPin({
    package: "@gpuix/native",
    version,
    gpuix: "9fcd628863e354e9c58019fc3bf38981a1e64158",
    zed: "81c99f816b4a5f69d3c014774068034c24d1d7af",
    shaders: "runtime",
  });

const binary = (markers: ReadonlyArray<string>): Uint8Array =>
  new TextEncoder().encode(
    ["gpuix-native", ...markers, "napi_register_module_v1"].join("\0"),
  );

describe("fingerprintIssue", () => {
  it("names the main-only capability a main-derived binding carries", () => {
    const issue = fingerprintIssue(
      binary(["lineClamp", "focusVisible", "registerFont"]),
      release(),
    );
    expect(Option.exists(issue, (text) => text.includes("focusVisible"))).toBe(
      true,
    );
    expect(Option.exists(issue, (text) => text.includes("0.10.0"))).toBe(true);
  });

  it("accepts a release binary that only carries release capabilities", () => {
    const issue = fingerprintIssue(
      binary(["lineClamp", "selectionColor", "getListScrollTop"]),
      release(),
    );
    expect(Option.isNone(issue)).toBe(true);
  });

  it("does not apply a release fingerprint to another version", () => {
    const issue = fingerprintIssue(
      binary(["focusVisible", "registerFont"]),
      release("0.11.0"),
    );
    expect(Option.isNone(issue)).toBe(true);
  });
});

describe("extensionIssue", () => {
  it("names the local extension a patched binding carries", () => {
    const issue = extensionIssue(
      binary(["backgroundColor", "zIndex"]),
      release(),
    );
    expect(Option.isSome(issue)).toBe(true);
    expect(Option.exists(issue, (text) => text.includes("zIndex"))).toBe(true);
  });

  it("accepts a release artifact that only carries release fields", () => {
    const issue = extensionIssue(
      binary(["backgroundColor", "lineClamp", "boxShadow"]),
      release(),
    );
    expect(Option.isNone(issue)).toBe(true);
  });

  it("does not apply an extension marker to another version", () => {
    const issue = extensionIssue(binary(["zIndex"]), release("0.11.0"));
    expect(Option.isNone(issue)).toBe(true);
  });
});

describe("artifactIssue", () => {
  it("reports a newer source before a local extension", () => {
    const issue = artifactIssue(binary(["focusVisible", "zIndex"]), release());
    expect(Option.exists(issue, (text) => text.includes("focusVisible"))).toBe(
      true,
    );
  });

  it("reports a local extension on its own", () => {
    const issue = artifactIssue(
      binary(["backgroundColor", "zIndex"]),
      release(),
    );
    expect(Option.exists(issue, (text) => text.includes("zIndex"))).toBe(true);
  });

  it("accepts the release artifact the suite runs", () => {
    const issue = artifactIssue(
      binary(["backgroundColor", "lineClamp", "getListScrollTop"]),
      release(),
    );
    expect(Option.isNone(issue)).toBe(true);
  });
});

describe("describeBinding", () => {
  it.effect("names the source commits, not only the package version", () =>
    Effect.sync(() => {
      const label = describeBinding(release());
      expect(label).toContain("9fcd6288");
      expect(label).toContain("81c99f81");
      expect(label).toContain("runtime shaders");
    }),
  );
});
