/** @jsxImportSource @gpuix/react */
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
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
import { isPlainKey } from "../core/keyboard.js";
import { spokenWord } from "../core/a11y.js";
import { defaultMessages, type PrimitiveMessages } from "../core/messages.js";
import { scrollTarget } from "../core/scroll.js";
import { scrollAxis, type ScrollSpec } from "../core/style.js";
import { colorRole, rowHeightOf } from "../core/theme.js";
import type { PrimitiveTheme, RadiusStep, SpaceStep } from "../core/theme.js";
import { scrollClass, scrollFrameClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeRefs, mergeStyle } from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

interface ScrollPart {
  readonly theme: PrimitiveTheme;
  readonly axis: ScrollSpec["axis"];
  readonly onScroll: ((event: EventPayload) => void) | undefined;
  readonly onScrollChange: ((event: EventPayload) => void) | undefined;
  readonly onLayout: ((event: EventPayload) => void) | undefined;
  readonly scrollbarColor: string | undefined;
  readonly scrollbarWidth: number | undefined;

  readonly focusable: boolean;

  readonly label: string | undefined;

  readonly onScrollKey: ((event: KeyEvent) => void) | undefined;
}

export const DEFAULT_SCROLL_NAME = defaultMessages.scrollRegion;

const ScrollPartContext = createContext<ScrollPart | null>(null);

const useScrollPart = (name: string): ScrollPart => {
  const part = useContext(ScrollPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside ScrollArea`);
  }
  return part;
};

export const scrollPart = (
  {
    axis: requestedAxis,
    onScroll,
    onScrollChange,
    onLayout,
    scrollbarColor,
    scrollbarWidth,
    focusable,
    label,
  }: Pick<
    ScrollAreaProps,
    | "axis"
    | "onScroll"
    | "onScrollChange"
    | "onLayout"
    | "scrollbarColor"
    | "scrollbarWidth"
    | "focusable"
    | "label"
  >,
  theme: PrimitiveTheme,
  onScrollKey?: (event: KeyEvent) => void,
): ScrollPart => ({
  theme,
  axis: scrollAxis(requestedAxis),
  onScroll,
  onScrollChange,
  onLayout,
  scrollbarColor: scrollbarColor ?? colorRole(theme, "scrollbar"),
  scrollbarWidth,
  focusable: focusable ?? true,
  label,
  onScrollKey,
});

export interface ScrollAreaProps extends ScrollSpec {
  readonly onScroll?: (event: EventPayload) => void;

  readonly onScrollChange?: (event: EventPayload) => void;

  readonly onLayout?: (event: EventPayload) => void;

  readonly padding?: SpaceStep;

  readonly radius?: RadiusStep;

  readonly border?: boolean;

  readonly scrollbarColor?: string;

  readonly scrollbarWidth?: number;

  readonly focusable?: boolean;

  readonly label?: string;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly children?: ReactNode;

  readonly testId?: string;

  readonly viewportTestId?: string;

  readonly viewportRef?: Ref<PublicInstance>;
}

export interface ScrollAreaViewportProps {
  readonly axis?: ScrollSpec["axis"];

  readonly onScroll?: (event: EventPayload) => void;

  readonly onScrollChange?: (event: EventPayload) => void;

  readonly onLayout?: (event: EventPayload) => void;

  readonly scrollbarColor?: string;

  readonly scrollbarWidth?: number;

  readonly focusable?: boolean;

  readonly label?: string;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;

  readonly ref?: Ref<PublicInstance>;
}

export const renderScrollAreaViewport = (
  {
    axis,
    onScroll,
    onScrollChange,
    onLayout,
    scrollbarColor,
    scrollbarWidth,
    focusable,
    label,
    style,
    className,
    children,
    testId,
    ref,
  }: ScrollAreaViewportProps,
  part: ScrollPart,
  instance?: (element: PublicInstance | null) => void,
  messages: PrimitiveMessages = defaultMessages,
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
    (focusablePort
      ? spokenWord(messages.scrollRegion, defaultMessages.scrollRegion)
      : undefined);

  const attach =
    instance === undefined && ref === undefined
      ? undefined
      : mergeRefs(instance, ref);
  return (
    <div
      ref={attach}
      role={name === undefined ? undefined : "group"}
      aria-label={name}
      tabIndex={focusablePort ? 0 : undefined}
      testId={testId}
      onScroll={onScroll ?? part.onScroll}
      onScrollChange={onScrollChange ?? part.onScrollChange}
      onLayout={onLayout ?? part.onLayout}
      onKeyDown={part.onScrollKey}
      style={mergeStyle(
        mergeStyle(
          mergeStyle(viewport, resolved.style),

          focusablePort ? controlRing(part.theme, {}) : undefined,
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

const useScrollKeyboard = (axis: ScrollSpec["axis"], theme: PrimitiveTheme) => {
  const { renderer } = useGpuix();
  const target = useRef<number | null>(null);
  const onKeyDown = (event: KeyEvent): void => {
    if (!isPlainKey(event.modifiers)) return;
    const id = target.current;
    if (id === null || renderer === null) return;

    if (renderer.getFocusedElementId?.() !== id) return;
    const box = renderer.getElementBounds?.(id);
    if (box === null || box === undefined) return;
    const offsets = renderer.getScrollOffset?.(id) ?? null;
    Option.match(
      scrollTarget(
        event.key ?? "",
        axis,
        { x: offsets?.[0] ?? 0, y: offsets?.[1] ?? 0 },
        {
          line: rowHeightOf(theme),
          page: { width: box.width, height: box.height },
        },
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

export const ScrollAreaViewport = (
  props: ScrollAreaViewportProps,
): ReactElement => {
  const area = useScrollPart("ScrollAreaViewport");
  const messages = useMessages();
  const keyboard = useScrollKeyboard(props.axis ?? area.axis, area.theme);
  return renderScrollAreaViewport(
    props,
    { ...area, onScrollKey: keyboard.onKeyDown },
    keyboard.instance,
    messages,
  );
};

const composesItsOwnViewport = (children: ReactNode): boolean =>
  Arr.some(Children.toArray(children), (child) => {
    if (!isValidElement<{ readonly children?: ReactNode }>(child)) return false;
    if (child.type === ScrollAreaViewport) return true;
    return (
      child.type === Fragment && composesItsOwnViewport(child.props.children)
    );
  });

export const renderScrollArea = (
  {
    style,
    className,
    children,
    testId,
    viewportTestId,
    viewportRef,
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
          <ScrollAreaViewport ref={viewportRef} testId={viewportTestId}>
            {children}
          </ScrollAreaViewport>
        )}
      </ScrollPartContext.Provider>
    </div>
  );
};

export const ScrollArea = (props: ScrollAreaProps): ReactElement =>
  renderScrollArea(props, useTheme());
