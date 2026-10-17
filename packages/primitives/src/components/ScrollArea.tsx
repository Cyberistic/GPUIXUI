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
 */

import { useRef, type ReactElement, type ReactNode, type Ref } from "react";
import type { EventPayload, PublicInstance, StyleDesc } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { focusRing } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { decideScroll, resolveScroll, scrollLine } from "../core/layout.js";
import { scrollStyle, type ScrollSpec } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { mergeStyle, useFocus } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface ScrollAreaProps extends ScrollSpec {
  /**
   * Names the region **and** makes it a keyboard scroll stop. Without a label a
   * `region` would be an unnamed focus target, so the area stays inert.
   */
  readonly label?: string;
  /**
   * A wheel/trackpad scroll, as the runtime reports it: `deltaX`/`deltaY`,
   * `precise` and `touchPhase`. There is **no absolute offset** — a consumer
   * accumulates deltas itself.
   */
  readonly onScroll?: (event: EventPayload) => void;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
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
  {
    axis = "vertical",
    label,
    onScroll,
    style,
    children,
    testId,
  }: ScrollAreaProps,
  theme: PrimitiveTheme,
  handlers: ScrollAreaHandlers = {},
): ReactElement => {
  const named = label !== undefined;
  const ring = handlers.focused === true && named ? focusRing(theme) : {};
  return (
    <div
      testId={testId}
      ref={handlers.ref}
      role={named ? "region" : undefined}
      aria-label={label}
      tabIndex={named ? 0 : undefined}
      onFocus={handlers.onFocus}
      onBlur={handlers.onBlur}
      onKeyDown={handlers.onKeyDown}
      onScroll={onScroll}
      style={mergeStyle({ ...scrollStyle({ axis }), ...ring }, style)}
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
  const focus = useFocus();

  const onKeyDown = (event: EventPayload): void => {
    if (props.label === undefined) return;
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
  };

  return renderScrollArea(props, theme, {
    ref: root,
    focused: focus.focused,
    onFocus: focus.onFocus,
    onBlur: focus.onBlur,
    onKeyDown,
  });
};
