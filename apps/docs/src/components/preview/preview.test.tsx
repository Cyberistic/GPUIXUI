import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ComponentMetaInput } from "@/component-meta/schema";
import {
  APPROXIMATION_NOTICE,
  IllustrativeApproximation,
} from "./approximation-banner";
import type { Capture, CaptureProvenance } from "./captures";
import { captureCaption } from "./captures";
import { NativePreview } from "./native-preview";
import { NativeScreenshot } from "./screenshot";
import { PlaygroundScreen } from "./playground-screen";
import { selectPreview } from "./select-preview";

/**
 * Guards the preview honesty rules (plan 412). The load-bearing failures are a
 * banner that can be omitted, and a screenshot shown with provenance the
 * capture script never wrote — e.g. the file name presented as a caption.
 */

const record = (
  overrides: Partial<ComponentMetaInput>,
): ComponentMetaInput => ({
  slug: "demo",
  title: "Demo",
  tier: "1",
  group: "foundational",
  status: "planned",
  gpuix: "unverified",
  summary: "A demo component.",
  packageName: "@gpuixui/primitives",
  sourcePath: null,
  api: [],
  parts: [],
  pattern: "static",
  persistence: null,
  dependencies: [],
  related: [],
  playgroundScreen: null,
  screenshots: [],
  runtime: null,
  limitations: [],
  ...overrides,
});

const provenance: CaptureProvenance = {
  platform: "darwin-x64",
  gpuixVersion: "0.1.0",
  commit: "abc1234",
  command: "nub run playground:capture",
  capturedAt: "2026-10-17T08:00:00.000Z",
};

const proven = (screenshot: string): Capture => ({
  screenshot,
  provenance,
});

describe("preview labels", () => {
  it("labels every illustrative approximation", () => {
    const html = renderToStaticMarkup(
      <IllustrativeApproximation>
        <span>demo-marker</span>
      </IllustrativeApproximation>,
    );
    expect(html).toContain(APPROXIMATION_NOTICE);
    expect(html).toContain("demo-marker");
  });

  it("shows an unverified component as unavailable, never approximated", () => {
    const html = renderToStaticMarkup(
      <NativePreview slug="message-scroller" />,
    );
    expect(html).toContain("Not verified in the GPUix runtime");
    expect(html).not.toContain(APPROXIMATION_NOTICE);
  });

  it("names the native suite for a component with no capture yet", () => {
    const html = renderToStaticMarkup(<NativePreview slug="button" />);
    expect(html).toContain('data-preview-tier="runtime"');
    expect(html).toContain(
      "packages/primitives/runtime/controls.runtime.test.tsx",
    );
    expect(html).toContain("nub run --filter @gpuixui/primitives test:runtime");
    expect(html).not.toContain("Not verified in the GPUix runtime");
  });

  it("reports an unknown component instead of rendering nothing", () => {
    const html = renderToStaticMarkup(<NativePreview slug="does-not-exist" />);
    expect(html).toContain("no registry record");
  });

  it("names the playground command and screen", () => {
    const html = renderToStaticMarkup(
      <PlaygroundScreen screen="Button gallery" />,
    );
    expect(html).toContain("nub run dev:playground");
    expect(html).toContain("Button gallery");
  });
});

describe("preview tier selection", () => {
  it("shows a screenshot only when its sidecar proves it", () => {
    const tier = selectPreview(
      record({ screenshots: ["screenshots/demo/default.png"] }),
      proven,
    );
    expect(tier.tier).toBe("screenshot");
  });

  it("refuses to show a screenshot whose sidecar is missing", () => {
    const tier = selectPreview(
      record({ screenshots: ["screenshots/demo/default.png"] }),
      () => undefined,
    );
    expect(tier).toEqual({
      tier: "unavailable",
      reason: "no capture sidecar for screenshots/demo/default.png",
    });
  });

  it("falls to the playground when no capture has been taken", () => {
    const tier = selectPreview(
      record({ playgroundScreen: "Button gallery" }),
      proven,
    );
    expect(tier).toEqual({ tier: "playground", screen: "Button gallery" });
  });

  it("reports native coverage when there is a suite but no capture", () => {
    const tier = selectPreview(
      record({
        runtime: {
          command: "nub run --filter @gpuixui/primitives test:runtime",
          testFile: "runtime/layout.runtime.test.tsx",
        },
      }),
      proven,
    );
    expect(tier).toEqual({
      tier: "runtime",
      command: "nub run --filter @gpuixui/primitives test:runtime",
      testFile: "runtime/layout.runtime.test.tsx",
    });
  });

  it("prefers a capture and a playground screen over native coverage", () => {
    const runtime = {
      command: "nub run --filter @gpuixui/primitives test:runtime",
      testFile: "runtime/layout.runtime.test.tsx",
    };
    expect(
      selectPreview(
        record({
          runtime,
          screenshots: ["screenshots/demo/default.png"],
        }),
        proven,
      ).tier,
    ).toBe("screenshot");
    expect(
      selectPreview(
        record({ runtime, playgroundScreen: "Demo gallery" }),
        proven,
      ).tier,
    ).toBe("playground");
  });

  it("reports unavailable when there is neither a capture, a screen nor a suite", () => {
    const tier = selectPreview(record({}), proven);
    expect(tier).toEqual({
      tier: "unavailable",
      reason: "no native preview has been captured yet",
    });
  });
});

describe("screenshot provenance", () => {
  it("captions a capture from its sidecar, not its file name", () => {
    const html = renderToStaticMarkup(
      <NativeScreenshot
        src="/screenshots/demo/default.png"
        provenance={provenance}
        alt="Demo rendered by GPUix"
      />,
    );
    const caption =
      html.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)?.[1] ?? "";
    expect(caption).toContain(captureCaption(provenance));
    expect(caption).toContain("darwin-x64");
    expect(caption).toContain("abc1234");
    expect(caption).not.toContain("screenshots/demo/default.png");
    expect(caption).not.toContain("Recorded in");
  });

  it("labels an interaction artefact as recorded, not as a still capture", () => {
    const html = renderToStaticMarkup(
      <NativeScreenshot
        src="/screenshots/demo/resize.png"
        provenance={{ ...provenance, kind: "interaction" }}
        alt="Demo resized by GPUix"
      />,
    );
    expect(html).toContain(
      "Recorded in GPUix — darwin-x64, GPUix 0.1.0, abc1234",
    );
    expect(html).not.toContain("Captured from GPUix");
  });

  it("never prints a platform, version or commit the sidecar omits", () => {
    const html = renderToStaticMarkup(
      <NativeScreenshot
        src="/screenshots/demo/default.png"
        provenance={provenance}
        alt="Demo rendered by GPUix"
      />,
    );
    expect(html).not.toContain("win32");
    expect(html).not.toContain("9.9.9");
    expect(html).not.toContain("deadbee");
  });
});
