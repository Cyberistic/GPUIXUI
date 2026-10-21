/**
 * Typed refusals for the capabilities the pinned runtime does not provide.
 *
 * `UnsupportedRuntimeFeature` is a `Schema.TaggedError`, so it can fail an
 * Effect's error channel and be caught with `catchTag`. `unsupportedFeature`
 * builds one from the capability matrix, keeping the reason and workaround in
 * one place.
 */

import * as Schema from "effect/Schema";
import {
  capabilities,
  unsupportedFeatures,
  type UnsupportedFeature,
} from "./capabilities.js";

export class UnsupportedRuntimeFeature extends Schema.TaggedError<UnsupportedRuntimeFeature>()(
  "UnsupportedRuntimeFeature",
  {
    feature: Schema.Literals(unsupportedFeatures),
    reason: Schema.String,
    workaround: Schema.String,
  },
  {
    description:
      "A capability the pinned GPUix runtime does not provide, with the honest reason and what to do instead.",
  },
) {
  override get message(): string {
    return (
      `${this.feature} is not supported by the pinned GPUix runtime — ` +
      `${this.reason} ${this.workaround}`
    );
  }
}

/** The typed refusal for one unsupported capability, read from the matrix. */
export const unsupportedFeature = (
  feature: UnsupportedFeature,
): UnsupportedRuntimeFeature => {
  const entry = capabilities[feature];
  return new UnsupportedRuntimeFeature({
    feature,
    reason: entry.reason,
    workaround: entry.workaround,
  });
};
