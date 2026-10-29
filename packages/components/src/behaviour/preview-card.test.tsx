/**
 * PreviewCard behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a hover delay that opens instantly or never; a press
 * that waits for the hover delay, or re-opens the card the same gesture just
 * dismissed; a card that closes while the pointer travels into it; a card that
 * never closes when the pointer leaves; an open path on focus, which a real
 * window never delivers; Escape or an outside press that closes the wrong
 * layer; an unnamed surface; and a controlled card that opens on its own.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "../preview-card.js";
import { Button } from "../internal/button.js";
import {
  after,
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Hover the card's padding, not a child inside it. */
const hoverCard = (root: ReturnType<typeof renderComponent>): void => {
  const bounds = requireBounds(root, "preview");
  root.renderer.nativeSimulateMouseMove(bounds.x + 10, bounds.y + 10);
};

/**
 * An open card near the window centre, where every alignment has room.
 *
 * The inner row is shrink-to-fit: the anchored layer measures the positioning
 * root, so a stretched root makes `end` read from the page's edge instead of
 * the trigger's.
 */
const AlignedCard = ({
  align,
}: {
  readonly align?: "start" | "center" | "end";
}) => (
  <div style={{ paddingLeft: 540, paddingTop: 100 }}>
    <div style={{ display: "flex", flexDirection: "row" }}>
      <PreviewCard open openDelay={0} closeDelay={0}>
        <PreviewCardTrigger testId="trigger">
          design-system.md
        </PreviewCardTrigger>
        <PreviewCardContent
          align={align}
          label="Design system"
          style={{ width: 240 }}
          testId="preview"
        >
          <text>Tokens, roles and themes.</text>
        </PreviewCardContent>
      </PreviewCard>
    </div>
  </div>
);

/** A document link with a hoverable preview card. */
const Workspace = ({
  open,
  onOpenChange,
  disabled,
  openDelay = 20,
  closeDelay = 20,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly disabled?: boolean;
  readonly openDelay?: number;
  readonly closeDelay?: number;
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
    <PreviewCard
      open={open}
      onOpenChange={onOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <PreviewCardTrigger testId="trigger" disabled={disabled}>
        design-system.md
      </PreviewCardTrigger>
      <PreviewCardContent label="Design system" testId="preview">
        <text>Tokens, roles and themes.</text>
        <Button testId="inside">Open file</Button>
      </PreviewCardContent>
    </PreviewCard>
    <div testId="elsewhere" tabIndex={0} style={{ width: 120, height: 20 }}>
      Elsewhere
    </div>
  </div>
);

describe("PreviewCard", () => {
  it("renders only the trigger until it is opened", async () => {
    const card = renderComponent(<Workspace />);

    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );
    expect(card.renderer.getAllText()).not.toContain("Design system");

    card.unmount();
  });

  it("opens on hover after the delay, not before", async () => {
    const card = renderComponent(<Workspace />);

    hoverCentreOf(card, "trigger");
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeDefined(),
    );
    card.unmount();
  });

  it("opens centred on its trigger when the caller names no align", () => {
    // The card defaulted to `align="start"`, so it sat on its trigger's left
    // corner where the popover centres. The house relation is `center`.
    const card = renderComponent(<AlignedCard />);
    settleMotion(card);

    const trigger = requireBounds(card, "trigger");
    const preview = requireBounds(card, "preview");

    expect(
      Math.abs(preview.x + preview.width / 2 - (trigger.x + trigger.width / 2)),
    ).toBeLessThanOrEqual(1);
    expect(preview.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);

    card.unmount();
  });

  it("opens the card on each alignment it is asked for", () => {
    // The panel's own relation to its trigger: `start` shares a left edge,
    // `center` a centre line and `end` a right edge. GPUix 0.11.0 centres on
    // the containing block, so `center` is `start` plus the measured half
    // difference (the popover's rule).
    const alignments = [
      [
        "start",
        (
          trigger: ReturnType<typeof requireBounds>,
          preview: ReturnType<typeof requireBounds>,
        ) => expect(preview.x).toBe(trigger.x),
      ],
      [
        "center",
        (
          trigger: ReturnType<typeof requireBounds>,
          preview: ReturnType<typeof requireBounds>,
        ) =>
          expect(
            Math.abs(
              preview.x + preview.width / 2 - (trigger.x + trigger.width / 2),
            ),
          ).toBeLessThanOrEqual(1),
      ],
      [
        "end",
        (
          trigger: ReturnType<typeof requireBounds>,
          preview: ReturnType<typeof requireBounds>,
        ) => expect(preview.x + preview.width).toBe(trigger.x + trigger.width),
      ],
    ] as const;

    for (const [align, expectRelation] of alignments) {
      const card = renderComponent(<AlignedCard align={align} />);
      try {
        settleMotion(card);

        const window = card.renderer.getWindowSize();
        const trigger = requireBounds(card, "trigger");
        const preview = requireBounds(card, "preview");

        expectRelation(trigger, preview);
        expect(preview.x).toBeGreaterThanOrEqual(0);
        expect(preview.x + preview.width).toBeLessThanOrEqual(window.width);
      } finally {
        card.unmount();
      }
    }
  });

  it("takes the documented delay when the delay it was given cannot be read", async () => {
    const card = renderComponent(
      <Workspace openDelay={Number.POSITIVE_INFINITY} />,
    );

    try {
      hoverCentreOf(card, "trigger");

      // `setTimeout` floors a delay it cannot read to one millisecond, so an
      // infinite wait used to open the card in the pointer's frame. The
      // documented default is 300 ms.
      await after(120);
      expect(card.renderer.findByTestId("preview")).toBeUndefined();

      await waitFor(
        () => expect(card.renderer.findByTestId("preview")).toBeDefined(),
        1_000,
      );
    } finally {
      card.unmount();
    }
  });

  it("opens on a press with no delay, and a second press closes it", async () => {
    const card = renderComponent(<Workspace />);

    try {
      clickCentreOf(card, "trigger");

      // No `await`: a press is explicit, so the card is open in the same frame,
      // not after `openDelay` (20 ms here, 300 by default).
      expect(card.renderer.findByTestId("preview")).toBeDefined();

      clickCentreOf(card, "trigger");
      await waitFor(() =>
        expect(card.renderer.findByTestId("preview")).toBeUndefined(),
      );
    } finally {
      card.unmount();
    }
  });

  it("does not open from a focus event alone, by policy", async () => {
    const card = renderComponent(<Workspace />);

    try {
      card.renderer.focusElement(
        card.renderer.findByTestId("trigger")?.id ?? -1,
      );

      // The event does arrive in a window; the card keeps its open path off it
      // deliberately, so focus alone leaves it closed.
      await waitFor(() =>
        expect(card.renderer.findByTestId("preview")).toBeUndefined(),
      );
    } finally {
      card.unmount();
    }
  });

  it("stays closed from a disabled trigger on hover, focus or press", async () => {
    const card = renderComponent(<Workspace disabled />);
    const trigger = card.renderer.findByTestId("trigger");

    expect(trigger?.customProps?.tabIndex).toBe(-1);

    hoverCentreOf(card, "trigger");
    await after(40);
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );

    card.renderer.focusElement(trigger?.id ?? -1);
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );

    card.unmount();
  });

  it("cancels a hover open when the trigger is disabled before the delay", async () => {
    // The trigger can be disabled between the pointer's entry and the delay's
    // end; the armed timer used to open anyway, mounting the card over a
    // control that refuses every route.
    const card = renderComponent(<Workspace openDelay={120} />);

    try {
      hoverCentreOf(card, "trigger");
      await after(30);
      expect(card.renderer.findByTestId("preview")).toBeUndefined();

      card.rerender(<Workspace openDelay={120} disabled />);
      await after(150);

      expect(card.renderer.findByTestId("preview")).toBeUndefined();
    } finally {
      card.unmount();
    }
  });

  it("stays open while the pointer is inside the card", async () => {
    const card = renderComponent(<Workspace />);

    hoverCentreOf(card, "trigger");
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeDefined(),
    );
    hoverCard(card);
    await after(40);

    expect(card.renderer.findByTestId("preview")).toBeDefined();

    card.unmount();
  });

  it("closes after the pointer leaves both surfaces", async () => {
    const card = renderComponent(<Workspace />);

    hoverCentreOf(card, "trigger");
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeDefined(),
    );
    hoverCard(card);
    hoverCentreOf(card, "elsewhere");
    await after(40);

    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );

    card.unmount();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const card = renderComponent(<Workspace />);
    clickCentreOf(card, "trigger");
    expect(card.renderer.findByTestId("preview")).toBeDefined();

    card.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );
    expect(focusedTestId(card)).toEqual(Option.some("trigger"));

    card.unmount();
  });

  it("closes on an outside press", async () => {
    const card = renderComponent(<Workspace />);
    hoverCentreOf(card, "trigger");
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeDefined(),
    );

    card.renderer.nativeSimulateClick(12, 12);

    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );

    card.unmount();
  });

  it("names the surface and reports the trigger's expanded state", async () => {
    const card = renderComponent(<Workspace />);
    hoverCentreOf(card, "trigger");
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeDefined(),
    );

    expect(card.renderer.findByTestId("preview")?.customProps).toMatchObject({
      role: "group",
      "aria-label": "Design system",
    });
    expect(card.renderer.findByTestId("trigger")?.customProps).toMatchObject({
      "aria-expanded": true,
    });

    card.unmount();
  });

  it("reports the open change and lets a controlled card stay closed", async () => {
    const onOpenChange = vi.fn();
    const card = renderComponent(
      <Workspace open={false} onOpenChange={onOpenChange} />,
    );

    hoverCentreOf(card, "trigger");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
    await waitFor(() =>
      expect(card.renderer.findByTestId("preview")).toBeUndefined(),
    );

    card.unmount();
  });
});
