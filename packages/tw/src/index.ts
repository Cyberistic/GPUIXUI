/**
 * `@gpuixui/tw` — shadcn class recipes for the GPUix native renderer.
 *
 * The root entry is renderer-free (plus `cn`); React wrappers live at
 * `@gpuixui/tw/react` so a pure test can resolve classes without a renderer.
 */

export { cn } from "cn";
export {
  classesToStyle,
  mergeTwStyle,
  type TwBucket,
  type TwResult,
} from "./classes.js";
export {
  dialogMotion,
  motionFromClasses,
  overlayMotion,
  toastMotion,
  type TwMotion,
} from "./motion.js";
export { resolveUtility, type Utility } from "./utilities.js";
export { unsupportedClasses, unsupportedReason } from "./unsupported.js";
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
