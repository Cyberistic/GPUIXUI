/**
 * Collapsible: one section that reveals its content on demand.
 *
 * The content stays mounted and is revealed from its measured height
 * (`internal/reveal.tsx`), so a draft inside a collapsed section survives the
 * cycle. Closed content is hidden with `visibility`, because the clipped body
 * still took keyboard focus (plan 372 §2).
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { createContext, useContext, useState } from "react";
import { activationHandlers } from "./internal/activate.js";
import { useControllableState } from "./internal/controllable.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { Reveal } from "./internal/reveal.js";
import { focusRing, textStyle, useTheme } from "./internal/theme.js";

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
        }}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
};

/** {@link CollapsibleTrigger} props. */
export interface CollapsibleTriggerProps extends Omit<Props, "style"> {
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
  onKeyUp,
  onFocus,
  onBlur,
  autoFocus = false,
  style,
  ...rest
}: CollapsibleTriggerProps) => {
  const theme = useTheme();
  const { open, setOpen } = useCollapsibleContext();
  const [focused, setFocused] = useState(autoFocus);
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
      autoFocus={autoFocus}
      tabIndex={0}
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
        {
          ...textStyle(theme, "label"),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          color: theme.colors.foreground,
          cursor: "pointer",
          hover: { backgroundColor: theme.colors.hover },
          active: { backgroundColor: theme.colors.active },
          ...(focused ? focusRing(theme) : {}),
        },
        resolveStyle(style, state),
      )}
    />
  );
};

/** {@link CollapsibleContent} props. */
export interface CollapsibleContentProps extends Props {
  /** Tween to the measured height; `false` snaps. Default `true`. */
  readonly animate?: boolean;
}

/**
 * The revealed body. It stays mounted so its state survives a close, and the
 * body height tweens to the content's measured height. While closed it is
 * hidden, which also removes it from the tab order.
 */
export const CollapsibleContent = ({
  animate = true,
  style,
  children,
  ...rest
}: CollapsibleContentProps) => {
  const theme = useTheme();
  const { open } = useCollapsibleContext();

  return (
    <Reveal
      open={open}
      animate={animate}
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.md,
          color: theme.colors.mutedForeground,
        },
        style,
      )}
    >
      {children}
    </Reveal>
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
    "hidden by `visibility` while closed, so it leaves the tab order; a rewrap while closed is not re-measured until the next open",
    "no `aria-controls` in 0.10.0, so the trigger→body relationship is positional",
  ],
  docs: "docs/collapsible.mdx",
  example: "examples/collapsible.example.tsx",
  testFile: "src/behaviour/collapsible.test.tsx",
} as const;
