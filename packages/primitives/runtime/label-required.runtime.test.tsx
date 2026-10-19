/**
 * A required `Label` marker must be announced as words, not an asterisk.
 *
 * The bug class (plan `581`): the marker was a plain `Text`, and the runtime
 * exposes every `<text>` as a `Label`. A required label therefore published a
 * third node — `Label: "*"` — after the name and description, while the page
 * called the marker "visual only". Assistive technology heard an unexplained
 * asterisk; 0.10.0 has no `aria-required`, so the marker is the only channel
 * that can say the field is required. It is now an `Image` named by
 * `Label.requiredLabel` ("required" by default), and no bare `*` node exists.
 *
 * The negative case is the other direction: a label without `required` must
 * publish no image at all.
 *
 * The marker is also a run a flex row can squeeze (plan `647`): `Text` removes
 * its content floor by default (`plan 383`), so a 60 px label column painted the
 * star at 2.5 px and a 12 px one at 0.5 px. It now opts out (`shrink={false}`)
 * and keeps its width while the name wraps.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Label } from "../src/components/Label.js";
import {
  a11yNode,
  a11yNodes,
  type Bounds,
  type Runtime,
} from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** Mount one label in a fresh window and return its accessibility dump. */
const labelTree = async (node: ReactElement) => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  runtime.flush();
  return { dump: runtime.a11y(), runtime };
};

/** Whether any prose node reports the bare marker text. */
const hasAsteriskNode = (runtime: Runtime): boolean =>
  Arr.some(
    a11yNodes(runtime.a11y()),
    (node) => node.aria?.role === "Label" && node.aria.value === "*",
  );

it("names the required marker instead of publishing a bare asterisk", async () => {
  const { dump, runtime } = await labelTree(
    <Label required description="Shown in the switcher">
      Email
    </Label>,
  );
  expect(
    Arr.some(
      a11yNodes(dump),
      (node) => node.aria?.role === "Label" && node.aria.value === "Email",
    ),
  ).toBe(true);
  // The old shape was `Label: "*"`; it must be gone, not merely joined by an
  // image (a duplicate would still read "asterisk").
  expect(hasAsteriskNode(runtime)).toBe(false);
  expect(
    Option.isSome(a11yNode(dump, { role: "Image", label: "required" })),
  ).toBe(true);
});

it("takes the marker's name from requiredLabel", async () => {
  const { dump } = await labelTree(
    <Label required requiredLabel="obligatoire">
      Email
    </Label>,
  );
  expect(
    Option.isSome(a11yNode(dump, { role: "Image", label: "obligatoire" })),
  ).toBe(true);
});

it("publishes no marker without the required prop", async () => {
  const { dump, runtime } = await labelTree(<Label>Email</Label>);
  expect(Option.isNone(a11yNode(dump, { role: "Image" }))).toBe(true);
  expect(hasAsteriskNode(runtime)).toBe(false);
});

/** The painted box of the marker's `*` run. */
const markerBox = (runtime: Runtime): Bounds =>
  Option.getOrElse(
    Option.flatMap(
      Arr.findFirst(runtime.all(), (element) => element.text === "*"),
      (element) => runtime.boundsOfId(element.id),
    ),
    () => expect.fail("the required marker painted no box"),
  );

/** A required label in a fixed-width column, and its paint. */
const labelIn = async (width: number) => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box tone="background" style={{ width }} testId="column">
        <Label required>Notification preferences</Label>
      </Box>
    </Surface>,
  );
  runtime.flush();
  return {
    marker: markerBox(runtime),
    column: Option.getOrElse(runtime.paintBounds("column"), () =>
      expect.fail("the runtime painted no box for the column"),
    ),
  };
};

it("keeps the marker's own width in a narrow column", async () => {
  // The old direction: the marker was 6 px in a 240 px column, 2.5 px in a
  // 60 px one and 0.5 px in a 12 px one — the name wrapped *and* squeezed it.
  const roomy = await labelIn(240);
  const narrow = await labelIn(60);
  expect(narrow.marker.width).toBe(roomy.marker.width);
  expect(narrow.marker.width).toBeGreaterThan(0);
  expect(narrow.marker.x + narrow.marker.width).toBeLessThanOrEqual(
    narrow.column.x + narrow.column.width,
  );
});
