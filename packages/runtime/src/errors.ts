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
