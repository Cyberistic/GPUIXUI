import type { Capture } from "./captures";
import { captureFor } from "./captures";
import { NativeScreenshot } from "./screenshot";

/**
 * The curated native captures on the Theming page (plan 412 §5, plan 433).
 * Only real theme-gallery frames from the playground are listed; a frame with
 * no sidecar is never rendered, and the page says which one is missing.
 */
const shots = [
  {
    screenshot: "screenshots/theming/theme-color-roles.png",
    alt: "The Theme gallery's colour-role swatches painted by GPUix",
  },
  {
    screenshot: "screenshots/theming/theme-type-and-shadow.png",
    alt: "Every type role, the focus ring and the elevation shadow painted by GPUix",
  },
] as const;

export const selectThemeCaptures = (
  lookup: (screenshot: string) => Capture | undefined,
) => ({
  captures: shots.flatMap((shot) => {
    const capture = lookup(shot.screenshot);
    return capture === undefined ? [] : [{ ...shot, capture }];
  }),
  missing: shots.flatMap((shot) =>
    lookup(shot.screenshot) === undefined ? [shot.screenshot] : [],
  ),
});

export function ThemeCaptures() {
  const { captures, missing } = selectThemeCaptures(captureFor);

  return (
    <div className="not-prose my-4 flex flex-col gap-4">
      {captures.map(({ screenshot, alt, capture }) => (
        <NativeScreenshot
          key={screenshot}
          src={`/${screenshot}`}
          provenance={capture.provenance}
          alt={alt}
        />
      ))}
      {missing.length > 0 ? (
        <p
          role="note"
          className="rounded-md border border-dashed border-fd-border bg-fd-card px-3 py-2 text-sm text-fd-muted-foreground"
        >
          No proven capture for {missing.join(", ")} — run the playground and
          write its sidecar before publishing an image.
        </p>
      ) : null}
    </div>
  );
}
