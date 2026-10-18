/**
 * `nested-layer-dismiss` — the event model behind the shipped dismiss stack.
 *
 * `@gpuixui/components` carries two opposite claims about one runtime:
 * `internal/dismiss-layer.ts` consumes an event by its **object identity**
 * (`WeakSet<EventPayload>`), while `internal/event-claim.ts` says the runtime
 * delivers a separate payload copy per handler, so identity cannot carry a
 * claim. `menu/sub.tsx` adds a third: a press inside a submenu reaches the
 * parent surface's `onMouseDownOutside` and can be classified from `event.x`/
 * `event.y` against the submenu's bounds.
 *
 * This probe nests two `<anchored>` layers in one React subtree — the shape the
 * components use, unlike `modal-focus-trap`'s sibling layers — and measures
 * which handlers see a key or a press, whether they share the payload object,
 * and whether one Escape closes one layer under a topmost-only stack.
 *
 * Measured facts: plan `187` §8.
 */
import { useCallback, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import { read, readoutNumber } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const SUBMENU_GAP = 4;
const READOUT = "layers-readout";
const OUTSIDE_POINT = { x: 520, y: 640 };

/** A layer's dismiss handler, as `dismiss-layer.ts` defines it. */
type Dismiss = (event: EventPayload) => void;

const boundsOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Effect.Effect<
  {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  Smoke.SmokeAssertionError
> =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

/** One menu row, so both layers share the same appearance and hit area. */
const Row = ({
  testId,
  onActivate,
  rowRef,
  expanded,
  children,
}: {
  readonly testId: string;
  readonly onActivate: () => void;
  readonly rowRef?: (instance: PublicInstance | null) => void;
  readonly expanded?: boolean;
  readonly children: string;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      ref={rowRef}
      role="menuitem"
      tabIndex={-1}
      aria-expanded={expanded}
      onClick={onActivate}
      style={{
        display: "flex",
        alignItems: "center",
        height: 24,
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        cursor: "pointer",
        backgroundColor: theme.colors.popover,
        hover: { backgroundColor: theme.colors.hover },
      }}
    >
      <Body>{children}</Body>
    </div>
  );
};

const LayerProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [parent, setParent] = useState(false);
  const [sub, setSub] = useState(false);
  const [point, setPoint] = useState<Option.Option<{ x: number; y: number }>>(
    Option.none(),
  );
  const [outsideParent, setOutsideParent] = useState(0);
  const [outsideSub, setOutsideSub] = useState(0);
  const [parentClicks, setParentClicks] = useState(0);
  const [subClicks, setSubClicks] = useState(0);
  const [coords, setCoords] = useState("unmeasured");
  const [last, setLast] = useState("none");
  const [keyStats, setKeyStats] = useState({ handlers: 0, objects: 0 });
  const moreId = useRef<Option.Option<number>>(Option.none());
  const subId = useRef<Option.Option<number>>(Option.none());
  const stack = useRef<ReadonlyArray<Dismiss>>([]);
  /**
   * The field-based claim from `event-claim.ts`: the runtime delivers a
   * separate payload copy per handler, so object identity cannot dedupe an
   * event across layers. A claim is one synchronous propagation and is cleared
   * in a microtask, so a later event with the same fields is a new event.
   */
  const claim = useRef<Option.Option<string>>(Option.none());
  const releaseParent = useRef<Option.Option<() => void>>(Option.none());
  const releaseSub = useRef<Option.Option<() => void>>(Option.none());
  const gesture = useRef<{
    readonly objects: ReadonlyArray<EventPayload>;
    readonly handlers: number;
  }>({ objects: [], handlers: 0 });

  const claimOf = (event: EventPayload): string =>
    `${event.eventType}|${event.key ?? ""}|${event.x ?? ""}|${event.y ?? ""}|${event.button ?? ""}`;

  const claimEvent = (event: EventPayload): void => {
    claim.current = Option.some(claimOf(event));
    queueMicrotask(() => {
      claim.current = Option.none();
    });
  };

  /** Consumes a claim another handler made for the same propagation. */
  const consumeClaim = (event: EventPayload): boolean =>
    Option.match(claim.current, {
      onNone: () => false,
      onSome: (current) => {
        if (current !== claimOf(event)) return false;
        claim.current = Option.none();
        return true;
      },
    });

  const push = useCallback((dismiss: Dismiss): (() => void) => {
    stack.current = Arr.append(stack.current, dismiss);
    return () => {
      stack.current = Arr.filter(stack.current, (each) => each !== dismiss);
    };
  }, []);

  /** The topmost layer consumes the event; a second handler is a no-op. */
  const dismissTop = (event: EventPayload): void => {
    if (consumeClaim(event)) return;
    claimEvent(event);
    Option.match(Arr.last(stack.current), {
      onNone: () => {},
      onSome: (dismiss) => dismiss(event),
    });
  };

  const release = (slot: { current: Option.Option<() => void> }): void => {
    Option.match(slot.current, {
      onNone: () => {},
      onSome: (run) => run(),
    });
    slot.current = Option.none();
  };

  const focusMore = (): void => {
    Option.match(moreId.current, {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
  };

  const closeSub = (reason: string): void => {
    release(releaseSub);
    setSub(false);
    setPoint(Option.none());
    setLast(reason);
    if (reason !== "activate") focusMore();
  };

  const closeParent = (reason: string): void => {
    release(releaseParent);
    release(releaseSub);
    setParent(false);
    setSub(false);
    setPoint(Option.none());
    setLast(reason);
  };

  /** Whether a pointer event landed inside the submenu's painted box. */
  const insideSub = (event: EventPayload): boolean => {
    if (event.x === undefined || event.y === undefined) {
      setCoords("no");
      return false;
    }
    const point = { x: event.x, y: event.y };
    setCoords("yes");
    return Option.match(
      Option.flatMap(subId.current, (id) =>
        Option.fromNullishOr(renderer?.getElementBounds?.(id)),
      ),
      {
        onNone: () => false,
        onSome: (box) =>
          point.x >= box.x &&
          point.x <= box.x + box.width &&
          point.y >= box.y &&
          point.y <= box.y + box.height,
      },
    );
  };

  const openParent = (): void => {
    if (parent) {
      closeParent("toggle");
      return;
    }
    setParent(true);
    releaseParent.current = Option.some(
      push((event) => {
        closeParent(
          event.eventType === "keyDown" ? "parent-escape" : "parent-outside",
        );
      }),
    );
    setLast("open");
  };

  const openSub = (): void => {
    Option.match(moreId.current, {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getElementBounds?.(id)), {
          onNone: () => {},
          onSome: (box) => {
            setPoint(
              Option.some({ x: box.x + box.width + SUBMENU_GAP, y: box.y }),
            );
            setSub(true);
            releaseSub.current = Option.some(
              push((event) => {
                if (event.eventType === "mouseDownOutside" && insideSub(event))
                  return;
                closeSub(
                  event.eventType === "keyDown" ? "sub-escape" : "sub-outside",
                );
              }),
            );
            setLast("sub-open");
          },
        }),
    });
  };

  const parentOutside = (event: EventPayload): void => {
    setOutsideParent((count) => count + 1);
    dismissTop(event);
  };

  const subOutside = (event: EventPayload): void => {
    setOutsideSub((count) => count + 1);
    dismissTop(event);
  };

  const key = (event: EventPayload): void => {
    if (event.key === "escape") dismissTop(event);
  };

  /** Records how many handlers and how many distinct objects one `x` reached. */
  const noteKey = (event: EventPayload): void => {
    if (event.key !== "x") return;
    // Identity, not structural equality, is the measurement.
    const known = Arr.findFirst(
      gesture.current.objects,
      (each) => each === event,
    );
    const objects = Option.isSome(known)
      ? gesture.current.objects
      : Arr.append(gesture.current.objects, event);
    gesture.current = {
      objects,
      handlers: gesture.current.handlers + 1,
    };
    setKeyStats({
      handlers: gesture.current.handlers,
      objects: Arr.length(objects),
    });
  };

  const layerStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: theme.spacing["2xs"],
    minWidth: 180,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.popover,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    pointerEvents: "auto" as const,
  };

  return (
    <div
      testId="layers-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 560,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="layers-trigger"
        tabIndex={0}
        role="button"
        onClick={openParent}
        style={{
          display: "flex",
          alignItems: "center",
          height: 28,
          paddingLeft: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          cursor: "pointer",
          backgroundColor: theme.colors.muted,
        }}
      >
        <Body>open menu</Body>
      </div>
      <Readout testId={READOUT}>
        {`parent=${parent ? 1 : 0} sub=${sub ? 1 : 0} depth=${Arr.length(stack.current)} outsideParent=${outsideParent} outsideSub=${outsideSub} parentClicks=${parentClicks} subClicks=${subClicks} coords=${coords} keyHandlers=${keyStats.handlers} keyObjects=${keyStats.objects} last=${last}`}
      </Readout>
      {parent ? (
        <anchored side="bottom" align="start" gap={SUBMENU_GAP}>
          <div
            testId="layers-parent"
            role="menu"
            aria-label="Parent"
            tabIndex={-1}
            autoFocus
            onMouseDownOutside={parentOutside}
            onKeyDown={key}
            style={layerStyle}
          >
            <Row
              testId="layers-row-one"
              onActivate={() => {
                setParentClicks((count) => count + 1);
                closeParent("activate");
              }}
            >
              One
            </Row>
            <Row
              testId="layers-row-more"
              expanded={sub}
              rowRef={(instance: PublicInstance | null) => {
                moreId.current = Option.map(
                  Option.fromNullishOr(instance),
                  (element) => element.id,
                );
              }}
              onActivate={openSub}
            >
              More
            </Row>
            <Row
              testId="layers-row-two"
              onActivate={() => {
                setParentClicks((count) => count + 1);
                closeParent("activate");
              }}
            >
              Two
            </Row>
            {sub
              ? Option.match(point, {
                  onNone: () => null,
                  onSome: (position) => (
                    <anchored position={position} fit="snap" priority={1}>
                      <div
                        testId="layers-sub"
                        role="menu"
                        aria-label="Sub"
                        tabIndex={-1}
                        autoFocus
                        ref={(instance: PublicInstance | null) => {
                          subId.current = Option.map(
                            Option.fromNullishOr(instance),
                            (element) => element.id,
                          );
                        }}
                        onMouseDownOutside={subOutside}
                        onKeyDown={key}
                        style={layerStyle}
                      >
                        <Row
                          testId="layers-sub-a"
                          onActivate={() => {
                            setSubClicks((count) => count + 1);
                            closeSub("activate");
                            closeParent("activate");
                          }}
                        >
                          Sub A
                        </Row>
                        <Row
                          testId="layers-sub-b"
                          onActivate={() => {
                            setSubClicks((count) => count + 1);
                            closeSub("activate");
                            closeParent("activate");
                          }}
                        >
                          Sub B
                        </Row>
                      </div>
                    </anchored>
                  ),
                })
              : null}
            <div testId="layers-identity-outer" onKeyDown={noteKey}>
              <div
                testId="layers-identity-inner"
                tabIndex={0}
                onKeyDown={noteKey}
                style={{
                  height: 16,
                  backgroundColor: theme.colors.muted,
                }}
              />
            </div>
          </div>
        </anchored>
      ) : null}
    </div>
  );
};

export const nestedLayerScenario: PlaygroundScenario = {
  id: "nested-layer-dismiss",
  title: "Nested layers: payload identity, dismiss stack and the submenu press",
  capability: "layers",
  view: () => <LayerProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("layers-trigger");
      yield* ctx.expectContains(
        "the trigger opened the parent layer",
        read(ctx, READOUT),
        "parent=1",
      );

      const root = yield* boundsOf(ctx, "layers-root");
      const parentBox = yield* boundsOf(ctx, "layers-parent");
      // Both boxes are content boxes on 0.10.0: the root is inset 8 px and the
      // layer 5 px from the same left edge, so the layer reports 3 px less
      // (plan 529 §6.3).
      yield* ctx.expectNear(
        "the side/align layer anchors to its parent, not the trigger",
        parentBox.x,
        root.x - 3,
        1,
      );
      yield* ctx.expectEqual(
        "the layer paints below its parent",
        parentBox.y > root.y,
        true,
      );

      ctx.host.click("layers-row-more");
      yield* ctx.expectContains(
        "the row opened the submenu",
        read(ctx, READOUT),
        "sub=1",
      );

      const more = yield* boundsOf(ctx, "layers-row-more");
      const subBox = yield* boundsOf(ctx, "layers-sub");
      yield* ctx.expectNear(
        // The submenu's content origin is 5 px inside its surface (plan 529 §6.3).
        "the submenu starts at the row's right edge plus the gap",
        subBox.x,
        more.x + more.width + SUBMENU_GAP + 5,
        1,
      );
      yield* ctx.expectNear(
        "the submenu shares the row's top edge",
        subBox.y,
        more.y + 5,
        1,
      );

      ctx.host.click("layers-sub-a");
      yield* ctx.expectContains(
        "the press inside the submenu activated its row",
        read(ctx, READOUT),
        "subClicks=1",
      );
      yield* ctx.expectContains(
        "the outer layer saw the press inside its descendant",
        read(ctx, READOUT),
        "outsideParent=1",
      );
      yield* ctx.expectContains(
        "an inside press is not outside the inner layer",
        read(ctx, READOUT),
        "outsideSub=0",
      );
      yield* ctx.expectContains(
        "the outside payload carries coordinates",
        read(ctx, READOUT),
        "coords=yes",
      );
      yield* ctx.expectContains(
        "activation closed both layers",
        read(ctx, READOUT),
        "last=activate",
      );

      ctx.host.click("layers-trigger");
      ctx.host.click("layers-row-more");
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "one Escape closed the submenu",
        read(ctx, READOUT),
        "sub=0",
      );
      yield* ctx.expectContains(
        "one Escape left the parent open",
        read(ctx, READOUT),
        "parent=1",
      );
      yield* ctx.expectContains(
        "the submenu reported the escape",
        read(ctx, READOUT),
        "last=sub-escape",
      );

      ctx.host.key("escape");
      yield* ctx.expectContains(
        "the second Escape closed the parent",
        read(ctx, READOUT),
        "parent=0",
      );
      yield* ctx.expectContains(
        "the parent reported the escape",
        read(ctx, READOUT),
        "last=parent-escape",
      );

      ctx.host.click("layers-trigger");
      ctx.host.click("layers-identity-inner");
      ctx.host.key("x");
      const handlers = yield* ctx.expectSome(
        "the key event was recorded",
        readoutNumber(ctx, READOUT, "keyHandlers"),
      );
      const objects = yield* ctx.expectSome(
        "the payload copies were counted",
        readoutNumber(ctx, READOUT, "keyObjects"),
      );
      yield* ctx.expectEqual(
        "the key reached the inner and the enclosing handler",
        handlers,
        2,
      );
      yield* ctx.expectEqual(
        "the runtime delivers a separate payload copy per handler",
        objects,
        2,
      );

      ctx.host.click("layers-row-more");
      yield* ctx.expectContains(
        "both layers sit on the dismiss stack",
        read(ctx, READOUT),
        "depth=2",
      );
      ctx.host.clickWindow(OUTSIDE_POINT.x, OUTSIDE_POINT.y);
      yield* ctx.expectContains(
        "an outside press closed the topmost layer",
        read(ctx, READOUT),
        "sub=0",
      );
      yield* ctx.expectContains(
        "the first outside press left the parent open",
        read(ctx, READOUT),
        "parent=1",
      );
      yield* Effect.yieldNow;
      ctx.host.clickWindow(OUTSIDE_POINT.x, OUTSIDE_POINT.y);
      yield* ctx.expectContains(
        "the second outside press closed the parent",
        read(ctx, READOUT),
        "parent=0",
      );
      yield* ctx.expectContains(
        "the dismiss stack emptied",
        read(ctx, READOUT),
        "depth=0",
      );
    }),
};
