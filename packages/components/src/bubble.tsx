/** @jsxImportSource @gpuix/react */
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

interface BubbleContextValue {
  readonly variant: BubbleVariant;
  readonly align: BubbleAlign;
  readonly group: BubbleGroupPosition;
  readonly hovered: boolean;
  readonly setHovered: (hovered: boolean) => void;
}

const BubbleContext = createContext<BubbleContextValue | undefined>(undefined);

const useBubble = (): BubbleContextValue => {
  const value = useContext(BubbleContext);
  if (value === undefined) {
    throw new Error("Bubble parts must be used inside Bubble");
  }
  return value;
};

export interface BubbleProps extends Omit<Props, "children"> {
  readonly variant?: BubbleVariant;

  readonly align?: BubbleAlign;

  readonly group?: BubbleGroupPosition;

  readonly maxWidth?: DimensionValue;

  readonly avatar?: ReactNode;

  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface BubbleContentProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

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

export interface BubbleActionsProps extends Omit<Props, "children"> {
  readonly label?: string;

  readonly className?: string;
  readonly children?: ReactNode;
}

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

const BubbleFocusContext = createContext<
  ((focused: boolean) => void) | undefined
>(undefined);

export interface BubbleActionProps extends Omit<
  ButtonProps,
  "variant" | "size"
> {
  readonly label: string;
}

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

export interface BubbleReactionsProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly className?: string;
  readonly children?: ReactNode;
}

export const BubbleReactions = ({
  label,
  className,
  children,
  style,
  ...rest
}: BubbleReactionsProps) => {
  const theme = useTheme();
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
          alignSelf: "flex-end",
          marginTop: reactionInset(height, theme.spacing.xs),
          marginRight: theme.spacing.lg,
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

export interface BubbleGroupProps extends Omit<Props, "children"> {
  readonly gap?: number;

  readonly className?: string;
  readonly children?: PartChildren;
}

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
