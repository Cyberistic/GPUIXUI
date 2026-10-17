import { type CaptureProvenance, captureCaption } from "./captures";

export interface NativeScreenshotProps {
  /** Path under `apps/docs/public`, e.g. `screenshots/button/default.png`. */
  readonly src: string;
  /** Read from the capture sidecar; the component never invents provenance. */
  readonly provenance: CaptureProvenance;
  readonly alt: string;
}

/**
 * A real capture from the GPUix runtime (`@gpuix/react/automation` `screenshot()`).
 * The caption is built only from the sidecar the capture script wrote (plan
 * 412 §5), so a screenshot cannot appear with an invented platform or commit.
 */
export function NativeScreenshot({
  src,
  provenance,
  alt,
}: NativeScreenshotProps) {
  return (
    <figure data-preview-tier="screenshot" className="not-prose my-4">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-fd-border"
      />
      <figcaption className="mt-2 text-sm text-fd-muted-foreground">
        {captureCaption(provenance)}
      </figcaption>
    </figure>
  );
}
