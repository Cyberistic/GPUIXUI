/**
 * `context-menu-pointer` — the right-click contract a Context menu is built on.
 *
 * `@gpuixui/components` opens its `ContextMenu` from `onAuxClick` +
 * `isRightClick`, places the surface with `<anchored position={pointer}>`, and
 * opens from the keyboard on Shift+F10. None of the three was measured on
 * 0.10.0, and a menu is only honest if the right click, the pointer placement
 * and the dismissal all survive a real gesture.
 *
 * This probe logs every mouse event on the trigger, opens a real anchored
 * surface at the point, and repeats the gesture on a row inside a scrolled
 * container: the anchored layer is the only window-coordinate primitive, and a
 * scroll offset is exactly where a double-application would hide.
 *
 * Measured facts: plan `164` §8.
 */
import { useCallback, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

/** A point in window coordinates, as the runtime reports it. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** Which mount the open surface uses: the scenario root, or inside the scroller. */
type MenuScope = "root" | "scroll";

/** The one open surface. A pointer open leaves focus where the action went. */
interface OpenMenu {
  readonly point: Point;
  readonly scope: MenuScope;
  readonly keyboard: boolean;
}

const scrollRows = 40;
const scrollTargetRow = 12;

const eventText = (event: EventPayload): string =>
  `${Math.round(event.x ?? -1)},${Math.round(event.y ?? -1)}`;

const ContextProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [menu, setMenu] = useState<Option.Option<OpenMenu>>(Option.none());
  const [last, setLast] = useState("none");
  const [keyReadout, setKeyReadout] = useState("none");
  const [log, setLog] = useState<ReadonlyArray<string>>([]);
  const keyboardTrigger = useRef<Option.Option<number>>(Option.none());

  const record = (entry: string): void =>
    setLog((previous) => Arr.append(previous, entry));

  const open = (point: Point, scope: MenuScope, keyboard: boolean): void => {
    setMenu(Option.some({ point, scope, keyboard }));
    record(`open:${scope}:${Math.round(point.x)},${Math.round(point.y)}`);
  };

  const close = useCallback(
    (reason: string): void => {
      Option.match(menu, {
        onNone: () => undefined,
        onSome: (current) => {
          if (!current.keyboard) return;
          Option.match(keyboardTrigger.current, {
            onNone: () => undefined,
            onSome: (id) => renderer?.focusElement?.(id),
          });
        },
      });
      setMenu(Option.none());
      setLast(reason);
    },
    [menu, renderer],
  );

  const select = (item: string): void => {
    record(`menu:${item}`);
    close(item);
  };

  /** The primary-button events; the aux click is logged by `pointerOpen`. */
  const mouseLog = (name: string) => ({
    onMouseDown: (event: EventPayload) =>
      record(`${name}:down:${event.button ?? -1}`),
    onMouseUp: (event: EventPayload) =>
      record(`${name}:up:${event.button ?? -1}`),
    onClick: (event: EventPayload) =>
      record(`${name}:click:${event.isRightClick === true}`),
  });

  const pointerOpen = (
    scope: MenuScope,
    name: string,
    event: EventPayload,
  ): void => {
    record(`${name}:aux:${eventText(event)}:${event.isRightClick === true}`);
    if (event.isRightClick !== true) return;
    open({ x: event.x ?? 0, y: event.y ?? 0 }, scope, false);
  };

  const attachKeyTrigger = useCallback((instance: PublicInstance | null) => {
    keyboardTrigger.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);

  const menuSurface = (current: OpenMenu) => {
    const surfaceId = current.scope === "root" ? "ctx-menu" : "ctx-menu-inside";
    return (
      <anchored
        position={current.point}
        deferred
        priority={1}
        occlude
        style={{ position: "absolute" }}
      >
        <div
          testId={surfaceId}
          role="menu"
          aria-label="context menu"
          tabIndex={-1}
          autoFocus
          onMouseDownOutside={() => {
            record(`${surfaceId}:outside`);
            close("outside");
          }}
          onKeyDown={(event: EventPayload) => {
            record(`${surfaceId}:key:${event.key ?? "none"}`);
            if (event.key !== "escape") return;
            close("escape");
          }}
          style={{
            width: 180,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: theme.spacing.xs,
            backgroundColor: theme.colors.popover,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          }}
        >
          {current.scope === "root" ? (
            <>
              <MenuRow
                testId="ctx-item-copy"
                label="Copy"
                onSelect={() => select("copy")}
              />
              <MenuRow
                testId="ctx-item-delete"
                label="Delete"
                onSelect={() => select("delete")}
              />
              <MenuRow testId="ctx-item-disabled" label="Disabled" disabled />
            </>
          ) : (
            <>
              <MenuRow
                testId="ctx-item-inside"
                label="Row action"
                onSelect={() => select("inside-item")}
              />
              <MenuRow
                testId="ctx-item-inside-2"
                label="Row action two"
                onSelect={() => select("inside-item-2")}
              />
              <MenuRow
                testId="ctx-item-inside-3"
                label="Row action three"
                onSelect={() => select("inside-item-3")}
              />
            </>
          )}
        </div>
      </anchored>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", gap: 60 }}>
        <div
          testId="ctx-target"
          {...mouseLog("A")}
          onAuxClick={(event: EventPayload) => pointerOpen("root", "A", event)}
          style={{
            width: 200,
            height: 100,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.muted,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <Body>right-click me</Body>
          <text
            testId="ctx-target-label"
            style={{ color: theme.colors.foreground }}
          >
            inside label
          </text>
        </div>
        <div
          testId="ctx-key-target"
          ref={attachKeyTrigger}
          tabIndex={0}
          role="button"
          aria-label="keyboard context trigger"
          onKeyDown={(event: EventPayload) => {
            const shift = event.modifiers?.shift === true;
            setKeyReadout(`key=${event.key ?? "none"} shift=${shift}`);
            if (event.key !== "f10" || !shift) return;
            Option.match(keyboardTrigger.current, {
              onNone: () => undefined,
              onSome: (id) =>
                Option.match(
                  Option.fromNullishOr(renderer?.getElementBounds?.(id)),
                  {
                    onNone: () => undefined,
                    onSome: (bounds) =>
                      open(
                        { x: bounds.x, y: bounds.y + bounds.height },
                        "root",
                        true,
                      ),
                  },
                ),
            });
          }}
          style={{
            width: 200,
            height: 40,
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.muted,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <Body>Shift+F10 here</Body>
        </div>
        <div
          testId="ctx-outside"
          onClick={() => record("outside:click")}
          style={{
            width: 200,
            height: 48,
            backgroundColor: theme.colors.card,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <Readout testId="ctx-key-readout">{keyReadout}</Readout>
      </div>

      <div
        testId="ctx-scroll"
        style={{
          width: 260,
          height: 160,
          overflowY: "scroll",
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(Arr.range(0, scrollRows - 1), (row) => (
          <div
            key={row}
            testId={
              row === scrollTargetRow ? "ctx-scroll-target" : `ctx-row-${row}`
            }
            {...(row === scrollTargetRow
              ? {
                  onAuxClick: (event: EventPayload) =>
                    pointerOpen("scroll", "S", event),
                }
              : {})}
            style={{
              height: 40,
              flexShrink: 0,
              padding: theme.spacing.sm,
              backgroundColor:
                row === scrollTargetRow
                  ? theme.colors.muted
                  : theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: theme.borderWidth.thin,
            }}
          >
            <Readout testId={`ctx-row-readout-${row}`}>{`row ${row}`}</Readout>
          </div>
        ))}
        {Option.match(menu, {
          onNone: () => null,
          onSome: (current) =>
            current.scope === "scroll" ? menuSurface(current) : null,
        })}
      </div>

      <Readout testId="ctx-state">
        {Option.match(menu, {
          onNone: () => `open=false last=${last}`,
          onSome: (current) =>
            `open=true x=${Math.round(current.point.x)} y=${Math.round(current.point.y)} scope=${current.scope} keyboard=${current.keyboard} last=${last}`,
        })}
      </Readout>
      <Readout testId="ctx-log">{Arr.join(log, ">")}</Readout>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {Option.match(menu, {
          onNone: () => null,
          onSome: (current) =>
            current.scope === "root" ? menuSurface(current) : null,
        })}
      </div>
    </div>
  );
};

/** One menu row: a real click target with an inert disabled state. */
const MenuRow = ({
  testId,
  label,
  disabled = false,
  onSelect,
}: {
  readonly testId: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      role="button"
      aria-label={label}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
      }}
      style={{
        height: 32,
        display: "flex",
        alignItems: "center",
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        hover: { backgroundColor: theme.colors.muted },
      }}
    >
      <text style={{ color: theme.colors.popoverForeground }}>{label}</text>
    </div>
  );
};

/** The aux point logged for `name`, if it arrived. */
const auxOf = (
  log: string,
  name: string,
): Option.Option<Point & { readonly right: boolean }> =>
  Option.flatMap(
    Arr.findFirst(Str.split(">")(log), Str.startsWith(`${name}:aux:`)),
    (entry) => {
      const parts = Arr.drop(Str.split(":")(entry), 2);
      return Option.flatMap(Arr.get(parts, 0), (coordinates) =>
        Option.map(
          Option.all({
            x: Arr.get(Str.split(",")(coordinates), 0),
            y: Arr.get(Str.split(",")(coordinates), 1),
            right: Arr.get(parts, 1),
          }),
          (parsed) => ({
            x: Number(parsed.x),
            y: Number(parsed.y),
            right: parsed.right === "true",
          }),
        ),
      );
    },
  );

const centerOf = (bounds: Smoke.Bounds): Point => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

const logOf = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text("ctx-log")), () => "");

const stateOf = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text("ctx-state")), () => "");

const focusedOf = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

export const contextMenuScenario: PlaygroundScenario = {
  id: "context-menu-pointer",
  title: "Context menu: right click, pointer placement, dismissal",
  capability: "menu",
  view: () => <ContextProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // A left click is not a context-menu gesture, and a right click is the
      // only pointer route 0.10.0 offers (there is no onContextMenu).
      const target = yield* ctx.expectSome(
        "the target has bounds",
        Option.fromNullishOr(ctx.host.bounds("ctx-target")),
      );
      const centre = centerOf(target);
      ctx.host.click("ctx-target");
      yield* ctx.expectContains(
        "a left click does not open the menu",
        stateOf(ctx),
        "open=false",
      );
      yield* ctx.expectEqual(
        "a left click produces no aux event",
        Str.includes("A:aux")(logOf(ctx)),
        false,
      );

      ctx.host.rightClick("ctx-target");
      const first = yield* ctx.expectSome(
        "the right click is logged as an aux event",
        auxOf(logOf(ctx), "A"),
      );
      yield* ctx.expectEqual(
        "the aux event is a right click",
        first.right,
        true,
      );
      yield* ctx.expectNear(
        "the aux event carries the pointer's x",
        first.x,
        centre.x,
        1,
      );
      yield* ctx.expectNear(
        "the aux event carries the pointer's y",
        first.y,
        centre.y,
        1,
      );
      yield* ctx.expectContains(
        "the right click reaches onMouseDown with button 2",
        logOf(ctx),
        "A:down:2",
      );
      const rightGesture = Option.getOrElse(
        Arr.get(Str.split("A:down:2")(logOf(ctx)), 1),
        () => "",
      );
      yield* ctx.expectEqual(
        "the right gesture does not end in a click",
        Str.includes("A:click")(rightGesture),
        false,
      );
      yield* ctx.expectContains(
        "the right click opened the root menu at the pointer",
        stateOf(ctx),
        `open=true x=${Math.round(centre.x)} y=${Math.round(centre.y)} scope=root`,
      );

      const surface = yield* ctx.expectSome(
        "the menu surface has bounds",
        Option.fromNullishOr(ctx.host.bounds("ctx-menu")),
      );
      yield* ctx.expectNear(
        "the menu paints at the pointer's x",
        surface.x,
        centre.x,
        1,
      );
      yield* ctx.expectNear(
        "the menu paints at the pointer's y",
        surface.y,
        centre.y,
        1,
      );

      // A disabled row is inert; an enabled row runs its action and closes.
      ctx.host.click("ctx-item-disabled");
      yield* ctx.expectContains(
        "a disabled item leaves the menu open",
        stateOf(ctx),
        "open=true",
      );
      ctx.host.click("ctx-item-copy");
      yield* ctx.expectContains(
        "an item runs its action and closes",
        stateOf(ctx),
        "open=false last=copy",
      );

      // Outside press and Escape are the two dismissals a menu must have.
      ctx.host.rightClick("ctx-target");
      ctx.host.click("ctx-outside");
      yield* ctx.expectContains(
        "an outside press closes the menu",
        stateOf(ctx),
        "open=false last=outside",
      );
      yield* ctx.expectContains(
        "the outside element received the press",
        logOf(ctx),
        "outside:click",
      );

      ctx.host.rightClick("ctx-target");
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape closes the menu",
        stateOf(ctx),
        "open=false last=escape",
      );

      // A right click on a child still opens: events bubble to the trigger.
      ctx.host.rightClick("ctx-target-label");
      yield* ctx.expectContains(
        "a right click on a child opens the menu",
        stateOf(ctx),
        "open=true",
      );
      yield* ctx.expectContains(
        "a right click on a child keeps the root scope",
        stateOf(ctx),
        "scope=root",
      );
      ctx.host.key("escape");

      // Shift+F10 is the keyboard route plan 122 promises.
      ctx.host.click("ctx-key-target");
      ctx.host.key("shift-f10");
      const keyReadout = yield* ctx.expectSome(
        "the keyboard trigger reports the delivered key",
        Option.fromNullishOr(ctx.host.text("ctx-key-readout")),
      );
      yield* ctx.expectContains(
        "shift-f10 arrives as key=f10 with shift",
        keyReadout,
        "key=f10 shift=true",
      );
      yield* ctx.expectContains(
        "the keyboard route opens at the trigger",
        stateOf(ctx),
        "scope=root keyboard=true",
      );
      yield* ctx.expectEqual(
        "the menu takes focus",
        focusedOf(ctx),
        "ctx-menu",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape returns focus to the trigger",
        focusedOf(ctx),
        "ctx-key-target",
      );

      // The scrolled-container case: window coordinates must not pick up the
      // scroll offset, and the surface must stay hittable below the viewport.
      ctx.host.wheel("ctx-scroll", 0, -400);
      const offset = yield* ctx.expectSome(
        "the scroll container has an offset",
        Option.fromNullishOr(ctx.host.scrollOffset("ctx-scroll")),
      );
      yield* ctx.expectEqual(
        "the wheel scrolled down (negative y)",
        offset.y < 0,
        true,
      );
      const row = yield* ctx.expectSome(
        "the scrolled row has bounds",
        Option.fromNullishOr(ctx.host.bounds("ctx-scroll-target")),
      );
      const rowCentre = centerOf(row);
      ctx.host.rightClick("ctx-scroll-target");
      const scrolled = yield* ctx.expectSome(
        "the scrolled right click is logged",
        auxOf(logOf(ctx), "S"),
      );
      yield* ctx.expectNear(
        "the scrolled click carries window x",
        scrolled.x,
        rowCentre.x,
        1,
      );
      yield* ctx.expectNear(
        "the scrolled click carries window y",
        scrolled.y,
        rowCentre.y,
        1,
      );
      yield* ctx.expectContains(
        "the scrolled menu is open",
        stateOf(ctx),
        "open=true",
      );
      yield* ctx.expectContains(
        "the scrolled menu uses the container scope",
        stateOf(ctx),
        "scope=scroll",
      );
      const inside = yield* ctx.expectSome(
        "the in-container surface has bounds",
        Option.fromNullishOr(ctx.host.bounds("ctx-menu-inside")),
      );
      yield* ctx.expectNear(
        "the in-container menu paints at the pointer's x",
        inside.x,
        rowCentre.x,
        1,
      );
      yield* ctx.expectNear(
        "the in-container menu paints at the pointer's y",
        inside.y,
        rowCentre.y,
        1,
      );
      yield* ctx.expectContains(
        "the item below the scroll viewport still paints",
        Arr.join(ctx.host.paintedText(), "\n"),
        "Row action three",
      );
      ctx.host.click("ctx-item-inside-3");
      yield* ctx.expectContains(
        "an item below the scroll viewport is still hittable",
        stateOf(ctx),
        "open=false last=inside-item-3",
      );
    }),
};
