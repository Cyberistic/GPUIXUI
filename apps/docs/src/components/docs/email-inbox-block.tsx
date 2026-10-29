import { useReducer, useRef, useState } from "react";
import { BlockIcon, type BlockIconName } from "./block-icons";
import { RailToggle } from "./sidebar-rail";

/**
 * Email inbox block — `/blocks/email-inbox`.
 *
 * A four-pane mail client: the folder rail, the message list, the reading pane
 * and the sender's contact card. `EmailInboxRender` is the browser reproduction
 * of the native geometry; `emailInboxSource` is the recipe a consumer copies.
 *
 * `inboxReducer` and `messagesInTab` are pure so the list's two filters — the
 * selected message and the Primary/Promotions/Social tab — are table-tested.
 */

export type MailTab = "primary" | "promotions" | "social";

export const mailTabs: ReadonlyArray<{
  readonly id: MailTab;
  readonly label: string;
}> = [
  { id: "primary", label: "Primary" },
  { id: "promotions", label: "Promotions" },
  { id: "social", label: "Social" },
];

export interface MailMessage {
  readonly id: string;
  readonly sender: string;
  readonly subject: string;
  readonly preview: string;
  readonly date: string;
  readonly body: string;
  readonly avatar: string;
  readonly category: MailTab;
  readonly unread: boolean;
  readonly attachment: boolean;
  readonly flagged: boolean;
  /** A provider label, such as Gmail's `Promotion` chip. */
  readonly tag?: string;
}

/** The open thread: Killua's message is not in the list, as in a thread view. */
export const bobThread: MailMessage = {
  id: "bob-dylan",
  sender: "Killua Zoldyck",
  subject: "Long time no see!",
  preview: "About our picnic — we'll be meeting at the park around 2PM.",
  date: "Fri, 07 March 2025, 09:10",
  body: "Hi Gon,\n\nHope you're doing well!\n\nAbout our picnic — we'll be meeting at the park around 2PM.\n\nBest regards, Killua",
  avatar: "BD",
  category: "primary",
  unread: false,
  attachment: false,
  flagged: false,
};

/** The Primary tab, in the order the list lays it out. */
export const inboxMessages: ReadonlyArray<MailMessage> = [
  {
    id: "em-client",
    sender: "Hunter Association",
    subject: "Welcome to the Hunter Association",
    preview: "Your mail, calendar and contacts are ready in one place.",
    date: "10/10/2024",
    body: "Welcome aboard.\n\nYour mail, calendar and contacts are ready in one place. Press N to write your first message.",
    avatar: "eM",
    category: "primary",
    unread: true,
    attachment: false,
    flagged: false,
  },
  {
    id: "google-play",
    sender: "Heavens Arena",
    subject: "Ticket presale opens tonight",
    preview: "Choose which ads you see, or reset your advertising ID.",
    date: "10/09/2024",
    body: "You can now choose which ads you see and reset your advertising ID at any time, from Play Store settings.",
    avatar: "GP",
    category: "promotions",
    unread: true,
    attachment: false,
    flagged: false,
    tag: "Promotion",
  },
  {
    id: "cristine",
    sender: "Kurapika",
    subject: "Invitation: Yorknew auction",
    preview: "Thursday at 15:00 — the agenda is attached.",
    date: "10/09/2024",
    body: "Here is the invite for our next release meeting, Thursday at 15:00.\n\nThe agenda is attached; add your items before Wednesday.",
    avatar: "C",
    category: "primary",
    unread: true,
    attachment: true,
    flagged: true,
  },
  {
    id: "vox-pride",
    sender: "Ging Freecss",
    subject: "A note from the Dark Continent",
    preview: "How brands borrowed the language of the movement.",
    date: "10/08/2024",
    body: "This week we look at how brands borrowed the language of Pride, and what the parade looks like without them.",
    avatar: "VX",
    category: "primary",
    unread: false,
    attachment: false,
    flagged: false,
  },
  {
    id: "vox-power",
    sender: "Ging Freecss",
    subject: "Why the most powerful men are the…",
    preview: "A new season asks why so few people hold so much.",
    date: "10/07/2024",
    body: "A new season asks why so few people hold so much — and what a century of consolidation did to the places they left.",
    avatar: "VX",
    category: "primary",
    unread: false,
    attachment: false,
    flagged: false,
  },
  {
    id: "ann-handley",
    sender: "Leorio Paladiknight",
    subject: "Clinic roster #164",
    preview: "The small, unglamorous habits that compound.",
    date: "10/06/2024",
    body: "Issue 164: the small, unglamorous habits that compound — and the four-word question that makes a draft better.",
    avatar: "AH",
    category: "primary",
    unread: false,
    attachment: false,
    flagged: false,
  },
  {
    id: "marginalian",
    sender: "Chimera Ant Research",
    subject: "Nen and the ant hierarchy…",
    preview: "Safety, connection and the stories we tell ourselves.",
    date: "10/05/2024",
    body: "A conversation about safety, connection and the stories we tell ourselves when the body keeps the score.",
    avatar: "TM",
    category: "primary",
    unread: false,
    attachment: false,
    flagged: true,
  },
  {
    id: "new-yorker",
    sender: "Yorknew Times",
    subject: "What is the opposite of Nen?",
    preview: "The case against the wells we cannot see.",
    date: "10/04/2024",
    body: "The case against the wells we cannot see, and for the unglamorous work of putting carbon back where it came from.",
    avatar: "NY",
    category: "primary",
    unread: false,
    attachment: false,
    flagged: false,
  },
];

export interface InboxState {
  readonly selectedId: string;
  readonly tab: MailTab;
  readonly railCollapsed: boolean;
}

export const initialInboxState: InboxState = {
  selectedId: bobThread.id,
  tab: "primary",
  railCollapsed: false,
};

export type InboxAction =
  | { readonly type: "select-message"; readonly id: string }
  | { readonly type: "select-tab"; readonly tab: MailTab }
  | { readonly type: "toggle-rail" };

export const inboxReducer = (
  state: InboxState,
  action: InboxAction,
): InboxState => {
  if (action.type === "select-message") {
    return { ...state, selectedId: action.id };
  }
  if (action.type === "toggle-rail") {
    return { ...state, railCollapsed: !state.railCollapsed };
  }
  return { ...state, tab: action.tab };
};

/** The messages a tab lists. */
export const messagesInTab = (tab: MailTab): ReadonlyArray<MailMessage> =>
  inboxMessages.filter((message) => message.category === tab);

/** The message the reading pane shows; the thread is the fallback. */
export const selectedMail = (state: InboxState): MailMessage =>
  [...inboxMessages, bobThread].find(
    (message) => message.id === state.selectedId,
  ) ?? bobThread;

const favoriteFolders: ReadonlyArray<{
  readonly label: string;
  readonly count?: string;
  readonly icon: BlockIconName;
}> = [
  { label: "All Inboxes", count: "37", icon: "mail" },
  { label: "Outbox", icon: "send" },
  { label: "Unread", count: "768", icon: "mark" },
  { label: "Flagged", count: "5", icon: "flag" },
];

const workFolders: ReadonlyArray<{
  readonly label: string;
  readonly count?: string;
}> = [
  { label: "Inbox", count: "16" },
  { label: "Google", count: "7" },
  { label: "Invoices" },
  { label: "Misc", count: "12" },
  { label: "Sent", count: "1" },
  { label: "Trash" },
  { label: "Drafts", count: "7" },
  { label: "Junk Email", count: "2" },
  { label: "All Mail", count: "161" },
];

const toolbar: ReadonlyArray<{
  readonly label: string;
  readonly icon: BlockIconName;
}> = [
  { label: "Reply", icon: "reply" },
  { label: "Reply All", icon: "replyAll" },
  { label: "Forward", icon: "forward" },
  { label: "Mark", icon: "mark" },
  { label: "Archive", icon: "archive" },
  { label: "Snooze", icon: "snooze" },
  { label: "Quick actions", icon: "zap" },
  { label: "Delete", icon: "trash" },
];

const olderThreads = [
  { subject: "Re: photos from the coast", date: "04 Mar" },
  { subject: "Picnic playlist", date: "28 Feb" },
  { subject: "Long time no see!", date: "21 Feb" },
] as const;

function FolderRow({
  label,
  count,
  icon,
  active = false,
  current = false,
}: {
  readonly label: string;
  readonly count?: string;
  readonly icon: BlockIconName;
  readonly active?: boolean;
  readonly current?: boolean;
}) {
  return (
    <button
      aria-current={current ? "true" : undefined}
      aria-label={label}
      className="gx-mail-folder"
      data-active={active}
      type="button"
    >
      <BlockIcon name={icon} size={14} />
      <span className="gx-mail-folder-label gx-rail-label">{label}</span>
      {count === undefined ? null : (
        <span className="gx-mail-count gx-rail-label">{count}</span>
      )}
    </button>
  );
}

/** The history/attachments switch, and the card it belongs to. */
function ContactRail() {
  const [tab, setTab] = useState<"history" | "attachments">("history");

  return (
    <aside aria-label="Contact details" className="gx-mail-contact">
      <p className="gx-mail-label">Contact Details</p>
      <div className="gx-mail-person">
        <span className="gx-mail-avatar gx-mail-avatar-lg">BD</span>
        <div>
          <p className="gx-mail-person-name">Killua Zoldyck</p>
          <p className="gx-mail-person-mail">bob.dylan@example.com</p>
        </div>
      </div>
      <div className="gx-mail-contact-rows">
        <div className="gx-mail-contact-row">
          <BlockIcon name="mail" size={13} />
          <span>Mail</span>
          <span className="gx-mail-contact-value">bob.dylan@example.com</span>
        </div>
        <div className="gx-mail-contact-row">
          <BlockIcon name="phone" size={13} />
          <span>Phone</span>
          <span className="gx-mail-contact-value">+1 (555) 014-2025</span>
        </div>
      </div>
      <div
        aria-label="Contact history"
        className="gx-mail-contact-tabs"
        role="tablist"
      >
        <button
          aria-selected={tab === "history"}
          className="gx-mail-contact-tab"
          onClick={() => setTab("history")}
          role="tab"
          type="button"
        >
          History
        </button>
        <button
          aria-selected={tab === "attachments"}
          className="gx-mail-contact-tab"
          onClick={() => setTab("attachments")}
          role="tab"
          type="button"
        >
          Attachments
        </button>
      </div>
      <div className="gx-mail-contact-panel" role="tabpanel">
        {tab === "history" ? (
          <ul className="gx-mail-contact-list">
            <li>2 replies · last 07 March</li>
            <li>Added to contacts · 12 January</li>
          </ul>
        ) : (
          <ul className="gx-mail-contact-list">
            <li>picnic-map.pdf · 1.2 MB</li>
            <li>coast-01.jpg · 3.4 MB</li>
          </ul>
        )}
      </div>
      <p className="gx-mail-label">Older</p>
      <ul className="gx-mail-threads">
        {olderThreads.map((thread) => (
          <li className="gx-mail-thread" key={thread.subject}>
            <span className="gx-mail-thread-subject">{thread.subject}</span>
            <span className="gx-mail-thread-date">{thread.date}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export interface EmailInboxSurfaceProps {
  readonly state: InboxState;
  readonly onSelectMessage: (id: string) => void;
  readonly onSelectTab: (tab: MailTab) => void;
  readonly onToggleRail: () => void;
}

/** The client at a given state; `EmailInboxRender` owns the reducer. */
export function EmailInboxSurface({
  state,
  onSelectMessage,
  onSelectTab,
  onToggleRail,
}: EmailInboxSurfaceProps) {
  const message = selectedMail(state);
  const messages = messagesInTab(state.tab);
  const reply = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="gx-mail">
      <aside
        aria-label="Mail folders"
        className="gx-mail-side"
        data-collapsed={state.railCollapsed}
      >
        <header className="gx-mail-side-head">
          <h3 className="gx-mail-title gx-rail-label">Mail</h3>
          <span className="gx-mail-head-actions">
            <span className="gx-mail-new gx-rail-label">
              <button
                className="gx-btn gx-btn-primary gx-btn-sm gx-mail-new-main"
                type="button"
              >
                New
              </button>
              <button
                aria-label="New message options"
                className="gx-btn gx-btn-primary gx-btn-sm gx-mail-new-more"
                type="button"
              >
                <BlockIcon name="chevronDown" size={12} />
              </button>
            </span>
            <RailToggle
              className="gx-mail-collapse"
              collapsed={state.railCollapsed}
              onToggle={onToggleRail}
            />
          </span>
        </header>
        <button className="gx-mail-refresh" type="button">
          <BlockIcon name="refresh" size={13} />
          <span className="gx-rail-label">Refresh</span>
        </button>

        <section className="gx-mail-group">
          <h4 className="gx-mail-group-title gx-rail-label">Favorites</h4>
          {favoriteFolders.map((folder) => (
            <FolderRow
              count={folder.count}
              icon={folder.icon}
              key={folder.label}
              label={folder.label}
            />
          ))}
        </section>

        <section className="gx-mail-group">
          <h4 className="gx-mail-group-title gx-rail-label">Gon - Work</h4>
          {workFolders.map((folder) => (
            <FolderRow
              active={folder.label === "Inbox"}
              count={folder.count}
              current={folder.label === "Inbox"}
              icon="folder"
              key={folder.label}
              label={folder.label}
            />
          ))}
        </section>

        <section className="gx-mail-group">
          <h4 className="gx-mail-group-title gx-rail-label">
            <BlockIcon name="chevronRight" size={11} />
            Gon - Personal
          </h4>
        </section>
        <section className="gx-mail-group">
          <h4 className="gx-mail-group-title gx-rail-label">
            <BlockIcon name="chevronRight" size={11} />
            Local Folders
          </h4>
        </section>
      </aside>

      <div className="gx-mail-main">
        <div className="gx-mail-toolbar">
          <div
            aria-label="Message actions"
            className="gx-mail-actions"
            role="group"
          >
            {toolbar.map((action) => (
              <button
                className="gx-mail-action"
                key={action.label}
                onClick={
                  action.label === "Reply"
                    ? () => {
                        reply.current?.focus();
                      }
                    : undefined
                }
                type="button"
              >
                <BlockIcon name={action.icon} size={14} />
                {action.label}
              </button>
            ))}
          </div>
          <div
            aria-label="Inbox categories"
            className="gx-mail-tabs"
            role="tablist"
          >
            {mailTabs.map((tab) => (
              <button
                aria-selected={state.tab === tab.id}
                className="gx-mail-tab"
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="gx-mail-panes">
          <section aria-label="Messages" className="gx-mail-list">
            {messages.length === 0 ? (
              <p className="gx-mail-empty">
                No messages in{" "}
                {mailTabs.find((tab) => tab.id === state.tab)?.label}.
              </p>
            ) : (
              messages.map((item) => (
                <button
                  aria-current={
                    item.id === state.selectedId ? "true" : undefined
                  }
                  className="gx-mail-row"
                  data-selected={item.id === state.selectedId}
                  data-unread={item.unread}
                  key={item.id}
                  onClick={() => onSelectMessage(item.id)}
                  type="button"
                >
                  <span className="gx-mail-avatar">{item.avatar}</span>
                  <span className="gx-mail-row-body">
                    <span className="gx-mail-row-top">
                      <span className="gx-mail-sender">{item.sender}</span>
                      {item.tag === undefined ? null : (
                        <span className="gx-mail-chip">{item.tag}</span>
                      )}
                      <span className="gx-mail-row-meta">
                        {item.attachment ? (
                          <BlockIcon name="paperclip" size={12} />
                        ) : null}
                        {item.flagged ? (
                          <BlockIcon name="flag" size={12} />
                        ) : null}
                        <span className="gx-mail-date">{item.date}</span>
                      </span>
                    </span>
                    <span className="gx-mail-subject">{item.subject}</span>
                    <span className="gx-mail-preview">{item.preview}</span>
                  </span>
                  <span
                    aria-label="Unread"
                    className="gx-mail-dot"
                    data-on={item.unread}
                  />
                </button>
              ))
            )}
          </section>

          <section aria-label="Reading pane" className="gx-mail-read">
            <h3 className="gx-mail-subject-lg">{message.subject}</h3>
            <div className="gx-mail-from">
              <span className="gx-mail-avatar gx-mail-avatar-lg">
                {message.avatar}
              </span>
              <div className="gx-mail-from-text">
                <p>
                  <strong>{message.sender}</strong>
                  <span className="gx-mail-to">
                    to gon@hunterassociation.org
                  </span>
                </p>
                <span className="gx-mail-date">{message.date}</span>
              </div>
              <button aria-label="Reply" className="gx-mail-icon" type="button">
                <BlockIcon name="reply" size={14} />
              </button>
            </div>
            <p className="gx-mail-body">{message.body}</p>
            <div className="gx-mail-reply">
              <textarea
                aria-label={`Reply to ${message.sender}`}
                className="gx-mail-reply-input"
                placeholder={`Reply to ${message.sender}…`}
                ref={reply}
                rows={3}
              />
              <div className="gx-mail-reply-actions">
                <button className="gx-btn gx-btn-ghost gx-btn-sm" type="button">
                  Attach
                </button>
                <button
                  className="gx-btn gx-btn-primary gx-btn-sm"
                  type="button"
                >
                  <BlockIcon name="send" size={12} />
                  Send
                </button>
              </div>
            </div>
          </section>

          <ContactRail />
        </div>
      </div>
    </div>
  );
}

/** The block's preview: the reducer, then the surface at its current state. */
export function EmailInboxRender() {
  const [state, dispatch] = useReducer(inboxReducer, initialInboxState);

  return (
    <EmailInboxSurface
      onSelectMessage={(id) => dispatch({ type: "select-message", id })}
      onSelectTab={(tab) => dispatch({ type: "select-tab", tab })}
      onToggleRail={() => dispatch({ type: "toggle-rail" })}
      state={state}
    />
  );
}

export const emailInboxPackages = [
  "@gpuixui/components",
  "@gpuixui/primitives",
  "@gpuixui/icons",
] as const;

/** The recipe a consumer copies. */
export const emailInboxSource = `import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Tabs, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import { Button, ScrollArea, Stack, Text, TextArea } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";

const messages = [
  { sender: "Hunter Association", subject: "Welcome to the Hunter Association", date: "10/10/2024", unread: true },
  { sender: "Heavens Arena", subject: "Ticket presale opens tonight", date: "10/09/2024", tag: "Promotion" },
  { sender: "Kurapika", subject: "Invitation: Yorknew auction", date: "10/09/2024" },
  // …the rest of the inbox
];

export function EmailInboxPage() {
  return (
    <Stack direction="row" grow style={{ height: 620 }}>
      <Stack direction="column" gap="2xs" style={{ width: 220, padding: 12 }}>
        <Stack direction="row" justify="between" align="center">
          <Text role="h3">Mail</Text>
          <Button variant="primary" size="sm">New</Button>
        </Stack>
        <Button variant="ghost"><Icon name="refresh" /> Refresh</Button>
        <Text role="label">Favorites</Text>
        {favorites.map((folder) => (
          <Stack direction="row" justify="between" key={folder.label}>
            <Text role="label">{folder.label}</Text>
            <Text role="caption" tone="muted">{folder.count}</Text>
          </Stack>
        ))}
        <Text role="label">Gon - Work</Text>
        {folders.map((folder) => (
          <Button key={folder.label} variant={folder.label === "Inbox" ? "secondary" : "ghost"}>
            <Icon name="folder" /> {folder.label}
          </Button>
        ))}
      </Stack>

      <Stack direction="column" grow>
        <Stack direction="row" justify="between" align="center" style={{ padding: 8 }}>
          <Stack direction="row" gap="2xs">
            {["Reply", "Reply All", "Forward", "Mark", "Archive", "Snooze", "Quick actions", "Delete"].map(
              (action) => <Button key={action} variant="ghost" size="sm">{action}</Button>,
            )}
          </Stack>
          <Tabs defaultValue="primary">
            <TabsList label="Inbox categories">
              <TabsTrigger value="primary">Primary</TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>
          </Tabs>
        </Stack>

        <Stack direction="row" grow>
          <ScrollArea style={{ width: 400 }}>
            {messages.map((message) => (
              <Button key={message.subject} variant="ghost" onActivate={() => open(message)}>
                <Avatar name={message.sender} size="sm" />
                <Stack direction="column" gap="2xs" grow>
                  <Text role="label">{message.sender}</Text>
                  <Text role="body">{message.subject}</Text>
                </Stack>
                {message.tag ? <Badge variant="success">{message.tag}</Badge> : null}
                <Text role="caption" tone="muted">{message.date}</Text>
              </Button>
            ))}
          </ScrollArea>

          <Stack direction="column" grow gap="md" style={{ padding: 18 }}>
            <Text role="h3">{open.subject}</Text>
            <Stack direction="row" gap="sm" align="center">
              <Avatar name={open.sender} size="md" />
              <Text role="label">{open.sender}</Text>
              <Text role="caption" tone="muted">to gon@hunterassociation.org</Text>
            </Stack>
            <Text role="body">{open.body}</Text>
            <TextArea label={\`Reply to \${open.sender}\`} placeholder="Reply…" />
            <Stack direction="row" justify="end" gap="sm">
              <Button variant="ghost">Attach</Button>
              <Button variant="primary">Send</Button>
            </Stack>
          </Stack>

          <Stack direction="column" gap="sm" style={{ width: 280, padding: 16 }}>
            <Text role="label">Contact Details</Text>
            <Avatar name="Killua Zoldyck" size="lg" />
            <Text role="h3">Killua Zoldyck</Text>
            <Text role="caption" tone="muted">bob.dylan@example.com</Text>
            <Stack direction="row" gap="sm"><Icon name="mail" /><Text role="caption">Mail</Text></Stack>
            <Stack direction="row" gap="sm"><Icon name="phone" /><Text role="caption">Phone</Text></Stack>
            <Text role="label">Older</Text>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}

// The tab filter is the app's: messages carry a category and the list renders
// only the active tab's. An empty tab is an EmptyState, never a blank pane.`;
