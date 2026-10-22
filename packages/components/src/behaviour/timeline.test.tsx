/**
 * Timeline behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a rail that keeps drawing past the last event, a status
 * that paints the wrong dot, a current event that is never announced, a style
 * callback that cannot see `last`, and an upcoming dot painted in the `muted`
 * surface role — 1.06:1 on the page, a dot nobody could see.
 */

import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { nodesWithRole } from "../internal/a11y.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { Timeline, TimelineItem } from "../timeline.js";

/** A three-event deploy history. */
const History = () => (
  <Timeline label="Deploy history">
    <TimelineItem
      testId="build"
      title="Build started"
      timestamp="09:41"
      status="complete"
    />
    <TimelineItem
      testId="tests"
      title="Tests passed"
      description="412 tests, 0 failures"
      timestamp="09:44"
      status="current"
    />
    <TimelineItem
      testId="deploy"
      title="Deploy"
      timestamp="—"
      status="upcoming"
    />
  </Timeline>
);

/** An item's dot, read through the rail column. */
const dotOf = (root: ComponentTestRoot, testId: string) => {
  const item = root.renderer.findByTestId(testId);
  const railId = item?.children[0];
  if (railId === undefined) return undefined;
  const rail = root.renderer.getElement(railId);
  const dotId = rail?.children[0];
  return dotId === undefined ? undefined : root.renderer.getElement(dotId);
};

/** The styled `<text>` behind a string. */
const textStyleOf = (root: ComponentTestRoot, value: string) => {
  const leaf = root.renderer.findByText(value);
  if (leaf?.parentId == null) return undefined;
  return root.renderer.getElement(leaf.parentId);
};

/** How many children the rail column has: dot alone for the last event. */
const railChildCount = (root: ComponentTestRoot, testId: string): number => {
  const item = root.renderer.findByTestId(testId);
  const railId = item?.children[0];
  if (railId === undefined) return 0;
  return root.renderer.getElement(railId)?.children.length ?? 0;
};

describe("Timeline", () => {
  it("renders events in declaration order with timestamp, title and description", () => {
    const history = renderComponent(<History />);

    expect(history.renderer.getAllText()).toEqual([
      "09:41",
      "Build started",
      "09:44",
      "Tests passed",
      "412 tests, 0 failures",
      "—",
      "Deploy",
    ]);

    history.unmount();
  });

  it("reports a named list with one listitem per event", () => {
    const history = renderComponent(<History />);

    const lists = nodesWithRole(history.renderer, "list");
    expect(lists).toHaveLength(1);
    expect(lists[0]?.name).toBe("Deploy history");
    expect(nodesWithRole(history.renderer, "listitem")).toHaveLength(3);

    history.unmount();
  });

  it("announces exactly the current event as selected", () => {
    const history = renderComponent(<History />);

    expect(
      nodesWithRole(history.renderer, "listitem").map((node) =>
        Option.contains(node.selected, true),
      ),
    ).toEqual([false, true, false]);

    history.unmount();
  });

  it("paints the dot from the event's status", () => {
    const history = renderComponent(<History />);

    expect(dotOf(history, "build")?.style.backgroundColor).toBe(
      darkTheme.colors.foreground,
    );
    expect(dotOf(history, "tests")?.style.backgroundColor).toBe(
      darkTheme.colors.primary,
    );
    expect(dotOf(history, "deploy")?.style.backgroundColor).toBe(
      darkTheme.colors.mutedForeground,
    );

    history.unmount();
  });

  it("paints every dot in a mark a reader can see on the page and a card", () => {
    // The upcoming dot painted `muted` — a *surface* role. At 1.06:1 on the
    // page it drew a dot nobody could see, and no mark contract measures that
    // role. A dot is a mark, so each fill has to clear the non-text floor on
    // every strip a timeline is drawn on.
    const probes = [lightTheme, darkTheme].map((theme) => {
      const history = renderComponent(<History />, theme.mode);
      const dots = ["build", "tests", "deploy"].map(
        (id) => dotOf(history, id)?.style.backgroundColor,
      );
      history.unmount();
      return { theme, dots };
    });

    expect(probes.map(({ dots }) => dots)).toEqual([
      [
        lightTheme.colors.foreground,
        lightTheme.colors.primary,
        lightTheme.colors.mutedForeground,
      ],
      [
        darkTheme.colors.foreground,
        darkTheme.colors.primary,
        darkTheme.colors.mutedForeground,
      ],
    ]);

    const strips = ["background", "card"] as const;
    const measurements = Arr.flatMap(probes, ({ theme, dots }) =>
      Arr.flatMap(strips, (strip) =>
        Arr.map(dots, (dot) => ({
          where: `${theme.name} ${strip}`,
          ratio: P.isString(dot)
            ? contrastRatio(dot, theme.colors[strip])
            : undefined,
        })),
      ),
    );
    expect(
      Arr.filter(
        measurements,
        (measurement) =>
          (measurement.ratio ?? Infinity) < contrastFloors.boundary,
      ),
      "a dot a reader cannot find on the strip it is drawn on",
    ).toEqual([]);

    // The premise: the role the upcoming dot used to paint is a surface, and it
    // is under the mark floor on the page in both shipped themes.
    expect(
      probes.map(({ theme }) =>
        contrastRatio(theme.colors.muted, theme.colors.background),
      ),
    ).toEqual([1.064193271496126, 1.230144227242232]);
  });

  it("draws a connector after every event but the last", () => {
    const history = renderComponent(<History />);

    expect(railChildCount(history, "build")).toBe(2);
    expect(railChildCount(history, "tests")).toBe(2);
    expect(railChildCount(history, "deploy")).toBe(1);

    history.unmount();
  });

  it("hands status and last to a style callback, in both themes", () => {
    const history = renderComponent(
      <Timeline label="Deploy history">
        <TimelineItem
          testId="one"
          title="Build"
          style={(state) => ({ opacity: state.last ? 1 : 0.5 })}
        />
        <TimelineItem testId="two" title="Deploy" status="upcoming" />
      </Timeline>,
    );

    expect(history.renderer.findByTestId("one")?.style.opacity).toBe(0.5);
    expect(textStyleOf(history, "Deploy")?.style.color).toBe(
      darkTheme.colors.mutedForeground,
    );
    history.unmount();

    const light = renderComponent(<History />, "light");
    expect(dotOf(light, "tests")?.style.backgroundColor).toBe(
      lightTheme.colors.primary,
    );
    expect(textStyleOf(light, "Deploy")?.style.color).toBe(
      lightTheme.colors.mutedForeground,
    );
    light.unmount();
  });
});
