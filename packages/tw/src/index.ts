/**
 * `@gpuixui/tw` — shadcn class recipes for the GPUix native renderer.
 *
 * The root entry is renderer-free (plus `cn`); React wrappers live at
 * `@gpuixui/tw/react` so a pure test can resolve classes without a renderer.
 */

export { cn } from "cn";
export {
  classesToStyle,
  createTw,
  mergeTwStyle,
  unsupportedReason,
  type TwCompiler,
  type TwResult,
} from "./classes.js";
export {
  createTwRegistry,
  defaultRegistry,
  type TwBucket,
  type TwRegistry,
  type TwRegistryConfig,
  type TwState,
  type TwUtilityResolver,
  type TwVariantResolver,
} from "./registry.js";
export { BASE_ALIASES } from "./aliases.js";
export {
  dialogMotion,
  motionFromClasses,
  overlayMotion,
  toastMotion,
  type TwMotion,
} from "./motion.js";
export { resolveUtility, type Utility } from "./utilities.js";
export { unsupportedClasses } from "./unsupported.js";
export {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  DIALOG_CONTENT,
  DIALOG_OVERLAY,
  INPUT_BASE,
  INPUT_FOCUS,
  INPUT_INVALID,
  POPOVER_CONTENT,
} from "./recipes.js";
