/**
 * List row subscriptions, in the real GPUix renderer.
 *
 * The bug this guards: one context value carried the selection, so a click that
 * moved the selection re-rendered every row, including rows whose state did not
 * change. Each row now reads its own slice from the store; this suite counts
 * each row's style resolution and requires an untouched row to stay put.
 */

import { describe, expect, it } from "vitest";
import { clickCentreOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { List, ListItem, ListItemTitle } from "../list.js";

const values = ["one", "two", "three"] as const;

/** Three rows, each recording how often its style resolves (= how often it paints). */
const Counter = ({
  paints,
}: {
  readonly paints: Record<string, number>;
}) => (
  <List selectionMode="multiple" defaultValue={["one"]}>
    {values.map((value) => (
      <ListItem
        key={value}
        value={value}
        testId={`row-${value}`}
        style={() => {
          paints[value] = (paints[value] ?? 0) + 1;
          return {};
        }}
      >
        <ListItemTitle>{value}</ListItemTitle>
      </ListItem>
    ))}
  </List>
);

describe("List row subscriptions", () => {
  it("repaints only the rows whose state moved", () => {
    const paints: Record<string, number> = {};
    const list = renderComponent(<Counter paints={paints} />);
    const before = { ...paints };

    // Cmd adds a second choice; row three's state does not move.
    clickCentreOf(list, "row-two", "cmd");

    expect(
      list.renderer.findByTestId("row-two")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(paints.two).toBeGreaterThan(before.two ?? 0);
    expect(paints.three).toBe(before.three);

    list.unmount();
  });
});
