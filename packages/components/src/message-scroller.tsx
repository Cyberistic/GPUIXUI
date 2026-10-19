/**
 * MessageScroller: follow new content while the reader is at the end, and leave
 * them alone when they are not.
 *
 * The pin decision is measured from a 1px tail sentinel's laid-out position
 * relative to the scroller root, not from an absolute scroll height: GPUix
 * reports a scroll offset (`getScrollOffset`) but no content height, while
 * offscreen `getElementBounds` still returns the sentinel's true position
 * (measured 2026-10-18, plan 206). It is measured against the **root**, not the
 * scroll container: on this binding the container's own box is reported in
 * scrolled content space (viewport `y: -1080` at offset `-1080`) while its rows
 * are in window space, so a scroll back to the end could never re-pin (plan 582).
 * The root is unscrolled, and the parts contract makes it the viewport's visible
 * box. That also keeps the rule correct for a future `<virtual-list>` swap,
 * where a distance-from-end measure is the only thing that survives row
 * virtualization.
 *
 * The viewport is a plain scroll container in v1: `<virtual-list>` takes an
 * item count rather than compound children, so it cannot host `Item` parts
 * without changing the public API. The limitation is recorded in
 * `COMPONENTS.md` and the docs page.
 *
 * `JumpToLatest` floats in the scroller's bottom-right corner: the root is a
 * positioned box, so an absolute child resolves against it rather than the mount
 * parent (the unpositioned case measured in plan 112; the positioned case
 * measured while fixing the Avatar, plan 571).
 */

import type {
  EventPayload,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { Button } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import { useTheme } from "./internal/theme.js";
import {
  addItems,
  observeScroll,
  pinThreshold,
  requestLatest,
  type MessageScrollerState,
} from "./message-scroller/logic.js";

/** The rules every part reads; throws outside a {@link MessageScroller}. */
interface MessageScrollerContextValue {
  readonly pinned: boolean;
  readonly unread: number;
  readonly threshold: number;
  readonly observe: (distanceFromEnd: number) => void;
  readonly addItems: (count: number) => void;
  readonly jumpToLatest: () => void;
  /** The unscrolled root: its box is the viewport's visible box. */
  readonly rootRef: RefObject<PublicInstance | null>;
}

const MessageScrollerContext = createContext<
  MessageScrollerContextValue | undefined
>(undefined);

/** The scroller a part belongs to. Throws when there is none. */
const useMessageScroller = (): MessageScrollerContextValue => {
  const value = useContext(MessageScrollerContext);
  if (value === undefined) {
    throw new Error(
      "MessageScroller parts must be used inside MessageScroller",
    );
  }
  return value;
};

/** {@link MessageScroller} props. */
export interface MessageScrollerProps extends Omit<Props, "children"> {
  /** The scroller's accessible name. */
  readonly label: string;
  /**
   * Distance from the tail that still counts as "at the end". Defaults to the
   * theme's `spacing["2xl"]` (24px) — a layout token, not a literal. A negative
   * value counts as zero; an absent or non-finite one uses the default.
   */
  readonly threshold?: number;
  /** The controlled pinned state. `undefined` means uncontrolled. */
  readonly pinned?: boolean;
  readonly defaultPinned?: boolean;
  readonly onPinnedChange?: (pinned: boolean) => void;
  readonly children?: PartChildren;
}

/** The scroller root: owns the pin/unread state and the threshold. */
export const MessageScroller = ({
  label,
  threshold: thresholdProp,
  pinned: pinnedProp,
  defaultPinned = true,
  onPinnedChange,
  children,
  style,
  ref,
  ...rest
}: MessageScrollerProps) => {
  const theme = useTheme();
  const [pinned, setPinned] = useControllableState({
    value: pinnedProp,
    defaultValue: defaultPinned,
    onChange: onPinnedChange,
  });
  const [unread, setUnread] = useState(0);
  const threshold = pinThreshold(thresholdProp, theme.spacing["2xl"]);
  const rootRef = useRef<PublicInstance | null>(null);
  const setRoot = useMergedRef(rootRef, ref);
  assertParts(messageScrollerRoot, children);

  const observe = useCallback(
    (distanceFromEnd: number) => {
      const next = observeScroll(
        { pinned, unread },
        { distanceFromEnd, threshold },
      );
      if (next.pinned !== pinned) setPinned(next.pinned);
      if (next.unread !== unread) setUnread(next.unread);
    },
    [pinned, unread, setPinned, threshold],
  );

  const add = useCallback(
    (count: number) => {
      const next = addItems({ pinned, unread }, count);
      if (next.unread !== unread) setUnread(next.unread);
    },
    [pinned, unread],
  );

  const jumpToLatest = useCallback(() => {
    const next = requestLatest({ pinned, unread });
    if (next.pinned !== pinned) setPinned(true);
    if (next.unread !== unread) setUnread(0);
  }, [pinned, unread, setPinned]);

  const context = useMemo<MessageScrollerContextValue>(
    () => ({
      pinned,
      unread,
      threshold,
      observe,
      addItems: add,
      jumpToLatest,
      rootRef,
    }),
    [pinned, unread, threshold, observe, add, jumpToLatest, rootRef],
  );

  return (
    <MessageScrollerContext.Provider value={context}>
      <div
        {...rest}
        role="group"
        aria-label={label}
        ref={setRoot}
        style={mergeStyles(
          {
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            minHeight: 0,
          },
          style,
        )}
      >
        {children}
      </div>
    </MessageScrollerContext.Provider>
  );
};

/** {@link MessageScrollerViewport} props. */
export interface MessageScrollerViewportProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
  readonly ref?: Ref<PublicInstance>;
}

/**
 * The scroll container. Give it a bounded `height` (or a flex parent that does);
 * without one there is nothing to scroll.
 */
export const MessageScrollerViewport = ({
  children,
  style,
  ref,
  onScroll,
  ...rest
}: MessageScrollerViewportProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const scroller = useMessageScroller();
  const viewportRef = useRef<PublicInstance | null>(null);
  const tailRef = useRef<PublicInstance | null>(null);
  const mergedRef = useMergedRef(viewportRef, ref);
  const items = Children.toArray(children);
  const previousCount = useRef(items.length);
  assertParts(messageScrollerViewport, children);

  const scrollToEnd = useCallback(() => {
    const tail = tailRef.current;
    if (tail === null) return;
    const viewport = viewportRef.current;
    if (renderer?.scrollIntoView !== undefined) {
      renderer.scrollIntoView(tail.id);
      return;
    }
    if (viewport !== null && renderer?.scrollTo !== undefined) {
      renderer.scrollTo(viewport.id, 0, -Number.MAX_SAFE_INTEGER);
    }
  }, [renderer]);

  useLayoutEffect(() => {
    const added = items.length - previousCount.current;
    previousCount.current = items.length;
    if (added > 0) scroller.addItems(added);
  }, [items.length, scroller]);

  // Run after every render: an appended row and a taller streamed row both need
  // the tail back in view while pinned. Unpinned, the position is never touched.
  useLayoutEffect(() => {
    if (scroller.pinned) scrollToEnd();
  });

  const handleScroll = (event: EventPayload): void => {
    const root = scroller.rootRef.current;
    const tail = tailRef.current;
    if (renderer !== null && root !== null && tail !== null) {
      const rootBounds = renderer.getElementBounds?.(root.id);
      const tailBounds = renderer.getElementBounds?.(tail.id);
      if (
        rootBounds !== undefined &&
        rootBounds !== null &&
        tailBounds !== undefined &&
        tailBounds !== null
      ) {
        scroller.observe(tailBounds.y - (rootBounds.y + rootBounds.height));
      }
    }
    onScroll?.(event);
  };

  const base: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    overflowY: "scroll",
    minHeight: 0,
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
  };

  return (
    <div
      {...rest}
      ref={mergedRef}
      onScroll={handleScroll}
      style={mergeStyles(base, style)}
    >
      {children}
      <div ref={tailRef} style={{ height: 1, flexShrink: 0 }} />
    </div>
  );
};

/** {@link MessageScrollerItem} props. */
export interface MessageScrollerItemProps extends Omit<Props, "children"> {
  readonly children?: ReactNode;
}

/** One message row. It paints no surface of its own. */
export const MessageScrollerItem = ({
  children,
  style,
  ...rest
}: MessageScrollerItemProps) => {
  const theme = useTheme();

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xs,
          flexShrink: 0,
          alignSelf: "stretch",
          paddingBottom: theme.spacing.sm,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link MessageScrollerJumpToLatest} props. */
export interface MessageScrollerJumpToLatestProps extends Omit<
  Props,
  "children"
> {
  /** Text when nothing is unread. Default `"Jump to latest"`. */
  readonly label?: string;
}

/**
 * The way back to the newest row. Rendered only while unpinned, so a pinned
 * reader never sees a control that would do nothing.
 */
export const MessageScrollerJumpToLatest = ({
  label = "Jump to latest",
  style,
  onClick,
  ...rest
}: MessageScrollerJumpToLatestProps) => {
  const theme = useTheme();
  const scroller = useMessageScroller();
  if (scroller.pinned) return null;

  const text =
    scroller.unread === 0
      ? label
      : `${scroller.unread} new ${scroller.unread === 1 ? "message" : "messages"}`;

  return (
    <Button
      {...rest}
      variant="secondary"
      size="sm"
      onClick={(event) => {
        scroller.jumpToLatest();
        onClick?.(event);
      }}
      style={mergeStyles(
        {
          position: "absolute",
          right: theme.spacing.lg,
          bottom: theme.spacing.lg,
        },
        style,
      )}
    >
      {text}
    </Button>
  );
};

const messageScrollerFamily: ReadonlyArray<PartComponent> = [
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
];

const messageScrollerRoot: PartsContract = {
  parent: "MessageScroller",
  family: messageScrollerFamily,
  accepts: [MessageScrollerViewport, MessageScrollerJumpToLatest],
  hint: "Put MessageScrollerViewport and MessageScrollerJumpToLatest directly inside it.",
};

const messageScrollerViewport: PartsContract = {
  parent: "MessageScrollerViewport",
  family: messageScrollerFamily,
  accepts: [MessageScrollerItem],
  hint: "Put MessageScrollerItem directly inside it; other content is allowed but counts as a row.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const messageScrollerMeta = {
  name: "Message scroller",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "the viewport renders every row: <virtual-list> takes itemCount rather than compound children, so long histories are not virtualized in v1",
    "a row that grows without the scroller re-rendering (internal child state) is not observed; there is no resize observer",
    "no aria-live role in 0.10.0, so new rows are not announced",
  ],
  docs: "docs/message-scroller.mdx",
  example: "examples/message-scroller.example.tsx",
  testFile: "src/behaviour/message-scroller.test.tsx",
} as const;

export type { MessageScrollerState };
