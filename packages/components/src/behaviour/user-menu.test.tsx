/**
 * UserMenu behaviour in the real GPUix renderer.
 *
 * The bugs these guard: a standalone account row that cannot be opened because
 * its avatar swallows the press, a row that runs its callback twice (once from
 * the pointer and once from the menu's close), and a menu that stays painted
 * after an action.
 */

import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  requireBounds,
  settle,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { UserMenu } from "../user-menu.js";

const user = { name: "Benji van der Brand", email: "benji@example.com" };

/** The standalone menu with one spy per row. */
const account = () => ({
  onUpgrade: vi.fn(),
  onAccount: vi.fn(),
  onBilling: vi.fn(),
  onNotifications: vi.fn(),
  onLogOut: vi.fn(),
});

describe("UserMenu", () => {
  it("opens from the identity row and paints every action", async () => {
    const root = renderComponent(
      <UserMenu user={user} onAccount={() => undefined} />,
    );
    expect(root.renderer.getAllText()).toContain("Benji van der Brand");
    expect(root.renderer.getAllText()).toContain("benji@example.com");

    clickCentreOf(root, "user-menu-trigger");
    await waitFor(() => {
      settle(root);
      requireBounds(root, "user-menu-notifications");
    });

    const text = root.renderer.getAllText();
    for (const row of [
      "Upgrade to Pro",
      "Account",
      "Billing",
      "Notifications",
      "Log out",
    ]) {
      expect(text).toContain(row);
    }
    root.unmount();
  });

  it("runs one action and closes the menu", async () => {
    const handlers = account();
    const root = renderComponent(<UserMenu user={user} {...handlers} />);

    clickCentreOf(root, "user-menu-trigger");
    await waitFor(() => {
      settle(root);
      requireBounds(root, "user-menu-log-out");
    });
    clickCentreOf(root, "user-menu-log-out");

    expect(handlers.onLogOut).toHaveBeenCalledTimes(1);
    expect(handlers.onAccount).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(root.renderer.findByTestId("user-menu-content")).toBeUndefined(),
    );
    root.unmount();
  });

  it("opens beside an icon rail and paints only the avatar", async () => {
    const root = renderComponent(<UserMenu user={user} collapsed />);
    expect(requireBounds(root, "user-menu-trigger").width).toBe(32);
    expect(root.renderer.getAllText()).not.toContain("benji@example.com");

    clickCentreOf(root, "user-menu-trigger");
    await waitFor(() => {
      settle(root);
      requireBounds(root, "user-menu-upgrade");
    });
    expect(root.renderer.getAllText()).toContain("benji@example.com");
    root.unmount();
  });
});
