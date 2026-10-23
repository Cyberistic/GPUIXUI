import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CLOSE_DELAY_MS,
  NAV_ITEMS,
  OPEN_DELAY_MS,
  applyNavEvent,
  initialNavState,
  navRoving,
  navTimer,
  openLabel,
  type NavEvent,
  type NavState,
} from "./navigation-menu-preview";

/**
 * The preview's state machine, held to the component that ships.
 *
 * A navigation menu's rules are temporal — one panel at a time, a hover that
 * must wait, a press that must beat a pending timer — and a drawing that only
 * swapped a title would look identical whether or not any of them held. These
 * cases read the delays and the guards out of
 * `packages/components/src/navigation-menu.tsx` and drive the preview's reducer
 * over the transitions the page teaches, so the model cannot drift from the
 * source it stands in for.
 */

const source = readFileSync(
  new URL(
    "../../../../../packages/components/src/navigation-menu.tsx",
    import.meta.url,
  ),
  "utf8",
);

/** Drive the nav through a list of events. */
const run = (
  events: ReadonlyArray<NavEvent>,
  from: NavState = initialNavState(),
): NavState => events.reduce(applyNavEvent, from);

const VALUES = NAV_ITEMS.map((item) => item.value);

describe("the component the preview mirrors", () => {
  it("waits the delay the preview prints before a hover opens", () => {
    expect(source).toContain("openDelay = 150");
    expect(source).toContain("closeDelay = 150");
    expect(OPEN_DELAY_MS).toBe(150);
    expect(CLOSE_DELAY_MS).toBe(150);
  });

  it("keeps one open item and toggles it shut on its own trigger", () => {
    // `setOpen(expanded ? null : value)` is the one-panel rule and the toggle.
    expect(source).toContain("setOpen(expanded ? null : value)");
    expect(
      applyNavEvent(initialNavState("docs"), { type: "press", value: "docs" })
        .open,
    ).toBe(null);
    expect(
      run([
        { type: "press", value: "platform" },
        { type: "press", value: "docs" },
      ]).open,
    ).toBe("docs");
  });

  it("lets an explicit press stop the pointer policy", () => {
    // stopHover() runs before the toggle, and hover events return while
    // `suspended` is set — the runtime delivers the pointer's leave after the
    // key that opened another panel.
    expect(source).toContain("stopHover();");
    expect(source).toContain("if (suspended.current) return;");

    const pressed = run([
      { type: "hover-enter", value: "platform" },
      { type: "press", value: "platform" },
    ]);
    expect(pressed.open).toBe("platform");
    // The pointer is still resting there in the drawing, but the stale leave
    // and the pending open can no longer move the panel.
    expect(run([{ type: "hover-leave", value: "platform" }], pressed)).toEqual(
      pressed,
    );
    expect(run([{ type: "hover-open", value: "platform" }], pressed)).toEqual(
      pressed,
    );
  });

  it("suspends the pointer until it reaches a trigger again", () => {
    const closed = run([
      { type: "open-key", value: "docs" },
      { type: "escape" },
    ]);
    expect(closed.open).toBeNull();
    const rested = run([{ type: "hover-enter", value: "docs" }], closed);
    expect(rested.suspended).toBe(false);
    expect(run([{ type: "hover-open", value: "docs" }], rested).open).toBe(
      "docs",
    );
  });

  it("only closes once the pointer has left the trigger and the panel", () => {
    expect(source).toContain(
      "if (hovered.current !== null || panelHovered.current) return;",
    );

    const overTrigger = run([{ type: "hover-enter", value: "platform" }]);
    expect(run([{ type: "hover-close" }], overTrigger).open).toBeNull();

    const intoPanel = run([
      { type: "hover-enter", value: "platform" },
      { type: "hover-open", value: "platform" },
      { type: "hover-leave", value: "platform" },
      { type: "panel-enter" },
    ]);
    expect(intoPanel.open).toBe("platform");
    expect(run([{ type: "hover-close" }], intoPanel)).toEqual(intoPanel);

    const leftBoth = run([{ type: "panel-leave" }], intoPanel);
    expect(leftBoth.panelHovered).toBe(false);
    expect(run([{ type: "hover-close" }], leftBoth).open).toBeNull();
  });

  it("closes on Escape and on an outside press, and never on a link's second run", () => {
    // `dismiss.current` stops the hover policy and closes; the same branch an
    // outside press takes. A link runs once and closes its panel.
    expect(source).toContain("setOpen(null);");
    const open = initialNavState("community");
    expect(run([{ type: "escape" }], open).open).toBeNull();
    expect(run([{ type: "outside" }], open).open).toBeNull();
    expect(run([{ type: "link", value: "Changelog" }], open).open).toBeNull();
  });

  it("moves focus into the panel only for ArrowDown", () => {
    // `isDown(event)` is the only branch that requests the panel's focus.
    expect(source).toContain("if (isDown(event)) {");
    expect(source).toContain("requestPanelFocus(value)");
    expect(source).toContain("moveFocus(value, -1)");
    expect(source).toContain("moveFocus(value, 1)");
    expect(source).toContain('moveFocus(value, "first")');
    expect(source).toContain('moveFocus(value, "last")');
  });

  it("names the panel with the item's value and keeps it reachable", () => {
    expect(source).toContain('role="group"');
    expect(source).toContain("aria-label={value}");
    expect(source).toContain("tabIndex={-1}");
  });
});

describe("the preview's state machine", () => {
  it("owes one timer at a time", () => {
    expect(navTimer(initialNavState())).toBeUndefined();
    expect(navTimer(initialNavState("platform"))).toEqual({
      delay: CLOSE_DELAY_MS,
      event: { type: "hover-close" },
    });

    const resting = applyNavEvent(initialNavState(), {
      type: "hover-enter",
      value: "docs",
    });
    expect(navTimer(resting)).toEqual({
      delay: OPEN_DELAY_MS,
      event: { type: "hover-open", value: "docs" },
    });

    // Once the panel is the hovered one, there is nothing left to schedule:
    // the pointer is on the trigger the panel belongs to.
    const opened = applyNavEvent(resting, {
      type: "hover-open",
      value: "docs",
    });
    expect(navTimer(opened)).toBeUndefined();

    // Leaving the trigger to cross into the panel owes the close grace.
    const crossing = applyNavEvent(opened, {
      type: "hover-leave",
      value: "docs",
    });
    expect(navTimer(crossing)).toEqual({
      delay: CLOSE_DELAY_MS,
      event: { type: "hover-close" },
    });

    const inPanel = applyNavEvent(crossing, { type: "panel-enter" });
    expect(navTimer(inPanel)).toBeUndefined();
  });

  it("switches panels when the pointer crosses the row", () => {
    const opened = run([
      { type: "hover-enter", value: "platform" },
      { type: "hover-open", value: "platform" },
      { type: "hover-leave", value: "platform" },
      { type: "hover-enter", value: "docs" },
    ]);
    expect(navTimer(opened)?.event).toEqual({
      type: "hover-open",
      value: "docs",
    });
    expect(run([{ type: "hover-open", value: "docs" }], opened).open).toBe(
      "docs",
    );
  });

  it("walks the roving group and wraps at both ends", () => {
    expect(navRoving(VALUES, "platform", "ArrowRight")).toBe("docs");
    expect(navRoving(VALUES, "community", "ArrowRight")).toBe("platform");
    expect(navRoving(VALUES, "platform", "ArrowLeft")).toBe("community");
    expect(navRoving(VALUES, "docs", "Home")).toBe("platform");
    expect(navRoving(VALUES, "docs", "End")).toBe("community");
    expect(navRoving([], "docs", "ArrowRight")).toBeUndefined();
  });

  it("reads the open item back by label, and a closed nav as closed", () => {
    expect(openLabel(null)).toBe("closed");
    expect(openLabel("community")).toBe("Community");
    // A value the nav no longer holds is printed rather than swallowed.
    expect(openLabel("gone")).toBe("gone");
  });

  it("leaves every other item's state alone", () => {
    const before = initialNavState("docs");
    const after = applyNavEvent(before, {
      type: "hover-enter",
      value: "platform",
    });
    expect(after.open).toBe("docs");
    expect(before).toEqual({
      open: "docs",
      hovered: null,
      panelHovered: false,
      suspended: false,
    });
  });
});
