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
import { icons } from "@gpuixui/icons";
import { targetSize } from "@gpuixui/tokens";
import { Button } from "../src/components/Button.js";
import { Rating } from "../src/components/Rating.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, a11yValueOf, type Bounds, type Runtime } from "./harness.js";
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
      <Rating testId="ra" label="Quality" value={3} onChange={() => {}} />
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

it("previews the star under the pointer, then restores the rating", async () => {
  // The bug this guards: a rating gave no hint which score a press would
  // choose. The preview is paint-only, so the value the group announces must
  // not move while the pointer does.
  const filled = icons["star-filled"];
  const outline = icons.star;
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="away" label="Away" />
        <Rating label="Quality" defaultValue={2} />
      </Stack>
    </Surface>,
  );

  /** The markup the star's own icon is painting. */
  const glyph = (label: string): string => {
    const star = byLabel(runtime, label);
    const icon = Option.flatMap(Option.fromNullishOr(star.children[0]), (id) =>
      Option.fromNullishOr(runtime.renderer.getElement(id)),
    );
    return String(
      Option.getOrElse(
        Option.map(icon, (element) => element.customProps?.source),
        () => "none",
      ),
    );
  };
  const painted = (): ReadonlyArray<string> =>
    Arr.map(Arr.range(1, 5), (index) => glyph(`${index} of 5`));

  expect(painted()).toStrictEqual([filled, filled, outline, outline, outline]);
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);

  const four = byLabel(runtime, "4 of 5");
  const bounds = Option.getOrElse(runtime.boundsOfId(four.id), () =>
    expect.fail("the fourth star painted no bounds"),
  );
  runtime.mouseMoveAt(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  runtime.flush();
  expect(painted()).toStrictEqual([filled, filled, filled, filled, outline]);
  // The preview is not the answer: the value still announces two stars.
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);

  runtime.hover("away");
  runtime.flush();
  expect(painted()).toStrictEqual([filled, filled, outline, outline, outline]);
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
        onChange={(value) => seen.push(value)}
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

it("activates the focused star with Space on the release", async () => {
  // The bug: a star is a `role="radio"` tab stop, but only the arrows moved the
  // value — Space did nothing on the star a keyboard user had landed on.
  const runtime = await openWindow();
  const seen: number[] = [];
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="b">Before</Button>
        <Rating
          testId="ra"
          label="Quality"
          onChange={(value) => seen.push(value)}
        />
      </Stack>
    </Surface>,
  );
  runtime.click("b");
  runtime.focusNext();
  expect(focusLabel(runtime)).toBe("1 of 5");
  runtime.keyDown("ra", "space");
  expect(checkedStars(runtime)[0]).toBe("unchecked");
  expect(seen).toStrictEqual([]);
  runtime.keyUp("ra", "space");
  expect(checkedStars(runtime)[0]).toBe("checked");
  expect(seen).toStrictEqual([1]);
});

it("keeps a one-star rating when the left arrow is nudged", async () => {
  // The bug: ArrowLeft at one star reported 0, so a reader trying to stay put
  // cleared a rating the page says only Delete clears.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={1} />
    </Surface>,
  );
  runtime.keyDown("ra", "left");
  expect(checkedStars(runtime)[0]).toBe("checked");
  expect(checkedStars(runtime)[1]).toBe("unchecked");
  // Delete is still the clear path.
  runtime.keyDown("ra", "delete");
  expect(checkedStars(runtime)[0]).toBe("unchecked");
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

it("paints the destructive role on chosen stars when invalid", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={2} invalid />
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
  expect(colorOf("1 of 5")).toBe(testTheme.colors.destructive);
  expect(colorOf("5 of 5")).toBe(testTheme.colors.mutedForeground);
});

it("declares the keyboard ring on every star and paints no shadow on a press", async () => {
  // The bug: the ring was merged on the focused star, so a click looked like a
  // Tab. Every star is a tab-stop candidate, so every star declares the outline
  // and the runtime paints it on the one that holds keyboard focus.
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
      Option.fromNullishOr(byLabel(runtime, label).style["focusVisible"]),
    );
  const shadowed = (label: string): boolean =>
    Option.isSome(
      Option.fromNullishOr(byLabel(runtime, label).style["boxShadow"]),
    );
  expect(ringed("3 of 5")).toBe(true);
  expect(ringed("2 of 5")).toBe(true);
  expect(shadowed("3 of 5")).toBe(false);
  expect(shadowed("2 of 5")).toBe(false);
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

it("gives every star a pressable target of at least the floor", async () => {
  // The smallest glyph is the strongest case: `sm` draws a 14px icon, so the
  // padding alone was an 18px press target. The star box must reserve the
  // 24px WCAG 2.2 SC 2.5.8 floor around it.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" size="sm" defaultValue={3} />
    </Surface>,
  );
  Arr.forEach(Arr.range(1, 5), (index) => {
    const label = `${index} of 5`;
    const bounds = Option.getOrElse(
      runtime.boundsOfId(byLabel(runtime, label).id),
      () => expect.fail(`${label} painted no box`),
    );
    expect(bounds.width).toBeGreaterThanOrEqual(targetSize.minimum);
    expect(bounds.height).toBeGreaterThanOrEqual(targetSize.minimum);
  });
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
          onChange={(value) => seen.push(value)}
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

it("scores a half from where inside the star the press landed", async () => {
  // The bug guarded: a rating could only score whole stars, and the recorded
  // reason — that the runtime cannot clip — was false. The press position says
  // which half of the star was meant, in a real hit-tested click.
  const runtime = await openWindow();
  const seen: number[] = [];
  runtime.render(
    <Surface>
      <Rating
        testId="ra"
        label="Quality"
        allowHalf
        defaultValue={1}
        onChange={(value) => seen.push(value)}
      />
    </Surface>,
  );
  const four = byLabel(runtime, "4 of 5");
  const bounds = Option.getOrElse(runtime.boundsOfId(four.id), () =>
    expect.fail("the fourth star painted no bounds"),
  );
  const y = bounds.y + bounds.height / 2;

  runtime.clickAt(bounds.x + bounds.width / 4, y);
  expect(seen.at(-1)).toBe(3.5);
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "checked",
    "half",
    "unchecked",
  ]);

  runtime.clickAt(bounds.x + (bounds.width * 3) / 4, y);
  expect(seen.at(-1)).toBe(4);
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "checked",
    "checked",
    "checked",
    "unchecked",
  ]);
});

it("cuts the half star from the filled glyph instead of scaling it", async () => {
  // A half is the filled glyph painted whole inside a box half the star wide
  // with `overflow: hidden`: the glyph keeps the outline's height, so it is cut
  // at the midpoint rather than shrunk to fit. The runtime reports no pixels
  // here, so the proof is geometry plus the measured clipping capability.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" allowHalf defaultValue={3.5} />
    </Surface>,
  );
  const star = byLabel(runtime, "4 of 5");
  const starBox = Option.getOrElse(runtime.boundsOfId(star.id), () =>
    expect.fail("the fourth star painted no bounds"),
  );
  const clipId = star.children[1];
  expect(clipId).toBeDefined();
  const clip = Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(clipId), (id) =>
      runtime.boundsOfId(id),
    ),
    () => expect.fail("the half star painted no clip"),
  );
  expect(clip.x).toBe(starBox.x);
  expect(clip.width).toBe(starBox.width / 2);

  /** The painted box of an element id, or the test's own failure. */
  const boundsOf = (id: Option.Option<number>, what: string): Bounds =>
    Option.getOrElse(
      Option.flatMap(id, (element) => runtime.boundsOfId(element)),
      () => expect.fail(`${what} painted no bounds`),
    );
  /** The id `depth` levels below `id`, following first children. */
  const descendant = (id: number, depth: number): Option.Option<number> =>
    depth === 0
      ? Option.some(id)
      : Option.flatMap(
          Option.flatMap(
            Option.fromNullishOr(runtime.renderer.getElement(id)),
            (element) => Option.fromNullishOr(element.children[0]),
          ),
          (child) => descendant(child, depth - 1),
        );
  // A whole filled star paints its glyph directly; the half star's glyph sits
  // two levels inside the clip (clip → cell → glyph). Same height means the
  // half was cut at the midpoint, not scaled to fit the half-wide box, and the
  // same offset from the star's edge means the cut glyph is in the outline's
  // own place — a cell stretched to the clip would start the glyph outside it.
  const third = byLabel(runtime, "3 of 5");
  const thirdBox = Option.getOrElse(runtime.boundsOfId(third.id), () =>
    expect.fail("the third star painted no bounds"),
  );
  const whole = boundsOf(
    Option.fromNullishOr(third.children[0]),
    "the third star's glyph",
  );
  const halfGlyph = boundsOf(
    Option.flatMap(Option.fromNullishOr(clipId), (clip) => descendant(clip, 2)),
    "the half star's glyph",
  );
  expect(halfGlyph.height).toBe(whole.height);
  expect(halfGlyph.x - starBox.x).toBe(whole.x - thirdBox.x);

  // The other stars are untouched: whole stars paint no clip at all.
  expect(byLabel(runtime, "3 of 5").children).toHaveLength(1);
  expect(byLabel(runtime, "5 of 5").children).toHaveLength(1);
});

it("previews the half the pointer is over, then restores the rating", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" allowHalf defaultValue={1} />
    </Surface>,
  );
  const four = byLabel(runtime, "4 of 5");
  const bounds = Option.getOrElse(runtime.boundsOfId(four.id), () =>
    expect.fail("the fourth star painted no bounds"),
  );
  runtime.mouseMoveAt(
    bounds.x + bounds.width / 4,
    bounds.y + bounds.height / 2,
  );
  runtime.flush();
  // The previewed half paints a clip; the announced value stays put.
  expect(byLabel(runtime, "4 of 5").children).toHaveLength(2);
  expect(byLabel(runtime, "5 of 5").children).toHaveLength(1);
  expect(checkedStars(runtime)).toStrictEqual([
    "checked",
    "unchecked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);

  runtime.mouseMoveAt(
    bounds.x + (bounds.width * 3) / 4,
    bounds.y + bounds.height / 2,
  );
  runtime.flush();
  expect(byLabel(runtime, "4 of 5").children).toHaveLength(1);
});

it("steps a half score by half and lands Home on the half star", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" allowHalf defaultValue={3} />
    </Surface>,
  );
  runtime.keyDown("ra", "right");
  expect(checkedStars(runtime)[3]).toBe("half");
  runtime.keyDown("ra", "right");
  expect(checkedStars(runtime)[3]).toBe("checked");
  runtime.keyDown("ra", "home");
  expect(checkedStars(runtime)[0]).toBe("half");
  expect(checkedStars(runtime)[1]).toBe("unchecked");
});
