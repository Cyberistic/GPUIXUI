/**
 * A group root contains itself in the row it is in.
 *
 * The bug this guards (plan `747`): a group root is a flex item, and the runtime
 * gives every flex item an automatic content floor. Measured on the release-tag
 * build in a 220 px row, a horizontal `ToggleGroup` painted `x 12…266` (254) and
 * a horizontal `RadioGroup` `x 12…267` (255) — 34 and 35 px outside the row —
 * while `CheckboxGroup` and `ButtonGroup` fit at 220, and the same `ToggleGroup`
 * in a 220 px column fit at 220. The constraint was identical; only the parent's
 * axis differed. The three data-driven group roots now carry `shrinkLayoutStyle`
 * (`minWidth: 0`), so a bounded row shrinks the group and its items/rows shrink
 * inside it, while a group with room still hugs its options.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Stack } from "../src/components/Stack.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const NARROW = 220;
const WIDE = 600;

const OPTIONS = [
  { value: "left", label: "Align left" },
  { value: "center", label: "Align centre" },
  { value: "right", label: "Align right" },
] as const;

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.paintBounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const right = (bounds: Bounds): number => bounds.x + bounds.width;

/** The painted boxes the containment assertions read: row, group root, last item. */
interface Containment {
  readonly row: Bounds;
  readonly group: Bounds;
  readonly item: Bounds;
}

const containment = (
  runtime: Runtime,
  row: string,
  group: string,
  item: string,
): Containment => ({
  row: boundsOf(runtime, row),
  group: boundsOf(runtime, group),
  item: boundsOf(runtime, item),
});

it("shrinks a ToggleGroup to the row it is in", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ width: NARROW }}>
        <Stack direction="row" testId="row">
          <ToggleGroup
            type="single"
            label="Align"
            testId="tg"
            options={OPTIONS}
          />
        </Stack>
      </Stack>
    </Surface>,
  );
  const { row, group, item } = containment(runtime, "row", "tg", "tg-right");
  // The measured pre-fix paint was 266 against a row ending at 232.
  expect(right(group)).toBeLessThanOrEqual(right(row));
  expect(right(item)).toBeLessThanOrEqual(right(group));
  expect(group.width).toBeLessThanOrEqual(NARROW);
});

it("shrinks a RadioGroup to the row it is in", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ width: NARROW }}>
        <Stack direction="row" testId="row">
          <RadioGroup
            orientation="horizontal"
            label="Align"
            testId="rg"
            options={OPTIONS}
          />
        </Stack>
      </Stack>
    </Surface>,
  );
  const { row, group, item } = containment(runtime, "row", "rg", "rg-right");
  // The measured pre-fix paint was 267 against a row ending at 232.
  expect(right(group)).toBeLessThanOrEqual(right(row));
  expect(right(item)).toBeLessThanOrEqual(right(group));
  expect(group.width).toBeLessThanOrEqual(NARROW);
});

it("shrinks a CheckboxGroup to the row it is in", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ width: NARROW }}>
        <Stack direction="row" testId="row">
          <CheckboxGroup
            orientation="horizontal"
            label="Extras"
            testId="cg"
            options={OPTIONS}
          />
        </Stack>
      </Stack>
    </Surface>,
  );
  const { row, group, item } = containment(runtime, "row", "cg", "cg-right");
  expect(right(group)).toBeLessThanOrEqual(right(row));
  expect(right(item)).toBeLessThanOrEqual(right(group));
  expect(group.width).toBeLessThanOrEqual(NARROW);
});

it("keeps a group that has room at its content width", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ width: WIDE }}>
        <Stack direction="row" testId="row">
          <ToggleGroup
            type="single"
            label="Align"
            testId="tg"
            options={OPTIONS}
          />
        </Stack>
      </Stack>
    </Surface>,
  );
  const { row, group } = containment(runtime, "row", "tg", "tg-right");
  // The seam removes a floor; it must never stretch a group that has room.
  expect(group.width).toBeGreaterThan(0);
  expect(group.width).toBeLessThan(right(row) - row.x);
});

it("keeps the stretched-column paint", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ width: NARROW }} testId="column">
        <ToggleGroup
          type="single"
          label="Align"
          testId="tg"
          options={OPTIONS}
        />
      </Stack>
    </Surface>,
  );
  const column = boundsOf(runtime, "column");
  const group = boundsOf(runtime, "tg");
  const item = boundsOf(runtime, "tg-right");
  expect(right(group)).toBe(right(column));
  expect(right(item)).toBeLessThanOrEqual(right(group));
  expect(item.width).toBeGreaterThan(0);
});

it("lets the caller keep a wider group", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" style={{ width: NARROW }}>
        <Stack direction="row" testId="row">
          <ToggleGroup
            type="single"
            label="Align"
            testId="tg"
            options={OPTIONS}
            style={{ minWidth: 400 }}
          />
        </Stack>
      </Stack>
    </Surface>,
  );
  const { group } = containment(runtime, "row", "tg", "tg-right");
  expect(group.width).toBe(400);
});
