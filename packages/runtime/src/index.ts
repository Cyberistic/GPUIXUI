/**
 * `@gpuixui/runtime` — the pinned GPUix runtime's capability matrix, typed
 * refusals, and runtime-detected helpers.
 *
 * Dependency-light on purpose: `effect` for the typed error and `@gpuix/react`
 * for the runtime surface it describes. Nothing here renders or depends on the
 * component/token layers.
 */

export {
  capabilities,
  unsupportedFeatures,
  type Capability,
  type CapabilityKey,
  type SupportedCapability,
  type UnsupportedCapability,
  type UnsupportedFeature,
} from "./capabilities.js";
export { UnsupportedRuntimeFeature, unsupportedFeature } from "./errors.js";

export { isTerminal } from "@gpuix/react";
