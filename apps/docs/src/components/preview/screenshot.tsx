export interface NativeScreenshotProps {
  /** Path under `apps/docs/public`, e.g. `screenshots/button/default.png`. */
  readonly src: string;
  /** Provenance line the playground capture script wrote; never invented. */
  readonly caption: string;
  readonly alt: string;
}

/**
 * A real capture from the GPUix runtime (`@gpuix/react/automation` `screenshot()`).
 * The caption is passed in from the screenshot sidecar so provenance is never
 * fabricated here (plan 412 §5).
 */
export function NativeScreenshot({ src, caption, alt }: NativeScreenshotProps) {
  return (
    <figure data-preview-tier="screenshot" className="not-prose my-4">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-fd-border"
      />
      <figcaption className="mt-2 text-sm text-fd-muted-foreground">
        Captured from GPUix — {caption}
      </figcaption>
    </figure>
  );
}
