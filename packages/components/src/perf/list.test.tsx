/**
 * The large-collection ceiling.
 *
 * Guards the plan 338 baseline: a 1,000-row `List` must mount, move its roving
 * focus and re-render without crossing an order of magnitude beyond what was
 * measured on this host. The ceilings are deliberately loose (plan 327: a
 * loaded host is not a regression), so the suite catches a pathological
 * change — a quadratic per-row scan, a render loop, a registration storm —
 * rather than ordinary machine load.
 *
 * This is not a gate. `docs/performance.md` records the baseline, the method
 * and the known limitation.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { focusedTestId } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { List, ListItem, ListItemTitle } from "../list.js";

const ROWS = 1_000;

const values = Arr.map(Arr.range(0, ROWS - 1), (index) => `row-${index}`);

const tree = (
  <List testId="list" selectionMode="multiple">
    {Arr.map(values, (value) => (
      <ListItem key={value} testId={value} value={value} textValue={value}>
        <ListItemTitle>{value}</ListItemTitle>
      </ListItem>
    ))}
  </List>
);

const CEILING = {
  mount: 10_000,
  move: 5_000,
  rerender: 5_000,
} as const;

describe("large list", () => {
  it("stays inside the recorded ceiling for mount, a focus move and a re-render", () => {
    const mountStart = performance.now();
    const root = renderComponent(tree);
    const mount = performance.now() - mountStart;

    const first = root.renderer.findByTestId("row-0")?.id ?? -1;
    root.renderer.focusElement(first);
    const moveStart = performance.now();
    root.renderer.simulateKeystrokes("down");
    const move = performance.now() - moveStart;

    const rerenderStart = performance.now();
    root.rerender(tree);
    const rerender = performance.now() - rerenderStart;

    // A suite that measured nothing must not pass: the move really landed.
    expect(focusedTestId(root)).toEqual(Option.some("row-1"));
    expect(
      mount,
      `mount of ${ROWS} rows took ${mount.toFixed(0)} ms`,
    ).toBeLessThan(CEILING.mount);
    expect(
      move,
      `one ArrowDown over ${ROWS} rows took ${move.toFixed(0)} ms`,
    ).toBeLessThan(CEILING.move);
    expect(
      rerender,
      `a re-render of ${ROWS} rows took ${rerender.toFixed(0)} ms`,
    ).toBeLessThan(CEILING.rerender);
  });
});
