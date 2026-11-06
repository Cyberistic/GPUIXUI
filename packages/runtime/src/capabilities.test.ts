import { describe, expect, it } from "vitest";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import { capabilities, unsupportedFeatures } from "./capabilities.js";
import { UnsupportedRuntimeFeature, unsupportedFeature } from "./errors.js";

const keysWith = (supported: boolean): ReadonlyArray<string> =>
  pipe(
    capabilities,
    R.toEntries,
    Arr.filter(([, entry]) => entry.supported === supported),
    Arr.map(([key]) => key),
    Arr.sort(Order.String),
  );

describe("capability matrix", () => {
  it("names every open gap exactly once", () => {
    expect(keysWith(false)).toEqual([
      "canvas",
      "globalShortcut",
      "gridSpan",
      "imeComposition",
      "nativeView",
      "systemAppearance",
      "transform",
      "tray",
    ]);
  });

  it("names every closed capability exactly once", () => {
    expect(keysWith(true)).toEqual([
      "headlessDialog",
      "tabNavigation",
      "terminal",
    ]);
  });

  it.each([...unsupportedFeatures])(
    "records a reason and workaround for %s",
    (feature) => {
      const entry = capabilities[feature];
      expect(entry.reason.length).toBeGreaterThan(0);
      expect(entry.workaround.length).toBeGreaterThan(0);
    },
  );
});

describe("UnsupportedRuntimeFeature", () => {
  it("builds the typed refusal from the matrix", () => {
    const refusal = unsupportedFeature("transform");
    expect(refusal).toBeInstanceOf(UnsupportedRuntimeFeature);
    expect(refusal.feature).toBe("transform");
    expect(refusal.reason).toBe(capabilities.transform.reason);
    expect(refusal.workaround).toBe(capabilities.transform.workaround);
    expect(refusal.message).toContain("transform");
    expect(refusal.message).toContain(capabilities.transform.reason);
  });

  it("decodes as a tagged error and rejects a closed feature", () => {
    const decoded = Schema.decodeUnknownSync(UnsupportedRuntimeFeature)({
      _tag: "UnsupportedRuntimeFeature",
      feature: "gridSpan",
      reason: "no span",
      workaround: "size the track",
    });
    expect(decoded).toBeInstanceOf(UnsupportedRuntimeFeature);
    expect(decoded.feature).toBe("gridSpan");

    expect(() =>
      Schema.decodeUnknownSync(UnsupportedRuntimeFeature)({
        _tag: "UnsupportedRuntimeFeature",
        feature: "terminal",
        reason: "",
        workaround: "",
      }),
    ).toThrow();
  });
});
