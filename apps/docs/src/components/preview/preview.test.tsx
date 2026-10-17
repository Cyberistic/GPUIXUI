import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  APPROXIMATION_NOTICE,
  IllustrativeApproximation,
} from "./approximation-banner";
import { NativePreview } from "./native-preview";
import { PlaygroundScreen } from "./playground-screen";

/**
 * Guards the preview honesty rules (plan 412): an approximation is never shown
 * without the "not GPUix" label, and an unverified component is never replaced
 * by one. The load-bearing failure is a banner that can be omitted.
 */

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
    const html = renderToStaticMarkup(<NativePreview slug="button" />);
    expect(html).toContain("Not verified in the GPUix runtime");
    expect(html).not.toContain(APPROXIMATION_NOTICE);
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
