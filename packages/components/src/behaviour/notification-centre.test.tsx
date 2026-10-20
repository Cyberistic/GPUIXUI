/**
 * NotificationCentre behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a badge that counts notifications instead of unread
 * ones; a panel that marks everything read simply by opening; a row press that
 * closes the panel or marks the row twice; a group heading repeated for every
 * row or a caller's order re-sorted; a dot painted on read rows; header actions
 * that do nothing or dismiss the panel; Escape and an outside press that leave
 * the panel open; arrow keys that walk group headings instead of notifications;
 * and a surface that only works in the dark theme. A held trigger press closed
 * on the press and re-opened on the release (plan 583).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  isShown,
  requireBounds,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  NotificationCentre,
  NotificationCentreClear,
  NotificationCentreContent,
  NotificationCentreHeader,
  NotificationCentreList,
  NotificationCentreMarkAll,
  NotificationCentreTitle,
  NotificationCentreTrigger,
} from "../notification-centre.js";
import type { NotificationItem } from "../notification-centre/model.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** Five notifications, three unread, in two contiguous groups. */
const seed: ReadonlyArray<NotificationItem> = [
  {
    id: "deploy",
    title: "Deploy finished",
    description: "web · 1.4.0",
    timestamp: "2m",
    group: "Today",
  },
  {
    id: "review",
    title: "Review requested",
    timestamp: "1h",
    group: "Today",
    read: true,
  },
  {
    id: "nightly",
    title: "Nightly failed",
    timestamp: "3h",
    group: "Today",
  },
  {
    id: "invite",
    title: "Invite accepted",
    timestamp: "Yesterday",
    group: "Earlier",
    read: true,
  },
  {
    id: "token",
    title: "Token expires soon",
    group: "Earlier",
  },
];

/** The shell every case drives: the bell, the header actions and the feed. */
const Centre = ({
  notifications,
  onRead,
  onMarkAllRead,
  onClear,
  onOpenChange,
  open,
  defaultOpen = false,
}: {
  readonly notifications: ReadonlyArray<NotificationItem>;
  readonly onRead?: (id: string) => void;
  readonly onMarkAllRead?: () => void;
  readonly onClear?: () => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
}) => (
  <NotificationCentre
    notifications={notifications}
    onRead={onRead}
    onMarkAllRead={onMarkAllRead}
    onClear={onClear}
    onOpenChange={onOpenChange}
    open={open}
    defaultOpen={defaultOpen}
  >
    <NotificationCentreTrigger testId="bell" />
    <NotificationCentreContent testId="panel">
      <NotificationCentreHeader>
        <NotificationCentreTitle />
        <NotificationCentreMarkAll testId="mark-all">
          Mark all
        </NotificationCentreMarkAll>
        <NotificationCentreClear testId="clear" />
      </NotificationCentreHeader>
      <NotificationCentreList testId="feed" emptyTitle="No notifications" />
    </NotificationCentreContent>
  </NotificationCentre>
);

/** The painted background of `testId`, `undefined` when it has none. */
const background = (root: ComponentTestRoot, testId: string): unknown =>
  root.renderer.findByTestId(testId)?.style.backgroundColor;

/** The feed's vertical scroll offset, `0` when it has not rendered. */
const offsetOf = (root: ComponentTestRoot): number => {
  const feed = root.renderer.findByTestId("feed");
  return feed === undefined
    ? 0
    : (root.renderer.getScrollOffset(feed.id)?.[1] ?? 0);
};

/** Send a key to the panel's handler through the runtime, not a React call. */
const press = (root: ComponentTestRoot, keystroke: string): void => {
  const panel = root.renderer.findByTestId("panel");
  if (panel === undefined) throw new Error("behaviour: the panel is not open");
  root.renderer.nativeSimulateKeystrokes(panel.id, keystroke);
};

describe("NotificationCentre", () => {
  it("keeps the panel closed and names the unread count", () => {
    const root = renderComponent(<Centre notifications={seed} />);

    expect(isShown(root, "panel")).toBe(false);
    expect(root.renderer.findByTestId("bell")?.customProps).toMatchObject({
      "aria-label": "Notifications, 3 unread",
      "aria-expanded": false,
    });
    expect(isShown(root, "bell-badge")).toBe(true);

    root.unmount();
  });

  it("opens the panel from the trigger and names it", () => {
    const root = renderComponent(<Centre notifications={seed} />);

    clickCentreOf(root, "bell");

    expect(isShown(root, "panel")).toBe(true);
    expect(root.renderer.findByTestId("panel")?.customProps).toMatchObject({
      role: "region",
      "aria-label": "Notifications",
    });
    expect(root.renderer.findByTestId("bell")?.customProps).toMatchObject({
      "aria-expanded": true,
    });
    expect(root.renderer.getAllText()).toContain("Deploy finished");

    root.unmount();
  });

  it("does not mark anything read on open", () => {
    const onRead = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onRead={onRead} />,
    );

    clickCentreOf(root, "bell");

    expect(onRead).not.toHaveBeenCalled();
    expect(isShown(root, "feed-review-unread")).toBe(false);

    root.unmount();
  });

  it("groups contiguous rows in the caller's order", () => {
    const root = renderComponent(<Centre notifications={seed} defaultOpen />);
    const text = root.renderer.getAllText();

    expect(Arr.filter(text, (value) => value === "Today")).toHaveLength(1);
    expect(Arr.filter(text, (value) => value === "Earlier")).toHaveLength(1);
    expect(text.indexOf("Deploy finished")).toBeLessThan(
      text.indexOf("Review requested"),
    );
    expect(text.indexOf("Review requested")).toBeLessThan(
      text.indexOf("Invite accepted"),
    );

    root.unmount();
  });

  it("marks unread rows, not read ones", () => {
    const root = renderComponent(<Centre notifications={seed} defaultOpen />);

    expect(isShown(root, "feed-deploy-unread")).toBe(true);
    expect(isShown(root, "feed-review-unread")).toBe(false);
    expect(
      root.renderer.findByTestId("feed-deploy")?.customProps,
    ).toMatchObject({
      "aria-label": "Deploy finished, unread",
    });
    expect(
      root.renderer.findByTestId("feed-review")?.customProps,
    ).toMatchObject({ "aria-label": "Review requested, read" });

    root.unmount();
  });

  it("reads a row once on press and does not close", () => {
    const onRead = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onRead={onRead} defaultOpen />,
    );

    clickCentreOf(root, "feed-deploy");

    expect(onRead).toHaveBeenCalledTimes(1);
    expect(onRead).toHaveBeenCalledWith("deploy");
    expect(isShown(root, "panel")).toBe(true);

    root.rerender(
      <Centre
        notifications={Arr.map(seed, (item) =>
          item.id === "deploy" ? { ...item, read: true } : item,
        )}
        onRead={onRead}
        defaultOpen
      />,
    );

    expect(isShown(root, "feed-deploy-unread")).toBe(false);
    expect(
      root.renderer.findByTestId("feed-deploy")?.customProps,
    ).toMatchObject({
      "aria-label": "Deploy finished, read",
    });

    root.unmount();
  });

  it("marks every row read from the header action", () => {
    const onMarkAllRead = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onMarkAllRead={onMarkAllRead} defaultOpen />,
    );

    clickCentreOf(root, "mark-all");

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(isShown(root, "panel")).toBe(true);

    root.unmount();
  });

  it("clears the inbox and shows the empty state", () => {
    const onClear = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onClear={onClear} defaultOpen />,
    );

    clickCentreOf(root, "clear");

    expect(onClear).toHaveBeenCalledTimes(1);

    root.rerender(<Centre notifications={[]} onClear={onClear} defaultOpen />);

    expect(root.renderer.getAllText()).toContain("No notifications");
    expect(isShown(root, "bell-badge")).toBe(false);
    expect(root.renderer.findByTestId("bell")?.customProps).toMatchObject({
      "aria-label": "Notifications, 0 unread",
    });

    root.unmount();
  });

  it("closes on Escape", () => {
    const onOpenChange = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onOpenChange={onOpenChange} defaultOpen />,
    );

    press(root, "escape");

    expect(isShown(root, "panel")).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    root.unmount();
  });

  it("keeps focus in a panel whose close the caller refuses", () => {
    const onOpenChange = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onOpenChange={onOpenChange} open />,
    );
    root.renderer.focusElement(
      root.renderer.findByTestId("feed-deploy")?.id ?? -1,
    );

    root.renderer.simulateKeystrokes("escape");

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(isShown(root, "panel")).toBe(true);
    expect(focusedTestId(root)).toEqual(Option.some("feed-deploy"));

    root.unmount();
  });

  it("closes on an outside press", () => {
    const onOpenChange = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onOpenChange={onOpenChange} defaultOpen />,
    );
    const panel = requireBounds(root, "panel");

    root.renderer.nativeSimulateClick(
      panel.x + panel.width + 40,
      panel.y + panel.height + 40,
    );

    expect(isShown(root, "panel")).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    root.unmount();
  });

  it("stays closed after a held trigger press, and a new press opens it", async () => {
    const root = renderComponent(<Centre notifications={seed} defaultOpen />);
    expect(isShown(root, "panel")).toBe(true);

    const { x, y, width, height } = requireBounds(root, "bell");
    root.renderer.nativeSimulateMouseDown(x + width / 2, y + height / 2);
    // The runtime delivers the release in a later task; the old panel closed on
    // the press and the click re-opened it.
    await new Promise((resolve) => setTimeout(resolve, 10));
    root.renderer.nativeSimulateMouseUp(x + width / 2, y + height / 2);

    expect(isShown(root, "panel")).toBe(false);

    clickCentreOf(root, "bell");

    expect(isShown(root, "panel")).toBe(true);

    root.unmount();
  });

  it("moves the active row with the arrow keys and reads it with Enter", () => {
    const onRead = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onRead={onRead} defaultOpen />,
    );

    expect(background(root, "feed-deploy")).toBe(darkTheme.colors.accent);

    press(root, "down");

    expect(background(root, "feed-review")).toBe(darkTheme.colors.accent);
    expect(background(root, "feed-deploy")).toBeUndefined();

    press(root, "enter");

    expect(onRead).toHaveBeenCalledTimes(1);
    expect(onRead).toHaveBeenCalledWith("review");

    root.unmount();
  });

  it("reveals the row an arrow moves to below the viewport", () => {
    const items: ReadonlyArray<NotificationItem> = Array.from(
      { length: 20 },
      (_, index) => ({ id: `n${index}`, title: `Notification ${index}` }),
    );
    const root = renderComponent(<Centre notifications={items} defaultOpen />);
    const frame = requireBounds(root, "feed-frame");

    Arr.forEach(Arr.range(1, 10), () => press(root, "down"));

    const row = requireBounds(root, "feed-n10");
    expect(root.renderer.getFocusedElementId?.()).toBe(
      root.renderer.findByTestId("feed-n10")?.id,
    );
    expect(row.y).toBeGreaterThanOrEqual(frame.y);
    expect(row.y + row.height).toBeLessThanOrEqual(frame.y + frame.height);

    root.unmount();
  });

  it("reveals the row an arrow moves to above a scrolled viewport", () => {
    const items: ReadonlyArray<NotificationItem> = Array.from(
      { length: 20 },
      (_, index) => ({ id: `n${index}`, title: `Notification ${index}` }),
    );
    const root = renderComponent(<Centre notifications={items} defaultOpen />);
    const frame = requireBounds(root, "feed-frame");

    root.renderer.nativeSimulateScrollWheel(
      frame.x + frame.width / 2,
      frame.y + frame.height / 2,
      0,
      -400,
    );
    const scrolled = offsetOf(root);

    press(root, "down");

    const row = requireBounds(root, "feed-n1");
    expect(row.y).toBeGreaterThanOrEqual(frame.y);
    expect(row.y + row.height).toBeLessThanOrEqual(frame.y + frame.height);
    expect(offsetOf(root)).toBeGreaterThan(scrolled);

    root.unmount();
  });

  it("runs a header action without reading the active row", () => {
    const onRead = vi.fn();
    const onMarkAllRead = vi.fn();
    const root = renderComponent(
      <Centre
        notifications={seed}
        onRead={onRead}
        onMarkAllRead={onMarkAllRead}
        defaultOpen
      />,
    );
    const action = root.renderer.findByTestId("mark-all");
    if (action === undefined) throw new Error("behaviour: no header action");

    root.renderer.nativeSimulateKeystrokes(action.id, "enter");

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(onRead).not.toHaveBeenCalled();
    expect(isShown(root, "panel")).toBe(true);

    root.unmount();
  });

  it("leaves the reading cursor alone while a header action holds focus", () => {
    const root = renderComponent(
      <Centre
        notifications={seed}
        onMarkAllRead={() => undefined}
        defaultOpen
      />,
    );
    const action = root.renderer.findByTestId("mark-all");
    if (action === undefined) throw new Error("behaviour: no header action");

    root.renderer.nativeSimulateKeystrokes(action.id, "down");

    expect(root.renderer.getFocusedElementId?.()).toBe(action.id);
    expect(background(root, "feed-deploy")).toBe(darkTheme.colors.accent);
    expect(background(root, "feed-review")).toBeUndefined();

    root.unmount();
  });

  it("keeps arrow and Enter working while a row holds focus", () => {
    const onRead = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onRead={onRead} defaultOpen />,
    );
    const panel = root.renderer.findByTestId("panel");
    const review = root.renderer.findByTestId("feed-review");
    if (panel === undefined || review === undefined)
      throw new Error("behaviour: the panel or row is missing");

    root.renderer.nativeSimulateKeystrokes(panel.id, "down");
    expect(root.renderer.getFocusedElementId?.()).toBe(review.id);

    root.renderer.simulateKeystrokes("enter");
    expect(onRead).toHaveBeenCalledTimes(1);
    expect(onRead).toHaveBeenCalledWith("review");

    root.unmount();
  });

  it("keeps the reader's row when a notification is prepended while scrolled", () => {
    const items: ReadonlyArray<NotificationItem> = Array.from(
      { length: 12 },
      (_, index) => ({
        id: `n${index}`,
        title: `Notification ${index}`,
        group: "Today",
      }),
    );
    const root = renderComponent(<Centre notifications={items} defaultOpen />);
    const feed = requireBounds(root, "feed");

    root.renderer.nativeSimulateScrollWheel(
      feed.x + feed.width / 2,
      feed.y + feed.height / 2,
      0,
      -200,
    );
    const before = requireBounds(root, "feed-n5").y;
    const beforeOffset = offsetOf(root);

    root.rerender(
      <Centre
        notifications={Arr.prepend(items, {
          id: "new",
          title: "New event",
          group: "Today",
        })}
        defaultOpen
      />,
    );

    expect(
      Math.abs(requireBounds(root, "feed-n5").y - before),
    ).toBeLessThanOrEqual(1);
    expect(offsetOf(root)).toBeLessThan(beforeOffset);

    root.unmount();
  });

  it("paints the light theme's roles", () => {
    const root = renderComponent(
      <Centre notifications={seed} defaultOpen />,
      "light",
    );

    expect(root.renderer.findByTestId("panel")?.style.backgroundColor).toBe(
      lightTheme.colors.popover,
    );
    expect(background(root, "feed-deploy")).toBe(lightTheme.colors.accent);
    expect(background(root, "feed-deploy-unread")).toBe(
      lightTheme.colors.primary,
    );

    root.unmount();
  });
});
