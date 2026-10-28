import { useState, type MouseEvent } from "react";

/**
 * The notification centre block — a dark panel of grouped notifications, plus
 * the `@gpuixui/*` recipe a consumer copies.
 *
 * The panel owns only what a reader can watch: the selected filter, the rows
 * that were read, and the invite that was accepted. Those three rules live in
 * exported functions below, because "which rows does Verified show" and "is
 * this dot painted" are the parts a rendering cannot be checked on.
 */

export type NotificationFilter = "all" | "verified" | "mentions";

export type NotificationBody =
  | { readonly kind: "quote"; readonly lines: readonly [string, string] }
  | { readonly kind: "follow" }
  | { readonly kind: "invite" }
  | { readonly kind: "file"; readonly name: string; readonly meta: string };

export interface Notification {
  readonly id: string;
  /** The day the row belongs to; a dashed rule separates two groups. */
  readonly group: "today" | "yesterday" | "earlier";
  readonly initials: string;
  readonly name: string;
  readonly action: string;
  /** The timestamp under the name. */
  readonly at: string;
  /** The right-aligned age. */
  readonly ago: string;
  readonly unread: boolean;
  /** Show the row under the Verified tab. */
  readonly verified: boolean;
  /** Show the row under the Mentions tab. */
  readonly mentions: boolean;
  readonly body: NotificationBody;
}

export const notifications: ReadonlyArray<Notification> = [
  {
    id: "priya",
    group: "today",
    initials: "PR",
    name: "Priya Raman",
    action: "commented on your document",
    at: "Friday 3:12 PM",
    ago: "2 hours ago",
    unread: true,
    verified: false,
    mentions: true,
    body: {
      kind: "quote",
      lines: [
        "The changelog draft reads well now — I moved the migration note above the examples.",
        "One question: should the intro name the release date?",
      ],
    },
  },
  {
    id: "marcus",
    group: "today",
    initials: "MB",
    name: "Marcus Bell",
    action: "started following you",
    at: "Friday 2:48 PM",
    ago: "2 hours ago",
    unread: true,
    verified: true,
    mentions: false,
    body: { kind: "follow" },
  },
  {
    id: "elena",
    group: "today",
    initials: "EC",
    name: "Elena Cirillo",
    action: "invited you to Northwind",
    at: "Friday 1:30 PM",
    ago: "3 hours ago",
    unread: true,
    verified: false,
    mentions: false,
    body: { kind: "invite" },
  },
  {
    id: "tomas",
    group: "today",
    initials: "TF",
    name: "Tomás Ferreira",
    action: "attached a file",
    at: "Friday 11:02 AM",
    ago: "5 hours ago",
    unread: true,
    verified: true,
    mentions: false,
    body: {
      kind: "file",
      name: "Prototype recording 01.mp4",
      meta: "MP4 · 14 MB",
    },
  },
  {
    id: "aiko",
    group: "yesterday",
    initials: "AT",
    name: "Aiko Tanaka",
    action: "mentioned you in Release notes",
    at: "Thursday 6:04 PM",
    ago: "12 hours ago",
    unread: true,
    verified: true,
    mentions: true,
    body: {
      kind: "quote",
      lines: [
        "I tagged you on the rollback section — the old number was still in the table.",
        "Could you confirm the new floor before I publish?",
      ],
    },
  },
  {
    id: "sofia",
    group: "yesterday",
    initials: "SM",
    name: "Sofia Marín",
    action: "commented on your document",
    at: "Thursday 4:20 PM",
    ago: "14 hours ago",
    unread: false,
    verified: false,
    mentions: false,
    body: {
      kind: "quote",
      lines: [
        "This is the clearest version of the onboarding copy so far.",
        "I left two phrasing notes in the margin.",
      ],
    },
  },
  {
    id: "daniel",
    group: "yesterday",
    initials: "DO",
    name: "Daniel Okafor",
    action: "started following you",
    at: "Thursday 9:15 AM",
    ago: "21 hours ago",
    unread: false,
    verified: false,
    mentions: false,
    body: { kind: "follow" },
  },
  {
    id: "northwind",
    group: "earlier",
    initials: "ND",
    name: "Northwind Design",
    action: "mentioned you in Sprint 42",
    at: "Wednesday 5:40 PM",
    ago: "yesterday",
    unread: false,
    verified: true,
    mentions: true,
    body: {
      kind: "quote",
      lines: [
        "The hand-off for the settings screens is ready for you to review.",
        "We closed the three open questions from Monday's call.",
      ],
    },
  },
  {
    id: "lena",
    group: "earlier",
    initials: "LV",
    name: "Lena Vogt",
    action: "attached a file",
    at: "Wednesday 2:10 PM",
    ago: "2 days ago",
    unread: true,
    verified: false,
    mentions: false,
    body: {
      kind: "file",
      name: "Brand audit.pdf",
      meta: "PDF · 2.4 MB",
    },
  },
  {
    id: "ravi",
    group: "earlier",
    initials: "RS",
    name: "Ravi Shah",
    action: "invited you to Atlas",
    at: "Tuesday 10:05 AM",
    ago: "3 days ago",
    unread: false,
    verified: false,
    mentions: false,
    body: { kind: "invite" },
  },
];

export const notificationFilters: ReadonlyArray<{
  readonly value: NotificationFilter;
  readonly label: string;
}> = [
  { value: "all", label: "View all" },
  { value: "verified", label: "Verified" },
  { value: "mentions", label: "Mentions" },
];

export interface NotificationState {
  /** The rows this panel was told to mark read. */
  readonly read: ReadonlyArray<string>;
  /** The invites that were accepted. */
  readonly accepted: ReadonlyArray<string>;
}

export const initialNotificationState: NotificationState = {
  read: [],
  accepted: [],
};

/** A row's dot is painted when the notification arrived unread and stays unread. */
export const isUnread = (
  state: NotificationState,
  row: Notification,
): boolean => row.unread && !state.read.includes(row.id);

export const markRead = (
  state: NotificationState,
  id: string,
): NotificationState =>
  state.read.includes(id) ? state : { ...state, read: [...state.read, id] };

/** Mark all read ignores the filter: every dot in the panel goes out. */
export const markAllRead = (
  state: NotificationState,
  rows: ReadonlyArray<Notification>,
): NotificationState => ({ ...state, read: rows.map((row) => row.id) });

/** Accepting an invite is a read plus a recorded decision. */
export const acceptInvite = (
  state: NotificationState,
  id: string,
): NotificationState => ({
  ...markRead(state, id),
  accepted: state.accepted.includes(id)
    ? state.accepted
    : [...state.accepted, id],
});

export const filterNotifications = (
  filter: NotificationFilter,
  rows: ReadonlyArray<Notification>,
): ReadonlyArray<Notification> =>
  filter === "all"
    ? rows
    : rows.filter((row) =>
        filter === "verified" ? row.verified : row.mentions,
      );

const DoubleCheckGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={15}
    viewBox="0 0 24 24"
    width={15}
  >
    <path d="m2 12.5 4.5 4.5L15 8" stroke="currentColor" strokeWidth="1.8" />
    <path d="m10 14.5 2.5 2.5L21 8.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const GearGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={15}
    viewBox="0 0 24 24"
    width={15}
  >
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 3v2.2M12 18.8V21M4.8 7.5l1.9 1.1M17.3 15.4l1.9 1.1M4.8 16.5l1.9-1.1M17.3 8.6l1.9-1.1"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const FileGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={14}
    viewBox="0 0 24 24"
    width={14}
  >
    <path
      d="M6 3h7l5 5v13H6zM13 3v5h5"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const DownloadGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={13}
    viewBox="0 0 24 24"
    width={13}
  >
    <path d="M12 3v12" stroke="currentColor" strokeWidth="1.8" />
    <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const Body = ({
  body,
  accepted,
  onAccept,
  onDecline,
  onDownload,
}: {
  readonly body: NotificationBody;
  readonly accepted: boolean;
  readonly onAccept: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly onDecline: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly onDownload: (event: MouseEvent<HTMLButtonElement>) => void;
}) => {
  if (body.kind === "quote") {
    return (
      <div className="gx-notif-quote">
        {body.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    );
  }

  if (body.kind === "invite") {
    return (
      <div className="gx-notif-invite">
        {accepted ? (
          <p className="gx-notif-accepted">Accepted</p>
        ) : (
          <>
            <button
              className="gx-btn gx-btn-ghost gx-btn-sm"
              onClick={onDecline}
              type="button"
            >
              Decline
            </button>
            <button
              className="gx-btn gx-btn-primary gx-btn-sm"
              onClick={onAccept}
              type="button"
            >
              Accept
            </button>
          </>
        )}
      </div>
    );
  }

  if (body.kind === "file") {
    return (
      <div className="gx-notif-file">
        <span className="gx-notif-file-glyph">
          <FileGlyph />
        </span>
        <span className="gx-notif-file-text">
          <span className="gx-notif-file-name">{body.name}</span>
          <span className="gx-notif-file-meta">{body.meta}</span>
        </span>
        <button
          aria-label={`Download ${body.name}`}
          className="gx-btn gx-btn-secondary gx-btn-sm gx-btn-square"
          onClick={onDownload}
          type="button"
        >
          <DownloadGlyph />
        </button>
      </div>
    );
  }

  return null;
};

const DayGroups = ["today", "yesterday", "earlier"] as const;

export interface NotificationCentreProps {
  /** The tab the panel opens on. */
  readonly initialFilter?: NotificationFilter;
}

export const NotificationCentreRender = ({
  initialFilter = "all",
}: NotificationCentreProps = {}) => {
  const [filter, setFilter] = useState<NotificationFilter>(initialFilter);
  const [state, setState] = useState<NotificationState>(
    initialNotificationState,
  );

  const visible = filterNotifications(filter, notifications);
  const groups = DayGroups.flatMap((group) => {
    const rows = visible.filter((row) => row.group === group);
    return rows.length === 0 ? [] : [{ group, rows }];
  });

  return (
    <div className="gx-notif">
      <section aria-label="Notifications" className="gx-notif-panel">
        <header className="gx-notif-head">
          <h3 className="gx-notif-title">Your notifications</h3>
          <div className="gx-notif-head-actions">
            <button
              aria-label="Mark all read"
              className="gx-notif-icon"
              onClick={() => setState(markAllRead(state, notifications))}
              type="button"
            >
              <DoubleCheckGlyph />
            </button>
            <button
              aria-label="Notification settings"
              className="gx-notif-icon"
              type="button"
            >
              <GearGlyph />
            </button>
          </div>
        </header>
        <div
          aria-label="Notification filters"
          className="gx-tabs-list gx-notif-tabs"
          role="tablist"
        >
          {notificationFilters.map(({ value, label }) => (
            <button
              aria-selected={filter === value}
              className="gx-tab gx-notif-tab"
              key={value}
              onClick={() => setFilter(value)}
              role="tab"
              type="button"
            >
              {label}
              {value === "all" ? (
                <span className="gx-notif-count">{notifications.length}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="gx-notif-list">
          {groups.map(({ group, rows }, index) => (
            <div className="gx-notif-group" key={group}>
              {index > 0 ? <hr className="gx-notif-sep" /> : null}
              {rows.map((row) => (
                <div
                  className="gx-notif-row"
                  data-unread={isUnread(state, row)}
                  key={row.id}
                  onClick={() => setState(markRead(state, row.id))}
                >
                  <span aria-hidden="true" className="gx-notif-avatar">
                    {row.initials}
                  </span>
                  <button
                    aria-label={`Open the notification from ${row.name}`}
                    className="gx-notif-hit"
                    type="button"
                  >
                    <span className="gx-notif-line">
                      <span className="gx-notif-name">{row.name}</span>
                      <span className="gx-notif-action">{row.action}</span>
                    </span>
                    <span className="gx-notif-time">{row.at}</span>
                  </button>
                  <span className="gx-notif-ago">{row.ago}</span>
                  <span aria-hidden="true" className="gx-notif-dot" />
                  <div className="gx-notif-body">
                    <Body
                      accepted={state.accepted.includes(row.id)}
                      body={row.body}
                      onAccept={(event) => {
                        event.stopPropagation();
                        setState(acceptInvite(state, row.id));
                      }}
                      onDecline={(event) => event.stopPropagation()}
                      onDownload={(event) => event.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const notificationCentreSource = `import { useState } from "react";
import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Card, CardHeader, CardTitle } from "@gpuixui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import { Button, IconButton, Stack, Text } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";

interface NotificationRow {
  readonly id: string;
  readonly name: string;
  readonly action: string;
  readonly at: string;
  readonly ago: string;
  readonly unread: boolean;
  readonly verified: boolean;
  readonly mentions: boolean;
  readonly body: "quote" | "follow" | "invite" | "file";
  readonly quote?: ReadonlyArray<string>;
  readonly file?: { readonly name: string; readonly meta: string };
}

export function NotificationCentre({ rows }: { readonly rows: ReadonlyArray<NotificationRow> }) {
  const [filter, setFilter] = useState("all");
  const [read, setRead] = useState<ReadonlyArray<string>>([]);
  const [accepted, setAccepted] = useState<ReadonlyArray<string>>([]);

  const markRead = (id: string) =>
    setRead((current) => (current.includes(id) ? current : [...current, id]));

  const visible = filter === "all"
    ? rows
    : rows.filter((row) => (filter === "verified" ? row.verified : row.mentions));

  return (
    <Card variant="outline" style={{ width: 460 }}>
      <CardHeader>
        <Stack direction="row" align="center" justify="between">
          <CardTitle>Your notifications</CardTitle>
          <Stack direction="row" gap="2xs">
            <IconButton
              label="Mark all read"
              icon={<Icon name="check" />}
              onActivate={() => setRead(rows.map((row) => row.id))}
            />
            <IconButton label="Notification settings" icon={<Icon name="settings" />} />
          </Stack>
        </Stack>
      </CardHeader>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList label="Notification filters">
          <TabsTrigger value="all">
            View all <Badge variant="neutral">{rows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
        </TabsList>
      </Tabs>
      <Stack direction="column" gap="2xs">
        {visible.map((row) => (
          <Stack key={row.id} direction="column" gap="2xs">
            <Stack direction="row" gap="sm" align="start">
              <Avatar name={row.name} size="sm" />
              <Stack direction="column" gap="2xs" grow>
                <Stack direction="row" gap="2xs" align="baseline">
                  <Text role="bodyStrong">{row.name}</Text>
                  <Text role="body" tone="muted">{row.action}</Text>
                </Stack>
                <Text role="caption" tone="muted">{row.at}</Text>
              </Stack>
              <Stack direction="row" gap="sm" align="center">
                {read.includes(row.id) ? null : <Badge variant="success">Unread</Badge>}
                <Text role="caption" tone="muted">{row.ago}</Text>
              </Stack>
            </Stack>
            {row.body === "quote" ? (
              <Stack direction="column" gap="2xs" style={{ marginLeft: 40 }}>
                {row.quote?.map((line) => (
                  <Text key={line} role="caption" tone="muted">{line}</Text>
                ))}
              </Stack>
            ) : null}
            {row.body === "file" && row.file !== undefined ? (
              <Stack direction="row" gap="sm" align="center" style={{ marginLeft: 40 }}>
                <Icon name="file" />
                <Stack direction="column" gap="2xs" grow>
                  <Text role="label">{row.file.name}</Text>
                  <Text role="caption" tone="muted">{row.file.meta}</Text>
                </Stack>
                <IconButton
                  label={\`Download \${row.file.name}\`}
                  icon={<Icon name="download" />}
                />
              </Stack>
            ) : null}
            {row.body === "invite" ? (
              accepted.includes(row.id) ? (
                <Text role="caption" tone="muted">Accepted</Text>
              ) : (
                <Stack direction="row" gap="2xs" style={{ marginLeft: 40 }}>
                  <Button variant="ghost" size="sm">Decline</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onActivate={() => {
                      markRead(row.id);
                      setAccepted((current) => [...current, row.id]);
                    }}
                  >
                    Accept
                  </Button>
                </Stack>
              )
            ) : null}
            {row.body === "follow" ? null : null}
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}`;
