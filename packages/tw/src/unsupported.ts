/**
 * Classes the native renderer cannot carry, grouped by the reason.
 *
 * `TwResult.unsupported` spells each class out; this table is the audit trail
 * behind it. `coverage.test.ts` refuses an upstream class that is neither
 * resolved nor named here, so a new shadcn recipe cannot silently lose a rule.
 */

import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as R from "effect/Record";

const GROUPS: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  [
    "GPUix has no CSS transform, so translate/origin/scale stay out.",
    [
      "-translate-x-1/2",
      "-translate-y-1/2",
      "active:not-aria-[haspopup]:translate-y-px",
      "origin-(--transform-origin)",
      "origin-bottom",
      "will-change-transform",
      "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
      "data-starting-style:[transform:translateY(150%)]",
      "data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
      "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
      "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
      "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
      "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
      "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
      "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
      "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
      "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
      "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
    ],
  ],
  [
    "GPUix has no CSS transitions; motion props animate explicit styles.",
    [
      "[transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
      "transition-[color,box-shadow,background-color]",
      "transition-opacity",
    ],
  ],
  [
    "Pseudo-element rules have no native element to style.",
    [
      "after:-inset-2",
      "after:absolute",
      "after:content-['']",
      "after:h-[calc(var(--gap)+1px)]",
      "after:left-0",
      "after:top-full",
      "after:w-full",
      "file:bg-transparent",
      "file:border-0",
      "file:font-medium",
      "file:h-7",
      "file:inline-flex",
      "file:text-foreground",
      "file:text-sm",
      "placeholder:text-muted-foreground",
    ],
  ],
  [
    "Child and sibling selectors are not part of an element's own StyleDesc.",
    [
      "*:[a]:hover:text-foreground",
      "*:[a]:underline",
      "*:[a]:underline-offset-3",
      "[&_svg]:pointer-events-none",
      "[&_svg:not([class*='size-'])]:size-3",
      "[&_svg:not([class*='size-'])]:size-4",
    ],
  ],
  [
    "Arbitrary CSS variables, calc() and color-mix() have no StyleDesc value.",
    [
      "[--gap:0.75rem]",
      "[--height:var(--toast-frontmost-height,var(--toast-height))]",
      "[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
      "[--peek:0.75rem]",
      "[--scale:calc(max(0,1-(var(--toast-index)*0.1)))]",
      "[--shrink:calc(1-var(--scale))]",
      "h-(--height)",
      "data-expanded:h-(--toast-height)",
      "max-w-[calc(100%-2rem)]",
      "z-[calc(1000-var(--toast-index))]",
      "hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
    ],
  ],
  [
    "GPUix StyleDesc has no background-clip, text-underline-offset or isolation.",
    ["bg-clip-padding", "underline-offset-4", "isolate"],
  ],
  [
    "GPUix draws rings as one box shadow; there is no separate ring offset.",
    ["ring-offset-background"],
  ],
  ["Stacking order awaits the native zIndex slice.", ["z-50"]],
  [
    "`sr-only` needs clipping and a 1px box the native style cannot express.",
    ["sr-only"],
  ],
  ["GPUix has no user-resize handle; the textarea is fixed.", ["resize-none"]],
  [
    "Percentage offsets and auto margins are not native numbers.",
    ["top-1/2", "left-1/2", "mx-auto"],
  ],
  [
    "GPUix has no backdrop filter.",
    ["supports-backdrop-filter:backdrop-blur-sm"],
  ],
  [
    "Registry apply-hook or group marker, not a Tailwind utility.",
    ["cn-font-heading", "group/toast"],
  ],
];

const BY_TOKEN = HashMap.fromIterable(
  Arr.flatMap(GROUPS, ([reason, tokens]) =>
    Arr.map(tokens, (token) => [token, reason] as const),
  ),
);

/** Every class with a recorded reason, for the coverage audit. */
export const unsupportedClasses: ReadonlyArray<string> = Arr.flatMap(
  GROUPS,
  ([, tokens]) => tokens,
);

/** The reason table, for a registry that wants to extend it. */
export const unsupportedReasons: Readonly<Record<string, string>> =
  R.fromEntries(
    Arr.flatMap(GROUPS, ([reason, tokens]) =>
      Arr.map(tokens, (token) => [token, reason] as const),
    ),
  );

/** Why `className` cannot become a `StyleDesc`, or undefined when it can. */
export const unsupportedReason = (className: string): string | undefined =>
  Option.getOrUndefined(HashMap.get(BY_TOKEN, className));
