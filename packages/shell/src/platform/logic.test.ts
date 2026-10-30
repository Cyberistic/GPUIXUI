import { describe, expect, it, vi } from "vitest";
import { Effect, Exit } from "effect";
import {
  TITLE_BAR_HEIGHT,
  TRAFFIC_LIGHT_INSET,
  pickedPaths,
  titleBarPadding,
} from "./logic.js";
import { FilePanelError, windowActions, type WindowHost } from "./window.js";

/**
 * The native surface's two pure facts.
 *
 * Bug guarded: the bar has to leave the window's traffic lights their box. A
 * bar that pads only 12 points paints the app's title under the close button,
 * which is a window that looks broken on every macOS machine and perfect on
 * every screenshot that cropped the lights away.
 */

const host = (overrides: Partial<WindowHost> = {}): WindowHost => ({
  activate: vi.fn(),
  minimize: vi.fn(),
  zoom: vi.fn(),
  toggleFullscreen: vi.fn(),
  setTitle: vi.fn(),
  pickPaths: vi.fn(async () => ["/tmp/a"]),
  ...overrides,
});

describe("the title bar's geometry", () => {
  it("reserves the traffic lights when the window has no titlebar", () => {
    expect(titleBarPadding("native")).toEqual({
      paddingLeft: TRAFFIC_LIGHT_INSET,
      paddingRight: 12,
      height: TITLE_BAR_HEIGHT.comfortable,
    });
  });

  it("does not reserve them for a window that keeps the system bar", () => {
    expect(titleBarPadding("none", "compact")).toEqual({
      paddingLeft: 12,
      paddingRight: 12,
      height: TITLE_BAR_HEIGHT.compact,
    });
  });

  it("keeps the inset wide enough for three lights and their gap", () => {
    // Three 12-point lights at 20 points from the edge end at 20 + 36 + 16.
    expect(TRAFFIC_LIGHT_INSET).toBeGreaterThanOrEqual(72);
  });
});

describe("a path prompt's answer", () => {
  it("reads a cancel as the absence of a choice, not an empty pick", () => {
    expect(pickedPaths(null)).toEqual({ _tag: "Cancelled" });
    expect(pickedPaths([])).toEqual({ _tag: "Cancelled" });
  });

  it("keeps the paths a reader chose", () => {
    expect(pickedPaths(["/a", "/b"])).toEqual({
      _tag: "Picked",
      paths: ["/a", "/b"],
    });
  });
});

describe("the window actions", () => {
  it("forwards every verb to the host", () => {
    const target = host();
    const actions = windowActions(target);
    actions.activate();
    actions.minimize();
    actions.zoom();
    actions.toggleFullscreen();
    actions.setTitle("Files");
    expect(target.activate).toHaveBeenCalledOnce();
    expect(target.minimize).toHaveBeenCalledOnce();
    expect(target.zoom).toHaveBeenCalledOnce();
    expect(target.toggleFullscreen).toHaveBeenCalledOnce();
    expect(target.setTitle).toHaveBeenCalledWith("Files");
  });

  it("turns a cancelled prompt into Cancelled", async () => {
    const actions = windowActions(host({ pickPaths: async () => null }));
    await expect(Effect.runPromise(actions.pickPaths())).resolves.toEqual({
      _tag: "Cancelled",
    });
  });

  it("fails with the panel error when the platform refuses to open it", async () => {
    const boom = new Error("no panel");
    const actions = windowActions(
      host({
        pickPaths: async () => {
          throw boom;
        },
      }),
    );
    const exit = await Effect.runPromiseExit(actions.pickPaths());
    expect(Exit.isFailure(exit)).toBe(true);
    const failure = await Effect.runPromise(Effect.flip(actions.pickPaths()));
    expect(failure).toBeInstanceOf(FilePanelError);
    expect(failure.cause).toBe(boom);
  });

  it("passes the prompt's options through", async () => {
    const pickPaths = vi.fn(async () => ["/dir"]);
    const actions = windowActions(host({ pickPaths }));
    await Effect.runPromise(
      actions.pickPaths({ directories: true, prompt: "Choose" }),
    );
    expect(pickPaths).toHaveBeenCalledWith({
      directories: true,
      prompt: "Choose",
    });
  });
});
