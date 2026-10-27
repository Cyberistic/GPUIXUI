/**
 * HoverCard behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a card that never opens on the keyboard, or opens only
 * after the hover delay there; a hover that opens before its wait; a card that
 * keeps the input's focus under it while it leaves; a card that opens twice for
 * one arrival (the pointer and focus handlers both asking); a card that closes
 * on Escape or an outside press without reporting it, or re-opens on the click
 * that follows the dismissing press; and a card that stays up after the pointer
 * has left both surfaces. The trigger is a **link** — shadcn's is an anchor,
 * and the ghost chip it used to wear read as a toggle button in a sentence — and
 * a card at the window's right edge is pulled back inside it.
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../hover-card.js";
import { Button } from "../internal/button.js";
import {
  after,
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
  settle,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Hover the card's padding, not a child inside it. */
const hoverCard = (root: ReturnType<typeof renderComponent>): void => {
  const bounds = requireBounds(root, "card");
  root.renderer.nativeSimulateMouseMove(bounds.x + 10, bounds.y + 10);
};

/** A profile link with a hover card, and somewhere else to move to. */
const Article = ({
  open,
  onOpenChange,
  openDelay = 20,
  closeDelay = 20,
  disabled,
  side,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly openDelay?: number;
  readonly closeDelay?: number;
  readonly disabled?: boolean;
  readonly side?: "top" | "right" | "bottom" | "left";
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 200,
      padding: 40,
    }}
  >
    <HoverCard
      open={open}
      onOpenChange={onOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <HoverCardTrigger testId="trigger" disabled={disabled}>
        @ada
      </HoverCardTrigger>
      <HoverCardContent
        label="Ada Lovelace"
        testId="card"
        {...(side === undefined ? {} : { side })}
      >
        <text>Mathematician</text>
        <Button testId="inside">Open profile</Button>
      </HoverCardContent>
    </HoverCard>
    <div testId="elsewhere" tabIndex={0} style={{ width: 120, height: 20 }}>
      Elsewhere
    </div>
  </div>
);

describe("HoverCard", () => {
  it("opens as soon as the trigger takes focus", () => {
    const card = renderComponent(<Article openDelay={10_000} />);
    try {
      card.renderer.focusElement(
        card.renderer.findByTestId("trigger")?.id ?? -1,
      );

      // No delay: a keyboard reader has no hover, so the focus path is the
      // card itself. The 10s hover wait proves this is not the timer.
      expect(card.renderer.findByTestId("card")).toBeDefined();
    } finally {
      card.unmount();
    }
  });

  it("opens on hover after the delay, not before", async () => {
    const card = renderComponent(<Article openDelay={120} />);
    try {
      hoverCentreOf(card, "trigger");
      await after(40);
      expect(card.renderer.findByTestId("card")).toBeUndefined();

      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeDefined(),
      );
    } finally {
      card.unmount();
    }
  });

  it("does not open twice when the pointer arrives as focus lands", async () => {
    const onOpenChange = vi.fn();
    const card = renderComponent(
      <Article openDelay={120} onOpenChange={onOpenChange} />,
    );
    try {
      hoverCentreOf(card, "trigger");
      card.renderer.focusElement(
        card.renderer.findByTestId("trigger")?.id ?? -1,
      );

      await after(200);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(card.renderer.findByTestId("card")).toBeDefined();
    } finally {
      card.unmount();
    }
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    const card = renderComponent(<Article />);
    try {
      // The keyboard path: the trigger holds focus, so the keystroke reaches
      // the card's own handler. (A pointer-opened card with focus elsewhere
      // cannot hear a window Escape — see the page's limitations.)
      card.renderer.focusElement(
        card.renderer.findByTestId("trigger")?.id ?? -1,
      );
      expect(card.renderer.findByTestId("card")).toBeDefined();

      card.renderer.simulateKeystrokes("escape");
      settle(card);
      expect(
        card.renderer.findByTestId("trigger")?.customProps?.["aria-expanded"],
      ).toBe(false);

      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeUndefined(),
      );
      expect(focusedTestId(card)).toEqual(Option.some("trigger"));
    } finally {
      card.unmount();
    }
  });

  it("closes on an outside press without re-opening on the click after it", async () => {
    const card = renderComponent(<Article />);
    try {
      // Opened by the pointer alone, so nothing has focus to lose: only the
      // dismiss stack can close this one.
      hoverCentreOf(card, "trigger");
      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeDefined(),
      );

      card.renderer.nativeSimulateClick(12, 12);
      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeUndefined(),
      );

      // The runtime delivers the press and the next click in separate tasks.
      await Promise.resolve();
      clickCentreOf(card, "trigger");
      expect(card.renderer.findByTestId("card")).toBeDefined();
    } finally {
      card.unmount();
    }
  });

  it("opens once when a press both focuses the trigger and activates it", () => {
    const onOpenChange = vi.fn();
    const card = renderComponent(<Article onOpenChange={onOpenChange} />);
    try {
      // The runtime focuses the trigger on the press, and the activation runs
      // after it: one gesture, two open requests, one card.
      clickCentreOf(card, "trigger");
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(card.renderer.findByTestId("card")).toBeDefined();
    } finally {
      card.unmount();
    }
  });

  it("closes after focus leaves both the trigger and the card", async () => {
    const card = renderComponent(<Article />);
    try {
      card.renderer.focusElement(
        card.renderer.findByTestId("trigger")?.id ?? -1,
      );
      expect(card.renderer.findByTestId("card")).toBeDefined();

      card.renderer.focusElement(
        card.renderer.findByTestId("elsewhere")?.id ?? -1,
      );

      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeUndefined(),
      );
    } finally {
      card.unmount();
    }
  });

  it("stays up while the pointer rests inside the card", async () => {
    const card = renderComponent(<Article />);
    try {
      hoverCentreOf(card, "trigger");
      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeDefined(),
      );

      hoverCard(card);
      await after(40);

      expect(card.renderer.findByTestId("card")).toBeDefined();
    } finally {
      card.unmount();
    }
  });

  it("closes after the pointer leaves both surfaces", async () => {
    const card = renderComponent(<Article />);
    try {
      hoverCentreOf(card, "trigger");
      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeDefined(),
      );
      hoverCard(card);
      hoverCentreOf(card, "elsewhere");

      await waitFor(() =>
        expect(card.renderer.findByTestId("card")).toBeUndefined(),
      );
    } finally {
      card.unmount();
    }
  });

  it("opens on the side it is given", () => {
    const card = renderComponent(<Article side="right" />);
    try {
      clickCentreOf(card, "trigger");
      settleMotion(card);

      const trigger = requireBounds(card, "trigger");
      const panel = requireBounds(card, "card");

      expect(panel.x).toBeGreaterThanOrEqual(trigger.x + trigger.width);
      settle(card);
    } finally {
      card.unmount();
    }
  });

  it("stays closed from a disabled trigger", async () => {
    const card = renderComponent(<Article disabled />);
    try {
      hoverCentreOf(card, "trigger");
      await after(40);
      expect(card.renderer.findByTestId("card")).toBeUndefined();

      card.renderer.focusElement(
        card.renderer.findByTestId("trigger")?.id ?? -1,
      );
      expect(card.renderer.findByTestId("card")).toBeUndefined();
    } finally {
      card.unmount();
    }
  });

  it("reports the open change and lets a controlled card stay closed", async () => {
    const onOpenChange = vi.fn();
    const card = renderComponent(
      <Article open={false} onOpenChange={onOpenChange} />,
    );
    try {
      hoverCentreOf(card, "trigger");
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
      expect(card.renderer.findByTestId("card")).toBeUndefined();
    } finally {
      card.unmount();
    }
  });
});

describe("the hover card's surface and trigger", () => {
  it("paints its trigger as a link, not a toggle chip", () => {
    const card = renderComponent(
      <HoverCard defaultOpen={false}>
        <HoverCardTrigger testId="trigger">@ada</HoverCardTrigger>
        <HoverCardContent testId="card" label="Ada Lovelace">
          <text>Mathematician</text>
        </HoverCardContent>
      </HoverCard>,
    );
    try {
      const trigger = card.renderer.findByTestId("trigger")?.style;

      // A link: no fill at rest, no edge, underlined.
      expect(trigger?.textDecoration).toBe("underline");
      expect(trigger?.backgroundColor).toBeUndefined();
      expect(trigger?.borderColor).toBeUndefined();
      expect(trigger?.borderWidth).toBe(0);
    } finally {
      card.unmount();
    }
  });

  it("keeps the card inside the window, under a link trigger", () => {
    // The bug this guards: a card anchored near the window's edge painted past
    // it — the drawing clipped it under the preview's scroller and the native
    // surface could hang outside the window. The anchored layer's snap margin is
    // the frame the card has to stay inside.
    const card = renderComponent(
      <div style={{ display: "flex", justifyContent: "flex-end", padding: 10 }}>
        <HoverCard defaultOpen>
          <HoverCardTrigger testId="trigger">@ada</HoverCardTrigger>
          <HoverCardContent testId="card" label="Ada Lovelace">
            <text>Mathematician · Analytical Engine</text>
          </HoverCardContent>
        </HoverCard>
      </div>,
    );
    try {
      settleMotion(card);
      const window = card.renderer.getWindowSize();
      const bounds = requireBounds(card, "card");

      // The trigger is the link look, not a chip...
      expect(card.renderer.findByTestId("trigger")?.style.textDecoration).toBe(
        "underline",
      );
      // ...and the surface stays inside the frame it is drawn in.
      expect(bounds.x).toBeGreaterThanOrEqual(8);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(window.width - 8);
    } finally {
      card.unmount();
    }
  });
});
