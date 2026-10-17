/**
 * Collapsible: one section that reveals its content on demand.
 *
 * The content unmounts while closed. That is the honest v1: GPUix's `motion`
 * animates a numeric height, and an automatic-height reveal needs a measured
 * first paint. The `TODO` on {@link CollapsibleContent} records the follow-up
 * instead of promising an animation the runtime cannot measure yet.
 */

import type { EventPayload, Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useControllableState } from "./internal/controllable.js";
import { isActivation } from "./internal/key.js";
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
  readonly children?: ReactNode;
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

/** A button that opens and closes its section. */
export const CollapsibleTrigger = ({
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  style,
  ...rest
}: Props) => {
  const theme = useTheme();
  const { open, setOpen } = useCollapsibleContext();
  const [focused, setFocused] = useState(false);

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
      onKeyDown={(event: EventPayload) => {
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
        style,
      )}
    />
  );
};

/** The revealed body. Unmounts while closed, so nothing inside it is running. */
export const CollapsibleContent = ({ style, children, ...rest }: Props) => {
  const theme = useTheme();
  const { open } = useCollapsibleContext();

  // TODO: measure the body with `onLayout` and animate to that height once a
  // motion budget exists; 0.10.0's `motion` needs a numeric target.
  if (!open) return null;

  return (
    <div
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
    </div>
  );
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
