/**
 * A scroller's own report is not a painted box: it is slid by the scroll
 * offset (plan `598`).
 *
 * The bug guarded, measured on the pinned release build: a 120-high
 * `ScrollArea` at `y 12` scrolled to `-100` reported `y -88`, and the harness
 * aimed the next wheel at its reported centre (`y -28`) — outside the window —
 * so a second `runtime.wheel` did nothing (`-100` stayed `-100`). A consumer's
 * "scroll to the bottom in two gestures" test was silently a one-gesture test.
 * The same report also made a containment check against a scroller compare a
 * painted child with a slid region (the `basic-app` 6/7 failure).
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { openWindow, Surface } from "./fixture.js";

const scene = (
  <Surface>
    <ScrollArea axis="vertical" style={{ height: 120, width: 300 }} testId="s">
      <Box tone="card" style={{ width: 600, height: 600 }} testId="tall" />
    </ScrollArea>
  </Surface>
);

const offsetOf = (runtime: Awaited<ReturnType<typeof openWindow>>) =>
  Option.getOrElse(runtime.scrollOffset("s"), () =>
    expect.fail("the ScrollArea painted no scrollable box"),
  );

it("scrolls on every wheel gesture, not only the first", async () => {
  const runtime = await openWindow();
  runtime.render(scene);
  runtime.wheel("s", 0, -100);
  runtime.flush();
  expect(offsetOf(runtime).y).toBe(-100);
  // The second gesture starts from the slider's new offset; an aim point read
  // from the slid report lands outside the window and this stays at -100.
  runtime.wheel("s", 0, -100);
  runtime.flush();
  expect(offsetOf(runtime).y).toBe(-200);
});

it("keeps a scroller's painted box put while its report slides", async () => {
  const runtime = await openWindow();
  runtime.render(scene);
  const paintedBefore = Option.getOrElse(runtime.paintBounds("s"), () =>
    expect.fail("the ScrollArea painted no box"),
  );
  const reportedBefore = Option.getOrElse(runtime.bounds("s"), () =>
    expect.fail("the ScrollArea reported no box"),
  );
  runtime.wheel("s", 0, -100);
  runtime.flush();
  const paintedAfter = Option.getOrElse(runtime.paintBounds("s"), () =>
    expect.fail("the scrolled ScrollArea painted no box"),
  );
  const reportedAfter = Option.getOrElse(runtime.bounds("s"), () =>
    expect.fail("the scrolled ScrollArea reported no box"),
  );
  // A scroller does not move when its content does.
  expect(paintedAfter).toStrictEqual(paintedBefore);
  // The raw report is the content origin, i.e. the painted box plus the offset.
  expect(reportedBefore).toStrictEqual(paintedBefore);
  expect(reportedAfter.y).toBe(paintedBefore.y + offsetOf(runtime).y);
  expect(reportedAfter.height).toBe(paintedBefore.height);
});
