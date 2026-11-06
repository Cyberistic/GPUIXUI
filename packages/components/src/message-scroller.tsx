/** @jsxImportSource @gpuix/react */
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
  MESSAGE_SCROLLER_JUMP,
  MESSAGE_SCROLLER_ROOT,
  MESSAGE_SCROLLER_VIEWPORT,
} from "@gpuixui/tw";
import {
  Children,
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
import { useTheme } from "./internal/theme.js";
import {
  makeMessageScrollerStore,
  type MessageScrollerState,
} from "./message-scroller/store.js";

interface MessageScrollerContextValue {
  readonly threshold: number;
  readonly peek: number;

  readonly ready: { current: boolean };

  readonly pinned: { current: boolean };
  readonly observe: (distanceFromEnd: number) => void;
  readonly arrived: () => void;
  readonly jump: () => void;

  readonly scrollToEnd: { current: () => void };

  readonly alignTo: { current: (instance: PublicInstance) => void };
}

const MessageScrollerContext = createContext<
  MessageScrollerContextValue | undefined
>(undefined);

const MessageScrollerStateContext = createContext<
  MessageScrollerState | undefined
>(undefined);

const useMessageScroller = (): MessageScrollerContextValue => {
  const value = useContext(MessageScrollerContext);
  if (value === undefined) {
    throw new Error(
      "MessageScroller parts must be used inside MessageScroller",
    );
  }
  return value;
};

const useMessageScrollerState = (): MessageScrollerState => {
  const value = useContext(MessageScrollerStateContext);
  if (value === undefined) {
    throw new Error(
      "MessageScroller parts must be used inside MessageScroller",
    );
  }
  return value;
};

const useFollowAppendedRows = (children: PartChildren): void => {
  const scroller = useMessageScroller();
  const rows = Children.count(children);
  useLayoutEffect(() => {
    if (scroller.pinned.current && scroller.ready.current) {
      scroller.scrollToEnd.current();
    }
  }, [rows, scroller]);
};

export interface MessageScrollerProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly threshold?: number;

  readonly previousItemPeek?: number;

  readonly pinned?: boolean;
  readonly defaultPinned?: boolean;
  readonly onPinnedChange?: (pinned: boolean) => void;

  readonly streaming?: boolean;

  readonly className?: string;
  readonly children?: PartChildren;
}

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
  const pinned = useRef(state.pinned);
  pinned.current = state.pinned;
  const scrollToEnd = useRef<() => void>(() => undefined);
  const alignTo = useRef<(instance: PublicInstance) => void>(() => undefined);
  assertParts(messageScrollerRoot, children);

  useEffect(() => {
    send(store.stream(streaming));
  }, [store, streaming]);

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
      threshold,
      peek,
      ready,
      pinned,
      observe,
      arrived,
      jump,
      scrollToEnd,
      alignTo,
    }),
    [threshold, peek, observe, arrived, jump],
  );

  return (
    <MessageScrollerContext.Provider value={context}>
      <MessageScrollerStateContext.Provider value={state}>
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
      </MessageScrollerStateContext.Provider>
    </MessageScrollerContext.Provider>
  );
};

export interface MessageScrollerViewportProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
  readonly ref?: Ref<PublicInstance>;
}

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

    const offset =
      viewport === null
        ? undefined
        : renderer?.getScrollOffset?.(viewport.id)?.[1];
    if (offset !== undefined) lastOffset.current = offset;
  };

  useLayoutEffect(() => {
    scroller.scrollToEnd.current = scrollToEnd;
  });

  useEffect(() => {
    if (scroller.ready.current) return;
    scroller.ready.current = true;
    if (scroller.pinned.current) scrollToEnd();
  }, []);

  useFollowAppendedRows(children);

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
        if (!scroller.ready.current) {
          scroller.ready.current = true;
          if (scroller.pinned.current) scrollToEnd();
        }
        onLayout?.(event);
      }}
      style={mergeStyles(base, style)}
    >
      {children}
      <div
        ref={tailRef}
        onLayout={() => {
          if (scroller.pinned.current && scroller.ready.current) scrollToEnd();
        }}
        style={{ height: 1, flexShrink: 0 }}
      />
    </div>
  );
};

export interface MessageScrollerContentProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

export const MessageScrollerContent = ({
  children,
  className,
  style,
  ...rest
}: MessageScrollerContentProps) => {
  const theme = useTheme();
  const state = useMessageScrollerState();
  useFollowAppendedRows(children);
  assertParts(messageScrollerContent, children);
  return (
    <div
      {...rest}
      aria-busy={state.streaming}
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

export interface MessageScrollerItemProps extends Omit<Props, "children"> {
  readonly scrollAnchor?: boolean;

  readonly className?: string;
  readonly children?: ReactNode;
  readonly ref?: Ref<PublicInstance>;
}

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

  useEffect(() => {
    if (scroller.ready.current) scroller.arrived();
  }, [scroller.arrived, scroller.ready]);

  return (
    <div
      {...rest}
      ref={mergedRef}
      onLayout={(event) => {
        if (
          !first.current &&
          scroller.pinned.current &&
          scroller.ready.current
        ) {
          scroller.scrollToEnd.current();
        }
        if (first.current) {
          first.current = false;
          if (
            scrollAnchor &&
            scroller.ready.current &&
            scroller.pinned.current
          ) {
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

export interface MessageScrollerJumpToLatestProps extends Omit<
  Props,
  "children"
> {
  readonly label?: string;

  readonly className?: string;
}

export const MessageScrollerJumpToLatest = ({
  label = "Jump to latest",
  className,
  style,
  onClick,
  ...rest
}: MessageScrollerJumpToLatestProps) => {
  const theme = useTheme();
  const scroller = useMessageScroller();
  const state = useMessageScrollerState();
  const active = !state.pinned;
  const text =
    state.unread === 0
      ? label
      : `${state.unread} new ${state.unread === 1 ? "message" : "messages"}`;

  if (!active) return null;

  return (
    <div
      style={mergeStyles(recipeStyle(MESSAGE_SCROLLER_JUMP, theme), {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: theme.spacing.lg,
      })}
    >
      <div
        motion={{
          initial: { opacity: 0, top: 4 },
          animate: { opacity: 1, top: 0 },
          transition: { duration: 0.2, ease: "easeOut" },
        }}
        style={{ pointerEvents: "auto" }}
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

export const messageScrollerMeta = {
  name: "Message scroller",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the viewport renders every row: <virtual-list> takes itemCount rather than compound children, so long histories are not virtualized",
    "a row that grows in place is followed through its own onLayout size report while pinned; there is no resize observer for a row outside the item wrapper, which is intentional",
    "no aria-live role in 0.11.0, so new rows are not announced; the jump control's count is painted",
    "a threshold or arrival count it cannot read (NaN) is ignored, so the pin state is kept and the affordance never paints NaN",
  ],
  docs: "docs/message-scroller.mdx",
  example: "examples/message-scroller.example.tsx",
  testFile: "src/behaviour/message-scroller.test.tsx",
} as const;

export type { MessageScrollerState };
