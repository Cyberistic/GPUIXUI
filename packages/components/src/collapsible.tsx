/**
 * Collapsible: one section that reveals its content on demand.
 *
 * The content stays mounted and is revealed from its measured height
 * (`internal/reveal.tsx`), so a draft inside a collapsed section survives the
 * cycle. Closed content is hidden with `visibility`, because the clipped body
 * still took keyboard focus (plan 372 §2).
 */

import { useGpuix, type Props, type PublicInstance } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type RefObject,
} from "react";
import { activationHandlers } from "./internal/activate.js";
import { useControllableState } from "./internal/controllable.js";
import { useFocusState } from "./internal/focus.js";
import { controlName } from "./internal/name.js";
import { stateDescription } from "./internal/state-description.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import { Reveal } from "./internal/reveal.js";
import { focusRing, textStyle, useTheme } from "./internal/theme.js";

/** The rules a collapsible part follows; throws outside a root. */
interface CollapsibleContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** The trigger's native instance, so a close can return focus to it. */
  readonly trigger: RefObject<Option.Option<PublicInstance>>;
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

  const trigger = useRef<Option.Option<PublicInstance>>(Option.none());

  return (
    <CollapsibleContext.Provider value={{ open, setOpen, trigger }}>
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
  /** Leave the tab order, drop activation and dim. Never inferred. */
  readonly disabled?: boolean;
  /** A style, or a function of the trigger's state. */
  readonly style?: StateStyle<CollapsibleTriggerState>;
}

/** What the trigger draws: the section's open state, its own focus and input. */
export interface CollapsibleTriggerState {
  readonly open: boolean;
  readonly closed: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
}

/** A button that opens and closes its section. */
export const CollapsibleTrigger = ({
  disabled = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  autoFocus = false,
  style,
  children,
  ref,
  ...rest
}: CollapsibleTriggerProps) => {
  const theme = useTheme();
  const { open, setOpen, trigger } = useCollapsibleContext();
  const name = controlName(rest["aria-label"], children);
  const [hostId, setHostId] = useState<number | undefined>(undefined);
  const [focused, setFocused] = useFocusState(autoFocus, disabled, hostId);
  const attach = useCallback(
    (next: PublicInstance | null) => {
      trigger.current = Option.fromNullishOr(next);
      setHostId(next?.id);
    },
    [trigger],
  );
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);
  const state: CollapsibleTriggerState = {
    open,
    closed: !open,
    disabled,
    focused,
  };

  const toggle = (): void => {
    if (!disabled) setOpen(!open);
  };

  return (
    <div
      role="button"
      aria-expanded={open}
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
      {...stateDescription(disabled, rest["aria-description"])}
      ref={setElement}
      autoFocus={autoFocus && !disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={
        disabled
          ? undefined
          : (event) => {
              onClick?.(event);
              toggle();
            }
      }
      {...activationHandlers(toggle, { disabled, onKeyDown, onKeyUp })}
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
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
          active: disabled
            ? undefined
            : { backgroundColor: theme.colors.active },
          ...(focused ? focusRing(theme) : {}),
        },
        resolveStyle(style, state),
      )}
    >
      {children}
    </div>
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
  const renderer = useGpuix().renderer;
  const { open, trigger } = useCollapsibleContext();
  const restoreFocus = useCallback(() => {
    Option.match(trigger.current, {
      onNone: () => undefined,
      onSome: (element) => renderer?.focusElement?.(element.id),
    });
  }, [renderer, trigger]);

  return (
    <Reveal
      open={open}
      animate={animate}
      restoreFocus={restoreFocus}
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
  focusable: true,
  limitations: [
    "hidden by `visibility` while closed, so it leaves the tab order; a rewrap while closed is not re-measured until the next open",
    "no `aria-controls` in 0.10.0, so the trigger→body relationship is positional",
    "a close that began with focus inside the body returns focus to the trigger by box containment; a control clipped out of the visible body is not recognised",
  ],
  docs: "docs/collapsible.mdx",
  example: "examples/collapsible.example.tsx",
  testFile: "src/behaviour/collapsible.test.tsx",
} as const;
