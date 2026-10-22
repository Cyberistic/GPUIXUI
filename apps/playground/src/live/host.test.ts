/**
 * Guards the live host's font, right-button and list-anchor verbs.
 *
 * The bug these catch: `fontInstaller` dropping or reshaping the probe's bytes
 * (the late-registration probe would then measure a face nobody installed), a
 * rejected font file surfacing as an unlabelled failure — the probe report must
 * name `registerFont`, not `unknown error` — a context-menu probe pressing the
 * primary button, which fires `onClick` and never `onAuxClick`, so the menu
 * stays shut and the probe measures nothing, and a `<virtual-list>` anchor read
 * out of a short tuple as index 0, which would make a tree reveal assert the
 * row it never reached.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Smoke } from "@gpuixui/testing";
import {
  fontInstaller,
  listAnchorOf,
  rightPress,
  windowSizeOf,
  type LiveFontRegistrar,
  type PressableLocator,
} from "./host.js";

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

describe("rightPress", () => {
  it.effect("presses the right button, which is the aux-click path", () => {
    const buttons: Array<number> = [];
    const locator: PressableLocator = {
      click: (options) => {
        buttons.push(options.button);
        return Promise.resolve();
      },
    };
    return Effect.gen(function* () {
      yield* Effect.tryPromise({
        try: () => rightPress(locator),
        catch: (cause) =>
          new Smoke.SmokeHostError({ verb: "rightPress", cause }),
      });
      expect(buttons).toEqual([2]);
    });
  });
});

describe("listAnchorOf", () => {
  it("names the renderer's three-number anchor", () => {
    expect(listAnchorOf([3000, 0, 278])).toEqual({
      itemIndex: 3000,
      offsetInItem: 0,
      viewportHeight: 278,
    });
  });

  it("refuses a short tuple instead of filling the gap with zero", () => {
    expect(listAnchorOf([12])).toBeNull();
    expect(listAnchorOf([])).toBeNull();
  });

  it("keeps the renderer's null, which is how a plain element answers", () => {
    expect(listAnchorOf(null)).toBeNull();
  });
});

describe("windowSizeOf", () => {
  it("keeps the renderer's paintable box", () => {
    expect(windowSizeOf(Option.some({ width: 900, height: 492 }))).toEqual(
      Option.some({ width: 900, height: 492 }),
    );
  });

  it("refuses a box no layout can be measured against", () => {
    expect(windowSizeOf(Option.some({ width: 0, height: 492 }))).toEqual(
      Option.none(),
    );
    expect(windowSizeOf(Option.some({ width: 900, height: -1 }))).toEqual(
      Option.none(),
    );
    expect(
      windowSizeOf(Option.some({ width: Number.NaN, height: 492 })),
    ).toEqual(Option.none());
  });

  it("keeps the renderer's absence as absence, not as a default window", () => {
    expect(windowSizeOf(Option.none())).toEqual(Option.none());
  });
});

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
