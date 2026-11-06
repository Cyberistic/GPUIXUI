/** @jsxImportSource @gpuix/react */
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
import { overlaySurfaceStyle, overlayVeilColor } from "./internal/overlay.js";
import { useTheme, type Theme } from "./internal/theme.js";

export type DrawerSide = "left" | "right" | "top" | "bottom";

const DrawerEdges = Schema.Literals(["left", "right", "top", "bottom"]);

export type DrawerSize = "sm" | "md" | "lg";

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

interface DrawerContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly restoreTarget: MutableRefObject<number | null>;
}

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

const useDrawerContext = (): DrawerContextValue => {
  const value = useContext(DrawerContext);
  if (value === undefined) {
    throw new Error("Drawer parts must be used inside Drawer");
  }
  return value;
};

export interface DrawerProps {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;

  readonly dismissible?: boolean;
  readonly children?: PartChildren;
}

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

export interface DrawerContentProps extends Omit<Props, "children"> {
  readonly side?: DrawerSide;

  readonly size?: DrawerSize;

  readonly label: string;

  readonly showClose?: boolean;

  readonly inset?: number;

  readonly grabber?: boolean;

  readonly initialFocus?: () => number | null;

  readonly className?: string;
  readonly children?: PartChildren;
}

const drawerSide = (side: unknown): DrawerSide =>
  Schema.is(DrawerEdges)(side) ? side : "right";

const drawerSize = (size: unknown): DrawerSize =>
  Schema.is(DrawerSizes)(size) ? size : "md";

const isVertical = (side: DrawerSide): boolean =>
  side === "bottom" || side === "top";

const surfaceSize = (
  side: DrawerSide,
  size: DrawerSize,
  window: { readonly width: number; readonly height: number },
): { readonly width: number; readonly height: number } =>
  isVertical(side)
    ? { width: window.width, height: Math.min(HEIGHT[size], window.height) }
    : { width: Math.min(WIDTH[size], window.width), height: window.height };

const innerCorners = (side: DrawerSide, radius: number) => ({
  borderTopLeftRadius: side === "right" || side === "bottom" ? radius : 0,
  borderTopRightRadius: side === "left" || side === "bottom" ? radius : 0,
  borderBottomLeftRadius: side === "right" || side === "top" ? radius : 0,
  borderBottomRightRadius: side === "left" || side === "top" ? radius : 0,
});

const GRABBER_WIDTH = 40;
const GRABBER_HEIGHT = 4;

const grabberStyle = (theme: Theme, side: DrawerSide) => ({
  position: "absolute" as const,
  left: 0,
  right: 0,
  top: side === "bottom" ? theme.spacing.sm : undefined,
  bottom: side === "top" ? theme.spacing.sm : undefined,
  display: "flex" as const,
  justifyContent: "center" as const,
  pointerEvents: "none" as const,
});

const grabberBarStyle = (theme: Theme) => ({
  width: GRABBER_WIDTH,
  height: GRABBER_HEIGHT,
  borderRadius: theme.radius.full,
  backgroundColor: theme.colors.borderStrong,
});

const surfaceStyle = (
  theme: Theme,
  box: { width: number; height: number },
  side: DrawerSide,
  className?: string,
) => ({
  ...overlaySurfaceStyle(DRAWER_CONTENT, className, theme, "lg"),
  width: box.width,
  height: box.height,
  position: "relative" as const,
  overflow: "scroll" as const,
  ...innerCorners(side, theme.radius.xl),
});

const entryTravel = (
  side: DrawerSide,
  box: { readonly width: number; readonly height: number },
): number => (isVertical(side) ? box.height : box.width);

export const DrawerContent = ({
  side: requestedSide,
  size: requestedSize = "md",
  label,
  showClose = true,
  inset,
  grabber = true,
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

  const side = drawerSide(requestedSide);

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

  const [outline, setOutline] = useState<PublicInstance | undefined>(undefined);
  const outlineRef = useCallback((next: PublicInstance | null) => {
    setOutline(next ?? undefined);
  }, []);
  const trapId = outline?.id ?? contentId;
  useModalFocus(contentId, initialFocus, open, restoreTarget);

  if (!presence.mounted) return null;

  const hangs = side === "top" && inset !== undefined;
  const edgeBox = surfaceSize(side, size, window);
  const box = hangs
    ? { ...edgeBox, width: Math.min(edgeBox.width, window.width - 80) }
    : edgeBox;
  const close = () => setOpen(false);
  const handleKeyDown = (event: KeyEvent): void => {
    handleModalKeyDown({ event, contentId: trapId, renderer, onKeyDown });
  };

  const travel = entryTravel(side, box);

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
            backgroundColor: overlayVeilColor(theme),
            width: window.width,
            height: window.height,

            overflow: "hidden",
            display: "flex",
            flexDirection: isVertical(side) ? "column" : "row",
            alignItems: "stretch",
            justifyContent:
              side === "left" || side === "top" ? "flex-start" : "flex-end",
            ...(hangs ? { alignItems: "center", paddingTop: inset } : {}),
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
            width: box.width,
            height: box.height,
          }}
        >
          <div
            motion={presenceMotion(fadeFromSide(side, travel), presence)}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              width: box.width,
              height: box.height,
              ...presenceStyle(presence.present),
            }}
          >
            {grabber && isVertical(side) ? (
              <div testId="drawer-grabber" style={grabberStyle(theme, side)}>
                <div style={grabberBarStyle(theme)} />
              </div>
            ) : null}
            <div
              role="dialog"
              aria-label={label}
              tabIndex={-1}
              {...rest}
              ref={setContentElement}
              testId={testId}
              style={mergeStyles(
                surfaceStyle(theme, box, side, className),
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
                  label="Close drawer"
                  size="sm"
                  testId="drawer-close"
                  {...presenceTabStop(presence.present)}
                  onClick={close}
                >
                  <Icon name="x" size="sm" color={theme.colors.foreground} />
                </IconButton>
              </div>
            ) : null}
          </div>
          <PresenceShield present={presence.present} />
        </div>
      </div>
    </anchored>
  );
};

export interface DrawerHeaderProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface DrawerTitleProps extends Props {
  readonly className?: string;
}

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

export interface DrawerDescriptionProps extends Props {
  readonly className?: string;
}

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

export interface DrawerFooterProps extends Props {
  readonly className?: string;
}

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

export const drawerMeta = {
  name: "Drawer",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no swipe-to-dismiss or snap points: 0.11.0 has no drag host, so the grabber cannot be dragged",
    "the surface slides its own span from the named edge: the runtime has no transform, so the travel is a numeric left/top offset on the surface's own box, and the window-sized veil (overflow hidden) clips it",
    "the veil cannot blur the page: StyleDesc has no filter or backdropFilter, so the 6px blur the drawings paint is drawing-only",
    "the inner corners round (radius.xl) while the window edge stays flush, and a top/bottom sheet paints the vaul grabber as decoration",
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
