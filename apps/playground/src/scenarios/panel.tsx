/**
 * `panel-resize` — a pointer-captured divider drag with clamping.
 *
 * Pointer capture is what makes a resize feel right: the pointer may leave the
 * 6px divider (and the pane) and the drag must keep tracking. The scenario
 * drags right by 80px and expects the readout and the pane's measured width to
 * follow, then drags far past the minimum and expects the clamp to hold.
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import type { PlaygroundScenario } from "../types.js";

const PanelProbe = () => {
  const theme = useTheme();
  const [size, setSize] = useState(320);
  const [parent, setParent] = useState(500);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 660 }}
    >
      <div style={{ height: 160, width: parent }}>
        <SplitPane
          id="panel"
          initial={320}
          min={80}
          max={520}
          onResize={setSize}
          primary={
            <div
              style={{
                height: "100%",
                backgroundColor: theme.colors.muted,
                padding: 8,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>A</text>
            </div>
          }
          secondary={
            <div
              style={{
                height: "100%",
                backgroundColor: theme.colors.card,
                padding: 8,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>B</text>
            </div>
          }
        />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Readout testId="panel-readout">{`split=${size}`}</Readout>
        <div
          testId="panel-parent-grow"
          tabIndex={0}
          role="button"
          onClick={() => setParent((current) => (current === 500 ? 600 : 500))}
          style={{
            padding: 6,
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>toggle width</text>
        </div>
      </div>
    </div>
  );
};

/** Parses the readout `split=<n>`; a missing readout is `-1`, never a guess. */
const panelSize = (ctx: Smoke.SmokeContext): number =>
  pipe(
    Option.fromNullishOr(ctx.host.text("panel-readout")),
    Option.map((readout) =>
      Number.parseInt(readout.slice("split=".length), 10),
    ),
    Option.getOrElse(() => -1),
  );

export const panelScenario: PlaygroundScenario = {
  id: "panel-resize",
  title: "Panel resize: pointer capture and clamping",
  capability: "panel",
  view: () => <PanelProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const before = yield* ctx.expectSome(
        "panel readout present",
        Option.fromNullishOr(ctx.host.text("panel-readout")),
      );
      yield* ctx.expectContains("panel starts at 320", before, "split=320");

      ctx.host.drag("panel-divider", 80, 0, 6);
      const grown = yield* ctx.expectSome(
        "panel readout after drag",
        Option.fromNullishOr(ctx.host.text("panel-readout")),
      );
      yield* ctx.expectContains("drag grew the pane by 80", grown, "split=400");

      const paneA = yield* ctx.expectSome(
        "pane A painted",
        Option.fromNullishOr(ctx.host.bounds("panel-pane-a")),
      );
      yield* ctx.expectNear(
        "measured pane width matches the readout",
        paneA.width,
        400,
        2,
      );

      ctx.host.drag("panel-divider", -600, 0, 6);
      yield* ctx.expectEqual("drag clamps at the minimum", panelSize(ctx), 80);

      ctx.host.drag("panel-divider", 600, 0, 6);
      yield* ctx.expectEqual("drag clamps at the maximum", panelSize(ctx), 520);
    }),
};
