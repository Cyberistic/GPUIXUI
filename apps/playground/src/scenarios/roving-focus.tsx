/**
 * `roving-focus` — programmatic focus between passive rows, and inside a
 * `<virtual-list>`.
 *
 * A menu, tab strip, radio group or data grid owns one tab stop and moves
 * native focus between its rows. That needs two runtime facts (plan `158`):
 * `renderer.focusElement` focuses a row that was never clicked, and the next
 * keystroke is delivered to the row that just received focus. The rows here
 * carry `tabIndex={-1}` and a ref registry so the key handler is the component
 * mechanism, not a host helper.
 *
 * The virtual-list half asks what happens when the focused row leaves the
 * painted window. Measured: focus is **not** lost (the row keeps native focus
 * and stays in the painted set), and the next arrow key still moves it. A
 * grid must account for that straggler instead of assuming the painted window
 * is exactly the visible rows.
 *
 * Measured facts: plan `158` §8.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 8;
const VROWS = 200;
const ROW_HEIGHT = 32;

const clamp = (index: number, last: number): number =>
  Math.min(Math.max(index, 0), last);

/** The id registry a row's `ref` fills; `null` when a row has no instance. */
type Registry = { current: Array<Option.Option<number>> };

const register =
  (registry: Registry, index: number) => (instance: PublicInstance | null) => {
    registry.current[index] = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  };

/** Focuses the row registered at `index`, or does nothing when it has no id. */
const focusIndex = (
  renderer: { focusElement?: (id: number) => void } | null | undefined,
  registry: Registry,
  index: number,
): void =>
  Option.match(Option.flatten(Option.fromNullishOr(registry.current[index])), {
    onNone: () => {},
    onSome: (id) => renderer?.focusElement?.(id),
  });

/** A row's key contract: arrows move the roving index and native focus. */
const step = (
  event: { key?: string },
  index: number,
  last: number,
): Option.Option<number> =>
  event.key === "down"
    ? Option.some(clamp(index + 1, last))
    : event.key === "up"
      ? Option.some(clamp(index - 1, last))
      : Option.none();

const RovingProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const rows = useRef<Array<Option.Option<number>>>([]);
  const virtualRows = useRef<Array<Option.Option<number>>>([]);
  const [active, setActive] = useState(0);
  const [activated, setActivated] = useState(-1);
  const [virtualActive, setVirtualActive] = useState(2);

  const onRowKey = (index: number) => (event: { key?: string }) => {
    const next = step(event, index, ROWS - 1);
    if (Option.isNone(next)) {
      if (event.key === "enter") setActivated(index);
      return;
    }
    const target = Option.getOrElse(next, () => index);
    setActive(target);
    focusIndex(renderer, { current: rows.current }, target);
  };

  const onVirtualKey = (index: number) => (event: { key?: string }) => {
    const next = step(event, index, VROWS - 1);
    if (Option.isNone(next)) return;
    const target = Option.getOrElse(next, () => index);
    setVirtualActive(target);
    focusIndex(renderer, { current: virtualRows.current }, target);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 360,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {Array.from({ length: ROWS }, (_, index) => (
          <div
            key={index}
            testId={`roving-row-${index}`}
            ref={register({ current: rows.current }, index)}
            tabIndex={active === index ? 0 : -1}
            role="option"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            onKeyDown={onRowKey(index)}
            style={{
              padding: 4,
              backgroundColor:
                active === index
                  ? theme.colors.accent
                  : theme.colors.background,
            }}
          >
            <text style={{ color: theme.colors.foreground }}>
              {`row ${index}`}
            </text>
          </div>
        ))}
      </div>
      <div
        testId="roving-focus-5"
        tabIndex={0}
        role="button"
        onClick={() => {
          setActive(5);
          focusIndex(renderer, { current: rows.current }, 5);
        }}
        style={{
          padding: 4,
          borderRadius: 4,
          cursor: "pointer",
          backgroundColor: theme.colors.muted,
        }}
      >
        <text style={{ color: theme.colors.foreground }}>focus row 5</text>
      </div>
      <div style={{ display: "flex", height: 280, width: 320 }}>
        <virtual-list
          testId="vlist-focus"
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {Array.from({ length: VROWS }, (_, index) => (
            <div
              key={index}
              testId={`vrow-${index}`}
              ref={register({ current: virtualRows.current }, index)}
              tabIndex={virtualActive === index ? 0 : -1}
              role="option"
              aria-selected={virtualActive === index}
              onClick={() => setVirtualActive(index)}
              onKeyDown={onVirtualKey(index)}
              style={{
                height: ROW_HEIGHT,
                padding: 6,
                backgroundColor:
                  virtualActive === index
                    ? theme.colors.accent
                    : theme.colors.background,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`virtual row ${index}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
      <Readout testId="roving-readout">
        {`active=${active} activated=${activated} vactive=${virtualActive}`}
      </Readout>
    </div>
  );
};

/** The focused `testId`, or `"none"` when nothing has native focus. */
const focused = (host: Smoke.SmokeHost): string =>
  Option.getOrElse(Option.fromNullishOr(host.focused()), () => "none");

/** Asserts the readout contains `needle`. */
const contains = (ctx: Smoke.SmokeContext, needle: string) =>
  Effect.gen(function* () {
    const text = yield* ctx.expectSome(
      "roving readout is painted",
      Option.fromNullishOr(ctx.host.text("roving-readout")),
    );
    yield* ctx.expectContains(`readout contains "${needle}"`, text, needle);
  });

export const rovingFocusScenario: PlaygroundScenario = {
  id: "roving-focus",
  title: "Roving focus: programmatic focus and a virtual list",
  capability: "focus",
  view: () => <RovingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("roving-row-2");
      yield* ctx.expectEqual(
        "click focused the row",
        focused(ctx.host),
        "roving-row-2",
      );
      yield* contains(ctx, "active=2");

      ctx.host.key("down");
      yield* ctx.expectEqual(
        "focus moved to the next row",
        focused(ctx.host),
        "roving-row-3",
      );
      yield* contains(ctx, "active=3");

      ctx.host.key("enter");
      yield* contains(ctx, "activated=3");

      ctx.host.click("roving-focus-5");
      yield* ctx.expectEqual(
        "focus moved to a row that was never clicked",
        focused(ctx.host),
        "roving-row-5",
      );
      yield* contains(ctx, "active=5");

      ctx.host.click("vrow-2");
      yield* ctx.expectEqual(
        "click focused the virtual row",
        focused(ctx.host),
        "vrow-2",
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "focus moved inside the virtual list",
        focused(ctx.host),
        "vrow-3",
      );
      yield* contains(ctx, "vactive=3");

      ctx.host.wheel("vlist-focus", 0, -1200);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the painted window moved past the first rows",
        ctx.host.paintedText().includes("virtual row 0"),
        false,
      );
      yield* ctx.expectEqual(
        "focus stayed on the scrolled-out row",
        focused(ctx.host),
        "vrow-3",
      );

      ctx.host.key("down");
      yield* ctx.expectEqual(
        "focus keeps moving after the window moved",
        focused(ctx.host),
        "vrow-4",
      );
      yield* contains(ctx, "vactive=4");

      ctx.host.wheel("vlist-focus", 0, 1200);
      ctx.host.advance(50);
      ctx.host.click("vrow-2");
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "focus can be restored and moved after scrolling back",
        focused(ctx.host),
        "vrow-3",
      );
    }),
};
