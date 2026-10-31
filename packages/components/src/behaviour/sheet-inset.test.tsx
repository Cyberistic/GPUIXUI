/**
 * An AppKit sheet: a top sheet that hangs from the toolbar (plan 724).
 *
 * Bug guarded: a Mac sheet drops from under the window's toolbar, centred and
 * narrower than the window; a top drawer painted flush against the window's top
 * edge across its whole width, over the toolbar it belongs under.
 */
import { describe, expect, it } from "vitest";
import { Drawer, DrawerContent } from "../drawer.js";
import { requireBounds, settleMotion } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

const VIEWPORT = { width: 1280, height: 800 } as const;

const Sheet = ({ inset }: { readonly inset?: number }) => (
  <Drawer open onOpenChange={() => undefined}>
    <DrawerContent
      label="New release"
      testId="sheet"
      side="top"
      {...(inset === undefined ? {} : { inset })}
    >
      <text>Title</text>
    </DrawerContent>
  </Drawer>
);

describe("a hanging sheet", () => {
  it("hangs below the toolbar, centred and inset from the window's sides", () => {
    const page = renderComponent(<Sheet inset={52} />);
    settleMotion(page);
    const box = requireBounds(page, "sheet");
    page.unmount();
    expect(box.y).toBeGreaterThanOrEqual(52);
    expect(box.width).toBeLessThanOrEqual(VIEWPORT.width - 80);
    expect(
      Math.abs(box.x + box.width / 2 - VIEWPORT.width / 2),
    ).toBeLessThanOrEqual(1);
  });

  it("keeps a plain top sheet on the window's top edge", () => {
    const page = renderComponent(<Sheet />);
    settleMotion(page);
    const box = requireBounds(page, "sheet");
    page.unmount();
    expect(box.y).toBe(0);
  });
});
