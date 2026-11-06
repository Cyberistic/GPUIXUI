import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const TAB_COUNT = 8;
const TAB_WIDTH = 80;
const RAIL_WIDTH = 320;

const nextIndex = (current: number, key: string): Option.Option<number> => {
  if (key === "end") return Option.some(TAB_COUNT - 1);
  if (key === "home") return Option.some(0);
  if (key === "right") return Option.some(Math.min(current + 1, TAB_COUNT - 1));
  if (key === "left") return Option.some(Math.max(current - 1, 0));
  return Option.none();
};

const TabStrip = ({
  id,
  reveal,
  nested,
  selected,
  onSelect,
}: {
  readonly id: string;
  readonly reveal: boolean;
  readonly nested?: boolean;
  readonly selected: number;
  readonly onSelect: (index: number) => void;
}) => {
  const theme = useTheme();
  const tabs = useRef<Array<PublicInstance | null>>([]);

  const choose = (index: number) => {
    onSelect(index);
    if (reveal) tabs.current[index]?.scrollIntoView?.();
  };

  const row = Array.from({ length: TAB_COUNT }, (_, index) => (
    <div
      key={index}
      testId={`${id}-tab-${index}`}
      ref={(element) => {
        tabs.current[index] = element;
      }}
      tabIndex={0}
      role="tab"
      aria-selected={selected === index}
      onClick={() => choose(index)}
      onKeyDown={(event: EventPayload) =>
        Option.match(nextIndex(index, event.key ?? ""), {
          onNone: () => {},
          onSome: choose,
        })
      }
      style={{
        width: TAB_WIDTH,
        padding: 8,
        flexShrink: 0,
        backgroundColor:
          selected === index ? theme.colors.selected : theme.colors.muted,
      }}
    >
      <text style={{ color: theme.colors.foreground }}>{`tab ${index}`}</text>
    </div>
  ));

  return (
    <div
      testId={`${id}-rail`}
      style={{
        width: RAIL_WIDTH,
        overflowX: "scroll",
        display: "flex",
        flexDirection: "row",
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {nested ? (
        <div style={{ display: "flex", flexDirection: "row" }}>{row}</div>
      ) : (
        row
      )}
    </div>
  );
};

const TabOverflowProbe = () => {
  const [plain, setPlain] = useState(0);
  const [revealing, setRevealing] = useState(0);
  const [nested, setNested] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <TabStrip
        id="plain"
        reveal={false}
        selected={plain}
        onSelect={setPlain}
      />
      <Readout testId="plain-readout">{`selected=${plain}`}</Readout>
      <TabStrip
        id="revealing"
        reveal
        selected={revealing}
        onSelect={setRevealing}
      />
      <Readout testId="revealing-readout">{`selected=${revealing}`}</Readout>
      <TabStrip
        id="nested"
        reveal
        nested
        selected={nested}
        onSelect={setNested}
      />
      <Readout testId="nested-readout">{`selected=${nested}`}</Readout>
    </div>
  );
};

const readout = (text: string | null): string =>
  Option.getOrElse(Option.fromNullishOr(text), () => "");

export const tabOverflowScenario: ScenarioBody = {
  view: () => <TabOverflowProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const offset = (id: string) =>
        Option.fromNullishOr(ctx.host.scrollOffset(`${id}-rail`));
      const bounds = (id: string) =>
        Option.fromNullishOr(ctx.host.bounds(`${id}-tab-${TAB_COUNT - 1}`));

      const plainStart = yield* ctx.expectSome(
        "the plain rail reports an offset",
        offset("plain"),
      );
      yield* ctx.expectEqual(
        "the plain rail starts at the left",
        plainStart.x,
        0,
      );

      ctx.host.click("plain-tab-0");
      ctx.host.key("end");
      yield* ctx.expectContains(
        "End selects the last tab",
        readout(ctx.host.text("plain-readout")),
        `selected=${TAB_COUNT - 1}`,
      );

      const plainAfter = yield* ctx.expectSome(
        "the plain rail still reports an offset",
        offset("plain"),
      );
      yield* ctx.expectEqual(
        "selecting a clipped tab does not move the rail",
        plainAfter.x,
        0,
      );

      const clip = yield* ctx.expectSome(
        "the clipped tab is painted",
        bounds("plain"),
      );
      yield* ctx.expectEqual(
        "the last tab starts past the rail's right edge",
        clip.x >= RAIL_WIDTH,
        true,
      );

      const revealStart = yield* ctx.expectSome(
        "the revealing rail reports an offset",
        offset("revealing"),
      );
      yield* ctx.expectEqual(
        "the revealing rail starts at the left",
        revealStart.x,
        0,
      );

      ctx.host.click("revealing-tab-0");
      ctx.host.key("end");
      yield* ctx.expectContains(
        "End selects the last tab on the revealing strip",
        readout(ctx.host.text("revealing-readout")),
        `selected=${TAB_COUNT - 1}`,
      );

      const revealAfter = yield* ctx.expectSome(
        "the revealing rail reports an offset after the reveal",
        offset("revealing"),
      );
      yield* ctx.expectEqual(
        "scrollIntoView moves the rail left",
        revealAfter.x < 0,
        true,
      );

      const revealed = yield* ctx.expectSome(
        "the revealed tab is painted",
        bounds("revealing"),
      );
      const rail = yield* ctx.expectSome(
        "the revealing rail is painted",
        Option.fromNullishOr(ctx.host.bounds("revealing-rail")),
      );

      const paintedX = revealed.x;
      yield* ctx.expectEqual(
        "the revealed tab starts inside the rail",
        paintedX >= rail.x - 1,
        true,
      );
      yield* ctx.expectEqual(
        "the revealed tab ends inside the rail",
        paintedX + revealed.width <= rail.x + rail.width + 1,
        true,
      );

      const nestedStart = yield* ctx.expectSome(
        "the nested rail reports an offset",
        offset("nested"),
      );
      yield* ctx.expectEqual(
        "the nested rail starts at the left",
        nestedStart.x,
        0,
      );

      ctx.host.click("nested-tab-0");
      ctx.host.key("end");
      yield* ctx.expectContains(
        "End selects the last nested tab",
        readout(ctx.host.text("nested-readout")),
        `selected=${TAB_COUNT - 1}`,
      );

      const nestedAfter = yield* ctx.expectSome(
        "the nested rail reports an offset after the reveal",
        offset("nested"),
      );
      yield* ctx.expectEqual(
        "a nested tab cannot be scrolled into view",
        nestedAfter.x > -(TAB_WIDTH / 2),
        true,
      );
    }),
};
