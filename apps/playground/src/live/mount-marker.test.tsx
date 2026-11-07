import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { FontRegistrar } from "@gpuixui/tokens";
import type { Smoke } from "@gpuixui/testing";
import { mountProbe, ROOT_VIEW, type LiveProbe } from "./run.js";
import { mountMarkerView, mountMarker } from "./mount-marker.js";
import type { LiveProbeId } from "./registry.js";

const testIdsIn = (node: ReactNode): ReadonlyArray<string> => {
  if (!isValidElement<{ testId?: string; children?: ReactNode }>(node)) {
    return [];
  }
  const props = node.props;
  return [
    ...(props.testId === undefined ? [] : [props.testId]),
    ...Children.toArray(props.children).flatMap(testIdsIn),
  ];
};

const probe = (id: LiveProbeId, view: () => ReactNode): LiveProbe => ({
  id,
  title: id,
  capability: "tree",
  view,
  steps: () => Effect.void,
});

const registrar: FontRegistrar = { registerFont: () => {} };

const handlers = { key: () => {}, selection: () => {} };

const facts = { background: "opaque", chrome: "default" } as const;

const runMount = (
  selected: ReadonlyArray<LiveProbe>,
  scenarioId: LiveProbeId,
  render: (element: ReactNode) => void,
  waitFor: (testId: string) => Effect.Effect<void, Smoke.SmokeHostError>,
) =>
  Effect.runPromise(
    mountProbe(
      { render },
      registrar,
      selected,
      handlers,
      facts,
      waitFor,
    )({
      id: scenarioId,
    }),
  );

const mountElement = async (
  selected: ReadonlyArray<LiveProbe>,
  scenarioId: LiveProbeId,
): Promise<ReactNode> => {
  let rendered: ReactNode = null;
  await runMount(
    selected,
    scenarioId,
    (element) => {
      rendered = element;
    },
    () => Effect.void,
  );
  return rendered;
};

describe("the live mount seam", () => {
  it("renders the marker and the probe's view in one commit", async () => {
    const rendered = await mountElement(
      [probe("data-tree-lifecycle", () => <text testId="probe-view" />)],
      "data-tree-lifecycle",
    );
    const ids = testIdsIn(rendered);
    expect(ids).toContain(mountMarker("data-tree-lifecycle"));
    expect(ids).toContain("probe-view");
  });

  it("keeps the root to one host child", async () => {
    const rendered = await mountElement(
      [probe("data-tree-lifecycle", () => null)],
      "data-tree-lifecycle",
    );
    if (!isValidElement<{ children?: ReactNode }>(rendered)) {
      throw new Error("the runner rendered no element");
    }
    expect(rendered.type).toBe(Fragment);
    expect(Children.count(rendered.props.children)).toBe(1);
    expect(testIdsIn(rendered)).toContain(ROOT_VIEW);
  });

  it("waits for that scenario's marker after the render, not before it", async () => {
    const order: string[] = [];
    await runMount(
      [probe("data-tree-lifecycle", () => null)],
      "data-tree-lifecycle",
      () => {
        order.push("render");
      },
      (testId) => {
        order.push(`wait:${testId}`);
        return Effect.void;
      },
    );
    expect(order).toEqual([
      "render",
      `wait:${mountMarker("data-tree-lifecycle")}`,
    ]);
  });

  it("cannot be satisfied by another probe's marker", async () => {
    const waits: string[] = [];
    const selected = [
      probe("virtual-tree-lifecycle", () => null),
      probe("data-tree-lifecycle", () => null),
    ];
    await runMount(
      selected,
      "virtual-tree-lifecycle",
      () => {},
      (testId) => {
        waits.push(testId);
        return Effect.void;
      },
    );
    expect(waits).toEqual([mountMarker("virtual-tree-lifecycle")]);
    expect(mountMarker("virtual-tree-lifecycle")).not.toBe(
      mountMarker("data-tree-lifecycle"),
    );
  });

  it("keeps the marker inert: no paint, no press, no layout", () => {
    const element = mountMarkerView("data-tree-lifecycle");
    if (
      !isValidElement<{
        testId: string;
        style: {
          position: string;
          width: number;
          height: number;
          pointerEvents: string;
        };
      }>(element)
    ) {
      throw new Error("the marker is not an element");
    }
    expect(element.props.testId).toBe("live-probe-data-tree-lifecycle");
    expect(element.props.style).toEqual({
      position: "absolute",
      top: 0,
      left: 0,
      width: 1,
      height: 1,
      pointerEvents: "none",
    });
  });
});
