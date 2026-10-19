/**
 * `InfoTip` in the real GPUix runtime.
 *
 * The regression guarded (plan 073): `examples/basic-app` wrapped the info icon
 * in a bare `Box`, which paints no role, no name and no tab stop — the tip was
 * hover-only and invisible to assistive technology. This suite mounts the one
 * honest shape and proves the keyboard path, the description, and the ring.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { focusRing } from "@gpuixui/tokens";
import { InfoTip } from "../src/components/InfoTip.js";
import { FLOATING_MARGIN } from "../src/core/floating.js";
import { a11yNode, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow, settleFocus, testTheme } from "./fixture.js";

const CONTENT = "Booked revenue, net of refunds.";

/**
 * The page used to say an InfoTip's tip "does not wrap" (plan `395`), because
 * plan `391` updated `tooltip.mdx` but not this component's page. This is long
 * enough to need more than one line in the 1280 px window the fixture opens.
 */
const LONG_CONTENT =
  "Revenue is recognised when the service is delivered, net of refunds and " +
  "credits, and excludes taxes collected on behalf of a jurisdiction. This " +
  "explanation is deliberately long enough to need more than one line in any " +
  "reasonable window, because the tip used to be nowrap with no width cap.";

const renderTip = (runtime: Runtime): void =>
  runtime.render(
    <Surface>
      <InfoTip
        content={CONTENT}
        label="Revenue definition"
        testId="trigger"
        tipTestId="tip"
      />
    </Surface>,
  );

it("opens an InfoTip on hover", async () => {
  const runtime = await openWindow();
  renderTip(runtime);
  expect(runtime.allText()).not.toContain(CONTENT);
  runtime.hover("trigger");
  expect(runtime.allText()).toContain(CONTENT);
});

it("reaches an InfoTip by keyboard, with its name and description", async () => {
  const runtime = await openWindow();
  renderTip(runtime);
  const trigger = Option.getOrElse(
    a11yNode(runtime.a11y(), {
      role: "Image",
      label: "Revenue definition",
    }),
    () => expect.fail("the trigger produced no accessibility node"),
  );
  expect(trigger.aria?.description).toBe(CONTENT);
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("trigger");
  expect(runtime.allText()).toContain(CONTENT);
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Tooltip", label: CONTENT }),
    ),
  ).toBe(true);
});

it("renders no tip and no description for blank content", async () => {
  // Plan 573: a whitespace `content` published `description: "   "` and opened
  // an empty `role="tooltip"` node named `"   "`. There is nothing to say, so
  // the trigger renders unchanged.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <InfoTip
        content="   "
        label="Revenue definition"
        testId="trigger"
        tipTestId="tip"
      />
    </Surface>,
  );
  const trigger = Option.getOrElse(
    a11yNode(runtime.a11y(), {
      role: "Image",
      label: "Revenue definition",
    }),
    () => expect.fail("the trigger produced no accessibility node"),
  );
  expect(trigger.aria?.description).toBeUndefined();
  runtime.hover("trigger");
  runtime.flush();
  expect(Option.isNone(runtime.bounds("tip"))).toBe(true);
  expect(Option.isNone(a11yNode(runtime.a11y(), { role: "Tooltip" }))).toBe(
    true,
  );
});

it("paints a focus ring on the trigger", async () => {
  const runtime = await openWindow();
  renderTip(runtime);
  const before = Option.flatMap(runtime.element("trigger"), (element) =>
    Option.fromNullishOr(element.style.boxShadow),
  );
  expect(before).toStrictEqual(Option.none());
  runtime.focusNext();
  await settleFocus();
  const after = Option.flatMap(runtime.element("trigger"), (element) =>
    Option.fromNullishOr(element.style.boxShadow),
  );
  // `inset` is the renderer's normalisation, not part of the authored ring:
  // the release build reports the five authored fields (plan `590`).
  expect({ ...Option.getOrUndefined(after), inset: undefined }).toStrictEqual({
    ...focusRing(testTheme).boxShadow,
    inset: undefined,
  });
});

/** The tip's painted box, after opening it with a hover. */
const openAndMeasure = async (
  content: string,
): Promise<{ readonly width: number; readonly height: number }> => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <InfoTip
        content={content}
        label="Revenue definition"
        testId="trigger"
        tipTestId="tip"
      />
    </Surface>,
  );
  runtime.hover("trigger");
  runtime.flush();
  const box = Option.getOrElse(runtime.bounds("tip"), () =>
    expect.fail("the open tip painted no box"),
  );
  return { width: box.width, height: box.height };
};

it("wraps a long tip inside the window instead of painting one wide line", async () => {
  const long = await openAndMeasure(LONG_CONTENT);
  // The wrapper caps at the room on the resolved side; for a top-side tip that
  // is the window less one margin at each edge (plan `391`).
  expect(long.width).toBeLessThanOrEqual(1280 - 2 * FLOATING_MARGIN);
  // More than one caption line: the measured form is 1 251 × 40 px (plan `395`).
  expect(long.height).toBeGreaterThan(testTheme.typography.caption.lineHeight);
});

it("keeps a short tip on one line", async () => {
  const short = await openAndMeasure(CONTENT);
  // Two caption lines would be `2 × lineHeight`; the measured one-line tip is
  // 24 px against a 20 px line, i.e. the padding and no second line (plan `395`).
  expect(short.height).toBeLessThan(
    2 * testTheme.typography.caption.lineHeight,
  );
});
