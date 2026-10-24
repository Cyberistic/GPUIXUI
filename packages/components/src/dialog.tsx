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
import { Icon } from "@gpuixui/icons";
import {
  DIALOG_CONTENT,
  DIALOG_DESCRIPTION,
  DIALOG_FOOTER,
  DIALOG_HEADER,
  DIALOG_OVERLAY,
  DIALOG_TITLE,
} from "@gpuixui/tw";
import * as Schema from "effect/Schema";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type MutableRefObject,
} from "react";
import { Button, IconButton, type ButtonProps } from "./internal/button.js";
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import { DismissScope } from "./internal/dismiss-scope.js";
import {
  handleModalKeyDown,
  useModalFocus,
  useModalState,
} from "./internal/modal.js";
import { overlaySurfaceStyle } from "./internal/overlay.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  fadeFrom,
  fadeOnly,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";

/** The surface widths a dialog offers: 360, 480 or 640 pixels. */
export type DialogSize = "sm" | "md" | "lg";

/** The sizes a dialog can paint, as the guard reads them. */
const DialogSizes = Schema.Literals(["sm", "md", "lg"]);

const MAX_WIDTH: Readonly<Record<DialogSize, number>> = {
  sm: 360,
  md: 480,
  lg: 640,
};

/**
 * The surface width a dialog paints, read from a value a caller may have stored.
 *
 * `DialogSize` is a compile-time guarantee, but a persisted setting is not: a
 * name a release dropped or renamed reaches the component at runtime, and the
 * table lookup then hands `Math.min` an `undefined` — the renderer serialises
 * the resulting `NaN` as `null` and drops the width, so the box shrank to its
 * content. A size the table does not name is the component's own default, `md`.
 */
const dialogSize = (size: unknown): DialogSize =>
  Schema.is(DialogSizes)(size) ? size : "md";

/** The rules a {@link DialogContent} follows; throws outside a {@link Dialog}. */
interface DialogContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly restoreTarget: MutableRefObject<number | null>;
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
  const { open, setOpen, restoreTarget } = useModalState({
    open: openProp,
    defaultOpen,
    onOpenChange,
    dismissible,
  });

  const context = useMemo<DialogContextValue>(
    () => ({ open, setOpen, restoreTarget }),
    [open, restoreTarget, setOpen],
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
  /**
   * Default `"md"` (480px).
   *
   * A value restored from storage that names no variant (a size a release
   * dropped, or a `null`) paints the default width rather than an unmeasured
   * box.
   */
  readonly size?: DialogSize;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The accessible name — required, because 0.11.0 has no `aria-labelledby`. */
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

/**
 * The modal surface: a full-window veil plus the dialog box, rendered while the
 * dialog is open. Focus enters the surface, Tab stays inside it, Escape and an
 * outside press close it, and closing returns focus to whatever had it before.
 *
 * The veil and the box compile the `DIALOG_OVERLAY` / `DIALOG_CONTENT` recipes;
 * the size, the centring and the scroll are the component's own, merged after
 * the recipe, because the renderer owns the window measurement and the size is
 * a library variant shadcn expresses with responsive classes.
 */
export const DialogContent = ({
  size: requestedSize = "md",
  label,
  showClose = true,
  initialFocus,
  children,
  onKeyDown,
  onMouseDownOutside,
  className,
  style,
  testId = "dialog-content",
  ref,
  ...rest
}: DialogContentProps) => {
  const theme = useTheme();
  const { open, setOpen, restoreTarget } = useDialogContext();
  const renderer = useGpuix().renderer ?? undefined;
  const window = useWindowSize();
  assertParts(dialogContent, children);
  const timing = useSurfaceTiming("slow");
  const presence = useSurfacePresence(open, timing);
  const [content, setContent] = useState<PublicInstance | undefined>(undefined);
  const contentRef = useCallback((next: PublicInstance | null) => {
    setContent(next ?? undefined);
  }, []);
  const setContentElement = useMergedRef<PublicInstance | null>(
    contentRef,
    ref,
  );
  const contentId = content?.id;
  // The surface's outline: the scroller plus the box's own close control. The
  // Tab trap and the keys belong here rather than to the scroller, because the
  // close control sits outside it and must stay a stop and a way out.
  const [outline, setOutline] = useState<PublicInstance | undefined>(undefined);
  const outlineRef = useCallback((next: PublicInstance | null) => {
    setOutline(next ?? undefined);
  }, []);
  const trapId = outline?.id ?? contentId;
  useModalFocus(contentId, initialFocus, open, restoreTarget);

  if (!presence.mounted) return null;

  // One size for the box it paints: a stored name the table does not carry is
  // the component's default rather than an `undefined` that drops the width.
  const size = dialogSize(requestedSize);
  const close = () => setOpen(false);

  const handleKeyDown = (event: KeyEvent): void => {
    handleModalKeyDown({ event, contentId: trapId, renderer, onKeyDown });
  };

  const available = window.width - 2 * theme.spacing["3xl"];

  return (
    <anchored
      position={{ x: 0, y: 0 }}
      occlude
      style={{ position: "absolute" }}
    >
      <div
        testId="dialog-backdrop"
        motion={presenceMotion(fadeOnly, presence)}
        style={mergeStyles(
          overlaySurfaceStyle(DIALOG_OVERLAY, undefined, theme),
          {
            width: window.width,
            height: window.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: theme.spacing["3xl"],
            ...presenceStyle(presence.present),
          },
        )}
      >
        {/* The shield's box lives outside the surface's own scroller, so a
            dialog scrolled down cannot carry the leaving guard off screen. The
            close control lives here for the same reason. */}
        <div
          ref={outlineRef}
          onMouseDownOutside={(event) => {
            onMouseDownOutside?.(event);
            dismissTopLayer(event);
          }}
          onKeyDown={handleKeyDown}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            {...rest}
            ref={setContentElement}
            testId={testId}
            motion={presenceMotion(fadeFrom("top", 8), presence)}
            style={mergeStyles(
              mergeStyles(
                overlaySurfaceStyle(DIALOG_CONTENT, className, theme, "lg"),
                {
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: Math.min(MAX_WIDTH[size], available),
                  maxWidth: available,
                  maxHeight: window.height - 2 * theme.spacing["3xl"],
                  overflow: "scroll",
                  ...presenceStyle(presence.present),
                },
              ),
              style,
            )}
          >
            <DismissScope>{children}</DismissScope>
          </div>
          {showClose ? (
            // The motion's travel is written to `top`, so the placement lives
            // on the wrapper and the control rides it.
            <div
              style={{
                position: "absolute",
                top: theme.spacing.lg,
                right: theme.spacing.lg,
                display: "flex",
              }}
            >
              <IconButton
                label="Close"
                size="sm"
                testId="dialog-close"
                onClick={close}
                motion={presenceMotion(fadeFrom("top", 8), presence)}
              >
                <Icon name="x" size="sm" color={theme.colors.foreground} />
              </IconButton>
            </div>
          ) : null}
          <PresenceShield present={presence.present} />
        </div>
      </div>
    </anchored>
  );
};

/** The surface's heading block: title, description and any meta row. */
export interface DialogHeaderProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The surface's heading block: title, description and any meta row. The
 * close-control clearance (`paddingRight`) is the library's own, because the
 * close control floats over the heading rather than sitting in the grid.
 */
export const DialogHeader = ({
  children,
  className,
  style,
  ...rest
}: DialogHeaderProps) => {
  const theme = useTheme();
  assertParts(dialogHeader, children);
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(overlaySurfaceStyle(DIALOG_HEADER, className, theme), {
          paddingRight: theme.spacing["2xl"],
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link DialogTitle} props. */
export interface DialogTitleProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The dialog's heading, announced as a level-2 heading. */
export const DialogTitle = ({
  className,
  style,
  ...rest
}: DialogTitleProps) => {
  const theme = useTheme();
  return (
    <text
      role="heading"
      aria-level={2}
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(DIALOG_TITLE, className, theme),
        style,
      )}
    />
  );
};

/** {@link DialogDescription} props. */
export interface DialogDescriptionProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** One paragraph of supporting copy under {@link DialogTitle}. */
export const DialogDescription = ({
  className,
  style,
  ...rest
}: DialogDescriptionProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(DIALOG_DESCRIPTION, className, theme),
        style,
      )}
    />
  );
};

/** {@link DialogFooter} props. */
export interface DialogFooterProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The actions row, right-aligned. */
export const DialogFooter = ({
  className,
  style,
  ...rest
}: DialogFooterProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(DIALOG_FOOTER, className, theme),
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
    "no aria-modal and no aria-labelledby in 0.11.0: the dialog is named with aria-label and its title is a heading",
    "the veil is an anchored element at window coordinates: the styled Dialog is a local overlay, not `@gpuix/react/dialog`'s portalled surface; a dialog mounted inside a scroll container stays painted at the window origin, not inside that container",
    "a size restored from storage that names no variant paints the default `md` width: the guarded lookup never hands the renderer an undefined width",
  ],
  docs: "docs/dialog.mdx",
  example: "examples/dialog.example.tsx",
  testFile: "src/behaviour/dialog.test.tsx",
} as const;
