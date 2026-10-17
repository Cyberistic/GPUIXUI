import { platformTypes } from "@gpuixui/tokens";
import { usePlatform } from "@/platform/platform-provider";
import { IllustrativeApproximation } from "./approximation-banner";
import { previewsBySlug } from "./approximations";
import { PreviewSurface, usePreviewTheme } from "./theme-surface";

/**
 * The Theming page's live proof that the platform toggle reaches every
 * labelled preview (plan 434). The shipped platform themes differ only in type
 * families today, so the note says exactly that instead of implying a palette
 * the package does not ship.
 */
export function PlatformPreviews() {
  const { platform } = usePlatform();
  const theme = usePreviewTheme();

  return (
    <div
      data-platform-previews=""
      className="not-prose my-4 flex flex-col gap-4"
    >
      <p
        role="note"
        className="rounded-md border border-fd-border bg-fd-muted px-3 py-2 text-sm text-fd-muted-foreground"
      >
        Showing the <strong>{platformTypes[platform].label}</strong> platform
        style. Each preview below is an illustrative browser approximation built
        from the active theme; the shipped platform styles currently differ in
        their type families and theme name only.
      </p>
      {[...previewsBySlug.entries()].map(([slug, Preview]) => (
        <div key={slug} className="flex flex-col gap-2">
          <p className="text-xs font-medium text-fd-muted-foreground">{slug}</p>
          <IllustrativeApproximation>
            <Preview theme={theme} />
          </IllustrativeApproximation>
        </div>
      ))}
      <PreviewSurface theme={theme}>
        <code
          style={{
            fontFamily: "var(--preview-font-mono)",
            fontSize: "var(--preview-text-code-size)",
            lineHeight: "var(--preview-text-code-leading)",
            color: "var(--preview-color-muted-foreground)",
          }}
        >
          {`platformTheme(themes.${theme.mode}, "${platform}")`}
        </code>
      </PreviewSurface>
    </div>
  );
}
