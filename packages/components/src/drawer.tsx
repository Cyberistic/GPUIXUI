/**
 * Drawer: a modal panel anchored to a window edge.
 *
 * Positioning and dismissal are the same as Dialog's (0.10.0 ships no Dialog
 * parts and no portal, so the veil is an `<anchored position={{x:0,y:0}}>` at
 * window coordinates, plan 112 §1c). What differs is where the surface sits:
 * a full-height column on the left or right, or a full-width sheet at the
 * bottom. The shared rules — open state, dismiss layer, focus in/return, Tab
 * trap — live in `internal/modal.ts`.
 *
 * Known gaps in 0.10.0: no `aria-modal` or `aria-labelledby` (the surface is
 * named with `aria-label`), no swipe gesture (no drag host feature), and no
 * slide animation (`motion` has no transform; animating width/left would reflow
 * the content).
 */

import type { KeyEvent, Props, PublicInstance } from "@gpuix/react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  DRAWER_CONTENT,
  DRAWER_DESCRIPTION,
  DRAWER_FOOTER,
  DRAWER_HEADER,
  DRAWER_OVERLAY,
  DRAWER_TITLE,
} from "@gpuixui/tw";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Button, IconButton, type ButtonProps } from "./internal/button.js";
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
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import { overlaySurfaceStyle } from "./internal/overlay.js";
import { useTheme, type Theme } from "./internal/theme.js";

/** The window edge a drawer opens from. */
export type DrawerSide = "left" | "right" | "bottom";

/** The surface sizes a drawer offers. */
export type DrawerSize = "sm" | "md" | "lg";

const WIDTH: Readonly<Record<DrawerSize, number>> = {
  sm: 320,
  md: 400,
  lg: 560,
};

const HEIGHT: Readonly<Record<DrawerSize, number>> = {
  sm: 240,
  md: 320,
  lg: 420,
};

/** The rules a {@link DrawerContent} follows; throws outside a {@link Drawer}. */
interface DrawerContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

/** The drawer a part belongs to. Throws when there is none (plan 110 §8.6). */
const useDrawerContext = (): DrawerContextValue => {
  const value = useContext(DrawerContext);
  if (value === undefined) {
    throw new Error("Drawer parts must be used inside Drawer");
  }
  return value;
};

/** {@link Drawer} props. */
export interface DrawerProps {
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Whether Escape and an outside press close the drawer. Default `true`. */
  readonly dismissible?: boolean;
  readonly children?: PartChildren;
}

/** The drawer's state and its dismiss layer. It paints nothing itself. */
export const Drawer = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dismissible = true,
  children,
}: DrawerProps) => {
  const { open, setOpen } = useModalState({
    open: openProp,
    defaultOpen,
    onOpenChange,
    dismissible,
  });

  const context = useMemo<DrawerContextValue>(
    () => ({ open, setOpen }),
    [open, setOpen],
  );

  assertParts(drawerRoot, children);

  return (
    <DrawerContext.Provider value={context}>{children}</DrawerContext.Provider>
  );
};

/** Opens the drawer it sits in. An ordinary button in every other respect. */
export const DrawerTrigger = ({ onClick, ...rest }: ButtonProps) => {
  const { open, setOpen } = useDrawerContext();
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

/** Closes the drawer it sits in. An ordinary button in every other respect. */
export const DrawerClose = ({ onClick, ...rest }: ButtonProps) => {
  const { setOpen } = useDrawerContext();
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

/** {@link DrawerContent} props. */
export interface DrawerContentProps extends Omit<Props, "children"> {
  /** The edge to open from. Default `"right"`. */
  readonly side?: DrawerSide;
  /** Default `"md"`. */
  readonly size?: DrawerSize;
  /** The accessible name — required, because 0.10.0 has no `aria-labelledby`. */
  readonly label: string;
  /** Renders the top-right close control. Default `true`. */
  readonly showClose?: boolean;
  /** The native id focus should land on after the drawer takes focus. */
  readonly initialFocus?: () => number | null;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** Whether a side lays the surface across the window's width. */
const isVertical = (side: DrawerSide): boolean => side === "bottom";

/** The surface's measured box for a side and size. */
const surfaceSize = (
  side: DrawerSide,
  size: DrawerSize,
  window: { readonly width: number; readonly height: number },
): { readonly width: number; readonly height: number } =>
  isVertical(side)
    ? { width: window.width, height: Math.min(HEIGHT[size], window.height) }
    : { width: Math.min(WIDTH[size], window.width), height: window.height };

/** The surface's look: the popover role, a border, the largest elevation. The
 * measured box, `position` and `overflow` stay here — the renderer owns them. */
const surfaceStyle = (
  theme: Theme,
  box: { width: number; height: number },
  className?: string,
) => ({
  ...overlaySurfaceStyle(DRAWER_CONTENT, className, theme),
  width: box.width,
  height: box.height,
  position: "relative" as const,
  overflow: "scroll" as const,
});

/**
 * The veil and the edge surface, rendered while the drawer is open. Focus enters
 * the surface, Tab stays inside it, Escape and an outside press close it, and
 * closing returns focus to whatever had it before.
 */
export const DrawerContent = ({
  side = "right",
  size = "md",
  label,
  showClose = true,
  initialFocus,
  className,
  children,
  onKeyDown,
  onMouseDownOutside,
  style,
  testId = "drawer-content",
  ref,
  ...rest
}: DrawerContentProps) => {
  const theme = useTheme();
  const { open, setOpen } = useDrawerContext();
  const renderer = useGpuix().renderer ?? undefined;
  const window = useWindowSize();
  assertParts(drawerContent, children);
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

  const box = surfaceSize(side, size, window);
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
        testId="drawer-backdrop"
        style={mergeStyles(
          overlaySurfaceStyle(DRAWER_OVERLAY, undefined, theme),
          {
            width: window.width,
            height: window.height,
            display: "flex",
            flexDirection: isVertical(side) ? "column" : "row",
            alignItems: "stretch",
            justifyContent: side === "left" ? "flex-start" : "flex-end",
            pointerEvents: "auto",
          },
        )}
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
          style={mergeStyles(surfaceStyle(theme, box, className), style)}
        >
          {children}
          {showClose ? (
            <IconButton
              label="Close drawer"
              size="sm"
              testId="drawer-close"
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
export interface DrawerHeaderProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The surface's heading block. The close-control clearance stays in style. */
export const DrawerHeader = ({
  children,
  className,
  style,
  ...rest
}: DrawerHeaderProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(overlaySurfaceStyle(DRAWER_HEADER, className, theme), {
          paddingRight: theme.spacing["2xl"],
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link DrawerTitle} props. */
export interface DrawerTitleProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The drawer's heading, announced as a level-2 heading. */
export const DrawerTitle = ({
  className,
  style,
  ...rest
}: DrawerTitleProps) => {
  const theme = useTheme();
  return (
    <text
      role="heading"
      aria-level={2}
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(DRAWER_TITLE, className, theme),
        style,
      )}
    />
  );
};

/** {@link DrawerDescription} props. */
export interface DrawerDescriptionProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** One paragraph of supporting copy under {@link DrawerTitle}. */
export const DrawerDescription = ({
  className,
  style,
  ...rest
}: DrawerDescriptionProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(DRAWER_DESCRIPTION, className, theme),
        style,
      )}
    />
  );
};

/** {@link DrawerFooter} props. */
export interface DrawerFooterProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The actions row, right-aligned. */
export const DrawerFooter = ({
  className,
  style,
  ...rest
}: DrawerFooterProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(DRAWER_FOOTER, className, theme),
        style,
      )}
    />
  );
};

/** Every part of Drawer, so a misplaced sibling is named. */
const drawerParts: ReadonlyArray<PartComponent> = [
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
];

const drawerRoot: PartsContract = {
  parent: "Drawer",
  family: drawerParts,
  accepts: [DrawerTrigger, DrawerContent, DrawerClose],
  hint: "Put DrawerTrigger and DrawerContent directly inside Drawer.",
};

const drawerContent: PartsContract = {
  parent: "DrawerContent",
  family: drawerParts,
  accepts: [
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
  ],
  hint: "Put the header, title, description, footer and close control inside DrawerContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const drawerMeta = {
  name: "Drawer",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no swipe-to-dismiss: 0.10.0 has no drag host feature",
    "no slide animation: motion has no transform, and width/left would reflow the content",
    "no aria-modal or aria-labelledby in 0.10.0: the surface is named with aria-label",
    "the veil is an anchored element at window coordinates because the release ships no portal",
    "sizes are layout constants: tokens carry no drawer-size role",
  ],
  docs: "docs/drawer.mdx",
  example: "examples/drawer.example.tsx",
  testFile: "src/behaviour/drawer.test.tsx",
} as const;
