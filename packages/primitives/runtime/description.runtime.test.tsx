/**
 * A blank `aria-description` is not a description — the runtime half (plan 586).
 *
 * The bug this guards: `ariaName` trimmed a blank label (plan 026) and the same
 * rule covered group-row and tooltip descriptions (plans 500/573/577), but the
 * public `aria-description` prop a slot trigger adds was forwarded raw. Measured
 * on the release runtime: nine surfaces published `description: "   "` verbatim
 * and a busy `Button` published `"Loading.    "`.
 *
 * The element-tree suite in `src/components/description.test.tsx` guards the
 * props; this file proves the accessibility tree the runtime actually builds.
 * It mounts a11y-only shapes, so it is not affected by the release binding's
 * focus and box-model deltas (plans 529/583).
 */

import * as Arr from "effect/Array";
import { expect, it } from "vitest";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Select } from "../src/components/Select.js";
import { Slider } from "../src/components/Slider.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { a11yNodes, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const DESCRIPTION = "Net of refunds.";

/** Every description the accessibility tree publishes, trimmed. */
const descriptions = (runtime: Runtime): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(
      a11yNodes(runtime.a11y()),
      (node) => node.aria?.description !== undefined,
    ),
    (node) => node.aria?.description ?? "",
  );

/** The control matrix: one smallest honest shape per description-bearing part. */
const controls = (description: string | undefined) => (
  <Surface>
    <Button testId="button" aria-description={description}>
      Save changes
    </Button>
    <Toggle testId="toggle" aria-description={description}>
      Grid view
    </Toggle>
    <Checkbox testId="check" label="Accept" aria-description={description} />
    <Switch testId="switch" label="Dark" aria-description={description} />
    <Input testId="input" label="Name" aria-description={description} />
    <TextArea testId="notes" label="Notes" aria-description={description} />
    <NumberField testId="count" label="Count" aria-description={description} />
    <Select
      testId="select"
      label="Fruit"
      placeholder="Pick"
      aria-description={description}
      options={[{ value: "apple", label: "Apple" }]}
    />
    <Slider testId="slider" label="Volume" aria-description={description} />
    <ScrollArea
      testId="scroll"
      label="Activity"
      aria-description={description}
    />
  </Surface>
);

it("publishes no description for a blank value", async () => {
  const runtime = await openWindow();
  runtime.render(controls("   "));
  expect(descriptions(runtime)).toStrictEqual([]);
});

it("trims a real description on every surface", async () => {
  const runtime = await openWindow();
  runtime.render(controls(`  ${DESCRIPTION}  `));
  expect(descriptions(runtime)).toStrictEqual(Arr.replicate(DESCRIPTION, 10));
});

it("publishes nothing when the prop is absent", async () => {
  const runtime = await openWindow();
  runtime.render(controls(undefined));
  expect(descriptions(runtime)).toStrictEqual([]);
});

it("announces a busy button as Loading, never a dangling separator", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="quiet" loading aria-description="   ">
        Save changes
      </Button>
    </Surface>,
  );
  expect(descriptions(runtime)).toStrictEqual(["Loading"]);
});

it("joins a real tip after Loading without padding", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="busy" loading aria-description={`  ${DESCRIPTION}  `}>
        Save changes
      </Button>
    </Surface>,
  );
  expect(descriptions(runtime)).toStrictEqual([`Loading. ${DESCRIPTION}`]);
});
