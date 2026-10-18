/**
 * PreviewCard behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a hover delay that opens instantly or never; a card that
 * closes while the pointer travels into it; a card that never closes when the
 * pointer leaves; focus that does not open it; Escape or an outside press that
 * closes the wrong layer; an unnamed surface; and a controlled card that opens
 * on its own.
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
  focusedTestId,
  hoverCentreOf,
  requireBounds,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Hover the card's padding, not a child inside it. */
const hoverCard = (root: ReturnType<typeof renderComponent>): void => {
  const bounds = requireBounds(root, "preview");
  root.renderer.nativeSimulateMouseMove(bounds.x + 10, bounds.y + 10);
};

/** Wait for a component timer (real timers, kept short by the props). */
const after = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait until the tree shows the expected state, at most ~2 s. React commits and
 * the native tree update can lag a timer under load, so a fixed sleep is a coin
 * flip; the assertion that follows is still what fails when it never happens.
 */
const until = async (check: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await after(20);
  }
};

/** Whether the tree currently contains `testId`. */
const isShown = (
  root: ReturnType<typeof renderComponent>,
  testId: string,
): boolean => root.renderer.findByTestId(testId) !== undefined;

/** A document link with a hoverable preview card. */
const Workspace = ({
  open,
  onOpenChange,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
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
      <PreviewCardTrigger testId="trigger">design-system.md</PreviewCardTrigger>
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
  it("renders only the trigger until it is opened", () => {
    const card = renderComponent(<Workspace />);

    expect(card.renderer.findByTestId("preview")).toBeUndefined();
    expect(card.renderer.getAllText()).not.toContain("Design system");

    card.unmount();
  });

  it("opens on hover after the delay, and on focus immediately", async () => {
    const card = renderComponent(<Workspace />);

    hoverCentreOf(card, "trigger");
    expect(card.renderer.findByTestId("preview")).toBeUndefined();
    await until(() => isShown(card, "preview"));
    expect(card.renderer.findByTestId("preview")).toBeDefined();
    card.unmount();

    const focused = renderComponent(<Workspace />);
    focused.renderer.focusElement(
      focused.renderer.findByTestId("trigger")?.id ?? -1,
    );
    expect(focused.renderer.findByTestId("preview")).toBeDefined();
    focused.unmount();
  });

  it("stays open while the pointer is inside the card", async () => {
    const card = renderComponent(<Workspace />);

    hoverCentreOf(card, "trigger");
    await until(() => isShown(card, "preview"));
    hoverCard(card);
    await after(40);

    expect(card.renderer.findByTestId("preview")).toBeDefined();

    card.unmount();
  });

  it("closes after the pointer leaves both surfaces", async () => {
    const card = renderComponent(<Workspace />);

    hoverCentreOf(card, "trigger");
    await until(() => isShown(card, "preview"));
    hoverCard(card);
    hoverCentreOf(card, "elsewhere");
    await until(() => !isShown(card, "preview"));

    expect(card.renderer.findByTestId("preview")).toBeUndefined();

    card.unmount();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const card = renderComponent(<Workspace />);
    card.renderer.focusElement(card.renderer.findByTestId("trigger")?.id ?? -1);
    expect(card.renderer.findByTestId("preview")).toBeDefined();

    card.renderer.simulateKeystrokes("escape");

    expect(card.renderer.findByTestId("preview")).toBeUndefined();
    expect(focusedTestId(card)).toEqual(Option.some("trigger"));

    card.unmount();
  });

  it("closes on an outside press", async () => {
    const card = renderComponent(<Workspace />);
    hoverCentreOf(card, "trigger");
    await until(() => isShown(card, "preview"));

    card.renderer.nativeSimulateClick(12, 12);

    expect(card.renderer.findByTestId("preview")).toBeUndefined();

    card.unmount();
  });

  it("names the surface and reports the trigger's expanded state", async () => {
    const card = renderComponent(<Workspace />);
    hoverCentreOf(card, "trigger");
    await until(() => isShown(card, "preview"));

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
    await until(() => onOpenChange.mock.calls.length > 0);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(card.renderer.findByTestId("preview")).toBeUndefined();

    card.unmount();
  });
});
