import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LIVE_SURFACE_DOWNLOAD,
  LIVE_SURFACE_NOTICE,
  LiveSurface,
  livePreviewSrc,
} from "./live-surface";

/**
 * Guards the live-surface contract (plan 455). A live surface is a real GPUix
 * renderer in the browser, but it is not the native window, and it must never
 * download 20 MB before the reader asks. Both rules are text and markup the
 * server can produce, so they are tested without a browser.
 */

describe("live preview URL", () => {
  it("carries the scene, the platform and the mode", () => {
    expect(
      livePreviewSrc({ scene: "button", platform: "win32", mode: "dark" }),
    ).toBe("/gpuix-preview/?scene=button&platform=win32&mode=dark");
  });

  it("keeps the default platform rather than inventing one", () => {
    expect(
      livePreviewSrc({ scene: "button", platform: "default", mode: "light" }),
    ).toContain("platform=default");
  });
});

describe("live preview labels", () => {
  const html = renderToStaticMarkup(
    <LiveSurface scene="button" title="Buttons" />,
  );

  it("says it is not the native desktop window", () => {
    expect(html).toContain("Live GPUix surface");
    expect(html).toContain("not the native desktop window");
    expect(LIVE_SURFACE_NOTICE).toContain("WebAssembly");
    expect(LIVE_SURFACE_NOTICE).toContain("WebAssembly");
  });

  it("states the download before loading", () => {
    expect(html).toContain("Load live preview");
    expect(html).toContain(LIVE_SURFACE_DOWNLOAD);
  });

  it("does not mount the iframe until the reader asks", () => {
    expect(html).toContain('data-preview-tier="live"');
    expect(html).not.toContain("<iframe");
  });
});
