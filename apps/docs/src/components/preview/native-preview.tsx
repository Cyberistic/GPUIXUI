import { bySlug } from "@/component-meta/registry";
import { captureFor } from "./captures";
import { NativeScreenshot } from "./screenshot";
import { PlaygroundScreen } from "./playground-screen";
import { PreviewUnavailable } from "./preview-unavailable";
import { selectPreview } from "./select-preview";

interface NativePreviewProps {
  readonly slug: string;
}

/**
 * Picks the strongest honest preview tier for a component from its registry
 * record and the real capture sidecars (plan 412). It never falls back to an
 * approximation: an approximation is only ever an explicit, labelled choice a
 * page author makes through `IllustrativeApproximation`.
 */
export function NativePreview({ slug }: NativePreviewProps) {
  const record = bySlug.get(slug);
  if (record === undefined) {
    return <PreviewUnavailable reason={`no registry record for "${slug}"`} />;
  }

  const preview = selectPreview(record, captureFor);

  if (preview.tier === "screenshot") {
    return (
      <div className="not-prose my-4 flex flex-col gap-3">
        {preview.captures.map((capture) => (
          <NativeScreenshot
            key={capture.screenshot}
            src={`/${capture.screenshot}`}
            provenance={capture.provenance}
            alt={`${record.title} rendered by GPUix`}
          />
        ))}
      </div>
    );
  }

  if (preview.tier === "playground") {
    return <PlaygroundScreen screen={preview.screen} />;
  }

  return <PreviewUnavailable reason={preview.reason} />;
}
