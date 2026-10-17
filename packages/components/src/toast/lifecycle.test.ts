/**
 * Runtime disposal under StrictMode.
 *
 * The bug this guards: disposing the toast runtime in the first effect cleanup
 * left the StrictMode remount subscribed to a dead runtime, so the first pushed
 * toast was dropped. Disposal is deferred one microtask and cancelled by a
 * remount.
 */

import { describe, expect, it, vi } from "vitest";
import { createRuntimeLifecycle } from "./lifecycle.js";

describe("createRuntimeLifecycle", () => {
  it("disposes after a real unmount", async () => {
    const dispose = vi.fn();
    const lifecycle = createRuntimeLifecycle(dispose);

    lifecycle.mount();
    lifecycle.unmount();
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("keeps the runtime when a remount follows the cleanup", async () => {
    const dispose = vi.fn();
    const lifecycle = createRuntimeLifecycle(dispose);

    lifecycle.mount();
    lifecycle.unmount();
    lifecycle.mount();
    await Promise.resolve();

    expect(dispose).not.toHaveBeenCalled();
  });

  it("disposes once for a second real unmount", async () => {
    const dispose = vi.fn();
    const lifecycle = createRuntimeLifecycle(dispose);

    lifecycle.mount();
    lifecycle.unmount();
    lifecycle.mount();
    await Promise.resolve();
    lifecycle.unmount();
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
