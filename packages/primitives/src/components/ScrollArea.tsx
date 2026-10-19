/**
 * `ScrollArea` — the one scroll container.
 *
 * The runtime paints the scrollbar from the platform theme and exposes no
 * `scrollbarColor` or `scrollbarWidth` (plan 020 §1.2), so this is only the
 * overflow axes and the caller's bounded size. It is deliberately a `<div>`:
 * the runtime has no separate scroller element.
 *
 * **Keyboard (plan 072).** The runtime does not scroll a container from the
 * keyboard, and focus does not bubble from a child, so a wheel was the only way
 * to move one. A **labelled** area is therefore a named, focusable `region`
 * with an arrow/page/Home/End contract resolved by `core/layout.ts` and applied
 * through the renderer's `scrollTo`. The handler compares the runtime's focused
 * element id with this container's own id, so an `Input` inside the area keeps
 * its arrow keys. An unlabelled area stays the inert container it always was —
 * adding a tab stop to every existing layout silently would be worse.
 *
 * **Position (plan 337).** The scroll *event* carries deltas, and a scroll this
 * component performs itself dispatches no event at all — measured, PageDown
 * moved the region and reported nothing. `onScrollPositionChange` therefore
 * reads the renderer's own absolute offset after both paths, so a consumer never
 * has to accumulate deltas (and never drifts when the runtime clamps).
 */

import {
  useImperativeHandle,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { focusRing } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { decideScroll, resolveScroll, scrollLine } from "../core/layout.js";
import { scrollStyle, type ScrollSpec } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import {
  ariaName,
  composeHandler,
  passiveTriggerHandlers,
  resolvePartStyle,
  usableLabel,
  useFocus,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `ScrollArea` style callback receives. */
export interface ScrollAreaState {
  /** Only a labelled area is focusable, so this is false for an inert one. */
  readonly focused: boolean;
}

/** An absolute scroll offset. `y` is `0` at the top and negative below it. */
export interface ScrollPosition {
  readonly x: number;
  readonly y: number;
}

/** Imperative controls on a scroll region, from its `ref`. */
export interface ScrollAreaHandle {
  /** The viewport host element, for measuring with the renderer. */
  readonly element: PublicInstance | null;
  /**
   * Scroll to an absolute offset — the runtime clamps it — and report the
   * result through `onScrollPositionChange`. An omitted axis keeps its current
   * offset. `renderer.scrollTo` called by hand dispatches no event, so use this
   * when the region must move from code.
   */
  readonly scrollTo: (target: Partial<ScrollPosition>) => void;
}

export interface ScrollAreaProps
  extends ScrollSpec, Omit<TriggerHandlers, "onScroll"> {
  /**
   * The imperative handle: `scrollTo`/`element`. A method call reports its own
   * position, which a raw `renderer.scrollTo` cannot.
   */
  readonly ref?: Ref<ScrollAreaHandle>;
  /**
   * Names the region **and** makes it a keyboard scroll stop. Without a label a
   * `region` would be an unnamed focus target, so the area stays inert.
   */
  readonly label?: string;
  /**
   * A wheel/trackpad scroll, as the runtime reports it: `deltaX`/`deltaY`,
   * `precise` and `touchPhase`. The payload has no absolute offset; use
   * `onScrollPositionChange` for one.
   */
  readonly onScroll?: (event: EventPayload) => void;
  /**
   * The absolute offset after a wheel or keyboard scroll, only when it changed.
   * The runtime clamps a programmatic scroll, so an `End` reports where the
   * content actually ends. A scroll this component performs itself dispatches no
   * `onScroll`, so this is the only complete position signal (plan 337).
   */
  readonly onScrollPositionChange?: (position: ScrollPosition) => void;
  /** An object, or a callback over the area's public state. */
  readonly style?: StateStyle<ScrollAreaState>;
  readonly children?: ReactNode;
  /**
   * Extra description announced after the name. A slot (a `Tooltip`) writes the
   * tip here; only a labelled area has a node to carry it.
   */
  readonly "aria-description"?: string;
  readonly testId?: string;
}

/** The impure glue the wrapper owns; the renderer below stays pure. */
export interface ScrollAreaHandlers {
  readonly ref?: Ref<PublicInstance>;
  readonly focused?: boolean;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
  readonly onKeyDown?: (event: EventPayload) => void;
}

/** The element tree `ScrollArea` renders. Pure in its arguments. */
export const renderScrollArea = (
  props: ScrollAreaProps,
  theme: PrimitiveTheme,
  handlers: ScrollAreaHandlers = {},
): ReactElement => {
  const { axis = "vertical", label, onScroll, style, children, testId } = props;
  const name = Option.getOrUndefined(usableLabel(label));
  const named = name !== undefined;
  const ring = handlers.focused === true && named ? focusRing(theme) : {};
  return (
    <div
      {...passiveTriggerHandlers(props)}
      testId={testId}
      ref={handlers.ref}
      role={named ? "region" : undefined}
      aria-label={name}
      aria-description={ariaName(props["aria-description"])}
      tabIndex={named ? 0 : undefined}
      onFocus={composeHandler(handlers.onFocus, props.onFocus)}
      onBlur={composeHandler(handlers.onBlur, props.onBlur)}
      onKeyDown={composeHandler(handlers.onKeyDown, props.onKeyDown)}
      onScroll={onScroll}
      style={resolvePartStyle({ ...scrollStyle({ axis }), ...ring }, style, {
        focused: named && handlers.focused === true,
      })}
    >
      {children}
    </div>
  );
};

/** A container that scrolls on the chosen axes. Give it a bounded size. */
export const ScrollArea = (props: ScrollAreaProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const root = useRef<PublicInstance | null>(null);
  const lastPosition = useRef<ScrollPosition>({ x: 0, y: 0 });
  const focus = useFocus();

  /** The runtime's own offset, which is already clamped after a scroll. */
  const reportPosition = (): void => {
    const id = root.current?.id;
    if (id === undefined) return;
    const position = Option.flatMap(
      Option.fromNullishOr(renderer?.getScrollOffset?.(id)),
      (values) =>
        Option.all({
          x: Option.fromNullishOr(values[0]),
          y: Option.fromNullishOr(values[1]),
        }),
    );
    if (Option.isNone(position)) return;
    const next = position.value;
    if (next.x === lastPosition.current.x && next.y === lastPosition.current.y)
      return;
    lastPosition.current = next;
    props.onScrollPositionChange?.(next);
  };

  const onScroll = (event: EventPayload): void => {
    props.onScroll?.(event);
    reportPosition();
  };

  /** Move the region from code, then report where it landed. */
  const scrollTo = (target: Partial<ScrollPosition>): void => {
    const id = root.current?.id;
    if (id === undefined) return;
    const current = Option.getOrUndefined(
      Option.map(
        Option.fromNullishOr(renderer?.getScrollOffset?.(id)),
        (values) => ({ x: values[0] ?? 0, y: values[1] ?? 0 }),
      ),
    );
    renderer?.scrollTo?.(
      id,
      target.x ?? current?.x ?? 0,
      target.y ?? current?.y ?? 0,
    );
    reportPosition();
  };

  useImperativeHandle(props.ref, () => ({
    get element() {
      return root.current;
    },
    scrollTo,
  }));

  const onKeyDown = (event: EventPayload): void => {
    if (Option.isNone(usableLabel(props.label))) return;
    const id = root.current?.id;
    if (id === undefined) return;
    // A child's keys may reach this handler; only scroll when the region itself
    // holds focus, so a field inside the area keeps its arrows (plan 072).
    if (renderer?.getFocusedElementId?.() !== id) return;
    const move = Option.getOrUndefined(
      decideScroll(event.key ?? "", props.axis ?? "vertical"),
    );
    if (move === undefined) return;
    const offset = renderer?.getScrollOffset?.(id);
    const bounds = renderer?.getElementBounds?.(id);
    const target = resolveScroll(move, {
      offset: { x: offset?.[0] ?? 0, y: offset?.[1] ?? 0 },
      viewport: { width: bounds?.width ?? 0, height: bounds?.height ?? 0 },
      line: scrollLine(theme),
    });
    renderer?.scrollTo?.(id, target.x, target.y);
    reportPosition();
  };

  return renderScrollArea({ ...props, onScroll }, theme, {
    ref: root,
    focused: focus.focused,
    onFocus: focus.onFocus,
    onBlur: focus.onBlur,
    onKeyDown,
  });
};
