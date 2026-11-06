import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NotificationCentreRender,
  acceptInvite,
  filterNotifications,
  initialNotificationState,
  isUnread,
  markAllRead,
  markRead,
  notifications,
} from "./notification-centre";

const text = (markup: string): string =>
  markup
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");

const rowsIn = (markup: string): number =>
  (markup.match(/class="gx-notif-row"/g) ?? []).length;

const all = renderToStaticMarkup(<NotificationCentreRender />);

describe("the notification centre", () => {
  it("prints the header actions and the three filter tabs", () => {
    expect(all).toContain("Your notifications");
    expect(all).toContain('aria-label="Mark all read"');
    expect(all).toContain('aria-label="Notification settings"');
    expect(all).toContain(">View all<");
    expect(all).toContain(">Verified<");
    expect(all).toContain(">Mentions<");
    expect(all).toContain('class="gx-notif-count"');
    expect(all).toContain(">10<");
  });

  it("prints all four row bodies", () => {
    expect(all).toContain("gx-notif-quote");
    expect(text(all)).toContain(
      "I moved the migration note above the examples.",
    );

    expect(text(all)).toContain("Marcus Bell");
    expect(text(all)).toContain("started following you");

    expect(all).toContain(">Decline<");
    expect(all).toContain(">Accept<");

    expect(all).toContain("Prototype recording 01.mp4");
    expect(all).toContain("MP4 · 14 MB");
    expect(all).toContain('aria-label="Download Prototype recording 01.mp4"');
  });

  it("prints a timestamp under every name and the age on the right", () => {
    expect(all).toContain("Friday 3:12 PM");
    expect(all).toContain(">2 hours ago<");
    expect(rowsIn(all)).toBe(notifications.length);
    expect((all.match(/class="gx-notif-time"/g) ?? []).length).toBe(
      notifications.length,
    );
  });

  it("separates the day groups with a dashed rule", () => {
    expect((all.match(/class="gx-notif-sep"/g) ?? []).length).toBe(2);
  });

  it("filters View all, Verified and Mentions", () => {
    const verified = filterNotifications("verified", notifications);
    const mentions = filterNotifications("mentions", notifications);

    expect(filterNotifications("all", notifications)).toEqual(notifications);
    expect(verified.length).toBe(4);
    expect(verified.every((row) => row.verified)).toBe(true);
    expect(mentions.length).toBe(3);
    expect(mentions.every((row) => row.mentions)).toBe(true);
    expect(
      rowsIn(
        renderToStaticMarkup(
          <NotificationCentreRender initialFilter="verified" />,
        ),
      ),
    ).toBe(verified.length);
    expect(
      rowsIn(
        renderToStaticMarkup(
          <NotificationCentreRender initialFilter="mentions" />,
        ),
      ),
    ).toBe(mentions.length);
  });

  it("marks a row read, and mark-all-read clears every unread dot", () => {
    const priya = notifications[0];
    expect(priya).toBeDefined();
    if (priya === undefined) return;

    expect(isUnread(initialNotificationState, priya)).toBe(true);
    const read = markRead(initialNotificationState, priya.id);
    expect(isUnread(read, priya)).toBe(false);

    expect(markRead(read, priya.id)).toBe(read);

    const cleared = markAllRead(initialNotificationState, notifications);
    expect(notifications.filter((row) => isUnread(cleared, row))).toEqual([]);
    expect(cleared.read).toEqual(notifications.map((row) => row.id));
  });

  it("accepts an invite and marks that row read", () => {
    const invite = notifications.find((row) => row.body.kind === "invite");
    expect(invite).toBeDefined();
    if (invite === undefined) return;

    const accepted = acceptInvite(initialNotificationState, invite.id);
    expect(accepted.accepted).toEqual([invite.id]);
    expect(isUnread(accepted, invite)).toBe(false);

    expect(acceptInvite(accepted, invite.id).accepted).toEqual([invite.id]);
  });
});
