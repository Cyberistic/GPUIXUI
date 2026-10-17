/**
 * `tab-strip-focus` — the tab strip's keyboard contract.
 *
 * Plan `173` proved a strip can pan and reveal. It did not answer what a
 * keyboard user meets in the overflowed part: a naive strip gives every tab
 * `tabIndex={0}`, so Tab visits tabs the viewport clipped; a roving strip gives
 * only the active tab a stop, so Tab leaves the strip.
 *
 * This probe mounts both models side by side and measures the native focus
 * sequence, whether focus reveals a clipped tab by itself, and the roving
 * End/Home round trip. Every assertion reads the renderer's focus and scroll
 * state; the `active` readouts only separate selection from focus.
 *
 * Measured facts: plan `174` §8.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const TABS = 10;
const TAB_WIDTH = 72;
const STRIP_WIDTH = 300;

type Registry = Record<string, PublicInstance | null>;

/** Parses `active=<n>`; a missing readout is `-1`, never a guess. */
const activeTab = (ctx: Smoke.SmokeContext, testId: string): number =>
  Option.getOrElse(
    Option.map(Option.fromNullishOr(ctx.host.text(testId)), (readout) =>
      Number.parseInt(readout.slice("active=".length), 10),
    ),
    () => -1,
  );

/** The strip's painted horizontal offset; a missing container is `0`. */
const offsetX = (ctx: Smoke.SmokeContext, testId: string): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.scrollOffset(testId)),
      (offset) => offset.x,
    ),
    () => 0,
  );

const focused = (ctx: Smoke.SmokeContext): Option.Option<string> =>
  Option.fromNullishOr(ctx.host.focused());

interface StripProps {
  readonly idPrefix: string;
  readonly active: number;
  readonly tabIndexFor: (index: number) => number;
  readonly onSelect: (index: number) => void;
  readonly onKeyDown?: (event: { key?: string }, index: number) => void;
  readonly register?: (index: number, instance: PublicInstance | null) => void;
}

/** One overflowing strip; the two scenarios differ only in tabindex and keys. */
const Strip = ({
  idPrefix,
  active,
  tabIndexFor,
  onSelect,
  onKeyDown,
  register,
}: StripProps) => {
  const theme = useTheme();
  return (
    <div
      testId={`${idPrefix}-strip`}
      style={{
        width: STRIP_WIDTH,
        padding: 4,
        display: "flex",
        gap: 4,
        overflowX: "scroll",
        overflowY: "hidden",
        backgroundColor: theme.colors.muted,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      {Arr.map(Arr.range(0, TABS - 1), (index) => (
        <div
          key={index}
          ref={(instance) => register?.(index, instance)}
          testId={`${idPrefix}-${index}`}
          role="tab"
          aria-selected={active === index}
          tabIndex={tabIndexFor(index)}
          onClick={() => onSelect(index)}
          onKeyDown={(event) => onKeyDown?.(event, index)}
          style={{
            width: TAB_WIDTH,
            height: 32,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: theme.radius.sm,
            cursor: "pointer",
            backgroundColor:
              active === index ? theme.colors.card : theme.colors.background,
            hover: { backgroundColor: theme.colors.card },
          }}
        >
          <text style={{ color: theme.colors.foreground }}>
            {`${idPrefix} ${index}`}
          </text>
        </div>
      ))}
    </div>
  );
};

const TabFocusProbe = () => {
  const renderer = useGpuix().renderer;
  const rovingTabs = useRef<Registry>({});
  const [naiveActive, setNaiveActive] = useState(0);
  const [rovingActive, setRovingActive] = useState(0);

  /** Roving contract: selection, native focus and reveal move together. */
  const selectRoving = (index: number) => {
    setRovingActive(index);
    const tab = rovingTabs.current[String(index)];
    Option.match(Option.fromNullishOr(tab?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
    tab?.scrollIntoView?.();
  };

  const rovingKey = (event: { key?: string }, index: number) => {
    if (event.key === "right")
      return selectRoving(Math.min(index + 1, TABS - 1));
    if (event.key === "left") return selectRoving(Math.max(index - 1, 0));
    if (event.key === "home") return selectRoving(0);
    if (event.key === "end") return selectRoving(TABS - 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Readout testId="naive-active">{`active=${naiveActive}`}</Readout>
      <Strip
        idPrefix="naive"
        active={naiveActive}
        tabIndexFor={() => 0}
        onSelect={setNaiveActive}
      />
      <Pressable testId="naive-after">
        <text>after naive</text>
      </Pressable>

      <Readout testId="roving-active">{`active=${rovingActive}`}</Readout>
      <Strip
        idPrefix="roving"
        active={rovingActive}
        tabIndexFor={(index) => (index === rovingActive ? 0 : -1)}
        onSelect={selectRoving}
        onKeyDown={rovingKey}
        register={(index, instance) => {
          rovingTabs.current[String(index)] = instance;
        }}
      />
      <Pressable testId="roving-after">
        <text>after roving</text>
      </Pressable>
    </div>
  );
};

/** Tabs `focusNext` with a label naming the id it landed on. */
const tabTo = (ctx: Smoke.SmokeContext, label: string) =>
  Effect.gen(function* () {
    ctx.host.focusNext();
    return yield* ctx.expectSome(
      `${label} (focused=${ctx.host.focused() ?? "none"})`,
      focused(ctx),
    );
  });

export const tabFocusScenario: PlaygroundScenario = {
  id: "tab-strip-focus",
  title: "Focus: clipped tab stops and the roving tab strip",
  capability: "focus",
  view: () => <TabFocusProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("naive-0");
      const first = yield* ctx.expectSome(
        "the naive strip takes focus on its first tab",
        focused(ctx),
      );
      yield* ctx.expectEqual(
        "the first naive tab is focused",
        first,
        "naive-0",
      );
      const start = offsetX(ctx, "naive-strip");
      yield* ctx.expectEqual("the naive strip starts at the left", start, 0);

      yield* Effect.forEach(
        Arr.range(1, TABS - 1),
        () => Effect.sync(() => ctx.host.focusNext()),
        { concurrency: 1 },
      );
      const walked = yield* ctx.expectSome(
        "the traversal landed on a tab",
        focused(ctx),
      );
      yield* ctx.expectEqual(
        "the traversal reached the last clipped tab",
        walked,
        `naive-${TABS - 1}`,
      );

      const afterWalk = offsetX(ctx, "naive-strip");
      yield* ctx.expectEqual(
        `focus does not reveal a clipped tab (x=${afterWalk})`,
        afterWalk,
        start,
      );

      const past = yield* tabTo(ctx, "focus leaves the naive strip");
      yield* ctx.expectEqual(
        "the naive traversal continues past the strip",
        past,
        "naive-after",
      );

      ctx.host.click("roving-0");
      const rovingFocus = yield* ctx.expectSome(
        "the roving strip takes focus",
        focused(ctx),
      );
      yield* ctx.expectEqual(
        "the roving first tab is focused",
        rovingFocus,
        "roving-0",
      );
      const oneStop = yield* tabTo(ctx, "a roving strip is one tab stop");
      yield* ctx.expectEqual(
        "Tab leaves the roving strip after one press",
        oneStop,
        "roving-after",
      );

      ctx.host.click("roving-3");
      ctx.host.key("end");
      yield* ctx.expectEqual(
        "End selects the last roving tab",
        activeTab(ctx, "roving-active"),
        TABS - 1,
      );
      const endFocus = yield* ctx.expectSome("End focuses a tab", focused(ctx));
      yield* ctx.expectEqual(
        "End focuses the last roving tab",
        endFocus,
        `roving-${TABS - 1}`,
      );
      const endOffset = offsetX(ctx, "roving-strip");
      yield* ctx.expectEqual(
        `End reveals the last tab (x=${endOffset})`,
        endOffset < -TAB_WIDTH,
        true,
      );

      ctx.host.key("home");
      const homeFocus = yield* ctx.expectSome(
        "Home focuses a tab",
        focused(ctx),
      );
      yield* ctx.expectEqual(
        "Home focuses the first roving tab",
        homeFocus,
        "roving-0",
      );
      const homeOffset = offsetX(ctx, "roving-strip");
      yield* ctx.expectEqual(
        `Home returns to the start region (x=${homeOffset})`,
        homeOffset > -TAB_WIDTH,
        true,
      );
    }),
};
