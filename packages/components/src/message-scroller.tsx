/** @jsxImportSource @gpuix/react */
/**
 * MessageScroller: follow new content while the reader is at the end, and leave
 * them alone when they are not.
 *
 * Ported from shadcn/ui's `MessageScroller` (provider, frame, viewport, content,
 * item, button). The behaviour is ours: the pin decision is measured from a 1px
 * tail sentinel's laid-out position relative to the viewport, because GPUix
 * reports a scroll offset but no content height. The viewport renders every row
 * (`<virtual-list>` takes a count, not compound children), and the limitation is
 * recorded in `COMPONENTS.md` and the page.
 *
 * **The frame owns its height.** The viewport grows inside the root
 * (`flex: 1 1 0; min-height: 0`), and the jump control sits in a reserved rail
 * below it. The rail is the layout-shift fix: the control used to be an
 * ordinary sibling, so showing it took height from the viewport and moved the
 * composer. A rail that is always laid out means the control can fade and travel
 * without resizing anything.
 *
 * **An append while the reader is away changes nothing.** The viewport scrolls
 * only when the store says it is pinned; a laid-out row (a streamed reply
 * growing) reaches the same rule through the tail sentinel's `onLayout`, so a
 * reader who scrolled up is never pulled back.
 *
 * `scrollAnchor` on an item is opt-in turn anchoring: a newly mounted anchor is
 * placed near the top of the viewport with `previousItemPeek` of the row above
 * still visible. It is not the default, and it only runs while the reader is
 * pinned — an unpinned reader keeps their place.
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
  cn,
  MESSAGE_SCROLLER_CONTENT,
  MESSAGE_SCROLLER_ITEM,
  MESSAGE_SCROLLER_RAIL,
  MESSAGE_SCROLLER_ROOT,
  MESSAGE_SCROLLER_VIEWPORT,
} from "@gpuixui/tw";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { Button } from "./internal/button.js";
import { send, useLocalState, useLocalStore } from "./internal/local-state.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import { controlHeight, useTheme } from "./internal/theme.js";
import {
  makeMessageScrollerStore,
  type MessageScrollerState,
} from "./message-scroller/store.js";

/** The rules every part reads; throws outside a {@link MessageScroller}. */
interface MessageScrollerContextValue {
  readonly state: MessageScrollerState;
  readonly threshold: number;
  readonly peek: number;
  /** The first layout has happened; a row mounting now is an arrival. */
  readonly ready: { current: boolean };
  readonly observe: (distanceFromEnd: number) => void;
  readonly arrived: () => void;
  readonly jump: () => void;
  /** The viewport's scroll command, installed by the mounted viewport. */
  readonly scrollToEnd: { current: () => void };
  /** Place an anchored row near the top, or scroll it into view. */
  readonly alignTo: { current: (instance: PublicInstance) => void };
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
   * theme's `spacing["2xl"]` (24px). A value the scroller cannot read (`NaN`) is
   * no observation: the pin state is kept.
   */
  readonly threshold?: number;
  /**
   * How much of the row above a `scrollAnchor` stays visible. Defaults to the
   * theme's `spacing["3xl"]` (32px).
   */
  readonly previousItemPeek?: number;
  /** The controlled pinned state. `undefined` means uncontrolled. */
  readonly pinned?: boolean;
  readonly defaultPinned?: boolean;
  readonly onPinnedChange?: (pinned: boolean) => void;
  /** A reply is still arriving; the content publishes `aria-busy`. */
  readonly streaming?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The scroller root: the store, the threshold and the two viewport commands. */
export const MessageScroller = ({
  label,
  threshold: thresholdProp,
  previousItemPeek,
  pinned: pinnedProp,
  defaultPinned = true,
  onPinnedChange,
  streaming = false,
  children,
  className,
  style,
  ...rest
}: MessageScrollerProps) => {
  const theme = useTheme();
  const store = useLocalStore(makeMessageScrollerStore(defaultPinned));
  const state = useLocalState(store.local);
  const threshold = thresholdProp ?? theme.spacing["2xl"];
  const peek = previousItemPeek ?? theme.spacing["3xl"];
  const ready = useRef(false);
  const scrollToEnd = useRef<() => void>(() => undefined);
  const alignTo = useRef<(instance: PublicInstance) => void>(() => undefined);
  assertParts(messageScrollerRoot, children);

  useEffect(() => {
    send(store.stream(streaming));
  }, [store, streaming]);

  // A controlled pin is authoritative; the store mirrors it for rendering.
  useEffect(() => {
    if (pinnedProp === undefined) return;
    send(store.setPinned(pinnedProp));
  }, [pinnedProp, store]);

  const observe = useMemo(
    () => (distanceFromEnd: number) => {
      const before = store.local.read().pinned;
      send(store.observe({ distanceFromEnd, threshold }));
      const after = store.local.read().pinned;
      if (after !== before) onPinnedChange?.(after);
    },
    [onPinnedChange, store, threshold],
  );

  const arrived = useMemo(
    () => () => {
      send(store.arrived);
    },
    [store],
  );

  const jump = useMemo(
    () => () => {
      send(store.jump);
      scrollToEnd.current();
      onPinnedChange?.(true);
    },
    [onPinnedChange, store],
  );

  const context = useMemo<MessageScrollerContextValue>(
    () => ({
      state,
      threshold,
      peek,
      ready,
      observe,
      arrived,
      jump,
      scrollToEnd,
      alignTo,
    }),
    [state, threshold, peek, observe, arrived, jump],
  );

  return (
    <MessageScrollerContext.Provider value={context}>
      <div
        {...rest}
        role="group"
        aria-label={label}
        aria-busy={state.streaming}
        style={mergeStyles(
          recipeStyle(cn(MESSAGE_SCROLLER_ROOT, className), theme),
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
  readonly ref?: Ref<PublicInstance>;
}

/**
 * The scroll container. It grows inside the root; give the root a bounded
 * height (directly or through a flex parent), because a scroller with no height
 * has nothing to scroll.
 */
export const MessageScrollerViewport = ({
  children,
  className,
  style,
  ref,
  onScroll,
  onLayout,
  ...rest
}: MessageScrollerViewportProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const scroller = useMessageScroller();
  const viewportRef = useRef<PublicInstance | null>(null);
  const tailRef = useRef<PublicInstance | null>(null);
  const mergedRef = useMergedRef(viewportRef, ref);
  // A scroll the scroller asked for is not the reader leaving the end. Its
  // events arrive while the viewport is still travelling, so a position short of
  // the tail for a moment is not an observation; an offset that moved back
  // toward the start is the reader, and is.
  const programmatic = useRef(false);
  const lastOffset = useRef(0);
  assertParts(messageScrollerViewport, children);

  const scrollToEnd = (): void => {
    const tail = tailRef.current;
    if (tail === null) return;
    programmatic.current = true;
    const viewport = viewportRef.current;
    if (renderer?.scrollIntoView !== undefined) {
      renderer.scrollIntoView(tail.id);
    } else if (viewport !== null && renderer?.scrollTo !== undefined) {
      renderer.scrollTo(viewport.id, 0, -Number.MAX_SAFE_INTEGER);
    }
    // The target is the baseline the next offset is read against, so a wheel
    // back toward the start is recognised even if no scroll event arrived.
    const offset =
      viewport === null
        ? undefined
        : renderer?.getScrollOffset?.(viewport.id)?.[1];
    if (offset !== undefined) lastOffset.current = offset;
  };

  useLayoutEffect(() => {
    scroller.scrollToEnd.current = scrollToEnd;
  });

  // After the first commit every later row is an arrival. A passive effect runs
  // after the initial rows' own effects, so the first transcript is not counted.
  useEffect(() => {
    if (scroller.ready.current) return;
    scroller.ready.current = true;
    if (scroller.state.pinned) scrollToEnd();
  }, []);

  // A row appended or a streamed reply grown: while pinned, the tail stays in
  // view. Unpinned, the position is never touched.
  useLayoutEffect(() => {
    if (scroller.state.pinned) scrollToEnd();
  });

  const align = (instance: PublicInstance): void => {
    const viewport = viewportRef.current;
    if (viewport === null || renderer === null) return;
    if (
      renderer.getElementBounds !== undefined &&
      renderer.getScrollOffset !== undefined &&
      renderer.scrollTo !== undefined
    ) {
      const box = renderer.getElementBounds(viewport.id);
      const target = renderer.getElementBounds(instance.id);
      if (box !== null && target !== null) {
        const offset = renderer.getScrollOffset(viewport.id)?.[1] ?? 0;
        // The sentinel/row is in window coordinates; move it to `peek` below
        // the viewport's top, never above the start.
        const next = Math.min(0, offset - (target.y - box.y) + scroller.peek);
        renderer.scrollTo(viewport.id, 0, next);
        return;
      }
    }
    renderer.scrollIntoView?.(instance.id);
  };

  useLayoutEffect(() => {
    scroller.alignTo.current = align;
  });

  const handleScroll = (event: EventPayload): void => {
    const viewport = viewportRef.current;
    const tail = tailRef.current;
    if (renderer !== null && viewport !== null && tail !== null) {
      const viewportBounds = renderer.getElementBounds?.(viewport.id);
      const tailBounds = renderer.getElementBounds?.(tail.id);
      if (
        viewportBounds !== undefined &&
        viewportBounds !== null &&
        tailBounds !== undefined &&
        tailBounds !== null
      ) {
        const distance =
          tailBounds.y - (viewportBounds.y + viewportBounds.height);
        const offset = renderer.getScrollOffset?.(viewport.id)?.[1] ?? 0;
        const movedUp = offset > lastOffset.current;
        lastOffset.current = offset;
        if (programmatic.current) {
          if (!movedUp && distance > scroller.threshold) return;
          programmatic.current = false;
        }
        scroller.observe(distance);
      }
    }
    onScroll?.(event);
  };

  const base: StyleDesc = {
    ...recipeStyle(cn(MESSAGE_SCROLLER_VIEWPORT, className), theme),
    overflowY: "scroll",
    // The viewport is the flexible middle: it may shrink, never grow the frame.
    // It keeps an explicit height a caller gives it; `flex-basis: 0` would
    // replace that height with zero on a scroller with no sized parent.
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  };

  return (
    <div
      {...rest}
      ref={mergedRef}
      onScroll={handleScroll}
      onLayout={(event) => {
        // The first paint makes later item mounts arrivals and later layout
        // reports scroll-safe; the initial transcript is not an arrival.
        if (!scroller.ready.current) {
          scroller.ready.current = true;
          if (scroller.state.pinned) scrollToEnd();
        }
        onLayout?.(event);
      }}
      style={mergeStyles(base, style)}
    >
      {children}
      <div
        ref={tailRef}
        onLayout={() => {
          // A streamed reply that grows through its own state changes nothing
          // React renders, but the sentinel moves. While pinned, follow it.
          if (scroller.state.pinned && scroller.ready.current) scrollToEnd();
        }}
        style={{ height: 1, flexShrink: 0 }}
      />
    </div>
  );
};

/** {@link MessageScrollerContent} props. */
export interface MessageScrollerContentProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The rows column. It publishes the streaming state beside the transcript. */
export const MessageScrollerContent = ({
  children,
  className,
  style,
  ...rest
}: MessageScrollerContentProps) => {
  const theme = useTheme();
  const scroller = useMessageScroller();
  assertParts(messageScrollerContent, children);
  return (
    <div
      {...rest}
      aria-busy={scroller.state.streaming}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn(MESSAGE_SCROLLER_CONTENT, className), theme),
          {
            gap: theme.spacing.lg,
          },
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link MessageScrollerItem} props. */
export interface MessageScrollerItemProps extends Omit<Props, "children"> {
  /**
   * Place this row near the top when it mounts after the first paint, while the
   * reader follows the end. A turn's user message is the usual anchor.
   */
  readonly scrollAnchor?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly ref?: Ref<PublicInstance>;
}

/** One row. It paints no surface; the message or marker inside does. */
export const MessageScrollerItem = ({
  scrollAnchor = false,
  children,
  className,
  style,
  ref,
  onLayout,
  ...rest
}: MessageScrollerItemProps) => {
  const theme = useTheme();
  const scroller = useMessageScroller();
  const itemRef = useRef<PublicInstance | null>(null);
  const mergedRef = useMergedRef(itemRef, ref);
  const first = useRef(true);

  // `arrived` is stable for the store's life: depending on the whole context
  // would re-run this on every state write and count the same row forever.
  useEffect(() => {
    if (scroller.ready.current) scroller.arrived();
  }, [scroller.arrived, scroller.ready]);

  return (
    <div
      {...rest}
      ref={mergedRef}
      onLayout={(event) => {
        if (first.current) {
          first.current = false;
          if (scrollAnchor && scroller.ready.current && scroller.state.pinned) {
            const instance = itemRef.current;
            if (instance !== null) scroller.alignTo.current(instance);
          }
        }
        onLayout?.(event);
      }}
      style={mergeStyles(
        recipeStyle(cn(MESSAGE_SCROLLER_ITEM, className), theme),
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
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
}

/**
 * The way back to the newest row.
 *
 * It always owns a reserved rail, because a control that takes height only
 * while unpinned moves the composer. Hidden, it is untabbable, takes no pointer
 * input and leaves the accessibility tree; the fade and 4px travel are motion
 * on `opacity` and `top` — the runtime has no transform.
 */
export const MessageScrollerJumpToLatest = ({
  label = "Jump to latest",
  className,
  style,
  onClick,
  ...rest
}: MessageScrollerJumpToLatestProps) => {
  const theme = useTheme();
  const scroller = useMessageScroller();
  const active = !scroller.state.pinned;
  const text =
    scroller.state.unread === 0
      ? label
      : `${scroller.state.unread} new ${scroller.state.unread === 1 ? "message" : "messages"}`;
  const railHeight = controlHeight(theme, "sm") + theme.spacing.sm;

  return (
    <div
      style={mergeStyles(recipeStyle(MESSAGE_SCROLLER_RAIL, theme), {
        height: railHeight,
        flexShrink: 0,
      })}
    >
      {/*
        The control is mounted only while it can act: a hidden control still
        publishes a button node in 0.11.0, and the tests that read the transcript
        name the controls that are really there. The rail keeps its height, so
        mounting it at the live edge never moves anything.
      */}
      {active ? (
        <div
          motion={{
            initial: { opacity: 0, top: 4 },
            animate: { opacity: 1, top: 0 },
            transition: { duration: 0.2, ease: "easeOut" },
          }}
        >
          <Button
            {...rest}
            variant="secondary"
            size="sm"
            onClick={(event) => {
              scroller.jump();
              onClick?.(event);
            }}
            style={mergeStyles(recipeStyle(cn(className ?? ""), theme), style)}
          >
            {text}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const messageScrollerFamily: ReadonlyArray<PartComponent> = [
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
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
  accepts: [MessageScrollerContent, MessageScrollerItem],
  hint: "Put MessageScrollerContent (or items directly) inside it.",
};

const messageScrollerContent: PartsContract = {
  parent: "MessageScrollerContent",
  family: messageScrollerFamily,
  accepts: [MessageScrollerItem],
  hint: "Put MessageScrollerItem directly inside it.",
};

/** Inventory record, mirrored into `COMPONENTS.md`. */
export const messageScrollerMeta = {
  name: "Message scroller",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the viewport renders every row: <virtual-list> takes itemCount rather than compound children, so long histories are not virtualized",
    "the jump control travels inside a reserved rail, not over the viewport's corner: position: absolute resolves against the mount parent in 0.11.0",
    "a row that grows without the scroller re-rendering is followed through the tail sentinel's onLayout while pinned; there is no resize observer for an unpinned row, which is intentional",
    "no aria-live role in 0.11.0, so new rows are not announced; the jump control's count is painted",
    "a threshold or arrival count it cannot read (NaN) is ignored, so the pin state is kept and the affordance never paints NaN",
  ],
  docs: "docs/message-scroller.mdx",
  example: "examples/message-scroller.example.tsx",
  testFile: "src/behaviour/message-scroller.test.tsx",
} as const;

export type { MessageScrollerState };
