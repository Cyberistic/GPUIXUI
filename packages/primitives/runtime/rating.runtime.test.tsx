/**
 * `Rating` in the real GPUix runtime.
 *
 * A rating is a radio group whose arrows clamp rather than wrap, so the runtime
 * suite proves the parts an element-tree test cannot: a hit-tested click on a
 * star, native focus following the value, the filled/outline icons actually
 * painted in two theme roles, the single tab stop, and the hover preview the
 * pointer drives (plan 094).
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Box } from "../src/components/Box.js";
import { Rating } from "../src/components/Rating.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const byLabel = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Arr.findFirst(
      runtime.all(),
      (element) => element.customProps?.["aria-label"] === label,
    ),
    () => expect.fail(`the runtime retained no element labelled ${label}`),
  );

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const checkedStars = (runtime: Runtime, max = 5): ReadonlyArray<string> =>
  Arr.map(Arr.range(1, max), (index) =>
    announced(runtime, `${index} of ${max}`),
  );

const focusLabel = (runtime: Runtime): string =>
  Option.getOrElse(
    Option.map(runtime.focusedElement(), (element) =>
      String(element.customProps?.["aria-label"] ?? ""),
    ),
    () => "nothing",
  );

it("is a named group of stars that reports the rating", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" value={3} onValueChange={() => {}} />
    </Surface>,
  );
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "RadioGroup", label: "Quality" }),
    ),
  ).toBe(true);
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "checked",
    "unchecked",
    "unchecked",
  ]);
});

it("selects the star that a real click lands on", async () => {
  const runtime = await openWindow();
  const seen: number[] = [];
  runtime.render(
    <Surface>
      <Rating
        testId="ra"
        label="Quality"
        defaultValue={1}
        onValueChange={(value) => seen.push(value)}
      />
    </Surface>,
  );
  runtime.clickElement(byLabel(runtime, "4 of 5"));
  expect(seen.at(-1)).toBe(4);
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "checked",
    "checked",
    "unchecked",
  ]);
});

it("moves with the arrows and takes native focus with it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={3} />
    </Surface>,
  );
  runtime.keyDown("ra", "right");
  expect(checkedStars(runtime)[3]).toBe("checked");
  expect(focusLabel(runtime)).toBe("4 of 5");
  runtime.keyDown("ra", "end");
  expect(checkedStars(runtime)[4]).toBe("checked");
  // Clamped, not wrapped: another Right at five stays at five.
  runtime.keyDown("ra", "right");
  expect(checkedStars(runtime)[0]).toBe("checked");
  expect(checkedStars(runtime)[4]).toBe("checked");
});

it("clears the rating with Delete", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={4} />
    </Surface>,
  );
  runtime.keyDown("ra", "delete");
  expect(checkedStars(runtime)).toStrictEqual([
    "unchecked",
    "unchecked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);
});

it("paints the brand role on filled stars and the muted role on empty ones", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={2} />
    </Surface>,
  );
  const colorOf = (label: string): unknown => {
    const star = byLabel(runtime, label);
    return Option.getOrElse(
      Option.flatMap(Option.fromNullishOr(star.children[0]), (id) =>
        Option.map(
          Option.fromNullishOr(runtime.renderer.getElement(id)),
          (svg) => svg.style["color"],
        ),
      ),
      () => expect.fail(`${label} painted no icon`),
    );
  };
  expect(colorOf("1 of 5")).toBe(testTheme.colors.primary);
  expect(colorOf("5 of 5")).toBe(testTheme.colors.mutedForeground);
});

it("rings the star that holds focus", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={3} />
    </Surface>,
  );
  runtime.clickElement(byLabel(runtime, "3 of 5"));
  runtime.flush();
  const ringed = (label: string): boolean =>
    Option.isSome(
      Option.fromNullishOr(byLabel(runtime, label).style["boxShadow"]),
    );
  expect(ringed("3 of 5")).toBe(true);
  expect(ringed("2 of 5")).toBe(false);
});

it("is one tab stop: Tab enters the rating and the next Tab leaves it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="b">Before</Button>
        <Rating testId="ra" label="Quality" defaultValue={3} />
      </Stack>
    </Surface>,
  );
  runtime.click("b");
  runtime.focusNext();
  expect(focusLabel(runtime)).toBe("3 of 5");
  runtime.focusNext();
  // Every other star is tabIndex -1, so the group contributes one stop, not five.
  expect(runtime.focused()).toStrictEqual(Option.some("b"));
});

it("refuses input and leaves the tab order when disabled", async () => {
  const runtime = await openWindow();
  const seen: number[] = [];
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="b">Before</Button>
        <Rating
          testId="ra"
          label="Quality"
          disabled
          defaultValue={3}
          onValueChange={(value) => seen.push(value)}
        />
      </Stack>
    </Surface>,
  );
  runtime.clickElement(byLabel(runtime, "5 of 5"));
  runtime.keyDown("ra", "right");
  expect(seen).toStrictEqual([]);
  runtime.click("b");
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("b"));
});

it("paints a failed validation on the empty stars only", async () => {
  const runtime = await openWindow();
  const colorOf = (label: string): unknown => {
    const star = byLabel(runtime, label);
    const iconId = Option.getOrElse(
      Option.fromNullishOr(star.children[0]),
      () => expect.fail(`the star ${label} painted no icon`),
    );
    return Option.getOrElse(
      Option.fromNullishOr(runtime.renderer.getElement(iconId)),
      () => expect.fail(`the icon under ${label} vanished`),
    ).style["color"];
  };
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={2} invalid />
    </Surface>,
  );
  expect(colorOf("1 of 5")).toBe(testTheme.colors.primary);
  expect(colorOf("3 of 5")).toBe(testTheme.colors.destructive);
  // The control: the same star is muted when nothing failed.
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={2} />
    </Surface>,
  );
  expect(colorOf("3 of 5")).toBe(testTheme.colors.mutedForeground);
});

/** The tint of the icon under a star, by the star's announced name. */
const filledColor = (runtime: Runtime, label: string): unknown => {
  const star = byLabel(runtime, label);
  const iconId = Option.getOrElse(Option.fromNullishOr(star.children[0]), () =>
    expect.fail(`the star ${label} painted no icon`),
  );
  return Option.getOrElse(
    Option.fromNullishOr(runtime.renderer.getElement(iconId)),
    () => expect.fail(`the icon under ${label} vanished`),
  ).style["color"];
};

const pointerScene = (rating: ReactElement): ReactElement => (
  <Surface>
    <Stack direction="row">
      {rating}
      <Box testId="outside" tone="none" style={{ width: 40, height: 40 }} />
    </Stack>
  </Surface>
);

it("previews the rating under the pointer, and leaving restores it", async () => {
  const runtime = await openWindow();
  runtime.render(
    pointerScene(<Rating testId="ra" label="Quality" defaultValue={2} />),
  );
  runtime.hover("ra-star-4");
  expect(filledColor(runtime, "1 of 5")).toBe(testTheme.colors.primary);
  expect(filledColor(runtime, "4 of 5")).toBe(testTheme.colors.primary);
  expect(filledColor(runtime, "5 of 5")).toBe(testTheme.colors.mutedForeground);
  // A preview is paint, not a selection: the announcement stays committed.
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);
  runtime.hover("outside");
  expect(filledColor(runtime, "4 of 5")).toBe(testTheme.colors.mutedForeground);
});

it("previews downward from a higher committed value", async () => {
  const runtime = await openWindow();
  runtime.render(
    pointerScene(<Rating testId="ra" label="Quality" defaultValue={4} />),
  );
  runtime.hover("ra-star-1");
  expect(filledColor(runtime, "1 of 5")).toBe(testTheme.colors.primary);
  expect(filledColor(runtime, "2 of 5")).toBe(testTheme.colors.mutedForeground);
  expect(filledColor(runtime, "4 of 5")).toBe(testTheme.colors.mutedForeground);
  runtime.hover("outside");
  expect(filledColor(runtime, "2 of 5")).toBe(testTheme.colors.primary);
  expect(filledColor(runtime, "4 of 5")).toBe(testTheme.colors.primary);
});

it("previews with the brand role while an invalid rating marks only what is missing", async () => {
  const runtime = await openWindow();
  runtime.render(
    pointerScene(
      <Rating testId="ra" label="Quality" defaultValue={2} invalid />,
    ),
  );
  runtime.hover("ra-star-4");
  expect(filledColor(runtime, "4 of 5")).toBe(testTheme.colors.primary);
  expect(filledColor(runtime, "5 of 5")).toBe(testTheme.colors.destructive);
});

it("takes no preview when the rating cannot take input", async () => {
  const runtime = await openWindow();
  Arr.forEach([{ disabled: true }, { readOnly: true }] as const, (props) => {
    runtime.render(
      pointerScene(
        <Rating testId="ra" label="Quality" defaultValue={2} {...props} />,
      ),
    );
    runtime.hover("ra-star-5");
    expect(filledColor(runtime, "5 of 5")).toBe(
      testTheme.colors.mutedForeground,
    );
  });
});
