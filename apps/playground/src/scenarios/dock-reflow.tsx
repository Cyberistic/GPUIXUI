import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import { Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const ROW = 560;

const SIDEBAR = { narrow: 120, wide: 220 } as const;

const INSPECTOR = 100;

interface LayoutPayload {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}

interface Reports {
  readonly width: number;
  readonly count: number;
}

interface Report {
  readonly sidebar: number;
  readonly centre: Reports;
  readonly inspector: Reports;
}

const firstReport = (width: number): Reports => ({ width, count: 1 });
const again = (reports: Reports, payload: LayoutPayload): Reports => ({
  width: Math.round(payload.width ?? reports.width),
  count: reports.count + 1,
});

const DockReflowProbe = () => {
  const theme = useTheme();
  const [report, setReport] = useState<Report>({
    sidebar: SIDEBAR.narrow,
    centre: firstReport(ROW - SIDEBAR.narrow - INSPECTOR),
    inspector: firstReport(INSPECTOR),
  });

  const setSidebar = (sidebar: number) => (): void =>
    setReport((current) => ({ ...current, sidebar }));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: ROW + 20,
      }}
    >
      <div
        testId="reflow-row"
        style={{ display: "flex", width: ROW, height: 120 }}
      >
        <div
          testId="reflow-sidebar"
          style={{ width: report.sidebar, backgroundColor: theme.colors.muted }}
        />
        <div
          testId="reflow-centre"
          onLayout={(payload) =>
            setReport((current) => ({
              ...current,
              centre: again(current.centre, payload),
            }))
          }
          style={{ flexGrow: 1, backgroundColor: theme.colors.card }}
        />
        <div
          testId="reflow-inspector"
          onLayout={(payload) =>
            setReport((current) => ({
              ...current,
              inspector: again(current.inspector, payload),
            }))
          }
          style={{ width: INSPECTOR, backgroundColor: theme.colors.accent }}
        />
      </div>
      <Readout testId="reflow-centre-readout">
        {`w=${report.centre.width} reports=${report.centre.count}`}
      </Readout>
      <Readout testId="reflow-inspector-readout">
        {`w=${report.inspector.width} reports=${report.inspector.count}`}
      </Readout>
      <Pressable testId="reflow-widen" onClick={setSidebar(SIDEBAR.wide)}>
        Widen sidebar
      </Pressable>
      <Pressable testId="reflow-narrow" onClick={setSidebar(SIDEBAR.narrow)}>
        Narrow sidebar
      </Pressable>
    </div>
  );
};

const reported = (readout: string, key: string): number =>
  Option.getOrElse(
    pipe(
      Str.match(new RegExp(`${key}=(\\d+)`))(readout),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.map((digits) => Number.parseInt(digits, 10)),
    ),
    () => -1,
  );

export const dockReflowScenario: ScenarioBody = {
  view: () => <DockReflowProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const readout = (testId: string): string =>
        Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");
      const centre = (): string => readout("reflow-centre-readout");
      const inspector = (): string => readout("reflow-inspector-readout");
      const centreWidth = (): number => reported(centre(), "w");
      const centreReports = (): number => reported(centre(), "reports");
      const inspectorWidth = (): number => reported(inspector(), "w");
      const inspectorReports = (): number => reported(inspector(), "reports");
      const boundsWidth = (testId: string): number =>
        Option.getOrElse(
          Option.map(
            Option.fromNullishOr(ctx.host.bounds(testId)),
            (bounds) => bounds.width,
          ),
          () => -1,
        );

      yield* ctx.expectEqual(
        "the centre pane takes the space the panel and inspector leave",
        centreWidth(),
        ROW - SIDEBAR.narrow - INSPECTOR,
      );
      yield* ctx.expectEqual(
        "the inspector keeps its fixed width",
        inspectorWidth(),
        INSPECTOR,
      );
      yield* ctx.expectEqual(
        "the report is the painted box, not the style's intent",
        centreWidth(),
        boundsWidth("reflow-centre"),
      );

      const reportsBefore = centreReports();
      ctx.host.click("reflow-widen");
      yield* ctx.expectEqual(
        "the first pass reports the width the pane still has",
        centreWidth(),
        ROW - SIDEBAR.narrow - INSPECTOR,
      );
      yield* ctx.expectEqual(
        "the stale pass is one report, not the settled one",
        centreReports(),
        reportsBefore + 1,
      );

      ctx.host.advance(50);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the widened sidebar shrinks the centre by exactly what it took",
        centreWidth(),
        ROW - SIDEBAR.wide - INSPECTOR,
      );
      yield* ctx.expectEqual(
        "the settled report is the painted box, not the style's intent",
        centreWidth(),
        boundsWidth("reflow-centre"),
      );
      yield* ctx.expectEqual(
        "the inspector keeps its box through the reflow",
        inspectorWidth(),
        INSPECTOR,
      );
      yield* ctx.expectEqual(
        "a pane that kept its box still got a report",
        inspectorReports(),
        2,
      );

      const reportsWide = centreReports();
      ctx.host.click("reflow-narrow");
      ctx.host.advance(50);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the narrowed sidebar gives the centre its width back",
        centreWidth(),
        ROW - SIDEBAR.narrow - INSPECTOR,
      );
      yield* ctx.expectEqual(
        "the second reflow reports as well",
        centreReports() > reportsWide,
        true,
      );
      yield* ctx.expectEqual(
        "the report and the painted box still agree",
        centreWidth(),
        boundsWidth("reflow-centre"),
      );
    }),
};
