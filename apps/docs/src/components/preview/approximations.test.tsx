import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lightTheme, platformTheme, type Theme } from "@gpuixui/tokens";
import { bySlug } from "@/component-meta/registry";
import { APPROXIMATION_NOTICE } from "./approximation-banner";
import { previewsBySlug } from "./approximations";
import { ComponentPreview } from "./component-preview";

/**
 * Guards the tier-A preview contract (plan 412, plan 434). The load-bearing
 * failures are an unlabelled approximation, a preview of a component that does
 * not exist, and a preview that stops reading the active theme so the platform
 * toggle silently does nothing.
 */

const previews = [...previewsBySlug.entries()];

const rendered = (slug: string, platform: "darwin" | "win32"): string =>
  renderToStaticMarkup(
    <ComponentPreviewWithTheme
      slug={slug}
      theme={platformTheme(lightTheme, platform)}
    />,
  );

function ComponentPreviewWithTheme({
  slug,
  theme,
}: {
  readonly slug: string;
  readonly theme: Theme;
}) {
  const Preview = previewsBySlug.get(slug);
  return Preview === undefined ? null : <Preview theme={theme} />;
}

describe("tier-A previews", () => {
  it("are all labelled as browser approximations", () => {
    previews.forEach(([slug]) => {
      expect(
        renderToStaticMarkup(<ComponentPreview slug={slug} />),
        slug,
      ).toContain(APPROXIMATION_NOTICE);
    });
  });

  it("only preview components the registry knows", () => {
    expect(
      previews.map(([slug]) => slug).filter((slug) => !bySlug.has(slug)),
    ).toEqual([]);
  });

  it("render nothing for a component with no preview", () => {
    expect(renderToStaticMarkup(<ComponentPreview slug="slider" />)).toBe("");
  });

  it("never present an interaction as native behaviour", () => {
    previews.forEach(([slug]) => {
      const html = rendered(slug, "darwin");
      expect(html, slug).not.toMatch(
        /onclick|tabindex|role="button"|<input|<button/,
      );
    });
  });

  it("re-render every preview when the platform theme changes", () => {
    previews.forEach(([slug]) => {
      const darwin = rendered(slug, "darwin").match(
        /--preview-font-mono:([^;"]+)/,
      )?.[1];
      const win32 = rendered(slug, "win32").match(
        /--preview-font-mono:([^;"]+)/,
      )?.[1];
      expect(darwin, slug).toBe("Menlo");
      expect(win32, slug).toBe("Consolas");
    });
  });
});
