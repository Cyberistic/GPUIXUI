import { describe, expect, it } from "vitest";
import { clickCentreOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { List, ListItem, ListItemTitle } from "../list.js";

const values = ["one", "two", "three"] as const;

const Counter = ({ paints }: { readonly paints: Record<string, number> }) => (
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

    clickCentreOf(list, "row-two", "cmd");

    expect(
      list.renderer.findByTestId("row-two")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(paints.two).toBeGreaterThan(before.two ?? 0);
    expect(paints.three).toBe(before.three);

    list.unmount();
  });
});
