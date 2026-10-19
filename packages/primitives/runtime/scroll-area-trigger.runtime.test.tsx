/**
 * `ScrollArea` as a slot trigger, in the real runtime.
 *
 * The bug guarded (plan `399b`): a **labelled** area is one focusable root
 * (`role="region"`, `tabIndex=0`, a name and a ring), so plan `345`'s rule says
 * it must accept the slot contract a `Tooltip` clones onto its child. It did
 * not declare `TriggerHandlers`, so a tip around it painted nothing on hover or
 * on keyboard focus, and the Tooltip page's "every single-root control does"
 * claim was false.
 *
 * Two facts the cases keep separate:
 *
 * - keyboard focus is the reliable path: focus reaches the region and the tip's
 *   string becomes the Region's `aria-description`;
 * - hover only reaches the root when the root is the **hit-tested** element.
 *   GPUix does not bubble a mouse event to an ancestor (the rule plan `072`
 *   measured for focus), so a painted child that covers the viewport receives
 *   the pointer and no tip opens. The page documents that limit; the second
 *   case guards it rather than promising a hover the runtime cannot deliver.
 *
 * The last case proves forwarding does not replace the region's own keyboard
 * scroll rule.
 *
 * **Plan `610`:** the focus path was still missing. A slot's `ref` reaches a
 * component as its **imperative handle**, not the host instance, and the handle
 * carried no `id`, so `Tooltip` compared `undefined` with the tracker's sample
 * and never opened the tip. Measured: `focusNext()` put native focus on the
 * region and the tip stayed shut. The handle now carries the viewport's id; the
 * focus case below drives the same `Tab` a keyboard user does.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { a11yNode } from "../src/testing/index.js";
import { openWindow, settleFocus, Surface } from "./fixture.js";

const TIP = "Scroll for newer entries";

/** A labelled region whose content does not cover the whole viewport. */
const sparse = () => (
  <Surface>
    <Tooltip content={TIP} side="bottom" testId="tip">
      <ScrollArea label="Activity" testId="target" style={{ height: 120 }}>
        <Box tone="card" style={{ width: 300, height: 60 }} />
      </ScrollArea>
    </Tooltip>
  </Surface>
);

/** A labelled region whose painted content covers the whole viewport. */
const filled = () => (
  <Surface>
    <Tooltip content={TIP} side="bottom" testId="tip">
      <ScrollArea label="Activity" testId="target" style={{ height: 120 }}>
        <Box tone="card" style={{ width: 300, height: 600 }} />
      </ScrollArea>
    </Tooltip>
  </Surface>
);

/** The same shape without a label: inert, so it must not become a trigger. */
const unlabelled = () => (
  <Surface>
    <Tooltip content={TIP} side="bottom" testId="tip">
      <ScrollArea testId="target" style={{ height: 120 }}>
        <Box tone="card" style={{ width: 300, height: 60 }} />
      </ScrollArea>
    </Tooltip>
  </Surface>
);

const tipPainted = (text: ReadonlyArray<string>): boolean => text.includes(TIP);

it("does not make an unlabelled area a hover trigger", async () => {
  // The bug guarded (plan 638): only a labelled area is a trigger, and both the
  // ScrollArea and Tooltip pages say so. The passive spread was unconditional,
  // so hovering this inert container painted a tip it could never open from the
  // keyboard and that reached no accessibility node.
  const runtime = await openWindow();
  runtime.render(unlabelled());
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(false);
  expect(Option.isNone(a11yNode(runtime.a11y(), { role: "Region" }))).toBe(
    true,
  );
});

it("opens a Tooltip on hover over the region itself", async () => {
  // The region is 120 tall and its painted content only 60, so the centre is
  // the root: the slot's `onMouseEnter` reaches it. Old direction (plan 399b
  // §0): `allText()` stayed `[]` because the handler was dropped.
  const runtime = await openWindow();
  runtime.render(sparse());
  expect(tipPainted(runtime.allText())).toBe(false);
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(true);
});

it("documents the hover limit: a painted child owns the pointer", async () => {
  // Measured (plan 399b §0): a child with a background is the hit-test element
  // and the runtime does not bubble the enter to its ancestor, so a
  // content-filled region is a keyboard-only trigger. This case fails if the
  // library ever claims a hover the runtime cannot deliver.
  const runtime = await openWindow();
  runtime.render(filled());
  runtime.hover("target");
  expect(tipPainted(runtime.allText())).toBe(false);
});

it("opens a Tooltip on keyboard focus", async () => {
  // The bug guarded (plan 610): the slot's ref is the ScrollArea's imperative
  // handle, so without `id` the tracker comparison never matched and the tip
  // stayed shut while the region held native focus.
  const runtime = await openWindow();
  runtime.render(filled());
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);

  // Escape dismisses a focus-opened tip while the region keeps focus (the
  // shared rule from plan 605); a fresh sample must not reopen it.
  runtime.keyDown("target", "escape");
  runtime.flush();
  await settleFocus();
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(false);
});

it("carries the tip as the Region's description", async () => {
  // The description is a render-time prop the slot clones onto the child; it
  // must reach the accessibility node even while the tip is shut.
  const runtime = await openWindow();
  runtime.render(filled());
  const region = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Region", label: "Activity" }),
    () => expect.fail("the labelled ScrollArea produced no Region node"),
  );
  expect(region.aria?.description).toBe(TIP);
});

it("keeps its keyboard scroll rule while wrapped in a Tooltip", async () => {
  // The composition guard: the slot's handlers must not replace the region's
  // own key path, and the passive spread must not drop the wheel handler.
  const runtime = await openWindow();
  runtime.render(filled());
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  runtime.keyDown("target", "pagedown");
  const page = Option.getOrElse(runtime.scrollOffset("target"), () =>
    expect.fail("the region painted no scrollable box"),
  );
  expect(page.y).toBeLessThan(0);
  runtime.keyDown("target", "home");
  expect(Option.getOrElse(runtime.scrollOffset("target"), () => page).y).toBe(
    0,
  );
});
