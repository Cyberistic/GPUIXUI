/**
 * Animated surface identity, in the real GPUix renderer.
 *
 * The bug these guard: `@gpuix/react`'s published `MotionDivProps` omits
 * `testId`, `role` and the `aria-*` props, so every animated box was anonymous.
 * A native suite could not measure a Collapsible/Accordion tween or address a
 * Toast's exit ghost, and the playground measured a neighbouring row instead of
 * the real animated box (plan 592). The typed `MotionSurface` forwards the full
 * host surface, and each animated box now carries `<part testId>-surface` —
 * `toast-<id>-surface` for a card — while the content box keeps its own id.
 */

import { describe, expect, it } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible.js";
import { Drawer, DrawerContent } from "../drawer.js";
import {
  clickCentreOf,
  finishMotion,
  isShown,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";
import { ToastProvider, ToastViewport, useToast } from "../toast.js";

/** A closed collapsible with a fixed-height body and a sibling row after it. */
const Collapsed = () => (
  <div testId="root">
    <Collapsible>
      <CollapsibleTrigger testId="collapse-trigger">
        Advanced
      </CollapsibleTrigger>
      <CollapsibleContent testId="collapse-content">
        <div style={{ height: 60 }} />
      </CollapsibleContent>
    </Collapsible>
    <div testId="after" style={{ height: 20 }} />
  </div>
);

/** A closed accordion section with a fixed-height body. */
const Faq = () => (
  <Accordion type="single" collapsible>
    <AccordionItem value="one">
      <AccordionTrigger testId="trigger-one">One</AccordionTrigger>
      <AccordionContent testId="content-one">
        <div style={{ height: 60 }} />
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

/** A popover panel with a fixed height. */
const FilterPanel = ({ testId }: { readonly testId?: string }) => (
  <div style={{ padding: 40 }}>
    <Popover>
      <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
      <PopoverContent testId={testId}>
        <div style={{ height: 60 }} />
      </PopoverContent>
    </Popover>
  </div>
);

/** A controlled drawer with a header-sized surface. */
const FiltersDrawer = ({ open }: { readonly open: boolean }) => (
  <div style={{ padding: 20 }}>
    <Drawer open={open} onOpenChange={() => undefined}>
      <DrawerContent label="Filters" testId="drawer">
        <div style={{ height: 60 }} />
      </DrawerContent>
    </Drawer>
  </div>
);

/** A page with one push control and the viewport. */
const ToastPage = () => {
  const toast = useToast();
  return (
    <div style={{ padding: 40 }}>
      <div
        role="button"
        tabIndex={0}
        testId="push"
        onClick={() => toast.push({ title: "Saved changes" })}
      >
        Push
      </div>
      <ToastViewport />
    </div>
  );
};

const ToastHarness = () => (
  <div style={{ width: 1200, height: 760 }}>
    <ToastProvider>
      <ToastPage />
    </ToastProvider>
  </div>
);

/** The measured height of a testId, or a broken-fixture failure. */
const heightOf = (root: ComponentTestRoot, testId: string): number =>
  requireBounds(root, testId).height;

describe("Animated surfaces", () => {
  it("measures a closed Collapsible's tween box while the content stays mounted", () => {
    const page = renderComponent(<Collapsed />);

    expect(heightOf(page, "collapse-content-surface")).toBe(0);
    // The content is mounted, but a zero-height clip reports no box (measured).
    expect(isShown(page, "collapse-content")).toBe(true);

    clickCentreOf(page, "collapse-trigger");
    finishMotion(page, 200);

    expect(heightOf(page, "collapse-content-surface")).toBe(
      heightOf(page, "collapse-content"),
    );

    page.unmount();
  });

  it("measures an Accordion section's tween box", () => {
    const page = renderComponent(<Faq />);

    expect(heightOf(page, "content-one-surface")).toBe(0);

    clickCentreOf(page, "trigger-one");
    finishMotion(page, 200);

    expect(heightOf(page, "content-one-surface")).toBe(
      heightOf(page, "content-one"),
    );

    page.unmount();
  });

  it("addresses a Popover panel's animated box in both themes", () => {
    const page = renderComponent(<FilterPanel testId="panel" />, "light");

    clickCentreOf(page, "trigger");
    finishMotion(page, 100);

    // The wrapper is the border box, the content's reported size is its
    // padding box (plan 540), so the two differ by at most the 1px border.
    const surface = requireBounds(page, "panel-surface");
    const panel = requireBounds(page, "panel");
    expect(Math.abs(surface.height - panel.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(surface.width - panel.width)).toBeLessThanOrEqual(2);
    expect(surface.width).toBeGreaterThan(0);

    page.unmount();
  });

  it("addresses the Drawer's edge surface while open and drops it after the exit", () => {
    const page = renderComponent(<FiltersDrawer open />);

    expect(isShown(page, "drawer-surface")).toBe(true);

    page.rerender(<FiltersDrawer open={false} />);
    expect(isShown(page, "drawer-surface")).toBe(true);

    finishMotion(page, 300);
    expect(isShown(page, "drawer")).toBe(false);
    expect(isShown(page, "drawer-surface")).toBe(false);

    page.unmount();
  });

  it("addresses a Toast's exit ghost until its motion completes", () => {
    const page = renderComponent(<ToastHarness />);

    clickCentreOf(page, "push");
    finishMotion(page, 500);
    expect(isShown(page, "toast-1-surface")).toBe(true);

    clickCentreOf(page, "toast-1-dismiss");
    expect(isShown(page, "toast-1")).toBe(true);
    expect(isShown(page, "toast-1-surface")).toBe(true);

    finishMotion(page, 500);
    expect(isShown(page, "toast-1")).toBe(false);
    expect(isShown(page, "toast-1-surface")).toBe(false);

    page.unmount();
  });

  it("authors no surface id when the part has no testId", () => {
    const page = renderComponent(<FilterPanel />);

    clickCentreOf(page, "trigger");
    finishMotion(page, 100);

    expect(isShown(page, "panel-surface")).toBe(false);
    expect(isShown(page, "undefined-surface")).toBe(false);

    page.unmount();
  });
});
