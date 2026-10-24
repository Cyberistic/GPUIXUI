/** @jsxImportSource @gpuix/react */
/**
 * Drawer: a modal panel anchored to a window edge.
 *
 * Positioning and dismissal are the same as Dialog's (the styled Dialog is a
 * local overlay that does not use `@gpuix/react/dialog`'s portal, so the veil is
 * an `<anchored position={{x:0,y:0}}>` at window coordinates, plan 112 §1c).
 * What differs is where the surface sits: a full-height column on the left or
 * right, or a full-width sheet at the bottom. The shared rules — open state,
 * dismiss layer, focus in/return, Tab trap — live in `internal/modal.ts`.
 *
 * Known gaps in 0.11.0: no `aria-modal` or `aria-labelledby` (the surface is
 * named with `aria-label`), no swipe gesture (no drag host feature), and no
 * slide animation (`motion` has no transform; animating width/left would reflow
 * the content).
 */

import type { KeyEvent, Props, PublicInstance } from "@gpuix/react";
import { useGpuix, useWindowSize } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
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
  type MutableRefObject,
} from "react";
import * as Schema from "effect/Schema";
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
import {
  fadeFromSide,
  fadeOnly,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  presenceTabStop,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { useMergedRef } from "./internal/ref.js";
import { dismissTopLayer } from "./internal/dismiss-layer.js";
import { DismissScope } from "./internal/dismiss-scope.js";
import { overlaySurfaceStyle } from "./internal/overlay.js";
import { useTheme, type Theme } from "./internal/theme.js";

/** The window edge a drawer opens from. */
export type DrawerSide = "left" | "right" | "bottom";

/** The edges a drawer can open from, as the guard reads them. */
const DrawerEdges = Schema.Literals(["left", "right", "bottom"]);

/** The surface sizes a drawer offers. */
export type DrawerSize = "sm" | "md" | "lg";

/** The sizes a drawer can paint, as the guard reads them. */
const DrawerSizes = Schema.Literals(["sm", "md", "lg"]);

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
  readonly restoreTarget: MutableRefObject<number | null>;
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
  const { open, setOpen, restoreTarget } = useModalState({
    open: openProp,
    defaultOpen,
    onOpenChange,
    dismissible,
  });

  const context = useMemo<DrawerContextValue>(
    () => ({ open, setOpen, restoreTarget }),
    [open, restoreTarget, setOpen],
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
  const { open, setOpen } = useDrawerContext();
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

/** {@link DrawerContent} props. */
export interface DrawerContentProps extends Omit<Props, "children"> {
  /**
   * The edge to open from. Default `"right"`.
   *
   * The box, the layout and the entry travel read the same edge, so a value
   * restored from storage that names no window edge (a logical `"end"`, a side
   * a release dropped) opens on the default right edge rather than painting a
   * right-hand panel that rises from the bottom.
   */
  readonly side?: DrawerSide;
  /** Default `"md"`. A value restored from storage that names no variant (a
   * size a release dropped, or a `null`) paints the default box rather than an
   * unmeasured one. */
  readonly size?: DrawerSize;
  /** The accessible name — required, because 0.11.0 has no `aria-labelledby`. */
  readonly label: string;
  /** Renders the top-right close control. Default `true`. */
  readonly showClose?: boolean;
  /** The native id focus should land on after the drawer takes focus. */
  readonly initialFocus?: () => number | null;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The edge a drawer opens from, read from a value a caller may have stored.
 *
 * `DrawerSide` is a compile-time guarantee, but a persisted setting is not: a
 * logical name a store wrote (`"start"`/`"end"`) or a name a release dropped
 * reaches the component at runtime. The box, the layout and the entry travel
 * must read the **one** edge — before this, the box took its right-hand branch
 * while `fadeFromSide` took its house `bottom`, so a stored name painted the
 * panel on the right and rose it from the bottom.
 *
 * An edge the table does not name is the component's own default, `"right"`.
 */
const drawerSide = (side: unknown): DrawerSide =>
  Schema.is(DrawerEdges)(side) ? side : "right";

/**
 * The surface size a drawer paints, read from a value a caller may have stored.
 *
 * `DrawerSize` is a compile-time guarantee, but a persisted setting is not: a
 * name a release dropped or renamed reaches the component at runtime, and the
 * table lookup then hands `Math.min` an `undefined` — the renderer serialises
 * the resulting `NaN` as `null` and drops the width and height, so the panel
 * shrank to its content. A size the table does not name is the component's own
 * default, `md`.
 */
const drawerSize = (size: unknown): DrawerSize =>
  Schema.is(DrawerSizes)(size) ? size : "md";

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
  side: requestedSide,
  size: requestedSize = "md",
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
  const { open, setOpen, restoreTarget } = useDrawerContext();
  const renderer = useGpuix().renderer ?? undefined;
  const window = useWindowSize();
  assertParts(drawerContent, children);
  const timing = useSurfaceTiming("slow");
  const presence = useSurfacePresence(open, timing);
  // One edge for the box, the layout and the entry travel: a side a store
  // wrote that names no window edge lands on the component's own default.
  const side = drawerSide(requestedSide);
  // One size for the box the panel paints; a stored name the table does not
  // carry is the component's default rather than an `undefined` side.
  const size = drawerSize(requestedSize);
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

  const box = surfaceSize(side, size, window);
  const close = () => setOpen(false);
  const handleKeyDown = (event: KeyEvent): void => {
    handleModalKeyDown({ event, contentId: trapId, renderer, onKeyDown });
  };

  return (
    <anchored
      position={{ x: 0, y: 0 }}
      occlude
      style={{ position: "absolute" }}
    >
      <div
        testId="drawer-backdrop"
        motion={presenceMotion(fadeOnly, presence)}
        style={mergeStyles(
          overlaySurfaceStyle(DRAWER_OVERLAY, undefined, theme),
          {
            width: window.width,
            height: window.height,
            display: "flex",
            flexDirection: isVertical(side) ? "column" : "row",
            alignItems: "stretch",
            justifyContent: side === "left" ? "flex-start" : "flex-end",
            ...presenceStyle(presence.present),
          },
        )}
      >
        {/* The shield's box sits outside the surface's own scroller, so a
            drawer scrolled down cannot carry the leaving guard off screen. The
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
            width: box.width,
            height: box.height,
          }}
        >
          <div
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            {...rest}
            ref={setContentElement}
            testId={testId}
            motion={presenceMotion(fadeFromSide(side, 12), presence)}
            style={mergeStyles(
              mergeStyles(
                surfaceStyle(theme, box, className),
                presenceStyle(presence.present),
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
                label="Close drawer"
                size="sm"
                testId="drawer-close"
                {...presenceTabStop(presence.present)}
                onClick={close}
                motion={presenceMotion(fadeFromSide(side, 12), presence)}
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
    "no swipe-to-dismiss: 0.11.0 has no drag host feature",
    "the surface fades and travels 12px from its own edge rather than sliding its full width: the runtime has no transform, and width/left would reflow the content",
    "no aria-modal or aria-labelledby in 0.11.0: the surface is named with aria-label",
    "the veil is an anchored element at window coordinates: the styled Dialog is a local overlay, not `@gpuix/react/dialog`'s portalled surface",
    "sizes are layout constants: tokens carry no drawer-size role",
    "a size restored from storage that names no variant paints the default `md` box: the guarded lookup never hands the renderer an undefined width or height",
    "a dismissed panel stays painted for its exit and its own close control leaves the tab order for that window; a control composed inside the body keeps its stop, because 0.11.0 has no inherited `inert`",
  ],
  docs: "docs/drawer.mdx",
  example: "examples/drawer.example.tsx",
  testFile: "src/behaviour/drawer.test.tsx",
} as const;
