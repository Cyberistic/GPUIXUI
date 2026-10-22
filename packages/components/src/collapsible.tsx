/**
 * Collapsible: one section that reveals its content on demand.
 *
 * The body grows to its measured height and collapses again through
 * `AutoHeight`, the plan-600 reveal: the content box reports what it paints and
 * the clipping box tweens to it, so the section reads as opening rather than
 * appearing. It stays mounted for its exit tween and unmounts after it, so a
 * closed body still holds nothing that runs.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  COLLAPSIBLE_CONTENT,
  COLLAPSIBLE_ROOT,
  COLLAPSIBLE_TRIGGER,
} from "@gpuixui/tw";
import { createContext, useContext, useState } from "react";
import { AutoHeight } from "./auto-height.js";
import { useControllableState } from "./internal/controllable.js";
import { activationHandlers } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { keyboardRing, useTheme } from "./internal/theme.js";

/** The rules a collapsible part follows; throws outside a root. */
interface CollapsibleContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | undefined>(
  undefined,
);

/** The collapsible a part belongs to. Throws when there is none. */
const useCollapsibleContext = (): CollapsibleContextValue => {
  const value = useContext(CollapsibleContext);
  if (value === undefined) {
    throw new Error("Collapsible parts must be used inside Collapsible");
  }
  return value;
};

/** {@link Collapsible} props. */
export interface CollapsibleProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: PartChildren;
}

/** The open state shared by a trigger and its content. */
export const Collapsible = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: CollapsibleProps) => {
  const theme = useTheme();
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  assertParts(collapsibleRoot, children);

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div style={recipeStyle(COLLAPSIBLE_ROOT, theme)}>{children}</div>
    </CollapsibleContext.Provider>
  );
};

/** {@link CollapsibleTrigger} props. */
export interface CollapsibleTriggerProps extends Omit<Props, "style"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the trigger's state. */
  readonly style?: StateStyle<CollapsibleTriggerState>;
  /** A section that cannot open: out of the tab order, no handlers, dimmed. */
  readonly disabled?: boolean;
}

/** What the trigger draws: the section's open state, its focus and its disabled state. */
export interface CollapsibleTriggerState {
  readonly open: boolean;
  readonly closed: boolean;
  readonly focused: boolean;
  readonly disabled: boolean;
}

/** A button that opens and closes its section. */
export const CollapsibleTrigger = ({
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  className,
  style,
  disabled = false,
  ...rest
}: CollapsibleTriggerProps) => {
  const theme = useTheme();
  const { open, setOpen } = useCollapsibleContext();
  const [focused, setFocused] = useState(false);
  const state: CollapsibleTriggerState = {
    open,
    closed: !open,
    focused,
    disabled,
  };

  const toggle = (): void => {
    if (!disabled) setOpen(!open);
  };

  return (
    <div
      role="button"
      aria-expanded={open}
      {...rest}
      tabIndex={disabled ? -1 : 0}
      onClick={(event) => {
        onClick?.(event);
        toggle();
      }}
      {...activationHandlers(toggle, { onKeyDown, onKeyUp })}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(COLLAPSIBLE_TRIGGER, className), theme), {
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
          active: disabled
            ? undefined
            : { backgroundColor: theme.colors.active },
          ...(disabled ? {} : keyboardRing(theme)),
        }),
        resolveStyle(style, state),
      )}
    />
  );
};

/** {@link CollapsibleContent} props. */
export interface CollapsibleContentProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The revealed body: a measured height reveal that unmounts after it closes. */
export const CollapsibleContent = ({
  className,
  style,
  children,
  ...rest
}: CollapsibleContentProps) => {
  const { open } = useCollapsibleContext();

  return (
    <AutoHeight
      {...rest}
      open={open}
      contentClassName={cn(COLLAPSIBLE_CONTENT, className)}
      style={style}
    >
      {children}
    </AutoHeight>
  );
};

/** Every part of Collapsible, so a misplaced sibling is named. */
const collapsibleParts: ReadonlyArray<PartComponent> = [
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
];

const collapsibleRoot: PartsContract = {
  parent: "Collapsible",
  family: collapsibleParts,
  accepts: [CollapsibleTrigger, CollapsibleContent],
  hint: "Put CollapsibleTrigger and CollapsibleContent directly inside Collapsible.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const collapsibleMeta = {
  name: "Collapsible sections",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the first open paints the body at zero for a frame while it measures, then grows to the reported height",
    "the body unmounts after its collapse tween, so state inside it does not survive a close",
  ],
  docs: "docs/collapsible.mdx",
  example: "examples/collapsible.example.tsx",
  testFile: "src/behaviour/collapsible.test.tsx",
} as const;
