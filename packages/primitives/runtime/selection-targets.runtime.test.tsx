import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import { targetSize } from "@gpuixui/tokens";
import { Checkbox } from "../src/components/Checkbox.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { type Bounds, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

it("toggles a Checkbox from its padding and its drawing exactly once each", async () => {
  const runtime = await openWindow();
  let changes = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox
          testId="check"
          label="Agree"
          checked={false}
          onCheckedChange={() => {
            changes += 1;
          }}
        />
      </Stack>
    </Surface>,
  );
  const target = boundsOf(runtime, "check");
  expect(target.width).toBeGreaterThanOrEqual(targetSize.minimum);
  expect(target.height).toBeGreaterThanOrEqual(targetSize.minimum);

  runtime.clickAt(target.x + 2, target.y + 2);
  runtime.flush();
  expect(changes).toBe(1);

  runtime.clickAt(target.x + target.width / 2, target.y + target.height / 2);
  runtime.flush();
  expect(changes).toBe(2);
});

it("toggles a Switch from its padding and its track exactly once each", async () => {
  const runtime = await openWindow();
  let changes = 0;
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Switch
          testId="toggle"
          label="Dark mode"
          checked={false}
          onCheckedChange={() => {
            changes += 1;
          }}
        />
      </Stack>
    </Surface>,
  );
  const target = boundsOf(runtime, "toggle");
  expect(target.height).toBeGreaterThanOrEqual(targetSize.minimum);
  expect(target.width).toBeGreaterThan(testTheme.iconSize.md);

  runtime.clickAt(target.x + target.width / 2, target.y + 2);
  runtime.flush();
  expect(changes).toBe(1);

  runtime.clickAt(target.x + target.width / 2, target.y + target.height / 2);
  runtime.flush();
  expect(changes).toBe(2);
});

it("paints an empty box's and track's edge in the measured boundary role", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Checkbox testId="check" label="Agree" />
        <Switch testId="toggle" label="Notify" />
      </Stack>
    </Surface>,
  );
  const edges = Arr.map(
    Arr.filter(
      runtime.all(),
      (element) => element.style.borderColor !== undefined,
    ),
    (element) => element.style.borderColor,
  );
  expect(edges).toStrictEqual([
    testTheme.colors.borderStrong,
    testTheme.colors.borderStrong,
  ]);
});
