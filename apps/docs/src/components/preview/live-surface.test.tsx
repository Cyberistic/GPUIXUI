import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SCENE_INTERACTION } from "../../../preview/scenes";
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

describe("gesture instructions", () => {
  /**
   * The five gesture scenes (plan 486) need a reader to open the surface; the
   * instruction is the only place the page says how. A scene that paints its
   * state only after a gesture without telling the reader is a blank frame with
   * a spinner, so the text is part of the contract, not decoration.
   */
  it("tells the reader the gesture a gesture scene needs", () => {
    const instruction = SCENE_INTERACTION.combobox;
    const html = renderToStaticMarkup(
      <LiveSurface scene="combobox" title="Comboboxes" />,
    );
    expect(instruction).toBeDefined();
    expect(html).toContain("data-scene-interaction");
    expect(html).toContain(instruction ?? "");
  });

  it("adds no instruction to a scene that opens itself", () => {
    const html = renderToStaticMarkup(
      <LiveSurface scene="button" title="Buttons" />,
    );
    expect(SCENE_INTERACTION.button).toBeUndefined();
    expect(html).not.toContain("data-scene-interaction");
  });
});
