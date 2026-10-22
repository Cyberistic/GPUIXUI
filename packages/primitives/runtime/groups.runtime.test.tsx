/**
 * The rows of the group controls in the real GPUix runtime.
 *
 * Each case is a defect measured in the pinned runtime, and the row the user
 * presses is the subject of all three:
 *
 * 1. **A painted box is not a press target.** GPUix gives a filled element a
 *    mouse-blocking hitbox (`style.rs` `should_occlude`), so the checked box a
 *    group draws inside its row swallowed the press before the row's handler
 *    ran: a checked `CheckboxGroup` option could be checked by clicking the row
 *    but not unchecked by clicking its own box. The box is decorative, so it now
 *    declares `pointerEvents: "none"` and the row hears every press.
 * 2. **The ring belongs on the element that holds focus.** `focusVisible` is a
 *    refinement the runtime applies only to an element it tracks focus for
 *    (`apply_focus_visible`, gated on a focus handle), so a declaration on a
 *    decorative circle never painted: the radio and checkbox groups had no
 *    keyboard focus indicator at all.
 * 3. **A row is a press target.** A single-line option row measured 17px tall
 *    on 0.11.0 — under the 24px floor WCAG 2.2 SC 2.5.8 states — so every row
 *    reserves it.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import { targetSize } from "@gpuixui/tokens";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import {
  a11yNodes,
  a11yValueOf,
  type Bounds,
  type Runtime,
} from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

/** The row an option painted, found by the name it announces. */
const rowOf = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === label,
    ),
    () => expect.fail(`the runtime retained no row labelled ${label}`),
  );

/** The decorative box inside a row — the first child the group draws. */
const boxOf = (runtime: Runtime, label: string) => {
  const row = rowOf(runtime, label);
  return Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(row.children[0]), (id) =>
      Option.fromNullishOr(runtime.renderer.getElement(id)),
    ),
    () => expect.fail(`the ${label} row painted no box`),
  );
};

const boundsOf = (runtime: Runtime, label: string): Bounds => {
  const row = rowOf(runtime, label);
  return Option.getOrElse(runtime.boundsOfId(row.id), () =>
    expect.fail(`the ${label} row painted no box`),
  );
};

/** An option's announced state — `aria-valuetext` is the only state this runtime carries. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

/** Whether an element declares the runtime's keyboard ring. */
const ringed = (element: {
  readonly style: { readonly focusVisible?: unknown };
}) => Option.isSome(Option.fromNullishOr(element.style.focusVisible));

const focusOn = (runtime: Runtime, label: string): void => {
  runtime.click("before");
  runtime.focusNext();
  runtime.flush();
  expect(
    Option.getOrElse(
      Option.map(runtime.focusedElement(), (element) =>
        String(element.customProps?.["aria-label"] ?? element.type),
      ),
      () => "nothing",
    ),
  ).toBe(label);
};

const groups = (props?: { readonly defaultValue?: string }) => (
  <Surface>
    <Stack direction="row">
      <Switch testId="before" label="Before" />
    </Stack>
    <RadioGroup
      testId="radios"
      label="Pick"
      defaultValue={props?.defaultValue ?? "a"}
      options={[
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ]}
    />
    <CheckboxGroup
      testId="checks"
      label="Many"
      defaultValue={["x"]}
      options={[
        { value: "x", label: "Xray" },
        { value: "y", label: "Yankee" },
      ]}
    />
  </Surface>
);

it("unchecks a checked checkbox group option when its own box is pressed", async () => {
  // The bug this guards: the filled box owns a mouse-blocking hitbox, so the
  // press never reached the row — the only clickable part of a checked option
  // was the empty space beside its box.
  const runtime = await openWindow();
  let changes = 0;
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="checks"
        label="Many"
        defaultValue={["x"]}
        onValueChange={() => {
          changes += 1;
        }}
        options={[
          { value: "x", label: "Xray" },
          { value: "y", label: "Yankee" },
        ]}
      />
    </Surface>,
  );
  expect(announced(runtime, "Xray")).toBe("checked");
  runtime.clickElement(boxOf(runtime, "Xray"));
  runtime.flush();
  expect(changes).toBe(1);
  expect(announced(runtime, "Xray")).toBe("unchecked");
});

it("declares the keyboard ring on the option that holds native focus", async () => {
  // The bug this guards: the ring was declared on the decorative circle, which
  // has no focus handle, so the runtime never painted it. A group option had no
  // keyboard focus indicator.
  const runtime = await openWindow();
  runtime.render(groups());

  focusOn(runtime, "Alpha");
  const alpha = rowOf(runtime, "Alpha");
  expect(ringed(alpha)).toBe(true);
  expect(ringed(boxOf(runtime, "Alpha"))).toBe(false);

  runtime.focusNext();
  runtime.flush();
  const xray = rowOf(runtime, "Xray");
  expect(
    Option.getOrElse(
      Option.map(runtime.focusedElement(), (element) =>
        String(element.customProps?.["aria-label"] ?? element.type),
      ),
      () => "nothing",
    ),
  ).toBe("Xray");
  expect(ringed(xray)).toBe(true);
  expect(ringed(boxOf(runtime, "Xray"))).toBe(false);
});

it("publishes a row's trimmed name, and no name at all for a blank label", async () => {
  // The bug this guards: the row's `aria-label` was the option's label
  // verbatim, so a padded label reached the accessibility tree with its padding
  // and a blank one published an empty name — an icon-only option announced
  // nothing rather than leaving the name to the content it paints.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        label="Many"
        options={[
          { value: "icon", label: "   " },
          { value: "y", label: "  Yankee  " },
        ]}
      />
    </Surface>,
  );
  const names = Arr.map(
    Arr.filter(
      a11yNodes(runtime.a11y()),
      (node) => node.aria?.role === "CheckBox",
    ),
    (node) => node.aria?.label,
  );

  // The padded label announced its padding, and the blank one announced an
  // empty name; the row now publishes the trimmed name, or none at all.
  expect(names).toEqual([undefined, "Yankee"]);
});

it("paints every group option at the pressable floor", async () => {
  // The bug this guards: a single-line option row was the height of its text
  // (17px on 0.11.0), so the target a pointer had to hit was under the floor.
  const runtime = await openWindow();
  runtime.render(groups());
  Arr.forEach(["Alpha", "Beta", "Xray", "Yankee"], (label) => {
    expect(boundsOf(runtime, label).height).toBeGreaterThanOrEqual(
      targetSize.minimum,
    );
  });
});
