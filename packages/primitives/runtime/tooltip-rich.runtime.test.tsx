/**
 * A rich (node) `Tooltip` in the real runtime.
 *
 * The gap these guard (plan 742): a node tip has no text the runtime can read,
 * so it painted a `tooltip` accessibility node with **no name** and left its
 * trigger with no description — the whole hint was invisible to assistive
 * technology, while `docs/tooltip.mdx` offered no way to fix it. `Tooltip` now
 * takes `label`, which is both the trigger's description and the open tip's
 * name; a string tip keeps its own text as the default, and an unlabelled node
 * tip still paints unnamed (the honest, documented result).
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Text } from "../src/components/Text.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { a11yNode, type Runtime } from "../src/testing/index.js";
import { awaitFrame, openWindow, Surface } from "./fixture.js";

/** The one node with this role, or a failure naming what was expected. */
const nodeOf = (runtime: Runtime, role: string, label?: string) =>
  Option.getOrElse(a11yNode(runtime.a11y(), { role, label }), () =>
    expect.fail(
      `no ${role} accessibility node${label === undefined ? "" : ` named ${label}`}`,
    ),
  );

/** The description a node reports, if any. */
const descriptionOf = (runtime: Runtime, role: string, label: string) =>
  Option.fromNullishOr(nodeOf(runtime, role, label).aria?.description);

/** Wait for the keyboard-opened tip to paint. */
const opened = (runtime: Runtime, text: string) =>
  awaitFrame(() => runtime.allText().includes(text), "the tip paints");

it("announces a labelled rich tip and describes its trigger", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip
        label="Billing cycle"
        content={<Text role="code">gpuixui</Text>}
        side="bottom"
        testId="tip"
      >
        <Button testId="trigger" label="Save">
          Save
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await opened(runtime, "gpuixui");
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Tooltip", label: "Billing cycle" }),
    ),
  ).toBe(true);
  expect(Option.getOrUndefined(descriptionOf(runtime, "Button", "Save"))).toBe(
    "Billing cycle",
  );
});

it("paints an unlabelled rich tip without inventing a name", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip
        content={<Text role="code">gpuixui</Text>}
        side="bottom"
        testId="tip"
      >
        <Button testId="trigger" label="Save">
          Save
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await opened(runtime, "gpuixui");
  const tip = nodeOf(runtime, "Tooltip");
  expect(Option.fromNullishOr(tip.aria?.label)).toStrictEqual(Option.none());
  expect(descriptionOf(runtime, "Button", "Save")).toStrictEqual(Option.none());
});

it("keeps a string tip's text when the label is blank", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="A hint" label="   " side="bottom" testId="tip">
        <Button testId="trigger" label="Save">
          Save
        </Button>
      </Tooltip>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await opened(runtime, "A hint");
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Tooltip", label: "A hint" }),
    ),
  ).toBe(true);
  expect(Option.getOrUndefined(descriptionOf(runtime, "Button", "Save"))).toBe(
    "A hint",
  );
});
