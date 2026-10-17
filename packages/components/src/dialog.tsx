/**
 * Dialog: a modal surface that takes the window until it is dismissed.
 *
 * `@gpuix/react@0.10.0` ships no dialog parts and no dismiss layer, so the
 * overlay is built from the primitives the release actually has (plan 112 §1c,
 * measured):
 *
 * - the veil is an `<anchored position={{x:0,y:0}}>` sized from `useWindowSize()`,
 *   because `position:"absolute"` resolves against the mount parent and a nested
 *   dialog would dim only its parent's box;
 * - Escape is offered to `internal/dismiss-layer.ts`, whose top layer is this
 *   dialog, so nested overlays dismiss outside-in;
 * - focus-in, focus-return and the Tab trap use the renderer's own
 *   `focusElement` / `focusNextWithin` / `focusPreviousWithin`.
 *
 * Known gaps in 0.10.0, recorded rather than papered over: no `aria-modal` and no
 * `aria-labelledby`, so the dialog is named with `aria-label` and its title is a
 * heading, not the dialog's accessible name; no `preventDefault`, so a key can be
 * observed but not cancelled.
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, IconButton, type ButtonProps } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import { useMergedRef } from "./internal/ref.js";
import { isDismiss, isTab } from "./internal/key.js";
import {
  elevationShadow,
  textStyle,
  useTheme,
  type Theme,
} from "./internal/theme.js";

/** The surface widths a dialog offers: 360, 480 or 640 pixels. */
export type DialogSize = "sm" | "md" | "lg";

const MAX_WIDTH: Readonly<Record<DialogSize, number>> = {
  sm: 360,
  md: 480,
  lg: 640,
};

/** The rules a {@link DialogContent} follows; throws outside a {@link Dialog}. */
interface DialogContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

/** The dialog a part belongs to. Throws when there is none (plan 110 §8.6). */
const useDialogContext = (): DialogContextValue => {
  const value = useContext(DialogContext);
  if (value === undefined) {
    throw new Error("Dialog parts must be used inside Dialog");
  }
  return value;
};

/** {@link Dialog} props. */
export interface DialogProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * Whether Escape and an outside press close the dialog. Default `true`; a
   * dialog doing uninterruptible work sets it `false`.
   */
  readonly dismissible?: boolean;
  readonly children?: ReactNode;
}

/**
 * The dialog's state and its dismiss layer. It paints nothing itself: the surface
 * appears where {@link DialogContent} is mounted.
 */
export const Dialog = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dismissible = true,
  children,
}: DialogProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // The layer handler must see the latest props without being re-pushed: a
  // re-push would move the dialog above an overlay that opened after it.
  const dismiss = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    dismiss.current = () => {
      if (dismissible) setOpen(false);
    };
  });

  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer(() => dismiss.current());
  }, [open]);

  const context = useMemo<DialogContextValue>(
    () => ({ open, setOpen }),
    [open, setOpen],
  );

  return (
    <DialogContext.Provider value={context}>{children}</DialogContext.Provider>
  );
};

/** Opens the dialog it sits in. An ordinary button in every other respect. */
export const DialogTrigger = ({ onClick, ...rest }: ButtonProps) => {
  const { open, setOpen } = useDialogContext();
  return (
    <Button
      {...rest}
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
    />
  );
};

/** Closes the dialog it sits in. An ordinary button in every other respect. */
export const DialogClose = ({ onClick, ...rest }: ButtonProps) => {
  const { setOpen } = useDialogContext();
  return (
    <Button
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
    />
  );
};

/** {@link DialogContent} props. */
export interface DialogContentProps extends Omit<Props, "children"> {
  /** Default `"md"` (480px). */
  readonly size?: DialogSize;
  /** The accessible name — required, because 0.10.0 has no `aria-labelledby`. */
  readonly label: string;
  /** Renders the top-right close control. Default `true`. */
  readonly showClose?: boolean;
  /**
   * The native id focus should land on once the surface is mounted. Evaluated
   * after `DialogContent` focuses itself, which is what lets a confirmation
   * dialog put focus on Cancel instead of on the destructive action.
   */
  readonly initialFocus?: () => number | null;
  readonly children?: ReactNode;
}

/** The surface's look: the popover role, a border, the largest elevation. */
const surfaceStyle = (
  theme: Theme,
  size: DialogSize,
  available: number,
): object => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.lg,
  width: Math.min(MAX_WIDTH[size], available),
  padding: theme.spacing["2xl"],
  backgroundColor: theme.colors.popover,
  color: theme.colors.popoverForeground,
  borderRadius: theme.radius.xl,
  borderWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  boxShadow: elevationShadow(theme, "lg"),
  position: "relative",
  pointerEvents: "auto",
});

/**
 * The modal surface: a full-window veil plus the dialog box, rendered while the
 * dialog is open. Focus enters the surface, Tab stays inside it, Escape and an
 * outside press close it, and closing returns focus to whatever had it before.
 */
export const DialogContent = ({
  size = "md",
  label,
  showClose = true,
  initialFocus,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  testId = "dialog-content",
  ref,
  ...rest
}: DialogContentProps) => {
  const theme = useTheme();
  const { open, setOpen } = useDialogContext();
  const renderer = useGpuix().renderer;
  const window = useWindowSize();
  const [content, setContent] = useState<PublicInstance | undefined>(undefined);
  const contentRef = useCallback((next: PublicInstance | null) => {
    setContent(next ?? undefined);
  }, []);
  const setContentElement = useMergedRef<PublicInstance | null>(
    contentRef,
    ref,
  );
  const previousFocus = useRef<number | null>(null);
  const initialFocusRef = useRef(initialFocus);
  useLayoutEffect(() => {
    initialFocusRef.current = initialFocus;
  });

  const contentId = content?.id;

  useLayoutEffect(() => {
    if (contentId === undefined) return;
    previousFocus.current = renderer?.getFocusedElementId?.() ?? null;
    renderer?.focusElement?.(contentId);
    const initial = initialFocusRef.current?.() ?? null;
    if (initial !== null && initial !== contentId) {
      renderer?.focusElement?.(initial);
    }
    return () => {
      const previous = previousFocus.current;
      // A destroyed opener must not be focused: `getElementBounds` is the
      // renderer's own existence check, and it is null once the element is gone.
      if (
        previous === null ||
        previous === contentId ||
        renderer?.getElementBounds?.(previous) === null
      ) {
        return;
      }
      renderer?.focusElement?.(previous);
    };
  }, [contentId, renderer]);

  if (!open) return null;

  const close = () => setOpen(false);

  const handleKeyDown = (event: EventPayload): void => {
    Match.value(event).pipe(
      Match.when(isDismiss, (value) => {
        dismissTopLayer(value);
      }),
      Match.when(isTab, (value) => {
        if (value.modifiers?.shift === true) {
          renderer?.focusPreviousWithin?.(contentId ?? -1);
        } else {
          renderer?.focusNextWithin?.(contentId ?? -1);
        }
      }),
      Match.orElse(() => undefined),
    );
    onKeyDown?.(event);
  };

  return (
    <anchored
      position={{ x: 0, y: 0 }}
      occlude
      style={{ position: "absolute" }}
    >
      <div
        testId="dialog-backdrop"
        style={{
          width: window.width,
          height: window.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing["3xl"],
          backgroundColor: theme.colors.overlay,
          pointerEvents: "auto",
        }}
      >
        <div
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          {...rest}
          ref={setContentElement}
          testId={testId}
          onMouseDownOutside={(event) => {
            onMouseDownOutside?.(event);
            dismissTopLayer(event);
          }}
          onKeyDown={handleKeyDown}
          style={mergeStyles(
            {
              ...surfaceStyle(
                theme,
                size,
                window.width - 2 * theme.spacing["3xl"],
              ),
              maxHeight: window.height - 2 * theme.spacing["3xl"],
              overflow: "scroll",
            },
            style,
          )}
        >
          {children}
          {showClose ? (
            <IconButton
              label="Close"
              size="sm"
              testId="dialog-close"
              onClick={close}
              style={{
                position: "absolute",
                top: theme.spacing.lg,
                right: theme.spacing.lg,
              }}
            >
              <text>✕</text>
            </IconButton>
          ) : null}
        </div>
      </div>
    </anchored>
  );
};

/** The surface's heading block: title, description and any meta row. */
export const DialogHeader = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xs,
          paddingRight: theme.spacing["2xl"],
        },
        style,
      )}
    />
  );
};

/** The dialog's heading, announced as a level-2 heading. */
export const DialogTitle = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      role="heading"
      aria-level={2}
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "h3"), color: theme.colors.popoverForeground },
        style,
      )}
    />
  );
};

/** One paragraph of supporting copy under {@link DialogTitle}. */
export const DialogDescription = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "body"), color: theme.colors.mutedForeground },
        style,
      )}
    />
  );
};

/** The actions row, right-aligned. */
export const DialogFooter = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: theme.spacing.md,
        },
        style,
      )}
    />
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const dialogMeta = {
  name: "Dialogs",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-modal and no aria-labelledby in 0.10.0: the dialog is named with aria-label and its title is a heading",
    "the veil is an anchored element at window coordinates because the release ships no portal; a dialog mounted inside a scroll container stays painted at the window origin, not inside that container",
    "the close control is a text glyph until packages/icons lands",
  ],
  docs: "docs/dialog.mdx",
  example: "examples/dialog.example.tsx",
  testFile: "src/behaviour/dialog.test.tsx",
} as const;
