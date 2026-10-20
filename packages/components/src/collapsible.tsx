/**
 * Collapsible: one section that reveals its content on demand.
 *
 * The content unmounts while closed. That is the honest v1: GPUix's `motion`
 * animates a numeric height, and an automatic-height reveal needs a measured
 * first paint. The `TODO` on {@link CollapsibleContent} records the follow-up
 * instead of promising an animation the runtime cannot measure yet.
 */

import type { KeyEvent, Props } from "@gpuix/react";
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
import { useControllableState } from "./internal/controllable.js";
import { isActivation } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { focusRing, useTheme } from "./internal/theme.js";

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
}

/** What the trigger draws: the section's open state and its own focus. */
export interface CollapsibleTriggerState {
  readonly open: boolean;
  readonly closed: boolean;
  readonly focused: boolean;
}

/** A button that opens and closes its section. */
export const CollapsibleTrigger = ({
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  className,
  style,
  ...rest
}: CollapsibleTriggerProps) => {
  const theme = useTheme();
  const { open, setOpen } = useCollapsibleContext();
  const [focused, setFocused] = useState(false);
  const state: CollapsibleTriggerState = {
    open,
    closed: !open,
    focused,
  };

  const toggle = (): void => setOpen(!open);

  return (
    <div
      role="button"
      aria-expanded={open}
      {...rest}
      tabIndex={0}
      onClick={(event) => {
        onClick?.(event);
        toggle();
      }}
      onKeyDown={(event: KeyEvent) => {
        if (isActivation(event)) toggle();
        onKeyDown?.(event);
      }}
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
          cursor: "pointer",
          hover: { backgroundColor: theme.colors.hover },
          active: { backgroundColor: theme.colors.active },
          ...(focused ? focusRing(theme) : {}),
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

/** The revealed body. Unmounts while closed, so nothing inside it is running. */
export const CollapsibleContent = ({
  className,
  style,
  children,
  ...rest
}: CollapsibleContentProps) => {
  const theme = useTheme();
  const { open } = useCollapsibleContext();

  // TODO: measure the body with `onLayout` and animate to that height once a
  // motion budget exists; 0.10.0's `motion` needs a numeric target.
  if (!open) return null;

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(COLLAPSIBLE_CONTENT, className), theme),
        style,
      )}
    >
      {children}
    </div>
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
  gpuixSupport: "partial",
  limitations: [
    "mounts and unmounts instantly: 0.10.0's motion needs a numeric height, and an auto-height reveal needs a measured first paint",
  ],
  docs: "docs/collapsible.mdx",
  example: "examples/collapsible.example.tsx",
  testFile: "src/behaviour/collapsible.test.tsx",
} as const;
