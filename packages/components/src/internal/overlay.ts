/**
 * The overlay recipe seam.
 *
 * Dialog, Popover, DropdownMenu, ContextMenu and CommandMenu compose their
 * resting appearance through {@link overlaySurfaceStyle}: a shadcn recipe
 * compiled against `@gpuixui/tw`'s **default** registry (fixed metrics), with
 * the caller's `className` joined last via `cn` so it wins conflicts. The
 * caller's `style` is still merged last by each component, so a consumer can
 * override one rule without forking the part.
 *
 * The other two halves of the overlay contract already have their own homes and
 * are referenced, not re-implemented, here:
 *
 * - **z-layering** — `internal/dismiss-layer.ts` owns the topmost-layer-wins
 *   Escape/outside-press stack (the "which overlay closes on Escape" answer),
 *   and the `<anchored>` `priority`/`occlude` props own paint order.
 * - **motion** — `@gpuixui/tw`'s `motionFromClasses` (and its `overlayMotion` /
 *   `dialogMotion` presets) derive the enter/exit motion a recipe names
 *   (`animate-in`, `fade-in-0`, `slide-in-from-*`). The overlay components do
 *   not animate yet; the recipe keeps those classes for provenance.
 *
 * The recipes' positioning classes (`fixed`, `top-1/2`, `z-50`,
 * `-translate-*`) do not become `StyleDesc` values — the renderer has no
 * transform or z-index — so the compiler records them as unsupported and the
 * components own their positioning through `<anchored>` / `<FloatingLayer>`.
 */

import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import { recipeStyle } from "./recipe.js";
import type { Theme } from "./theme.js";

/** Compile an overlay recipe (surface or scrim) to its resting `StyleDesc`.
 *
 * The caller's `className` is joined after the recipe so it wins conflicts;
 * motion and the renderer-unowned positioning classes stay out of the result.
 */
export const overlaySurfaceStyle = (
  recipe: string,
  className: string | undefined,
  theme: Theme,
): StyleDesc => recipeStyle(cn(recipe, className), theme);
