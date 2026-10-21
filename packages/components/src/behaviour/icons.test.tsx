/**
 * Tier 2 chrome icons, in the real GPUix renderer.
 *
 * The gap these guard: every control mark was a text stand-in (`✕`, `▾`, `✓`,
 * `‹`, `⌄`, …), announced as a punctuation symbol and sized by the font rather
 * than the icon scale. The components now paint `@gpuixui/icons`, so this suite
 * measures the `<svg>` where the glyph used to be, the name a labelled one
 * announces, and the source sweep that keeps a text stand-in from returning.
 *
 * `node:fs` is read synchronously only because the sweep is a test-time
 * repository check; nothing in the component runtime imports it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
} from "../date-picker.js";
import { Dialog, DialogContent, DialogTrigger } from "../dialog.js";
import { nodesWithRole } from "../internal/a11y.js";
import { clickCentreOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { SearchInput } from "../search-input.js";

/** The painted icons in a frame. */
const icons = (root: ReturnType<typeof renderComponent>): number =>
  root.renderer.findByType("svg").length;

describe("Tier 2 icons", () => {
  it("draws the dialog's close control as an icon, not a ✕", () => {
    const dialog = renderComponent(
      <Dialog open onOpenChange={vi.fn()}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent label="Settings" testId="dialog">
          <text>Body</text>
        </DialogContent>
      </Dialog>,
    );

    expect(dialog.renderer.getAllText()).not.toContain("✕");
    expect(icons(dialog)).toBe(1);
    const [close] = dialog.renderer.findByType("svg");
    const bounds =
      close === undefined ? null : dialog.renderer.getElementBounds(close.id);
    expect(bounds?.width ?? 0).toBeGreaterThan(0);

    dialog.unmount();
  });

  it("announces the accordion indicator as an expand/collapse image", () => {
    const faq = renderComponent(
      <Accordion type="single" collapsible>
        <AccordionItem value="one">
          <AccordionTrigger testId="trigger">Question</AccordionTrigger>
          <AccordionContent>
            <text>Answer</text>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const names = (): ReadonlyArray<string> =>
      Arr.map(nodesWithRole(faq.renderer, "image"), (node) => node.name);

    expect(names()).toContain("Expand");

    clickCentreOf(faq, "trigger");

    expect(names()).toContain("Collapse");
    expect(names()).not.toContain("Expand");

    faq.unmount();
  });

  it("paints the search field's leading icon and its clear control", () => {
    const empty = renderComponent(<SearchInput />);
    expect(icons(empty)).toBe(1);
    empty.unmount();

    const filled = renderComponent(<SearchInput defaultValue="design" />);
    expect(icons(filled)).toBe(2);
    filled.unmount();
  });

  it("paints the date picker's caret and both month chevrons", () => {
    const picker = renderComponent(
      <DatePicker today="2026-10-17" defaultValue="2026-10-17">
        <DatePickerTrigger label="Due date" />
        <DatePickerContent>
          <DatePickerCalendar />
        </DatePickerContent>
      </DatePicker>,
    );

    expect(icons(picker)).toBe(1);

    clickCentreOf(picker, "date-picker-trigger");

    expect(icons(picker)).toBe(3);

    picker.unmount();
  });

  it("keeps a text stand-in glyph out of the component source", () => {
    const source = fileURLToPath(new URL("../", import.meta.url));
    const entries: ReadonlyArray<string> = readdirSync(source, {
      recursive: true,
      encoding: "utf8",
    });
    const files = Arr.filter(
      entries,
      (entry) => entry.endsWith(".tsx") && !entry.includes(".test."),
    );
    // check-tests-ok: the floor below is the assertion; a sweep with no file
    // would pass without measuring anything.
    expect(files.length).toBeGreaterThan(30);

    const standIns = Arr.filter(files, (file) =>
      /[✕✓⌕▾›‹⌃⌄▸]/.test(readFileSync(`${source}${file}`, "utf8")),
    );

    expect(standIns).toEqual([]);
  });
});
