import { bySlug } from "@/component-meta/registry";
import { NativeScreenshot } from "./screenshot";
import { PlaygroundScreen } from "./playground-screen";
import { PreviewUnavailable } from "./preview-unavailable";

interface NativePreviewProps {
  readonly slug: string;
}

/**
 * Picks the strongest honest preview tier for a component, from its registry
 * record (plan 412). It never falls back to an approximation: an approximation
 * is only ever an explicit, labelled choice a page author makes.
 */
export function NativePreview({ slug }: NativePreviewProps) {
  const record = bySlug.get(slug);
  if (record === undefined) {
    return <PreviewUnavailable reason={`no registry record for "${slug}"`} />;
  }

  if (record.screenshots.length > 0) {
    return (
      <div className="not-prose my-4 flex flex-col gap-3">
        {record.screenshots.map((screenshot) => (
          // TODO: read the capture sidecar for platform/version/commit provenance.
          <NativeScreenshot
            key={screenshot}
            src={`/${screenshot}`}
            caption={screenshot}
            alt={`${record.title} rendered by GPUix`}
          />
        ))}
      </div>
    );
  }

  if (record.playgroundScreen !== null) {
    return <PlaygroundScreen screen={record.playgroundScreen} />;
  }

  return (
    <PreviewUnavailable reason="no native preview has been captured yet" />
  );
}
