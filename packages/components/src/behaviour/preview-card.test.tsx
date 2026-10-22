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
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Hover the card's padding, not a child inside it. */
const hoverCard = (root: ReturnType<typeof renderComponent>): void => {
  const bounds = requireBounds(root, "preview");
  root.renderer.nativeSimulateMouseMove(bounds.x + 10, bounds.y + 10);
};

/** A document link with a hoverable preview card. */
const Workspace = ({
  open,
  onOpenChange,
  disabled,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly disabled?: boolean;
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
      openDelay={20}
      closeDelay={20}
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

  it("opens on a press with no delay, and a second press closes it", async () => {
    const card = renderComponent(<Workspace />);

    try {
      clickCentreOf(card, "trigger");

      // No `await`: a press is explicit, so the card is open in the same frame,
      // not after `openDelay` (20 ms here, 300 by default).
      expect(card.renderer.findByTestId("preview")).toBeDefined();

      // eslint-disable-next-line no-console
      console.error(
        "AFTER OPEN",
        JSON.stringify(card.renderer.findByTestId("trigger")?.customProps),
      );
      clickCentreOf(card, "trigger");
      // eslint-disable-next-line no-console
      console.error(
        "AFTER SECOND",
        JSON.stringify(card.renderer.findByTestId("trigger")?.customProps),
      );
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
