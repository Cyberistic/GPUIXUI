import { bySlug } from "@/component-meta/registry";
import { captureFor } from "./captures";
import { LiveSurface } from "./live-surface";
import { NativeScreenshot } from "./screenshot";
import { PlaygroundScreen } from "./playground-screen";
import { PreviewUnavailable } from "./preview-unavailable";
import { RuntimeCoverage } from "./runtime-coverage";
import {
  selectNativeEvidence,
  selectPreview,
  type PreviewTier,
} from "./select-preview";

/** The tiers that are evidence from a GPUix runtime rather than a browser. */
type NativeTier = Extract<
  PreviewTier,
  { tier: "screenshot" | "playground" | "runtime" }
>;

const isNativeTier = (tier: PreviewTier): tier is NativeTier =>
  tier.tier === "screenshot" ||
  tier.tier === "playground" ||
  tier.tier === "runtime";

const NativeEvidence = ({
  tier,
  title,
}: {
  readonly tier: NativeTier;
  readonly title: string;
}) => {
  if (tier.tier === "screenshot") {
    return (
      <div className="not-prose my-4 flex flex-col gap-3">
        {tier.captures.map((capture) => (
          <NativeScreenshot
            key={capture.screenshot}
            src={`/${capture.screenshot}`}
            provenance={capture.provenance}
            alt={`${title} rendered by GPUix`}
          />
        ))}
      </div>
    );
  }

  if (tier.tier === "playground") {
    return <PlaygroundScreen screen={tier.screen} />;
  }

  return <RuntimeCoverage command={tier.command} testFile={tier.testFile} />;
};

interface NativePreviewProps {
  readonly slug: string;
}

/**
 * Picks the strongest honest preview tier for a component from its registry
 * record and the real capture sidecars (plan 412). A live wasm scene outranks
 * the native tiers on the page but never hides them: the native evidence stays
 * beneath it, because a browser renderer is not the desktop binary (plan 455).
 * It never falls back to an approximation: an approximation is only ever an
 * explicit, labelled choice a page author makes through
 * `IllustrativeApproximation`.
 */
export function NativePreview({ slug }: NativePreviewProps) {
  const record = bySlug.get(slug);
  if (record === undefined) {
    return <PreviewUnavailable reason={`no registry record for "${slug}"`} />;
  }

  const preview = selectPreview(record, captureFor);

  if (preview.tier === "live") {
    const evidence = selectNativeEvidence(record, captureFor);
    return (
      <div className="flex flex-col gap-2">
        <LiveSurface scene={preview.scene} title={record.title} />
        {isNativeTier(evidence) ? (
          <NativeEvidence tier={evidence} title={record.title} />
        ) : null}
      </div>
    );
  }

  if (preview.tier === "unavailable") {
    return <PreviewUnavailable reason={preview.reason} />;
  }

  return <NativeEvidence tier={preview} title={record.title} />;
}
