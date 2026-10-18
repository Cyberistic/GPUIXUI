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
import * as Option from "effect/Option";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { a11yNode, type Runtime } from "../src/testing/index.js";
import { openWindow, Surface } from "./fixture.js";

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
