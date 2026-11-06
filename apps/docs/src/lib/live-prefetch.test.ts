import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./live-wasm", () => ({ liveWasmUrl: "/assets/live.wasm" }));

/**
 * The live link's intent prefetch.
 *
 * The live surface downloads a ~20 MiB wasm module; the link warms it once, and
 * only when a reader hovers, focuses or presses. A missing guard would download
 * the module on every render, and a missing call would leave the live page
 * paying the whole transfer after the click.
 */
describe("the live prefetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("downloads the wasm once, and only when asked", async () => {
    const fetch = vi.fn(
      async (_input: RequestInfo | URL) => new Response(null),
    );
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("window", {});

    const { prefetchLiveSurface } = await import("./live-prefetch");
    expect(fetch).not.toHaveBeenCalled();

    prefetchLiveSurface();
    prefetchLiveSurface();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(String(fetch.mock.calls[0]?.[0])).toMatch(/\.wasm$/);
  });
});
