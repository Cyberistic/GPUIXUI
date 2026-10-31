import { describe, expect, it, vi } from "vitest";
import { Effect, Exit } from "effect";
import { pickedPaths } from "./logic.js";
import { FilePanelError, windowActions, type WindowHost } from "./window.js";

/**
 * The native surface's window verbs and the path prompt's answer.
 *
 * Bug guarded: a cancelled prompt read as an empty pick, so a caller reported
 * "0 files" for a reader who chose nothing.
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
