/** @jsxImportSource @gpuix/react */
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
import { overlaySurfaceStyle, overlayVeilColor } from "./internal/overlay.js";
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
  presenceTabStop,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";

export type DialogSize = "sm" | "md" | "lg";

const DialogSizes = Schema.Literals(["sm", "md", "lg"]);

const MAX_WIDTH: Readonly<Record<DialogSize, number>> = {
  sm: 360,
  md: 480,
  lg: 640,
};

const dialogSize = (size: unknown): DialogSize =>
  Schema.is(DialogSizes)(size) ? size : "md";

interface DialogContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly restoreTarget: MutableRefObject<number | null>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

const useDialogContext = (): DialogContextValue => {
  const value = useContext(DialogContext);
  if (value === undefined) {
    throw new Error("Dialog parts must be used inside Dialog");
  }
  return value;
};

export interface DialogProps {
  readonly open?: boolean;

  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;

  readonly dismissible?: boolean;
  readonly children?: PartChildren;
}

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

export const DialogClose = ({ onClick, ...rest }: ButtonProps) => {
  const { open, setOpen } = useDialogContext();
  return (
    <Button
      {...presenceTabStop(open)}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
    />
  );
};

export interface DialogContentProps extends Omit<Props, "children"> {
  readonly size?: DialogSize;

  readonly className?: string;

  readonly label: string;

  readonly role?: "dialog" | "alertdialog";

  readonly showClose?: boolean;

  readonly initialFocus?: () => number | null;
  readonly children?: PartChildren;
}

export const DialogContent = ({
  size: requestedSize = "md",
  label,
  role = "dialog",
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

  const [outline, setOutline] = useState<PublicInstance | undefined>(undefined);
  const outlineRef = useCallback((next: PublicInstance | null) => {
    setOutline(next ?? undefined);
  }, []);
  const trapId = outline?.id ?? contentId;
  useModalFocus(contentId, initialFocus, open, restoreTarget);

  if (!presence.mounted) return null;

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
            backgroundColor: overlayVeilColor(theme),
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
        {}
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
            role={role}
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
                {...presenceTabStop(presence.present)}
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

export interface DialogHeaderProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface DialogTitleProps extends Props {
  readonly className?: string;
}

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

export interface DialogDescriptionProps extends Props {
  readonly className?: string;
}

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

export interface DialogFooterProps extends Props {
  readonly className?: string;
}

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

export const dialogMeta = {
  name: "Dialogs",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-modal and no aria-labelledby in 0.11.0: the dialog is named with aria-label and its title is a heading",
    "the veil is an anchored element at window coordinates: the styled Dialog is a local overlay, not `@gpuix/react/dialog`'s portalled surface; a dialog mounted inside a scroll container stays painted at the window origin, not inside that container",
    "a size restored from storage that names no variant paints the default `md` width: the guarded lookup never hands the renderer an undefined width",
    "a dismissed surface stays painted for its exit and its own close control leaves the tab order for that window; a control composed inside the body keeps its stop, because 0.11.0 has no inherited `inert`",
  ],
  docs: "docs/dialog.mdx",
  example: "examples/dialog.example.tsx",
  testFile: "src/behaviour/dialog.test.tsx",
} as const;
