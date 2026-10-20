/**
 * NotificationCentre: an inbox behind a bell-shaped trigger.
 *
 * The shape follows the measured contract in the playground's plan 381: a
 * trigger whose badge is **derived** from the caller's read flags, a non-modal
 * panel anchored to it, grouped rows in the caller's newest-first order, and
 * one roving highlight driven by the arrow keys. Read state belongs to the
 * caller — `onRead`, `onMarkAllRead` and `onClear` are requests, never a hidden
 * store — so closing and reopening the panel cannot lose a read flag.
 *
 * Dismissal is the package's shared stack: Escape closes the topmost overlay and
 * returns focus to the trigger; an outside press closes without taking focus
 * back, because the press already moved it. The panel is **not** modal, so Tab
 * leaves it (no trap). A header action owns its own keys: the panel moves the
 * reading cursor only while the surface or a row holds focus, because a key that
 * bubbles from a control belongs to that control.
 *
 * v1 renders every row. The published `<virtual-list>` host takes `itemCount`
 * and the app must window its own children (`@gpuix/react@0.10.0` ships no
 * wrapper), and this host reports no list bounds in the harness; a bounded
 * inbox is better served by a real row per notification. The limitation is
 * recorded in docs and `COMPONENTS.md`; a later plan can add windowing without
 * changing this API.
 */

import type {
  EventPayload,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  floatingRootStyle,
  FloatingLayer,
  mergeStyles,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Badge } from "./badge.js";
import { EmptyState } from "./empty-state.js";
import { headingLevel, type HeadingLevel } from "./internal/heading.js";
import { Button, type ButtonProps } from "./internal/button.js";
import { useCloseFocus } from "./internal/close-focus.js";
import { useControllableState } from "./internal/controllable.js";
import { dismissTopLayer, pushDismissLayer } from "./internal/dismiss-layer.js";
import {
  OverlayHostProvider,
  useOverlayHost,
} from "./internal/overlay-host.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  isDismiss,
  isDown,
  isEnter,
  isSpaceRelease,
  isUp,
} from "./internal/key.js";
import { pressedOn } from "./internal/pointer.js";
import { useMergedRef } from "./internal/ref.js";
import {
  elevationShadow,
  focusRing,
  textStyle,
  useTheme,
  type Theme,
} from "./internal/theme.js";
import { usePlacement } from "./internal/use-placement.js";
import {
  flattenRows,
  unreadCount,
  type NotificationItem,
  type NotificationRow,
} from "./notification-centre/model.js";

/** The copy a centre can relabel, so a consumer can localize it. */
export interface NotificationCentreLabels {
  /** The trigger's label and the panel's default name. Default `"Notifications"`. */
  readonly label?: string;
  /** The empty panel's title. Default `"You're all caught up"`. */
  readonly empty?: string;
}

/** The rules a notification-centre part follows; throws outside the root. */
type NotificationCloseFocus = "trigger" | "none";

interface NotificationCentreContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** Request a close; focus moves only when the close is accepted. */
  readonly requestClose: (focus: NotificationCloseFocus) => void;
  readonly notifications: ReadonlyArray<NotificationItem>;
  readonly rows: ReadonlyArray<NotificationRow>;
  readonly unread: number;
  readonly label: string;
  /** The empty panel's title, resolved on the root. */
  readonly empty: string;
  readonly trigger: RefObject<PublicInstance | null>;
  /** Native row handles by notification id, for keyboard focus. */
  readonly rowRefs: RefObject<Map<string, PublicInstance>>;
  /** Bring one row into the list's visible box; a no-op when it already is. */
  readonly revealRow: RefObject<(id: string) => void>;
  readonly active: Option.Option<string>;
  readonly setActive: (id: string) => void;
  readonly moveActive: (delta: 1 | -1) => void;
  readonly read: (id: string) => void;
  readonly readActive: () => void;
  readonly markAllRead?: () => void;
  readonly clear?: () => void;
}

const NotificationCentreContext = createContext<
  NotificationCentreContextValue | undefined
>(undefined);

/** The centre a part belongs to. Throws when there is none. */
const useNotificationCentre = (): NotificationCentreContextValue => {
  const value = useContext(NotificationCentreContext);
  if (value === undefined) {
    throw new Error(
      "NotificationCentre parts must be used inside NotificationCentre",
    );
  }
  return value;
};

/** {@link NotificationCentre} props. */
export interface NotificationCentreProps extends NotificationCentreLabels {
  /** The caller's notifications, newest first. The component never re-sorts. */
  readonly notifications: ReadonlyArray<NotificationItem>;
  /** A row was read, by press or by `Enter`. Idempotent in the caller. */
  readonly onRead?: (id: string) => void;
  /** Mark every notification read; omit to hide the control. */
  readonly onMarkAllRead?: () => void;
  /** Clear the inbox; omit to hide the control. */
  readonly onClear?: () => void;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: PartChildren;
}

/** The inbox root: open state, derived rows and the read requests. */
export const NotificationCentre = ({
  notifications,
  onRead,
  onMarkAllRead,
  onClear,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label = "Notifications",
  empty = "You're all caught up",
  children,
}: NotificationCentreProps) => {
  const depth = useOverlayHost().depth + 1;
  const renderer = useGpuix().renderer;
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const trigger = useRef<PublicInstance | null>(null);
  const rowRefs = useRef(new Map<string, PublicInstance>());
  const revealRow = useRef<(id: string) => void>(() => undefined);
  const [activeId, setActiveId] = useState<Option.Option<string>>(
    Option.none(),
  );
  /** The row the reading cursor last focused, remembered while it exists. */
  const heldRow = useRef<Option.Option<string>>(Option.none());
  // A close the caller refuses must leave the panel and the user's focus alone.
  const requestClose = useCloseFocus<NotificationCloseFocus>(
    open,
    () => setOpen(false),
    (focus) => {
      if (focus === "none") return;
      const target = trigger.current;
      if (target !== null) renderer?.focusElement?.(target.id);
    },
  );

  const rows = useMemo(() => flattenRows(notifications), [notifications]);
  const unread = useMemo(() => unreadCount(notifications), [notifications]);

  // A selection that names a vanished row falls back to the first row, so a
  // filtered inbox never keeps a highlight nobody can see. Opening highlights
  // the first row without writing state.
  const active = useMemo(
    () =>
      pipe(
        Option.filter(activeId, (id) =>
          Arr.some(notifications, (item) => item.id === id),
        ),
        Option.orElse(() =>
          Option.map(Arr.head(notifications), (item) => item.id),
        ),
      ),
    [activeId, notifications],
  );

  useLayoutEffect(() => {
    if (!open) {
      setActiveId(Option.none());
      heldRow.current = Option.none();
    }
  }, [open]);

  // A vanished selection is forgotten on the next data update, so a refill can
  // never resume a row the reader has already lost (the plan-510 rule).
  useEffect(() => {
    setActiveId((current) => {
      const live = Option.filter(current, (id) =>
        Arr.some(notifications, (item) => item.id === id),
      );
      return Option.isSome(current) && Option.isNone(live)
        ? Option.none()
        : current;
    });
  }, [notifications]);

  /**
   * A row the reading cursor was on can disappear under the user (a read, a
   * clear, a live feed dropping an old item). Its host is gone, so it cannot be
   * read afterwards: the holder was remembered while it existed. Hand a lost
   * focus to the live row the accent already names, and reveal it, but never
   * steal focus from another control (plans 510/708/712).
   */
  useLayoutEffect(() => {
    const held = heldRow.current;
    if (Option.isNone(held)) return;
    if (Arr.some(notifications, (item) => item.id === held.value)) return;
    heldRow.current = Option.none();
    const focused = renderer?.getFocusedElementId?.() ?? null;
    if (focused !== null) return;
    Option.match(active, {
      onNone: () => undefined,
      onSome: (id) => {
        const row = rowRefs.current.get(id);
        if (row === undefined) return;
        renderer?.focusElement?.(row.id);
        revealRow.current(id);
      },
    });
  });

  const setActive = useCallback((id: string) => {
    heldRow.current = Option.some(id);
    setActiveId(Option.some(id));
  }, []);

  const read = useCallback(
    (id: string) => {
      onRead?.(id);
    },
    [onRead],
  );

  const readActive = useCallback(() => {
    Option.match(active, {
      onNone: () => undefined,
      onSome: read,
    });
  }, [active, read]);

  const moveActive = useCallback(
    (delta: 1 | -1) => {
      const current = Option.flatMap(active, (id) =>
        Arr.findFirstIndex(notifications, (item) => item.id === id),
      );
      const start = Option.getOrElse(current, () => (delta === 1 ? -1 : 0));
      const next = Math.min(
        Math.max(0, Arr.length(notifications) - 1),
        Math.max(0, start + delta),
      );
      Option.match(Arr.get(notifications, next), {
        onNone: () => undefined,
        onSome: (item) => {
          setActive(item.id);
          Option.match(Option.fromNullishOr(rowRefs.current.get(item.id)), {
            onNone: () => undefined,
            onSome: (element) => {
              renderer?.focusElement?.(element.id);
              revealRow.current(item.id);
            },
          });
        },
      });
    },
    [active, notifications, renderer, revealRow, setActive],
  );

  const context = useMemo<NotificationCentreContextValue>(
    () => ({
      open,
      setOpen,
      requestClose,
      notifications,
      rows,
      unread,
      label,
      empty,
      trigger,
      rowRefs,
      revealRow,
      active,
      setActive,
      moveActive,
      read,
      readActive,
      markAllRead: onMarkAllRead,
      clear: onClear,
    }),
    [
      active,
      empty,
      label,
      moveActive,
      notifications,
      onClear,
      onMarkAllRead,
      open,
      read,
      readActive,
      revealRow,
      requestClose,
      rows,
      setActive,
      setOpen,
      trigger,
      unread,
    ],
  );

  assertParts(notificationCentreRoot, children);

  return (
    <NotificationCentreContext.Provider value={context}>
      <OverlayHostProvider depth={depth} contentId={undefined}>
        <div style={floatingRootStyle()}>{children}</div>
      </OverlayHostProvider>
    </NotificationCentreContext.Provider>
  );
};

/** {@link NotificationCentreTrigger} props. */
export interface NotificationCentreTriggerProps extends ButtonProps {
  /** Replaces the visible label; the unread badge still follows the data. */
  readonly children?: ReactNode;
  /** Hide the derived badge and keep only the accessible count. Default `true`. */
  readonly showBadge?: boolean;
}

/** The bell-shaped button: a visible label, the unread badge and the label. */
export const NotificationCentreTrigger = ({
  children,
  showBadge = true,
  variant = "secondary",
  onClick,
  ref,
  ...rest
}: NotificationCentreTriggerProps) => {
  const { open, setOpen, requestClose, unread, label, trigger } =
    useNotificationCentre();
  const setTrigger = useMergedRef<PublicInstance | null>(trigger, ref);
  const count = unread > 99 ? "99+" : String(unread);

  return (
    <Button
      {...rest}
      ref={setTrigger}
      variant={variant}
      aria-expanded={open}
      aria-label={`${label}, ${unread} unread`}
      onClick={(event) => {
        onClick?.(event);
        if (open) requestClose("none");
        else setOpen(true);
      }}
    >
      {children ?? <text>{label}</text>}
      {showBadge && unread > 0 ? (
        <Badge
          size="sm"
          variant="primary"
          testId={
            rest.testId === undefined ? undefined : `${rest.testId}-badge`
          }
        >
          {count}
        </Badge>
      ) : null}
    </Button>
  );
};

/** {@link NotificationCentreContent} props: the non-modal anchored panel. */
export interface NotificationCentreContentProps extends FloatingContentProps {
  /** The panel's accessible name. Defaults to the root's `label`. */
  readonly label?: string;
  /** Default `"bottom"`. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"end"`. */
  readonly align?: "start" | "center" | "end";
  /** Default `8`. */
  readonly sideOffset?: number;
  /** Default `8`. */
  readonly collisionPadding?: number;
  readonly children?: PartChildren;
}

const panelStyle = (theme: Theme): StyleDesc => ({
  ...textStyle(theme, "body"),
  display: "flex",
  flexDirection: "column",
  width: 320,
  maxHeight: 380,
  overflow: "hidden",
  padding: 0,
  backgroundColor: theme.colors.popover,
  color: theme.colors.popoverForeground,
  borderRadius: theme.radius.lg,
  borderWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  boxShadow: elevationShadow(theme, "md"),
  pointerEvents: "auto",
});

/** The anchored inbox, rendered while open. */
export const NotificationCentreContent = ({
  label,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  alignOffset = 0,
  collisionPadding = 8,
  autoFocus = true,
  children,
  onKeyDown,
  onKeyUp,
  onMouseDownOutside,
  style,
  ref,
  ...rest
}: NotificationCentreContentProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const {
    open,
    requestClose,
    label: rootLabel,
    trigger,
    rowRefs,
    moveActive,
    readActive,
  } = useNotificationCentre();
  const depth = useOverlayHost().depth;
  const surface = useRef<PublicInstance | null>(null);
  const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
  const placement = usePlacement({
    open,
    side,
    align,
    margin: collisionPadding,
    trigger,
    surface,
  });

  useLayoutEffect(() => {
    if (!open) return;
    return pushDismissLayer((event) => {
      // A press on the panel's own trigger is its gesture: claim it and let the
      // click close (the press and the click arrive in separate tasks — plan
      // 583). An Escape still closes and returns focus.
      if (
        event.eventType !== "keyDown" &&
        pressedOn(renderer, trigger.current, event)
      ) {
        return;
      }
      requestClose(event.eventType === "keyDown" ? "trigger" : "none");
    }, depth);
  }, [depth, open, renderer, trigger]);

  /**
   * Whether the panel itself or one of its rows holds focus. A key that bubbles
   * from a header action belongs to that control; `EventPayload.elementId` names
   * the handler's element, not the focused one, so the renderer is asked.
   */
  const ownsRowKeys = (): boolean => {
    const focused = renderer?.getFocusedElementId?.();
    if (focused === undefined || focused === null) return false;
    return (
      focused === surface.current?.id ||
      Arr.some(
        Arr.fromIterable(rowRefs.current.values()),
        (row) => row.id === focused,
      )
    );
  };

  const handleKeyDown = (event: EventPayload): void => {
    if (isDismiss(event)) {
      dismissTopLayer(event);
      return;
    }
    if (!ownsRowKeys()) return;
    if (isDown(event)) {
      moveActive(1);
      return;
    }
    if (isUp(event)) {
      moveActive(-1);
      return;
    }
    if (isEnter(event)) readActive();
  };

  // A row draws as a button, so Space activates on release — the shared
  // button contract (plans 332/334). A key that belongs to a header action
  // never reaches the rows.
  const handleKeyUp = (event: EventPayload): void => {
    if (!ownsRowKeys()) return;
    if (isSpaceRelease(event)) readActive();
  };

  if (!open) return null;

  return (
    <FloatingLayer
      {...rest}
      side={placement.side}
      align={placement.align}
      sideOffset={sideOffset}
      alignOffset={placement.alignOffset + alignOffset}
      collisionPadding={collisionPadding}
      role="region"
      aria-label={label ?? rootLabel}
      tabIndex={0}
      autoFocus={autoFocus}
      ref={setSurface}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        dismissTopLayer(event);
      }}
      onKeyDown={(event: EventPayload) => {
        onKeyDown?.(event);
        handleKeyDown(event);
      }}
      onKeyUp={(event: EventPayload) => {
        onKeyUp?.(event);
        handleKeyUp(event);
      }}
      style={mergeStyles(panelStyle(theme), style)}
    >
      {children}
    </FloatingLayer>
  );
};

/** {@link NotificationCentreHeader} props. */
export interface NotificationCentreHeaderProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

/** The title and the panel actions, above the list. */
export const NotificationCentreHeader = ({
  children,
  style,
  ...rest
}: NotificationCentreHeaderProps) => {
  const theme = useTheme();
  assertParts(notificationCentreHeader, children);

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderBottomWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link NotificationCentreTitle} props. */
export interface NotificationCentreTitleProps extends Props {
  /** The heading level in the document outline. Default `3`. */
  readonly level?: HeadingLevel;
}

/** The panel's heading; its level belongs to the surrounding outline. */
export const NotificationCentreTitle = ({
  level,
  children,
  style,
  ...rest
}: NotificationCentreTitleProps) => {
  const theme = useTheme();
  const { label } = useNotificationCentre();

  return (
    <text
      role="heading"
      {...rest}
      aria-level={headingLevel(level, rest["aria-level"], 3)}
      style={mergeStyles(
        {
          ...textStyle(theme, "label"),
          color: theme.colors.foreground,
          flexGrow: 1,
        },
        style,
      )}
    >
      {children ?? label}
    </text>
  );
};

/** The shared look of the two header actions. */
const actionStyle = (theme: Theme): StyleDesc => ({
  ...textStyle(theme, "label"),
  color: theme.colors.mutedForeground,
});

/** {@link NotificationCentreMarkAll} props. */
export type NotificationCentreMarkAllProps = Omit<
  ButtonProps,
  "variant" | "size"
>;

/** Mark every notification read. Renders only when the root has a handler. */
export const NotificationCentreMarkAll = ({
  children,
  onClick,
  ...rest
}: NotificationCentreMarkAllProps) => {
  const theme = useTheme();
  const { markAllRead } = useNotificationCentre();
  if (markAllRead === undefined) return null;

  return (
    <Button
      {...rest}
      variant="ghost"
      size="sm"
      style={mergeStyles(actionStyle(theme), rest.style)}
      onClick={(event) => {
        onClick?.(event);
        markAllRead();
      }}
    >
      {children ?? "Mark all read"}
    </Button>
  );
};

/** {@link NotificationCentreClear} props. */
export type NotificationCentreClearProps = Omit<
  ButtonProps,
  "variant" | "size"
>;

/** Clear the inbox. Renders only when the root has a handler. */
export const NotificationCentreClear = ({
  children,
  onClick,
  ...rest
}: NotificationCentreClearProps) => {
  const theme = useTheme();
  const { clear } = useNotificationCentre();
  if (clear === undefined) return null;

  return (
    <Button
      {...rest}
      variant="ghost"
      size="sm"
      style={mergeStyles(actionStyle(theme), rest.style)}
      onClick={(event) => {
        onClick?.(event);
        clear();
      }}
    >
      {children ?? "Clear"}
    </Button>
  );
};

/** {@link NotificationCentreList} props. */
export interface NotificationCentreListProps extends Omit<Props, "children"> {
  /** Shown when there are no notifications. Default `"You're all caught up"`. */
  readonly emptyTitle?: string;
  /** Shown under the empty title. */
  readonly emptyDescription?: string;
  /** Each group label's heading level. Default `4`, one below the title. */
  readonly groupLevel?: HeadingLevel;
}

/** The scrollable rows, grouped by the caller's contiguous `group` labels. */
export const NotificationCentreList = ({
  emptyTitle,
  emptyDescription,
  groupLevel,
  style,
  testId,
  ref,
  ...rest
}: NotificationCentreListProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const viewport = useRef<PublicInstance | null>(null);
  const frame = useRef<PublicInstance | null>(null);
  const sentinel = useRef<PublicInstance | null>(null);
  const setViewport = useMergedRef<PublicInstance | null>(viewport, ref);
  const {
    rows,
    notifications,
    active,
    empty,
    rowRefs,
    revealRow,
    setActive,
    read,
  } = useNotificationCentre();

  /**
   * Bring a row into the frame's visible box with one measured scroll. The frame
   * is unscrolled, so its box is window space; the sentinel gives the current
   * scroll position without `getScrollOffset`, which reports nothing at offset
   * zero on this binding (plan 644).
   */
  const reveal = useCallback(
    (id: string) => {
      const row = rowRefs.current.get(id);
      const frameId = frame.current?.id;
      const viewportId = viewport.current?.id;
      const sentinelId = sentinel.current?.id;
      if (
        row === undefined ||
        frameId === undefined ||
        viewportId === undefined ||
        sentinelId === undefined
      ) {
        return;
      }
      const box = (elementId: number) =>
        Option.fromNullishOr(renderer?.getElementBounds?.(elementId));
      pipe(
        Option.all({
          frame: box(frameId),
          row: box(row.id),
          sentinel: box(sentinelId),
        }),
        Option.match({
          onNone: () => undefined,
          onSome: ({ frame: visible, row: target, sentinel: top }) => {
            const scrollTop = visible.y - top.y;
            const margin = theme.spacing.sm;
            const above = target.y - (visible.y + margin);
            const below =
              target.y + target.height - (visible.y + visible.height - margin);
            const next =
              above < 0
                ? scrollTop + above
                : below > 0
                  ? scrollTop + below
                  : scrollTop;
            if (next === scrollTop) return;
            renderer?.scrollTo?.(viewportId, 0, -Math.max(0, next));
          },
        }),
      );
    },
    [renderer, rowRefs, theme.spacing.sm],
  );

  useLayoutEffect(() => {
    revealRow.current = reveal;
    return () => {
      revealRow.current = () => undefined;
    };
  }, [reveal, revealRow]);

  const anchor = useRef<
    | {
        readonly items: ReadonlyArray<NotificationItem>;
        readonly id: string;
        readonly top: number;
        readonly offset: number;
      }
    | undefined
  >(undefined);
  useLayoutEffect(() => {
    const viewportId = viewport.current?.id;
    if (viewportId === undefined) return;
    const bounds = (id: string): Option.Option<number> =>
      Option.flatMap(Option.fromNullishOr(rowRefs.current.get(id)), (element) =>
        Option.map(
          Option.fromNullishOr(renderer?.getElementBounds?.(element.id)),
          (box) => box.y,
        ),
      );
    const offset = Option.getOrElse(
      Option.fromNullishOr(renderer?.getScrollOffset?.(viewportId)?.[1]),
      () => 0,
    );
    const previous = anchor.current;

    const correction =
      previous !== undefined && notifications !== previous.items && offset < 0
        ? Option.flatMap(
            Option.all({
              top: bounds(previous.id),
              next: Option.fromNullishOr(notifications[0]),
            }),
            ({ top, next }) => {
              const fit = top - (previous.top + (offset - previous.offset));
              return fit > 0 ? Option.some({ fit, next, top }) : Option.none();
            },
          )
        : Option.none<{
            readonly fit: number;
            readonly next: NotificationItem;
            readonly top: number;
          }>();

    if (Option.isSome(correction)) {
      const { fit, next, top } = correction.value;
      renderer?.scrollTo?.(viewportId, 0, offset - fit);
      anchor.current = {
        items: notifications,
        id: next.id,
        top: Option.getOrElse(bounds(next.id), () => top) - fit,
        offset: offset - fit,
      };
      return;
    }

    const first = notifications[0];
    if (first === undefined) {
      anchor.current = undefined;
      return;
    }
    anchor.current = Option.match(bounds(first.id), {
      onNone: () => anchor.current,
      onSome: (top) => ({
        items: notifications,
        id: first.id,
        top,
        offset,
      }),
    });
  });

  if (notifications.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? empty}
        description={emptyDescription}
        testId={testId === undefined ? undefined : `${testId}-empty`}
        style={{ padding: theme.spacing["3xl"], flexGrow: 1 }}
      />
    );
  }

  return (
    <div
      ref={frame}
      testId={testId === undefined ? undefined : `${testId}-frame`}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          maxHeight: 280,
          overflow: "hidden",
        },
        style,
      )}
    >
      <div
        {...rest}
        ref={setViewport}
        testId={testId}
        style={{
          display: "flex",
          flexDirection: "column",
          overflowY: "scroll",
          minHeight: 0,
          flexGrow: 1,
          flexShrink: 1,
        }}
      >
        <div ref={sentinel} style={{ height: 0, flexShrink: 0 }} />
        {Arr.map(rows, (row) =>
          row.kind === "header" ? (
            <text
              key={row.key}
              role="heading"
              aria-level={groupLevel ?? 4}
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
                paddingLeft: theme.spacing.lg,
                paddingRight: theme.spacing.lg,
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing["2xs"],
              }}
            >
              {row.label}
            </text>
          ) : (
            <NotificationRowView
              key={row.key}
              item={row.item}
              active={Option.contains(active, row.item.id)}
              testId={
                testId === undefined ? undefined : `${testId}-${row.item.id}`
              }
              register={(instance) => {
                if (instance === null) rowRefs.current.delete(row.item.id);
                else rowRefs.current.set(row.item.id, instance);
              }}
              onActivate={() => {
                setActive(row.item.id);
                read(row.item.id);
              }}
            />
          ),
        )}
      </div>
    </div>
  );
};

/** One notification: the derived unread mark, title, metadata and body. */
interface NotificationRowViewProps {
  readonly item: NotificationItem;
  readonly active: boolean;
  readonly testId?: string;
  readonly register: (instance: PublicInstance | null) => void;
  readonly onActivate: () => void;
}

const NotificationRowView = ({
  item,
  active,
  testId,
  register,
  onActivate,
}: NotificationRowViewProps) => {
  const theme = useTheme();
  const unread = item.read !== true;

  return (
    <div
      ref={register}
      testId={testId}
      role="button"
      tabIndex={-1}
      aria-label={`${item.title}, ${unread ? "unread" : "read"}`}
      onClick={onActivate}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing["2xs"],
        padding: theme.spacing.lg,
        borderRadius: theme.radius.sm,
        cursor: "pointer",
        backgroundColor: active ? theme.colors.accent : undefined,
        hover: { backgroundColor: theme.colors.hover },
        active: { backgroundColor: theme.colors.active },
        ...(active ? focusRing(theme) : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        {unread ? (
          <div
            testId={testId === undefined ? undefined : `${testId}-unread`}
            style={{
              width: 6,
              height: 6,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.primary,
              flexShrink: 0,
            }}
          />
        ) : null}
        <text
          style={{
            ...textStyle(theme, "bodyStrong"),
            color: theme.colors.foreground,
            flexGrow: 1,
          }}
        >
          {item.title}
        </text>
        {item.timestamp === undefined ? null : (
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {item.timestamp}
          </text>
        )}
      </div>
      {item.description === undefined ? null : (
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.mutedForeground,
          }}
        >
          {item.description}
        </text>
      )}
    </div>
  );
};

/** Every part, so a misplaced sibling is named. */
const notificationCentreParts: ReadonlyArray<PartComponent> = [
  NotificationCentre,
  NotificationCentreTrigger,
  NotificationCentreContent,
  NotificationCentreHeader,
  NotificationCentreTitle,
  NotificationCentreMarkAll,
  NotificationCentreClear,
  NotificationCentreList,
];

const notificationCentreRoot: PartsContract = {
  parent: "NotificationCentre",
  family: notificationCentreParts,
  accepts: [NotificationCentreTrigger, NotificationCentreContent],
  hint: "Put NotificationCentreTrigger and NotificationCentreContent directly inside NotificationCentre.",
};

const notificationCentreHeader: PartsContract = {
  parent: "NotificationCentreHeader",
  family: notificationCentreParts,
  accepts: [
    NotificationCentreTitle,
    NotificationCentreMarkAll,
    NotificationCentreClear,
  ],
  hint: "Put the title and the two actions directly inside NotificationCentreHeader.",
};

/** Inventory record, mirrored into `COMPONENTS.md`. */
export const notificationCentreMeta = {
  name: "Notification centre",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "every row renders: the published `<virtual-list>` host takes `itemCount` and requires app-side windowing, so v1 uses a plain scroll viewport (a later plan can add windowing without changing the API)",
    "no bell icon: `@gpuixui/icons` has no `bell`, so the trigger is a text button with the count badge; a caller may pass a custom child",
    "read state and the notifications themselves are the caller's: `onRead`/`onMarkAllRead`/`onClear` are requests, so a remount resets nothing the caller persists",
    "no `aria-live` in 0.10.0, so an arrival is not announced while the panel is closed; the trigger's accessible name carries the count",
    "the panel is non-modal: no focus trap and no `aria-modal`; `Tab` leaves it",
    "keyboard focus moves best-effort through `renderer.focusElement`; the active row's accent fill and ring are the visible cursor, and the feed scrolls it into view (plan 644), because 0.10.0 has no `aria-activedescendant`",
    "a focused row that is removed hands focus to the first live row only when nothing else holds native focus; the holder is remembered while the row exists, because a removed host cannot be read (plan 746)",
    "a group label is a heading, not a labelled region: 0.10.0 has no `aria-labelledby`, so its rows are not associated with it",
  ],
  docs: "docs/notification-centre.mdx",
  example: "examples/notification-centre.example.tsx",
  testFile: "src/behaviour/notification-centre.test.tsx",
} as const;
