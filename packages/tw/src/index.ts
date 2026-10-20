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
  CALC_REASONS,
  calcReason,
  calcReasonFromClass,
  calcExpressions,
  evaluateCalc,
  isThemeTokenName,
  themeTokenNumber,
  type CalcResult,
} from "./calc.js";
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
export {
  ALERT_BASE,
  ALERT_CONTENT,
  ALERT_DESCRIPTION,
  ALERT_ICON,
  ALERT_TITLE,
  ALERT_TONES,
  AVATAR_DISC,
  AVATAR_FALLBACK,
  AVATAR_ROOT,
  BADGE_BASE,
  BADGE_SIZES,
  BADGE_VARIANTS,
  CARD_BASE,
  CARD_CONTENT,
  CARD_DESCRIPTION,
  CARD_FOOTER,
  CARD_HEADER,
  CARD_TITLE,
  CARD_VARIANTS,
  EMPTY_STATE_ACTION,
  EMPTY_STATE_DESCRIPTION,
  EMPTY_STATE_ICON,
  EMPTY_STATE_ROOT,
  EMPTY_STATE_TITLE,
  LIST_ITEM,
  LIST_ITEM_DESCRIPTION,
  LIST_ITEM_TITLE,
  LIST_ROOT,
  PAGINATION_ELLIPSIS,
  PAGINATION_LIST,
  PAGINATION_ROOT,
  STEPPER_DESCRIPTION,
  STEPPER_LABEL,
  STEPPER_MARKER,
  STEPPER_MARKER_TEXT,
  STEPPER_ORIENTATION,
  STEPPER_ROOT,
  STEPPER_STEP,
  STEPPER_TEXT,
} from "./recipes.js";
