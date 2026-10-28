/** @jsxImportSource @gpuix/react */
/**
 * Bubble: the surface one message wears.
 *
 * Ported from shadcn/ui's `Bubble` (`registry/bases/base/ui/bubble.tsx`): seven
 * variants, start/end alignment, a content surface, an avatar slot, a reaction
 * row and a hover/focus action strip. The implementation is ours and runs on
 * GPUix host elements. A bubble is independent of `Message` — the bubble can be
 * a quoted reply, a suggestion or a notification — so it never reads a message
 * context.
 *
 * Two rules are geometry, not paint. A bubble is at most 80% of its row
 * (`ghost` takes the whole row) and the cap is a `DimensionValue` the caller can
 * replace. Consecutive bubbles from one sender tighten through `BubbleGroup` and
 * square their joined corners through `group`; the last keeps a short tail on
 * the sender's side.
 *
 * The action strip is laid out even while hidden and fades in on pointer-over
 * or focus, so revealing it never moves the bubble. The reaction pill hangs a
 * quarter of its height over the surface's bottom edge from inside the column:
 * `position: "absolute"` resolves against the mount parent in
 * `@gpuix/native@0.11.0`, so shadcn's three-quarter overlap is not available.
 */

import type { DimensionValue, Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  BUBBLE_ACTIONS,
  BUBBLE_COLUMN,
  BUBBLE_CONTENT,
  BUBBLE_GROUP,
  BUBBLE_REACTIONS,
  BUBBLE_ROOT,
  BUBBLE_VARIANTS,
  cn,
} from "@gpuixui/tw";
import { createContext, useContext, useState, type ReactNode } from "react";
import { accessibleName } from "@gpuixui/primitives/core";
import { Button, type ButtonProps } from "./internal/button.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { textOf } from "./internal/text.js";
import { alpha, controlHeight, useTheme } from "./internal/theme.js";
import {
  bubbleAlignOf,
  bubbleCorners,
  bubbleGroupOf,
  bubbleVariantOf,
  reactionInset,
  type BubbleAlign,
  type BubbleGroupPosition,
  type BubbleVariant,
} from "./bubble/logic.js";

export type { BubbleAlign, BubbleGroupPosition, BubbleVariant };

/** The rules every part reads; throws outside a {@link Bubble}. */
interface BubbleContextValue {
  readonly variant: BubbleVariant;
  readonly align: BubbleAlign;
  readonly group: BubbleGroupPosition;
  readonly hovered: boolean;
  readonly setHovered: (hovered: boolean) => void;
}

const BubbleContext = createContext<BubbleContextValue | undefined>(undefined);

/** The bubble a part belongs to. Throws when there is none. */
const useBubble = (): BubbleContextValue => {
  const value = useContext(BubbleContext);
  if (value === undefined) {
    throw new Error("Bubble parts must be used inside Bubble");
  }
  return value;
};

/** {@link Bubble} props. */
export interface BubbleProps extends Omit<Props, "children"> {
  /**
   * The surface. Default `"default"`; a name this release does not ship reads
   * as that default.
   */
  readonly variant?: BubbleVariant;
  /** The inline alignment. Default `"start"`. */
  readonly align?: BubbleAlign;
  /**
   * The bubble's place in a run from one sender. Default `"single"`; a name
   * this release does not ship reads as that default.
   */
  readonly group?: BubbleGroupPosition;
  /**
   * The widest the row may be. Default `"80%"` (`"100%"` for `ghost`), matching
   * shadcn's cap.
   */
  readonly maxWidth?: DimensionValue;
  /** An avatar slot. It sits on the outer edge: leading for `start`, trailing
   * for `end`. */
  readonly avatar?: ReactNode;
  /** A Tailwind class string, joined after the root recipe. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** One message surface, up to 80% wide, with an optional avatar. */
export const Bubble = ({
  variant: variantProp = "default",
  align: alignProp = "start",
  group: groupProp = "single",
  maxWidth,
  avatar,
  className,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: BubbleProps) => {
  const theme = useTheme();
  const variant = bubbleVariantOf(variantProp);
  const align = bubbleAlignOf(alignProp);
  const group = bubbleGroupOf(groupProp);
  const [hovered, setHovered] = useState(false);
  assertParts(bubbleRoot, children);

  return (
    <BubbleContext.Provider
      value={{ variant, align, group, hovered, setHovered }}
    >
      <div
        {...rest}
        onMouseEnter={(event) => {
          setHovered(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          setHovered(false);
          onMouseLeave?.(event);
        }}
        style={mergeStyles(
          mergeStyles(recipeStyle(cn(BUBBLE_ROOT, className), theme), {
            // The runtime paints `row-reverse` as order, not geometry on this
            // host, so the avatar's side is the order it is rendered in.
            flexDirection: "row",
            alignSelf: align === "end" ? "flex-end" : "flex-start",
            maxWidth: maxWidth ?? (variant === "ghost" ? "100%" : "80%"),
            ...(variant === "ghost" ? { flexGrow: 1 } : {}),
          }),
          style,
        )}
      >
        {align === "start" ? avatar : null}
        <div
          style={mergeStyles(recipeStyle(BUBBLE_COLUMN, theme), {
            alignItems: align === "end" ? "flex-end" : "flex-start",
          })}
        >
          {children}
        </div>
        {align === "end" ? avatar : null}
      </div>
    </BubbleContext.Provider>
  );
};

/** {@link BubbleContent} props. */
export interface BubbleContentProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  readonly children?: ReactNode;
}

/** The framed surface. Its fill, type and corners come from the bubble. */
export const BubbleContent = ({
  className,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: BubbleContentProps) => {
  const theme = useTheme();
  const { variant, align, group, setHovered } = useBubble();
  const corners = bubbleCorners(
    align,
    group,
    theme.radius.xl,
    theme.radius.sm,
    theme.radius.sm,
  );
  const ghost = variant === "ghost";

  return (
    <div
      {...rest}
      onMouseEnter={(event) => {
        setHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        onMouseLeave?.(event);
      }}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(
            cn(BUBBLE_CONTENT, BUBBLE_VARIANTS[variant], className),
            theme,
          ),
          {
            ...corners,
            ...(variant === "tinted"
              ? { backgroundColor: alpha(theme.colors.primary, 0.14) }
              : {}),
            ...(ghost
              ? {
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }
              : {}),
          },
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link BubbleActions} props. */
export interface BubbleActionsProps extends Omit<Props, "children"> {
  /** The row's accessible name. Default `"Message actions"`. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * The action strip. It reserves its height and fades in while the bubble is
 * hovered or one of its {@link BubbleAction}s holds focus.
 */
export const BubbleActions = ({
  label = "Message actions",
  className,
  children,
  style,
  ...rest
}: BubbleActionsProps) => {
  const theme = useTheme();
  const { hovered, setHovered } = useBubble();
  const name = accessibleName(textOf(label)) ?? "Message actions";
  const [held, setHeld] = useState(false);
  const revealed = hovered || held;

  return (
    <BubbleFocusContext.Provider value={setHeld}>
      <div
        role="group"
        aria-label={name}
        {...rest}
        style={mergeStyles(
          mergeStyles(recipeStyle(cn(BUBBLE_ACTIONS, className), theme), {
            height: controlHeight(theme, "sm"),
            opacity: revealed ? 1 : 0,
            // A hidden strip keeps its space but takes no pointer input; its
            // controls stay in the tab order so focus can reveal it.
            ...(revealed ? {} : { pointerEvents: "none" as const }),
          }),
          style,
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setHeld(false);
        }}
      >
        {children}
      </div>
    </BubbleFocusContext.Provider>
  );
};

/**
 * The report a `BubbleAction` makes to its strip. A host's focus event belongs
 * to the focused element, so the strip cannot learn that a descendant holds
 * focus; the action tells it.
 */
const BubbleFocusContext = createContext<
  ((focused: boolean) => void) | undefined
>(undefined);

/** {@link BubbleAction} props. */
export interface BubbleActionProps extends Omit<
  ButtonProps,
  "variant" | "size"
> {
  /** The action's visible word, and its accessible name. */
  readonly label: string;
}

/** One small ghost action inside {@link BubbleActions}. */
export const BubbleAction = ({
  label,
  onFocus,
  onBlur,
  ...rest
}: BubbleActionProps) => {
  const report = useContext(BubbleFocusContext);
  if (report === undefined) {
    throw new Error("BubbleAction must be used inside BubbleActions");
  }
  return (
    <Button
      {...rest}
      variant="ghost"
      size="sm"
      onFocus={(event) => {
        report(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        report(false);
        onBlur?.(event);
      }}
    >
      {label}
    </Button>
  );
};

/** {@link BubbleReactions} props. */
export interface BubbleReactionsProps extends Omit<Props, "children"> {
  /** The reactions as one announcement, e.g. `"Reactions: thumbs up, fire"`. */
  readonly label: string;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * The reaction pill on the bubble's edge.
 *
 * It is inset from the sender's edge and hangs a quarter of its height over the
 * surface, with the page fill drawn as a ring around it so the pill reads as cut
 * out of the bubble. shadcn's absolute anchor hangs three quarters; the runtime
 * cannot position a child against its parent, so the pill stays in the column
 * and the rest of its box lays out below the edge (see the page's Limitations).
 */
export const BubbleReactions = ({
  label,
  className,
  children,
  style,
  ...rest
}: BubbleReactionsProps) => {
  const theme = useTheme();
  const { align } = useBubble();
  const name = accessibleName(textOf(label)) ?? "Reactions";
  const recipe = recipeStyle(cn(BUBBLE_REACTIONS, className), theme);
  const height =
    (recipe.lineHeight ?? 0) +
    (recipe.paddingTop ?? 0) +
    (recipe.paddingBottom ?? 0);

  return (
    <div
      role="group"
      aria-label={name}
      {...rest}
      style={mergeStyles(
        mergeStyles(recipe, {
          alignSelf: align === "end" ? "flex-end" : "flex-start",
          marginTop: reactionInset(height, theme.spacing.xs),
          ...(align === "end"
            ? { marginRight: theme.spacing.lg }
            : { marginLeft: theme.spacing.lg }),
          boxShadow: {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 0,
            spreadRadius: theme.borderWidth.strong,
            color: theme.colors.background,
          },
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link BubbleGroup} props. */
export interface BubbleGroupProps extends Omit<Props, "children"> {
  /** The gap between bubbles. Default the theme's `md` (8px). */
  readonly gap?: number;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * Consecutive bubbles from one sender. The gap is the tightening; each bubble
 * still owns its `group` position so its corners join the run.
 */
export const BubbleGroup = ({
  gap,
  className,
  children,
  style,
  ...rest
}: BubbleGroupProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(BUBBLE_GROUP, className), theme), {
          gap: gap ?? theme.spacing.md,
          alignItems: "flex-start",
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

const bubbleFamily: ReadonlyArray<PartComponent> = [
  Bubble,
  BubbleContent,
  BubbleActions,
  BubbleAction,
  BubbleReactions,
  BubbleGroup,
];

const bubbleRoot: PartsContract = {
  parent: "Bubble",
  family: bubbleFamily,
  accepts: [BubbleContent, BubbleActions, BubbleReactions],
  hint: "Put BubbleContent, BubbleActions and BubbleReactions directly inside it.",
};

/** Inventory record, mirrored into `COMPONENTS.md`. */
export const bubbleMeta = {
  name: "Bubble",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the reaction pill hangs a quarter of its height over the surface's edge; shadcn's three-quarter overlap needs parent-relative absolute positioning, which `position: absolute` does not provide in 0.11.0 (it resolves against the mount parent), so the hanging part also lays out below the edge instead of over the next row",
    "the surface paints the theme's `xl` corner (12px in the default ladder, 16–18px on the platform skins); shadcn computes `--radius * 1.4` (14px with its default radius), and the library's ladder has no such step",
    "the type is the recipe's `text-sm` (14px/20px); shadcn sets `leading-relaxed` (22.75px) and the type scale has no relaxed step",
    "the avatar is a prop slot, not a part, because the runtime cannot wrap a caller's children in the bubble's column selectively",
    "no `render`/polymorphic content: `BubbleContent` is always a div, because the runtime has no anchor host",
    "the action strip reserves its height while hidden, so revealing it does not move the bubble; a focus event belongs to the focused element, so a caller-supplied control that is not a `BubbleAction` does not reveal the strip on keyboard focus",
  ],
  docs: "docs/bubble.mdx",
  example: "examples/bubble.example.tsx",
  testFile: "src/behaviour/bubble.test.tsx",
} as const;
