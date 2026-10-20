/**
 * Dialog: a modal surface that takes the window until it is dismissed.
 *
 * `@gpuix/react@0.11.0` ships a headless dialog (`@gpuix/react/dialog`) with a
 * Radix-style part model — `Root`/`Trigger`/`Portal`/`Backdrop`/`Popup`/
 * `Title`/`Close`. This component does not wrap it: the library's public Dialog
 * is a *styled* compound part with a shadcn shape (`Dialog`/`Trigger`/`Content`/
 * `Header`/`Title`/`Description`/`Footer`/`Close`) and a theme-aware surface,
 * which the headless primitive deliberately leaves to the caller. Rebuilding on
 * it is a future migration, not a mapping; until then the overlay is built from
 * the primitives the release has (plan 112 §1c, measured):
 *
 * - the veil is an `<anchored position={{x:0,y:0}}>` sized from `useWindowSize()`,
 *   because `position:"absolute"` resolves against the mount parent and a nested
 *   dialog would dim only its parent's box;
 * - Escape is offered to `internal/dismiss-layer.ts`, whose top layer is this
 *   dialog, so nested overlays dismiss outside-in;
 * - focus-in, focus-return and the Tab trap use the renderer's own
 *   `focusElement` / `focusNextWithin` / `focusPreviousWithin`; the Tab trap
 *   calls `event.preventDefault()` so 0.11.0's default Tab navigation does not
 *   also move focus out of the surface.
 *
 * Remaining gaps, recorded rather than papered over: no `aria-modal` and no
 * `aria-labelledby`, so the dialog is named with `aria-label` and its title is a
 * heading, not the dialog's accessible name.
 */

import type { KeyEvent, Props, PublicInstance } from "@gpuix/react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Button, IconButton, type ButtonProps } from "./internal/button.js";
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import {
  handleModalKeyDown,
  useModalFocus,
  useModalState,
} from "./internal/modal.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
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
  readonly children?: PartChildren;
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
  const { open, setOpen } = useModalState({
    open: openProp,
    defaultOpen,
    onOpenChange,
    dismissible,
  });

  const context = useMemo<DialogContextValue>(
    () => ({ open, setOpen }),
    [open, setOpen],
  );

  assertParts(dialogRoot, children);

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
  readonly children?: PartChildren;
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
  const renderer = useGpuix().renderer ?? undefined;
  const window = useWindowSize();
  assertParts(dialogContent, children);
  const [content, setContent] = useState<PublicInstance | undefined>(undefined);
  const contentRef = useCallback((next: PublicInstance | null) => {
    setContent(next ?? undefined);
  }, []);
  const setContentElement = useMergedRef<PublicInstance | null>(
    contentRef,
    ref,
  );
  const contentId = content?.id;
  useModalFocus(contentId, initialFocus);

  if (!open) return null;

  const close = () => setOpen(false);

  const handleKeyDown = (event: KeyEvent): void => {
    handleModalKeyDown({ event, contentId, renderer, onKeyDown });
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
export interface DialogHeaderProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

/** The surface's heading block: title, description and any meta row. */
export const DialogHeader = ({
  children,
  style,
  ...rest
}: DialogHeaderProps) => {
  const theme = useTheme();
  assertParts(dialogHeader, children);
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
    >
      {children}
    </div>
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

/** Every part of Dialog, so a misplaced sibling is named. */
const dialogParts: ReadonlyArray<PartComponent> = [
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
];

const dialogRoot: PartsContract = {
  parent: "Dialog",
  family: dialogParts,
  accepts: [DialogTrigger, DialogContent, DialogClose],
  hint: "Put DialogTrigger and DialogContent directly inside Dialog.",
};

const dialogContent: PartsContract = {
  parent: "DialogContent",
  family: dialogParts,
  accepts: [
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
  ],
  hint: "Put the header, title, description, footer and close control inside DialogContent.",
};

const dialogHeader: PartsContract = {
  parent: "DialogHeader",
  family: dialogParts,
  accepts: [DialogTitle, DialogDescription],
  hint: "Put DialogTitle and DialogDescription directly inside DialogHeader.",
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
