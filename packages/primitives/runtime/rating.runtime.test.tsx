/**
 * `Rating` in the real GPUix runtime.
 *
 * A rating is a radio group whose arrows clamp rather than wrap, so the runtime
 * suite proves the parts an element-tree test cannot: a hit-tested click on a
 * star, native focus following the value, the filled/outline icons actually
 * painted in two theme roles, and the single tab stop.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Rating } from "../src/components/Rating.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import { a11yNode, a11yValueOf, type Runtime } from "../src/testing/index.js";
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

/** The tint of the icon painted under the star announced as `label`. */
const paintedColor = (runtime: Runtime, label: string): unknown => {
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

it("mounts a non-finite count as one named star", async () => {
  // The bug guarded (plan 366): `max={Infinity}` reached `Arr.range` and the
  // component threw `RangeError: Invalid array length`; `NaN` named its only
  // star "1 of NaN".
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" max={Number.POSITIVE_INFINITY} />
    </Surface>,
  );
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "RadioButton", label: "1 of 1" }),
    ),
  ).toBe(true);
  expect(
    Option.isNone(
      a11yNode(runtime.a11y(), { role: "RadioButton", label: "2 of 1" }),
    ),
  ).toBe(true);
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

it("moves native focus to the tab stop when Delete clears the rating", async () => {
  // The bug guarded (plan 334): Delete cleared the value and painted the ring on
  // star 1, but `onMove(0)` looked for a star "0", found none, and never moved
  // native focus — so the ring and the keyboard were on different stars.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={4} />
    </Surface>,
  );
  runtime.click("ra-star-4");
  runtime.flush();
  expect(runtime.focused()).toStrictEqual(Option.some("ra-star-4"));
  const focusedId = Option.getOrElse(
    Option.fromNullishOr(runtime.renderer.getFocusedElementId()),
    () => expect.fail("the clicked star took no native focus"),
  );
  // Delete through the focused element, as the keyboard would deliver it.
  runtime.renderer.nativeSimulateKeyDown(focusedId, "delete");
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  expect(runtime.focused()).toStrictEqual(Option.some("ra-star-1"));
  expect(checkedStars(runtime)).toStrictEqual([
    "unchecked",
    "unchecked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);
  const ringed = (label: string): boolean =>
    Option.isSome(
      Option.fromNullishOr(byLabel(runtime, label).style["boxShadow"]),
    );
  expect(ringed("1 of 5")).toBe(true);
  expect(ringed("4 of 5")).toBe(false);
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
  const colorOf = (label: string): unknown => paintedColor(runtime, label);
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

it("previews the star under the pointer and restores the value on leave", async () => {
  // The bug guarded (plan 094): a pointer could not preview the value a click
  // would set, so an unrated group showed outline stars under the mouse.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Rating testId="ra" label="Quality" defaultValue={2} />
        <Box testId="outside" tone="background" padding="sm">
          <Text>Elsewhere</Text>
        </Box>
      </Stack>
    </Surface>,
  );
  runtime.hover("ra-star-4");
  expect(paintedColor(runtime, "4 of 5")).toBe(testTheme.colors.primary);
  expect(paintedColor(runtime, "5 of 5")).toBe(
    testTheme.colors.mutedForeground,
  );
  // A preview is paint only: the announcement stays the committed value.
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);
  runtime.hover("outside");
  expect(paintedColor(runtime, "4 of 5")).toBe(
    testTheme.colors.mutedForeground,
  );
  expect(paintedColor(runtime, "2 of 5")).toBe(testTheme.colors.primary);
});

it("previews downward when the pointer is left of the value", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={4} />
    </Surface>,
  );
  runtime.hover("ra-star-2");
  expect(paintedColor(runtime, "2 of 5")).toBe(testTheme.colors.primary);
  expect(paintedColor(runtime, "3 of 5")).toBe(
    testTheme.colors.mutedForeground,
  );
  // Moving between stars previews the new one; the value is still untouched.
  runtime.hover("ra-star-1");
  expect(paintedColor(runtime, "1 of 5")).toBe(testTheme.colors.primary);
  expect(paintedColor(runtime, "2 of 5")).toBe(
    testTheme.colors.mutedForeground,
  );
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "checked",
    "checked",
    "unchecked",
  ]);
});

it("keeps an invalid preview on the brand role", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={2} invalid />
    </Surface>,
  );
  runtime.hover("ra-star-4");
  expect(paintedColor(runtime, "4 of 5")).toBe(testTheme.colors.primary);
  // The error still marks the star that remains missing.
  expect(paintedColor(runtime, "5 of 5")).toBe(testTheme.colors.destructive);
});

it.each(
  Arr.map(
    [
      { name: "disabled", props: { disabled: true } },
      { name: "read-only", props: { readOnly: true } },
    ] as const,
    (testCase) => [testCase.name, testCase.props] as const,
  ),
)("does not preview when %s", async (_name, props) => {
  const runtime = await openWindow();
  const seen: number[] = [];
  runtime.render(
    <Surface>
      <Rating
        testId="ra"
        label="Quality"
        defaultValue={2}
        onValueChange={(value) => seen.push(value)}
        {...props}
      />
    </Surface>,
  );
  runtime.hover("ra-star-5");
  expect(paintedColor(runtime, "5 of 5")).toBe(
    testTheme.colors.mutedForeground,
  );
  expect(seen).toStrictEqual([]);
});
