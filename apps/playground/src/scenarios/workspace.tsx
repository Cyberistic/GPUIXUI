/**
 * Tier 4 probe: `workspace-tab-drag`.
 *
 * The docking question is whether a workspace can be composed from what GPUix
 * has: tabs in React state, a pointer-captured divider, and a tab that moves
 * between panes. Plan `130` §3.3 wants a real drag between panes; pointer
 * capture keeps every move on the pressed tab, so the tab decides the drop from
 * the pointer delta (a documented heuristic, not a floating preview — 0.10.0
 * has no `position: fixed`).
 *
 * The last step records the honesty note the docking plan needs: with no
 * storage primitive, panel state does not survive a remount; persistence is the
 * app boundary's job (Effect `FileSystem`/`Config`). `workspace-restore` (plan
 * `167`) measures the restore contract that follows from that.
 */
import { useState } from "react";
import { Effect, Option } from "effect";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import { TabStrip } from "../panels/tab-strip.js";
import type { PlaygroundScenario } from "../types.js";

type PaneId = "a" | "b";

const WorkspaceProbe = () => {
  const theme = useTheme();
  const [aTabs, setATabs] = useState<ReadonlyArray<string>>(["one", "two"]);
  const [bTabs, setBTabs] = useState<ReadonlyArray<string>>([]);
  const [active, setActive] = useState("one");
  const [split, setSplit] = useState(320);

  const move = (id: string, from: string) => {
    if (from === "a") {
      setATabs((tabs) => tabs.filter((tab) => tab !== id));
      setBTabs((tabs) => [...tabs, id]);
    } else {
      setBTabs((tabs) => tabs.filter((tab) => tab !== id));
      setATabs((tabs) => [...tabs, id]);
    }
    setActive(id);
  };

  const strip = (pane: PaneId, tabs: ReadonlyArray<string>) => (
    <TabStrip
      testIdPrefix="tab-"
      pane={pane}
      tabs={tabs}
      active={active}
      onSelect={setActive}
      onMove={move}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 660,
        height: 260,
      }}
    >
      <Readout testId="ws-readout">
        {`aTabs=${aTabs.length === 0 ? "none" : aTabs.join(",")} bTabs=${
          bTabs.length === 0 ? "none" : bTabs.join(",")
        } active=${active} split=${split}`}
      </Readout>
      <div style={{ height: 200 }}>
        <SplitPane
          id="ws"
          initial={320}
          min={160}
          max={480}
          onResize={setSplit}
          primary={
            <div style={{ height: "100%", backgroundColor: theme.colors.card }}>
              {strip("a", aTabs)}
            </div>
          }
          secondary={
            <div
              style={{
                height: "100%",
                backgroundColor: theme.colors.background,
              }}
            >
              {strip("b", bTabs)}
            </div>
          }
        />
      </div>
      <Readout testId="ws-note">
        no storage primitive: panel state resets on remount (persistence is the
        app boundary)
      </Readout>
    </div>
  );
};

export const workspaceScenario: PlaygroundScenario = {
  id: "workspace-tab-drag",
  title: "Workspace: tabs, drag between panes and split resize",
  capability: "workspace",
  view: () => <WorkspaceProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const read = (): string =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("ws-readout")),
          () => "",
        );

      yield* ctx.expectContains(
        "initial workspace state",
        read(),
        "aTabs=one,two bTabs=none active=one split=320",
      );

      ctx.host.click("tab-two");
      yield* ctx.expectContains(
        "clicking a tab activates it",
        read(),
        "active=two",
      );

      ctx.host.drag("tab-one", 200, 0, 8);
      yield* ctx.expectContains(
        "drag moved the tab to pane B",
        read(),
        "aTabs=two bTabs=one",
      );

      ctx.host.drag("ws-divider", 80, 0, 6);
      const resized = yield* ctx.expectSome(
        "workspace readout after resize",
        Option.fromNullishOr(ctx.host.text("ws-readout")),
      );
      yield* ctx.expectContains(
        "divider drag resized the split",
        resized,
        "split=400",
      );
    }),
};
