/**
 * Guards the live host's font verb.
 *
 * The bug these catch: `fontInstaller` dropping or reshaping the probe's bytes
 * (the late-registration probe would then measure a face nobody installed), and
 * a rejected font file surfacing as an unlabelled failure — the probe report
 * must name `registerFont`, not `unknown error`, so a run is diagnosable.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import { Smoke } from "@gpuixui/testing";
import { fontInstaller, type LiveFontRegistrar } from "./host.js";

const recorder = (): {
  readonly registrar: LiveFontRegistrar;
  readonly installed: () => ReadonlyArray<number>;
} => {
  const files: Array<ReadonlyArray<number>> = [];
  return {
    registrar: {
      registerFont: (data) => {
        files.push(Arr.fromIterable(new Uint8Array(data)));
      },
    },
    installed: () => Arr.flatten(files),
  };
};

describe("fontInstaller", () => {
  it.effect("forwards the probe's bytes to the renderer unchanged", () => {
    const fake = recorder();
    return Effect.gen(function* () {
      yield* fontInstaller(fake.registrar)(new Uint8Array([0, 1, 255]));
      expect(fake.installed()).toEqual([0, 1, 255]);
    });
  });

  it.effect("names the failing verb when the runtime rejects the file", () => {
    const rejecting: LiveFontRegistrar = {
      registerFont: () => {
        throw new Error("no usable name");
      },
    };
    return Effect.gen(function* () {
      const error = yield* fontInstaller(rejecting)(new Uint8Array([1])).pipe(
        Effect.flip,
      );
      expect(error).toBeInstanceOf(Smoke.SmokeHostError);
      expect(error.message).toBe("registerFont: no usable name");
    });
  });
});
