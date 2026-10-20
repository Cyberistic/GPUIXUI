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
 *
 * A notification row draws as a button, but only Enter read it; Space on
 * release now does too (plan 741), because GPUix synthesizes no activation
 * click for a role-bearing div. A header action still owns its own keys. A
 * caller's authored trigger name was overwritten by the derived unread count,
 * although the package's naming rule lets the caller win (plan 794). A
 * non-finite `sideOffset` was coerced to 0, dropping the documented gap
 * (plan 813).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import type { HeadingLevel } from "../internal/heading.js";
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
  triggerLabel,
  sideOffset,
}: {
  readonly notifications: ReadonlyArray<NotificationItem>;
  readonly onRead?: (id: string) => void;
  readonly onMarkAllRead?: () => void;
  readonly onClear?: () => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly triggerLabel?: string;
  readonly sideOffset?: number;
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
    <NotificationCentreTrigger testId="bell" aria-label={triggerLabel} />
    <NotificationCentreContent testId="panel" sideOffset={sideOffset}>
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

/** Two ungrouped notifications, so the panel title is the only heading. */
const ungrouped: ReadonlyArray<NotificationItem> = [
  { id: "build", title: "Build passed" },
  { id: "sync", title: "Sync complete", read: true },
];

/** An open centre whose header parts are configurable, for the outline cases. */
const Outline = ({
  notifications,
  level,
  rawLevel,
  groupLevel,
  headerTestId,
  titleTestId,
  titleStyle,
  children,
}: {
  readonly notifications: ReadonlyArray<NotificationItem>;
  readonly level?: HeadingLevel;
  readonly rawLevel?: number;
  readonly groupLevel?: HeadingLevel;
  readonly headerTestId?: string;
  readonly titleTestId?: string;
  readonly titleStyle?: { readonly backgroundColor: string };
  readonly children?: ReactNode;
}) => (
  <NotificationCentre notifications={notifications} defaultOpen>
    <NotificationCentreTrigger />
    <NotificationCentreContent testId="panel">
      <NotificationCentreHeader testId={headerTestId}>
        <NotificationCentreTitle
          level={level}
          aria-level={rawLevel}
          testId={titleTestId}
          style={titleStyle}
        >
          {children}
        </NotificationCentreTitle>
      </NotificationCentreHeader>
      <NotificationCentreList testId="feed" groupLevel={groupLevel} />
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

  it("lets the caller's authored name be the whole trigger name", () => {
    const root = renderComponent(
      <Centre notifications={seed} triggerLabel="Alerts" />,
    );

    expect(root.renderer.findByTestId("bell")?.customProps).toMatchObject({
      "aria-label": "Alerts",
      "aria-expanded": false,
    });

    clickCentreOf(root, "bell");

    expect(root.renderer.findByTestId("panel")?.customProps).toMatchObject({
      role: "region",
      "aria-label": "Notifications",
    });

    root.unmount();
  });

  it("trims the caller's authored trigger name", () => {
    const root = renderComponent(
      <Centre notifications={seed} triggerLabel="  Alerts  " />,
    );

    expect(root.renderer.findByTestId("bell")?.customProps).toMatchObject({
      "aria-label": "Alerts",
    });

    root.unmount();
  });

  it("falls back to the derived name when the authored one is blank", () => {
    const root = renderComponent(
      <Centre notifications={seed} triggerLabel="   " />,
    );

    expect(root.renderer.findByTestId("bell")?.customProps).toMatchObject({
      "aria-label": "Notifications, 3 unread",
    });

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

  it("keeps the default gap when sideOffset is malformed", () => {
    const byDefault = renderComponent(
      <Centre notifications={seed} defaultOpen />,
    );
    const defaultY = requireBounds(byDefault, "panel").y;
    byDefault.unmount();

    const malformed = renderComponent(
      <Centre notifications={seed} defaultOpen sideOffset={Number.NaN} />,
    );
    const panel = requireBounds(malformed, "panel");

    // 0.10.0 coerces a non-finite offset to 0, so the old code dropped the
    // documented 8px gap (measured 81 -> 73). The default is the fallback.
    expect(Number.isFinite(panel.y)).toBe(true);
    expect(panel.y).toBe(defaultY);

    malformed.unmount();
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

  it("hands focus to the first live row when the focused notification is removed", () => {
    const root = renderComponent(<Centre notifications={seed} defaultOpen />);
    press(root, "down");
    expect(focusedTestId(root)).toEqual(Option.some("feed-review"));

    root.rerender(
      <Centre notifications={seed.filter((item) => item.id !== "review")} />,
    );

    expect(isShown(root, "panel")).toBe(true);
    expect(focusedTestId(root)).toEqual(Option.some("feed-deploy"));
    expect(isShown(root, "feed-deploy")).toBe(true);

    root.unmount();
  });

  it("does not steal focus when a row is removed while the trigger holds it", () => {
    const root = renderComponent(<Centre notifications={seed} defaultOpen />);
    press(root, "down");
    root.renderer.focusElement(root.renderer.findByTestId("bell")?.id ?? -1);

    root.rerender(
      <Centre notifications={seed.filter((item) => item.id !== "review")} />,
    );

    expect(isShown(root, "panel")).toBe(true);
    expect(focusedTestId(root)).toEqual(Option.some("bell"));

    root.unmount();
  });

  it("remembers a surviving row across another removal before handing over", () => {
    const root = renderComponent(<Centre notifications={seed} defaultOpen />);
    press(root, "down");
    expect(focusedTestId(root)).toEqual(Option.some("feed-review"));

    root.rerender(
      <Centre notifications={seed.filter((item) => item.id !== "token")} />,
    );
    expect(focusedTestId(root)).toEqual(Option.some("feed-review"));

    root.rerender(
      <Centre
        notifications={seed.filter(
          (item) => item.id !== "token" && item.id !== "review",
        )}
      />,
    );
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

  it("reads the active row with Space, on its release", () => {
    const onRead = vi.fn();
    const root = renderComponent(
      <Centre notifications={seed} onRead={onRead} defaultOpen />,
    );
    const row = root.renderer.findByTestId("feed-review");
    if (row === undefined) throw new Error("behaviour: no row");

    press(root, "down");
    expect(root.renderer.getFocusedElementId?.()).toBe(row.id);

    root.renderer.nativeSimulateKeyDown(row.id, "space");
    expect(onRead).not.toHaveBeenCalled();

    root.renderer.nativeSimulateKeyUp(row.id, "space");
    expect(onRead).toHaveBeenCalledTimes(1);
    expect(onRead).toHaveBeenCalledWith("review");
    expect(isShown(root, "panel")).toBe(true);

    root.unmount();
  });

  it("leaves a header action's Space press to that action", () => {
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

    root.renderer.nativeSimulateKeyDown(action.id, "space");
    root.renderer.nativeSimulateKeyUp(action.id, "space");

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(onRead).not.toHaveBeenCalled();
    expect(isShown(root, "panel")).toBe(true);

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

  it("announces the panel title as a level-3 heading", () => {
    const root = renderComponent(<Outline notifications={ungrouped} />);
    const headings = nodesWithRole(root.renderer, "heading");

    expect(headings.map((node) => node.name)).toEqual(["Notifications"]);
    expect(headings.map((node) => node.level)).toEqual([Option.some(3)]);

    root.unmount();
  });

  it("takes the title level from the caller", () => {
    const explicit = renderComponent(
      <Outline notifications={ungrouped} level={1} />,
    );
    expect(
      nodesWithRole(explicit.renderer, "heading").map((node) => node.level),
    ).toEqual([Option.some(1)]);
    explicit.unmount();

    // The typed prop wins over the raw attribute it replaces.
    const both = renderComponent(
      <Outline notifications={ungrouped} level={2} rawLevel={5} />,
    );
    expect(
      nodesWithRole(both.renderer, "heading").map((node) => node.level),
    ).toEqual([Option.some(2)]);
    both.unmount();

    // With no typed prop, the caller's raw aria-level is the level.
    const raw = renderComponent(
      <Outline notifications={ungrouped} rawLevel={5} />,
    );
    expect(
      nodesWithRole(raw.renderer, "heading").map((node) => node.level),
    ).toEqual([Option.some(5)]);
    raw.unmount();
  });

  it("announces each group label as a heading below the title", () => {
    const root = renderComponent(<Outline notifications={seed} />);
    const headings = nodesWithRole(root.renderer, "heading");

    expect(
      headings.map((node) => [node.name, Option.getOrNull(node.level)]),
    ).toEqual([
      ["Notifications", 3],
      ["Today", 4],
      ["Earlier", 4],
    ]);

    root.unmount();

    const moved = renderComponent(
      <Outline notifications={seed} groupLevel={2} />,
    );
    expect(
      nodesWithRole(moved.renderer, "heading").map((node) => [
        node.name,
        Option.getOrNull(node.level),
      ]),
    ).toEqual([
      ["Notifications", 3],
      ["Today", 2],
      ["Earlier", 2],
    ]);

    moved.unmount();
  });

  it("addresses the header and the title", () => {
    const root = renderComponent(
      <Outline
        notifications={ungrouped}
        headerTestId="inbox-header"
        titleTestId="inbox-title"
        titleStyle={{ backgroundColor: "#FF0000" }}
      >
        Inbox
      </Outline>,
    );

    expect(root.renderer.findByTestId("inbox-header")).toBeDefined();
    expect(root.renderer.findByTestId("inbox-title")).toBeDefined();
    expect(
      root.renderer.findByTestId("inbox-title")?.style.backgroundColor,
    ).toBe("#FF0000");

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
