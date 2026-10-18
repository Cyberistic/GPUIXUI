/**
 * Notification centre example: a workspace inbox.
 *
 * The read flags live in this component, exactly as an app's server state would:
 * the centre only requests a read, so closing the panel and reopening it keeps
 * every flag. "Simulate arrival" prepends an unread row so the derived badge and
 * the grouped feed can be seen moving together.
 */

import * as Arr from "effect/Array";
import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import {
  NotificationCentre,
  NotificationCentreClear,
  NotificationCentreContent,
  NotificationCentreHeader,
  NotificationCentreList,
  NotificationCentreMarkAll,
  NotificationCentreTitle,
  NotificationCentreTrigger,
} from "../src/notification-centre.js";
import {
  readAll,
  readItem,
  unreadCount,
  type NotificationItem,
} from "../src/notification-centre/model.js";

const seed: ReadonlyArray<NotificationItem> = [
  {
    id: "deploy",
    title: "Deploy finished",
    description: "web · 1.4.0 is live",
    timestamp: "2m",
    group: "Today",
  },
  {
    id: "review",
    title: "Review requested",
    description: "settings-form.tsx",
    timestamp: "18m",
    group: "Today",
    read: true,
  },
  {
    id: "nightly",
    title: "Nightly failed",
    description: "darwin-arm64 · 3 checks",
    timestamp: "1h",
    group: "Today",
  },
  {
    id: "invite",
    title: "Invite accepted",
    description: "Ada joined the workspace",
    timestamp: "Yesterday",
    group: "Earlier",
    read: true,
  },
  {
    id: "token",
    title: "Token expires soon",
    description: "Rotate the deploy token",
    timestamp: "Yesterday",
    group: "Earlier",
  },
];

/** A new unread row, as a server push would deliver it. */
const arrival = (id: number): NotificationItem => ({
  id: `arrival-${id}`,
  title: `New event ${id}`,
  description: "Streamed from the workspace",
  timestamp: "now",
  group: "Today",
});

/** A workspace inbox with a live arrival control. */
export const NotificationCentreExample = () => {
  const theme = useTheme();
  const [items, setItems] = useState<ReadonlyArray<NotificationItem>>(seed);
  const [next, setNext] = useState(1);
  const unread = unreadCount(items);

  const arrive = (): void => {
    setItems((current) => Arr.prepend(current, arrival(next)));
    setNext((current) => current + 1);
  };

  return (
    <Card style={{ maxWidth: 520 }}>
      <CardHeader>
        <CardTitle>Workspace inbox</CardTitle>
        <CardDescription>
          {unread === 0 ? "Everything is read" : `${unread} unread`}
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
          paddingTop: theme.spacing.xs,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`${items.length} notifications · ${unread} unread`}
        </text>
        <NotificationCentre
          notifications={items}
          onRead={(id) => setItems((current) => readItem(current, id))}
          onMarkAllRead={() => setItems((current) => readAll(current))}
          onClear={() => setItems([])}
        >
          <NotificationCentreTrigger testId="inbox-trigger">
            Inbox
          </NotificationCentreTrigger>
          <NotificationCentreContent>
            <NotificationCentreHeader>
              <NotificationCentreTitle>Inbox</NotificationCentreTitle>
              <NotificationCentreMarkAll>Mark all</NotificationCentreMarkAll>
              <NotificationCentreClear />
            </NotificationCentreHeader>
            <NotificationCentreList
              testId="inbox-feed"
              emptyTitle="You're all caught up"
              emptyDescription="New events will appear here."
            />
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "flex-end",
                padding: theme.spacing.md,
                borderTopWidth: theme.borderWidth.thin,
                borderColor: theme.colors.border,
              }}
            >
              <Button size="sm" onClick={arrive}>
                Simulate arrival
              </Button>
            </div>
          </NotificationCentreContent>
        </NotificationCentre>
      </div>
    </Card>
  );
};
