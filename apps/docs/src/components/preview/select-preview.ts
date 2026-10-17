import type { ComponentMetaInput } from "@/component-meta/schema";
import type { Capture } from "./captures";

/**
 * The tier a component's page must show (plan 412, extended by plan 455). Pure
 * and lookup-driven so it is testable without a browser, a GPUix runtime or a
 * screenshot: the caller supplies the capture lookup, production supplies the
 * real sidecars.
 */
export type PreviewTier =
  | { readonly tier: "live"; readonly scene: string }
  | { readonly tier: "screenshot"; readonly captures: readonly Capture[] }
  | { readonly tier: "playground"; readonly screen: string }
  | {
      readonly tier: "runtime";
      readonly command: string;
      readonly testFile: string;
    }
  | { readonly tier: "unavailable"; readonly reason: string };

/**
 * The native evidence for a record, independent of any live surface. A live
 * surface is a real GPUix renderer, but it is not the desktop binary, so it
 * never replaces this tier on a page that has one (plan 455).
 */
export const selectNativeEvidence = (
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

  if (record.runtime !== null) {
    return {
      tier: "runtime",
      command: record.runtime.command,
      testFile: record.runtime.testFile,
    };
  }

  return {
    tier: "unavailable",
    reason: "no native preview has been captured yet",
  };
};

/**
 * Picks the highest honest preview. A live surface outranks a screenshot for
 * the interactive showcase, but only when the build ships its scene; the
 * native evidence is rendered beneath it. A screenshot the registry lists but
 * no sidecar proves is **not** shown, because a caption taken from a file name
 * would be invented provenance. A component with no capture and no playground
 * screen but a real native suite is **covered**, not unverified (plan 432).
 */
export const selectPreview = (
  record: ComponentMetaInput,
  lookup: (screenshot: string) => Capture | undefined,
): PreviewTier =>
  record.liveScene !== null
    ? { tier: "live", scene: record.liveScene }
    : selectNativeEvidence(record, lookup);
