/**
 * `ScrollArea` — the one scroll container.
 *
 * GPUix 0.11.0 paints the scrollbar itself and exposes two knobs for it:
 * `scrollbarColor` and `scrollbarWidth` (`native/dist/host.d.ts`, measured in
 * `runtime/layout.runtime.test.tsx`). There is still no `Scrollbar`/`Thumb`/
 * `Corner` part — the platform paints one native thumb that takes no pointer
 * input — so the viewport only tints it and, optionally, sets its thickness.
 *
 * The viewport is a keyboard scroll region: it is a tab stop, and arrows /
 * PageUp / PageDown / Home / End move it through the renderer's `scrollTo`
 * (`core/scroll.ts` decides the target). The handler only runs for a key whose
 * target is the scroller itself, so a field inside keeps its own arrow keys.
 *
 * That stop is also a named `group`, because a node reaches the accessibility
 * tree only with a role: an unnamed viewport used to be a tab stop assistive
 * technology could not see. `label` names it, unnamed it is
 * `DEFAULT_SCROLL_NAME`, and `focusable={false}` adds neither.
 *
 * The root is the frame: its padding, radius and border stay outside the
 * scroller. `ScrollAreaViewport` carries the overflow axes, `onScroll` (wheel
 * deltas) and `onScrollChange` (the absolute offset, whatever moved it).
 *
 * The resting appearance is a Tailwind recipe (`recipe/scrollClass` and
 * `recipe/scrollFrameClass`), compiled through `@gpuixui/tw`; the caller's
 * `className` is joined last so it wins conflicts exactly as `cn` resolves them.
 */

import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { useGpuix } from "@gpuix/react";
import type {
  EventPayload,
  KeyEvent,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { accessibleName } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import { scrollTarget } from "../core/scroll.js";
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
  readonly onScrollChange: ((event: EventPayload) => void) | undefined;
  readonly scrollbarColor: string;
  readonly scrollbarWidth: number | undefined;
  /** Whether the viewport is a tab stop and answers the scroll keys. */
  readonly focusable: boolean;
  /** The region's accessible name, when the caller gives one. */
  readonly label: string | undefined;
  /** The keyboard handler the viewport component installs. */
  readonly onScrollKey: ((event: KeyEvent) => void) | undefined;
}

/**
 * What an unnamed viewport that is a tab stop is called.
 *
 * A tab stop a reader cannot reach with assistive technology is a stop nobody
 * can describe, and ARIA asks a focusable scroll region to be named. `label`
 * overrides this; it is fixed English like the OTP field's cell names.
 */
export const DEFAULT_SCROLL_NAME = "Scroll region";

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
    onScrollChange,
    scrollbarColor,
    scrollbarWidth,
    focusable,
    label,
  }: Pick<
    ScrollAreaProps,
    | "axis"
    | "onScroll"
    | "onScrollChange"
    | "scrollbarColor"
    | "scrollbarWidth"
    | "focusable"
    | "label"
  >,
  theme: PrimitiveTheme,
  onScrollKey?: (event: KeyEvent) => void,
): ScrollPart => ({
  theme,
  axis,
  onScroll,
  onScrollChange,
  scrollbarColor: scrollbarColor ?? theme.colors.scrollbar,
  scrollbarWidth,
  focusable: focusable ?? true,
  label,
  onScrollKey,
});

export interface ScrollAreaProps extends ScrollSpec {
  /**
   * A wheel/trackpad scroll, as the runtime reports it: `deltaX`/`deltaY`,
   * `precise` and `touchPhase`.
   */
  readonly onScroll?: (event: EventPayload) => void;
  /**
   * The absolute offset after any move — wheel, scrollbar, `scrollTo` — as
   * `scrollX`/`scrollY` (0 at the start, negative after).
   */
  readonly onScrollChange?: (event: EventPayload) => void;
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
  /**
   * Whether the scroller is a tab stop that answers the scroll keys. Defaults to
   * `true`; set `false` when the content inside carries its own scroll contract.
   */
  readonly focusable?: boolean;
  /**
   * The scroller is a tab stop, and a tab stop whose element has no role is
   * absent from the accessibility tree — so the viewport is always a `group`
   * while it can take focus. `label` names it; unnamed it is
   * `DEFAULT_SCROLL_NAME`. Set `focusable` to `false` to add neither.
   */
  readonly label?: string;
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
  /** Defaults to the scroll area's `onScrollChange`. */
  readonly onScrollChange?: (event: EventPayload) => void;
  /** Defaults to the scroll area's thumb colour. */
  readonly scrollbarColor?: string;
  /** Defaults to the scroll area's thickness. */
  readonly scrollbarWidth?: number;
  /** Defaults to the scroll area's `focusable`. */
  readonly focusable?: boolean;
  /** Defaults to the scroll area's `label`. */
  readonly label?: string;
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
    onScrollChange,
    scrollbarColor,
    scrollbarWidth,
    focusable,
    label,
    style,
    className,
    children,
    testId,
  }: ScrollAreaViewportProps,
  part: ScrollPart,
  instance?: (element: PublicInstance | null) => void,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(scrollClass(axis ?? part.axis), className),
    part.theme,
  );
  const focusablePort = focusable ?? part.focusable;
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
  const name =
    accessibleName(label ?? part.label) ??
    (focusablePort ? DEFAULT_SCROLL_NAME : undefined);
  return (
    <div
      ref={instance}
      role={name === undefined ? undefined : "group"}
      aria-label={name}
      tabIndex={focusablePort ? 0 : undefined}
      testId={testId}
      onScroll={onScroll ?? part.onScroll}
      onScrollChange={onScrollChange ?? part.onScrollChange}
      onKeyDown={part.onScrollKey}
      style={mergeStyle(
        mergeStyle(
          mergeStyle(viewport, resolved.style),
          // A tab stop owes a visible cue: the runtime paints `focusVisible`
          // only on an element that declares it, so a keyboard reader landing
          // in the scroller would otherwise see nothing. The declaration sits on
          // the element that holds the focus, never on the frame around it.
          focusablePort ? controlRing(part.theme, {}) : undefined,
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

/**
 * The viewport's keyboard contract.
 *
 * The renderer is the only thing that can move a scroller: `scrollTo` takes the
 * element id, and `getScrollOffset` reports where it is. The handler ignores an
 * event aimed at a descendant (a field inside keeps its arrows), and swallows a
 * key only once the target is known, so an unhandled key still reaches the rest
 * of the window.
 */
const useScrollKeyboard = (axis: ScrollSpec["axis"], theme: PrimitiveTheme) => {
  const { renderer } = useGpuix();
  const target = useRef<number | null>(null);
  const onKeyDown = (event: KeyEvent): void => {
    const id = target.current;
    if (id === null || renderer === null) return;
    // GPUI bubbles a key from the focused element up, so the element that owns
    // the handler is not necessarily the one the key was aimed at. A field
    // inside keeps its arrows; only the focused scroller scrolls.
    if (renderer.getFocusedElementId?.() !== id) return;
    const box = renderer.getElementBounds?.(id);
    if (box === null || box === undefined) return;
    const offsets = renderer.getScrollOffset?.(id) ?? null;
    Option.match(
      scrollTarget(
        event.key ?? "",
        axis,
        { x: offsets?.[0] ?? 0, y: offsets?.[1] ?? 0 },
        { line: theme.density.rowHeight, page: box.height },
      ),
      {
        onNone: () => {},
        onSome: (next) => {
          event.preventDefault();
          renderer.scrollTo?.(id, next.x, next.y);
        },
      },
    );
  };
  return {
    onKeyDown,
    instance: (element: PublicInstance | null): void => {
      target.current = element?.id ?? null;
    },
  };
};

/** The scroller, inside a `ScrollArea`. */
export const ScrollAreaViewport = (
  props: ScrollAreaViewportProps,
): ReactElement => {
  const area = useScrollPart("ScrollAreaViewport");
  const keyboard = useScrollKeyboard(props.axis ?? area.axis, area.theme);
  return renderScrollAreaViewport(
    props,
    { ...area, onScrollKey: keyboard.onKeyDown },
    keyboard.instance,
  );
};

/**
 * Whether the caller brought their own viewport.
 *
 * A `ScrollArea`'s children are the content of one implicit viewport, so the
 * old `<ScrollArea>rows</ScrollArea>` keeps scrolling. A caller who needs a
 * heading outside the scroller composes `ScrollAreaViewport` among the
 * children instead; that viewport is the one they placed.
 *
 * A fragment is transparent — a caller groups a heading and a viewport in one
 * without meaning to wrap either — so the scan descends through fragments
 * exactly as it does through an array. Reading only the direct children left a
 * viewport in a fragment invisible, and the area wrapped the whole composition
 * in a second, implicit scroller.
 */
const composesItsOwnViewport = (children: ReactNode): boolean =>
  Arr.some(Children.toArray(children), (child) => {
    if (!isValidElement<{ readonly children?: ReactNode }>(child)) return false;
    if (child.type === ScrollAreaViewport) return true;
    return (
      child.type === Fragment && composesItsOwnViewport(child.props.children)
    );
  });

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
