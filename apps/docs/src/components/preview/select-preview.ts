import type { ComponentMetaInput } from "@/component-meta/schema";
import type { Capture } from "./captures";

/**
 * The tier a component's page must show (plan 412). Pure and lookup-driven so
 * it is testable without a browser, a GPUix runtime or a screenshot: the
 * caller supplies the capture lookup, production supplies the real sidecars.
 */
export type PreviewTier =
  | { readonly tier: "screenshot"; readonly captures: readonly Capture[] }
  | { readonly tier: "playground"; readonly screen: string }
  | { readonly tier: "unavailable"; readonly reason: string };

/**
 * Picks the highest honest tier. A screenshot the registry lists but no sidecar
 * proves is **not** shown: it reports the missing sidecar, because a caption
 * taken from a file name would be invented provenance.
 */
export const selectPreview = (
  record: ComponentMetaInput,
  lookup: (screenshot: string) => Capture | undefined,
): PreviewTier => {
  const captures = record.screenshots.flatMap((screenshot) => {
    const capture = lookup(screenshot);
    return capture === undefined ? [] : [capture];
  });

  if (captures.length !== record.screenshots.length) {
    const missing = record.screenshots.filter(
      (screenshot) => lookup(screenshot) === undefined,
    );
    return {
      tier: "unavailable",
      reason: `no capture sidecar for ${missing.join(", ")}`,
    };
  }

  if (captures.length > 0) {
    return { tier: "screenshot", captures };
  }

  if (record.playgroundScreen !== null) {
    return { tier: "playground", screen: record.playgroundScreen };
  }

  return {
    tier: "unavailable",
    reason: "no native preview has been captured yet",
  };
};
