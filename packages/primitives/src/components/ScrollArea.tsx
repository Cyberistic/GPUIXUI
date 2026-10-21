/**
 * `ScrollArea` — the one scroll container.
 *
 * GPUix 0.11.0 paints the scrollbar itself and exposes two knobs for it:
 * `scrollbarColor` and `scrollbarWidth` (`native/dist/host.d.ts`, measured in
 * `runtime/layout.runtime.test.tsx`). There is still no `Scrollbar`/`Thumb`/
 * `Corner` part — the platform paints one native thumb that takes no pointer
 * input — so the viewport only tints it and, optionally, sets its thickness.
 *
 * The root is the frame: its padding, radius and border stay outside the
 * scroller. `ScrollAreaViewport` carries the overflow axes and `onScroll`, and
 * a bare `<ScrollArea>` renders one implicit viewport so the old API is
 * unchanged.
 *
 * The resting appearance is a Tailwind recipe (`recipe/scrollClass` and
 * `recipe/scrollFrameClass`), compiled through `@gpuixui/tw`; the caller's
 * `className` is joined last so it wins conflicts exactly as `cn` resolves them.
 */

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { ScrollSpec } from "../core/style.js";
import type { PrimitiveTheme, RadiusStep, SpaceStep } from "../core/theme.js";
import { scrollClass, scrollFrameClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The scroll behaviour every viewport shares. */
interface ScrollPart {
  readonly theme: PrimitiveTheme;
  readonly axis: ScrollSpec["axis"];
  readonly onScroll: ((event: EventPayload) => void) | undefined;
  readonly scrollbarColor: string;
  readonly scrollbarWidth: number | undefined;
}

const ScrollPartContext = createContext<ScrollPart | null>(null);

const useScrollPart = (name: string): ScrollPart => {
  const part = useContext(ScrollPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside ScrollArea`);
  }
  return part;
};

/** The scroll facts a scroll area resolves once, for its root and viewport. */
export const scrollPart = (
  {
    axis = "vertical",
    onScroll,
    scrollbarColor,
    scrollbarWidth,
  }: Pick<
    ScrollAreaProps,
    "axis" | "onScroll" | "scrollbarColor" | "scrollbarWidth"
  >,
  theme: PrimitiveTheme,
): ScrollPart => ({
  theme,
  axis,
  onScroll,
  scrollbarColor: scrollbarColor ?? theme.colors.scrollbar,
  scrollbarWidth,
});

export interface ScrollAreaProps extends ScrollSpec {
  /**
   * A wheel/trackpad scroll, as the runtime reports it: `deltaX`/`deltaY`,
   * `precise` and `touchPhase`. There is **no absolute offset** — a consumer
   * accumulates deltas itself.
   */
  readonly onScroll?: (event: EventPayload) => void;
  /** Frame padding, on the theme's spacing scale. It does not scroll. */
  readonly padding?: SpaceStep;
  /** Frame radius. Defaults to no rounding. */
  readonly radius?: RadiusStep;
  /** Draw the frame's border. Defaults to off. */
  readonly border?: boolean;
  /** The viewport's scrollbar thumb. Defaults to the theme's `scrollbar` role. */
  readonly scrollbarColor?: string;
  /** The viewport's scrollbar thickness in px. Defaults to the platform's. */
  readonly scrollbarWidth?: number;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  /** The root frame's locator. Use `viewportTestId` to locate the scroller. */
  readonly testId?: string;
  /** The implicit viewport's locator, for scroll automation. */
  readonly viewportTestId?: string;
}

/** {@link ScrollAreaViewport} props. */
export interface ScrollAreaViewportProps {
  /** Defaults to the scroll area's axis. */
  readonly axis?: ScrollSpec["axis"];
  /** Defaults to the scroll area's `onScroll`. */
  readonly onScroll?: (event: EventPayload) => void;
  /** Defaults to the scroll area's thumb colour. */
  readonly scrollbarColor?: string;
  /** Defaults to the scroll area's thickness. */
  readonly scrollbarWidth?: number;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The element a scroll area's content scrolls in. Pure in its arguments. */
export const renderScrollAreaViewport = (
  {
    axis,
    onScroll,
    scrollbarColor,
    scrollbarWidth,
    style,
    className,
    children,
    testId,
  }: ScrollAreaViewportProps,
  part: ScrollPart,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(scrollClass(axis ?? part.axis), className),
    part.theme,
  );
  const viewport: StyleDesc = {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    minWidth: 0,
    scrollbarColor: scrollbarColor ?? part.scrollbarColor,
  };
  if ((scrollbarWidth ?? part.scrollbarWidth) !== undefined) {
    viewport.scrollbarWidth = scrollbarWidth ?? part.scrollbarWidth;
  }
  return (
    <div
      testId={testId}
      onScroll={onScroll ?? part.onScroll}
      style={mergeStyle(mergeStyle(viewport, resolved.style), style)}
    >
      {children}
    </div>
  );
};

/** The scroller, inside a `ScrollArea`. */
export const ScrollAreaViewport = (
  props: ScrollAreaViewportProps,
): ReactElement =>
  renderScrollAreaViewport(props, useScrollPart("ScrollAreaViewport"));

/**
 * Whether the caller brought their own viewport.
 *
 * A `ScrollArea`'s children are the content of one implicit viewport, so the
 * old `<ScrollArea>rows</ScrollArea>` keeps scrolling. A caller who needs a
 * heading outside the scroller composes `ScrollAreaViewport` among the
 * children instead; that viewport is the one they placed.
 */
const composesItsOwnViewport = (children: ReactNode): boolean =>
  Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === ScrollAreaViewport,
  );

/** The element a scroll area renders. Pure in its arguments. */
export const renderScrollArea = (
  {
    style,
    className,
    children,
    testId,
    viewportTestId,
    padding,
    radius,
    border,
    ...spec
  }: ScrollAreaProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const part = scrollPart(spec, theme);
  return (
    <div
      testId={testId}
      style={mergeStyle(
        recipeTw.classesToStyle(
          cn(scrollFrameClass({ padding, radius, border }), className),
          theme,
        ).style,
        style,
      )}
    >
      <ScrollPartContext.Provider value={part}>
        {composesItsOwnViewport(children) ? (
          children
        ) : (
          <ScrollAreaViewport testId={viewportTestId}>
            {children}
          </ScrollAreaViewport>
        )}
      </ScrollPartContext.Provider>
    </div>
  );
};

/** A container that scrolls on the chosen axes. Give it a bounded size. */
export const ScrollArea = (props: ScrollAreaProps): ReactElement =>
  renderScrollArea(props, useTheme());
