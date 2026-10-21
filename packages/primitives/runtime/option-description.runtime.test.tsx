/**
 * A selection row's visible description in the real GPUix runtime.
 *
 * The bug this guards (plan 500): `CheckboxGroup` and `RadioGroup` accepted an
 * `option.description` and painted it as a caption, but the row published only
 * its name. A screen reader heard "Email" and never "A digest.". The pages
 * recorded that as a runtime limitation because GPUix 0.10.0 has no
 * `aria-describedby`; it does, however, expose the string form
 * `aria-description`, which this package already uses for tooltips.
 *
 * These cases read the accessibility tree the renderer builds, not the
 * authored props, so a description that never reaches the node fails here.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Box } from "../src/components/Box.js";
import { a11yNode, type Bounds, type Runtime } from "../src/testing/index.js";
import { openWindow, Surface } from "./fixture.js";

/**
 * The painted box of the `<text>` node holding `text`.
 *
 * The runtime reports text nodes by content rather than by `testId`, so this is
 * how a layout assertion names the label and the caption of one row.
 */
const textBounds = (runtime: Runtime, text: string): Bounds => {
  const element = runtime.renderer.findByText(text);
  if (element === undefined)
    expect.fail(`no text element paints ${JSON.stringify(text)}`);
  const bounds = runtime.renderer.getElementBounds(element.id);
  if (bounds === null)
    expect.fail(`the runtime reports no bounds for ${JSON.stringify(text)}`);
  return bounds;
};

/** A row's box, from its `testId`. */
const rowBounds = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`no row carries the testId ${testId}`),
  );

/** The description the accessibility node matching `match` reports, if any. */
const descriptionOf = (
  runtime: Runtime,
  match: { readonly role?: string; readonly label?: string },
): Option.Option<string> =>
  Option.flatMap(a11yNode(runtime.a11y(), match), (node) =>
    Option.fromNullishOr(node.aria?.description),
  );

it("announces a checkbox row's visible description", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="channels"
        label="Channels"
        options={[
          { value: "email", label: "Email", description: "A digest." },
          { value: "push", label: "Push" },
          { value: "sms", label: "SMS", description: "   " },
        ]}
      />
    </Surface>,
  );
  expect(
    Option.getOrUndefined(
      descriptionOf(runtime, { role: "CheckBox", label: "Email" }),
    ),
  ).toBe("A digest.");
  // An absent description stays absent, and a whitespace-only one is not a
  // description at all (the blank-label rule, plan 026).
  expect(
    descriptionOf(runtime, { role: "CheckBox", label: "Push" }),
  ).toStrictEqual(Option.none());
  expect(
    descriptionOf(runtime, { role: "CheckBox", label: "SMS" }),
  ).toStrictEqual(Option.none());
});

it("announces a radio option's visible description", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="cadence"
        label="Cadence"
        options={[
          { value: "weekly", label: "Weekly", description: "Every Monday." },
          { value: "monthly", label: "Monthly" },
        ]}
      />
    </Surface>,
  );
  expect(
    Option.getOrUndefined(
      descriptionOf(runtime, { role: "RadioButton", label: "Weekly" }),
    ),
  ).toBe("Every Monday.");
  expect(
    descriptionOf(runtime, { role: "RadioButton", label: "Monthly" }),
  ).toStrictEqual(Option.none());
});

it("paints a radio option's description under its name, as a checkbox row does", async () => {
  // The bug this guards (plan 809): the radio row painted the box, label and
  // caption as three siblings of a row-shaped flex row, so `Every Monday.`
  // started 49 px right of `Weekly` inside the label's own 17 px band while the
  // same option shape in `CheckboxGroup` painted a caption under the name.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RadioGroup
        testId="cadence"
        label="Cadence"
        options={[
          { value: "weekly", label: "Weekly", description: "Every Monday." },
          { value: "monthly", label: "Monthly" },
        ]}
      />
      <CheckboxGroup
        testId="channels"
        label="Channels"
        options={[{ value: "email", label: "Email", description: "A digest." }]}
      />
    </Surface>,
  );
  const label = textBounds(runtime, "Weekly");
  const caption = textBounds(runtime, "Every Monday.");
  // The shared rule: the caption starts on the name's own column and below it,
  // exactly as the `CheckboxGroup` control in the same window paints.
  expect(caption.x).toBe(label.x);
  expect(caption.y).toBeGreaterThanOrEqual(label.y + label.height);
  const checkLabel = textBounds(runtime, "Email");
  const checkCaption = textBounds(runtime, "A digest.");
  expect(checkCaption.x).toBe(checkLabel.x);
  expect(checkCaption.y).toBeGreaterThanOrEqual(
    checkLabel.y + checkLabel.height,
  );
  // A described row is two lines, so it is taller than its undescribed sibling.
  expect(rowBounds(runtime, "cadence-weekly").height).toBeGreaterThan(
    rowBounds(runtime, "cadence-monthly").height,
  );
});

it("keeps a described radio row inside a bounded group", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box tone="background" style={{ width: 220 }}>
        <RadioGroup
          testId="narrow"
          label="Delivery"
          options={[
            {
              value: "digest",
              label: "A weekly digest of everything that changed",
              description:
                "One summary every Monday covering the whole workspace.",
            },
          ]}
        />
      </Box>
    </Surface>,
  );
  const group = rowBounds(runtime, "narrow");
  const right = group.x + group.width;
  const label = textBounds(
    runtime,
    "A weekly digest of everything that changed",
  );
  const caption = textBounds(
    runtime,
    "One summary every Monday covering the whole workspace.",
  );
  // Both runs stay inside the group, and the caption is under the name rather
  // than beside it (the class plan 380 fixed for a horizontal group).
  Arr.forEach([label, caption], (run) => {
    expect(run.x).toBeGreaterThanOrEqual(group.x);
    expect(run.x + run.width).toBeLessThanOrEqual(right);
  });
  expect(caption.y).toBeGreaterThanOrEqual(label.y + label.height);
});
