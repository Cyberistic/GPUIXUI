/**
 * InputGroup behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: the row's ring not following the field's focus (so the
 * group looks inert while it is being typed in); an `inline-end` addon shrinking
 * the field instead of taking its own width; an `inline-start` addon painted
 * after the field because of where it was written; a press on an addon not
 * reaching the field; and an error message painting neither the destructive edge
 * nor the message itself.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  requireBounds,
  focusedTestId,
  settle,
} from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../input-group.js";

/** A search row with a trailing shortcut, written before the field. */
const Search = ({
  error,
  description,
}: {
  readonly error?: string;
  readonly description?: string;
}) => (
  <div style={{ padding: 20, width: 420 }}>
    <InputGroup
      testId="group"
      label="Search"
      error={error}
      description={description}
    >
      <InputGroupInput testId="field" placeholder="Search…" />
      <InputGroupAddon testId="end" align="inline-end">
        <InputGroupText>⌘K</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  </div>
);

/** The ring the group paints while the field holds focus. */
const ringOf = (page: ReturnType<typeof renderComponent>) =>
  page.renderer.findByTestId("group")?.style.boxShadow;

describe("InputGroup", () => {
  it("paints the focus ring on the group while its field holds focus", () => {
    const page = renderComponent(<Search />);
    try {
      settle(page);
      expect(ringOf(page)).toBeUndefined();

      page.renderer.focusElement(page.renderer.findByTestId("field")?.id ?? -1);

      expect(ringOf(page)).toMatchObject({ spreadRadius: 3 });
      // The field declares no ring of its own: one box owns the cue.
      expect(
        page.renderer.findByTestId("field")?.style.focusVisible,
      ).toMatchObject({ outlineWidth: 0 });
    } finally {
      page.unmount();
    }
  });

  it("keeps the field's width when an inline-end addon sits beside it", () => {
    const page = renderComponent(<Search />);
    try {
      settle(page);
      const group = requireBounds(page, "group");
      const field = requireBounds(page, "field");
      const addon = requireBounds(page, "end");

      // The addon takes its own width to the right; the field takes the rest
      // of the line rather than collapsing to the width of its placeholder.
      expect(field.x + field.width).toBeLessThanOrEqual(addon.x + 1);
      expect(
        Math.abs(field.width + addon.width - group.width),
      ).toBeLessThanOrEqual(2);
      expect(addon.x + addon.width).toBeLessThanOrEqual(group.x + group.width);
    } finally {
      page.unmount();
    }
  });

  it("paints an inline-start addon before the field wherever it is written", () => {
    const page = renderComponent(
      <div style={{ padding: 20, width: 420 }}>
        <InputGroup testId="group">
          <InputGroupInput testId="field" />
          <InputGroupAddon testId="start" align="inline-start">
            <InputGroupText>$</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>,
    );
    try {
      settle(page);
      const start = requireBounds(page, "start");
      const field = requireBounds(page, "field");

      expect(start.x + start.width).toBeLessThanOrEqual(field.x + 1);
    } finally {
      page.unmount();
    }
  });

  it("focuses the field when the addon itself is pressed", () => {
    const page = renderComponent(<Search />);
    try {
      settle(page);
      const addon = requireBounds(page, "end");
      page.renderer.nativeSimulateClick(
        addon.x + addon.width / 2,
        addon.y + addon.height / 2,
      );

      expect(focusedTestId(page)).toEqual(Option.some("field"));
    } finally {
      page.unmount();
    }
  });

  it("paints the destructive edge and the message an error names", () => {
    const page = renderComponent(<Search error="Enter a query" />);
    try {
      settle(page);
      const group = page.renderer.findByTestId("group");
      expect(group?.style.borderColor).toBe(darkTheme.colors.destructive);
      expect(page.renderer.getAllText()).toContain("Enter a query");
      expect(page.renderer.getAllText()).not.toContain("Search by name");
    } finally {
      page.unmount();
    }
  });

  it("hides the description while an error holds the slot", () => {
    const page = renderComponent(<Search description="Search by name" />);
    try {
      settle(page);
      expect(page.renderer.getAllText()).toContain("Search by name");
      expect(page.renderer.findByTestId("group")?.style.borderColor).toBe(
        darkTheme.colors.border,
      );
    } finally {
      page.unmount();
    }
  });
});
