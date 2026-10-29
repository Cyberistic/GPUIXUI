import { Fragment, useReducer, useRef, useState, type ReactNode } from "react";
import { BlockIcon } from "./block-icons";
import { RailToggle } from "./sidebar-rail";

/**
 * Conversations block — `/blocks/conversations`.
 *
 * One Messages-style window in four platform dresses: macOS Messages, Windows
 * 11 (Fluent 2), Linux (Breeze dark) and Omarchy (a Linux desktop in its own
 * Tokyo Night look). `ConversationWindow` is the browser reproduction the docs
 * page and the landing deck mount; `conversationsSource` is the recipe a
 * consumer copies, and `.agents/slop/references/conversations.md` is the
 * reference the four skins are measured against.
 *
 * `conversationsReducer` and `filterConversations` are pure, so the block's
 * three interactions — selecting a thread, sending a message and filtering the
 * list — are table-tested against the same code the surface dispatches to.
 */

export type ConversationPlatform = "macos" | "windows" | "linux" | "omarchy";

/** The role an outgoing bubble wears, per platform. */
const OUTGOING_TONE: Readonly<
  Record<ConversationPlatform, "success" | "primary" | "info">
> = {
  macos: "success",
  windows: "primary",
  linux: "info",
  omarchy: "primary",
};

export interface ConversationMessage {
  readonly id: string;
  /** Outgoing (right) rather than incoming (left). */
  readonly mine: boolean;
  readonly text: string;
  /** The grey timestamp a message carries. */
  readonly at?: string;
  /** The photo attachment, drawn as a soft dune gradient. */
  readonly photo?: boolean;
  /** The grey receipt under an outgoing message. */
  readonly read?: boolean;
}

export interface Conversation {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly preview: string;
  readonly when: string;
  readonly messages: ReadonlyArray<ConversationMessage>;
}

const killua: Conversation = {
  id: "killua",
  name: "Killua Zoldyck",
  initials: "KZ",
  preview: "Is your mind blown? 🤯",
  when: "Sunday",
  messages: [
    {
      id: "killua-1",
      mine: true,
      at: "10:24 AM",
      text: "Are we doing the Greed Island run or the Hunter exam prep?",
    },
    {
      id: "killua-2",
      mine: false,
      at: "10:26 AM",
      text: "Oh! 🥹 I forgot you still have the card binder",
    },
    {
      id: "killua-3",
      mine: false,
      text: "Let's stick with the exam prep for now",
    },
    { id: "killua-4", mine: true, text: "Anytime, partner" },
    {
      id: "killua-5",
      mine: true,
      at: "10:27 AM",
      text: "I found the perfect training spot for you to challenge the kids",
    },
    { id: "killua-6", mine: true, text: "", photo: true },
    {
      id: "killua-7",
      mine: true,
      at: "10:28 AM",
      text: "But only if you finish the 1000-piece Nen puzzle before returning it 😅",
    },
    {
      id: "killua-8",
      mine: false,
      at: "10:29 AM",
      text: "Hmm. Maybe just a 500-piece one? 😂",
    },
    {
      id: "killua-9",
      mine: false,
      at: "10:30 AM",
      text: "Or I can just put the Chimera Ants on one?",
    },
    {
      id: "killua-10",
      mine: true,
      at: "10:31 AM",
      text: "Come by if you want them",
      read: true,
    },
    {
      id: "killua-11",
      mine: false,
      at: "10:32 AM",
      text: "Thanks for the cards!",
    },
  ],
};

/** The conversations, in the list's order. Three carry a short thread. */
export const conversations: ReadonlyArray<Conversation> = [
  {
    id: "gon",
    name: "Gon Freecss",
    initials: "GF",
    preview: "Gotcha covered!",
    when: "Yesterday",
    messages: [
      { id: "gon-1", mine: false, text: "I found the card!" },
      { id: "gon-2", mine: false, text: "Meet at Heavens Arena at 6." },
    ],
  },
  killua,
  {
    id: "leorio",
    name: "Leorio Paladiknight",
    initials: "LP",
    preview: "Kurapika reacted ❤️ to “The auction is tonight!”",
    when: "Sunday",
    messages: [],
  },
  {
    id: "kurapika",
    name: "Kurapika",
    initials: "KP",
    preview: "Looking forward to Friday!",
    when: "Sunday",
    messages: [
      { id: "kurapika-1", mine: false, text: "The auction moved to Friday." },
      { id: "kurapika-2", mine: false, text: "Bring the chain." },
    ],
  },
  {
    id: "bisky",
    name: "Bisky Krueger",
    initials: "BK",
    preview: "Now you've got me thinking about my next vacation",
    when: "Sunday",
    messages: [
      { id: "bisky-1", mine: false, text: "Training starts at dawn." },
      { id: "bisky-2", mine: false, text: "Don't be late." },
    ],
  },
  {
    id: "ging",
    name: "Ging Freecss",
    initials: "GF",
    preview: "Hope the little ones aren't tiring you out!",
    when: "Saturday",
    messages: [],
  },
  {
    id: "hisoka",
    name: "Hisoka Morrow",
    initials: "HM",
    preview: "See you tomorrow! 🃏",
    when: "Saturday",
    messages: [],
  },
  {
    id: "knov",
    name: "Knov",
    initials: "KN",
    preview: "Cool… I'll be by just before 7 to drop off the cake 🎂",
    when: "Friday",
    messages: [],
  },
];

export interface ConversationsState {
  readonly selectedId: string;
  readonly query: string;
  readonly threads: ReadonlyArray<Conversation>;
  readonly railCollapsed: boolean;
}

export const initialConversationsState: ConversationsState = {
  selectedId: "killua",
  query: "",
  threads: conversations,
  railCollapsed: false,
};

export type ConversationsAction =
  | { readonly type: "select"; readonly id: string }
  | { readonly type: "search"; readonly query: string }
  | { readonly type: "send"; readonly text: string }
  | { readonly type: "toggle-rail" };

/** The thread a send opens; an unknown selection falls back to the sample. */
export const selectedConversation = (state: ConversationsState): Conversation =>
  state.threads.find((thread) => thread.id === state.selectedId) ?? killua;

/** The list a search leaves: a name or a preview matches, case-insensitively. */
export const filterConversations = (
  threads: ReadonlyArray<Conversation>,
  query: string,
): ReadonlyArray<Conversation> => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return threads;
  return threads.filter((thread) =>
    `${thread.name} ${thread.preview}`.toLowerCase().includes(needle),
  );
};

export const conversationsReducer = (
  state: ConversationsState,
  action: ConversationsAction,
): ConversationsState => {
  if (action.type === "select") {
    return { ...state, selectedId: action.id };
  }
  if (action.type === "search") {
    return { ...state, query: action.query };
  }
  if (action.type === "toggle-rail") {
    return { ...state, railCollapsed: !state.railCollapsed };
  }
  const text = action.text.trim();
  if (text === "") return state;
  return {
    ...state,
    threads: state.threads.map((thread) =>
      thread.id === state.selectedId
        ? {
            ...thread,
            messages: [
              ...thread.messages,
              {
                id: `${thread.id}-${thread.messages.length + 1}`,
                mine: true,
                text,
              },
            ],
          }
        : thread,
    ),
  };
};

export interface ConversationsSurfaceProps {
  readonly platform: ConversationPlatform;
  readonly state: ConversationsState;
  readonly onSelect: (id: string) => void;
  readonly onSearch: (query: string) => void;
  readonly onSend: (text: string) => void;
  readonly onToggleRail: () => void;
}

/** The window at a given state; `ConversationWindow` owns the reducer. */
export function ConversationsSurface({
  platform,
  state,
  onSelect,
  onSearch,
  onSend,
  onToggleRail,
}: ConversationsSurfaceProps) {
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const thread = selectedConversation(state);
  const visible = filterConversations(state.threads, state.query);
  const tone = OUTGOING_TONE[platform];

  // The newest bubble scrolls into view after it paints; the window itself keeps
  // its height, so the thread grows inside the log and nothing else moves.
  const reveal = () => {
    requestAnimationFrame(() => {
      const node = log.current;
      if (node !== null) node.scrollTop = node.scrollHeight;
    });
  };

  return (
    <div className="gx-conv" data-platform={platform}>
      <div className="gx-conv-bar">
        {platform === "macos" ? (
          <span aria-hidden="true" className="gx-conv-lights">
            <i />
            <i />
            <i />
          </span>
        ) : null}
        {platform === "macos" ? null : (
          <span aria-hidden="true" className="gx-conv-wincontrols">
            <i>–</i>
            <i>□</i>
            <i>×</i>
          </span>
        )}
      </div>

      <div className="gx-conv-body">
        {platform === "macos" ? null : (
          <nav aria-label="Sections" className="gx-conv-rail">
            <button
              aria-current="true"
              aria-label="Messages"
              className="gx-conv-rail-item"
              data-active="true"
              type="button"
            >
              <ChatGlyph />
            </button>
            <button
              aria-label="People"
              className="gx-conv-rail-item"
              type="button"
            >
              <PeopleGlyph />
            </button>
            <button
              aria-label="Settings"
              className="gx-conv-rail-item"
              type="button"
            >
              <GearGlyph />
            </button>
          </nav>
        )}

        <aside
          aria-label="Conversations"
          className="gx-conv-side"
          data-collapsed={state.railCollapsed}
        >
          <div className="gx-conv-side-head">
            <span className="gx-conv-search">
              <BlockIcon name="search" size={12} />
              <input
                aria-label="Search conversations"
                name="search"
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Search"
                type="search"
                value={state.query}
              />
            </span>
            <RailToggle
              className="gx-conv-glyph"
              collapsed={state.railCollapsed}
              onToggle={onToggleRail}
            />
          </div>

          <div className="gx-conv-list">
            {visible.length === 0 ? (
              <p className="gx-conv-none">No conversations</p>
            ) : (
              visible.map((conversation) => (
                <button
                  aria-current={
                    conversation.id === state.selectedId ? "true" : undefined
                  }
                  aria-label={`Conversation with ${conversation.name}`}
                  className="gx-conv-row"
                  data-selected={conversation.id === state.selectedId}
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  type="button"
                >
                  <span className="gx-conv-avatar">
                    {conversation.initials}
                  </span>
                  <span className="gx-conv-row-text gx-rail-label">
                    <span className="gx-conv-row-top">
                      <span className="gx-conv-name">{conversation.name}</span>
                      <span className="gx-conv-when">{conversation.when}</span>
                    </span>
                    <span className="gx-conv-preview">
                      {conversation.preview}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section
          aria-label={`Conversation with ${thread.name}`}
          className="gx-conv-thread"
        >
          <header className="gx-conv-head">
            <button
              aria-label="New message"
              className="gx-conv-glyph"
              type="button"
            >
              <ComposeGlyph />
            </button>
            <span className="gx-conv-contact">
              <span className="gx-conv-avatar gx-conv-avatar-sm">
                {thread.initials}
              </span>
              <span className="gx-conv-contact-name">{thread.name}</span>
              <i aria-hidden="true" className="gx-conv-dot" />
              <span className="gx-conv-status">Online</span>
            </span>
            <span className="gx-conv-head-actions">
              <button
                aria-label="Start video call"
                className="gx-conv-glyph"
                type="button"
              >
                <VideoGlyph />
              </button>
              <button
                aria-label="Start voice call"
                className="gx-conv-glyph"
                type="button"
              >
                <PhoneGlyph />
              </button>
            </span>
          </header>

          <div className="gx-conv-log" ref={log}>
            {thread.messages.length === 0 ? (
              <p className="gx-conv-empty">
                No messages with {thread.name} yet. Say hello.
              </p>
            ) : (
              thread.messages.map((message) => (
                <Fragment key={message.id}>
                  {message.photo === true ? (
                    <span
                      aria-label="Attachment: Greed Island, south shore"
                      className="gx-conv-attach"
                      role="img"
                    />
                  ) : (
                    <p
                      className="gx-conv-bubble"
                      data-mine={message.mine}
                      data-tone={message.mine ? tone : "neutral"}
                    >
                      {message.text}
                    </p>
                  )}
                  {message.at === undefined && message.read !== true ? null : (
                    <span className="gx-conv-meta" data-mine={message.mine}>
                      {message.at === undefined ? null : (
                        <span className="gx-conv-time">{message.at}</span>
                      )}
                      {message.mine ? <Ticks /> : null}
                      {message.read === true ? (
                        <span className="gx-conv-read">Read</span>
                      ) : null}
                    </span>
                  )}
                </Fragment>
              ))
            )}
          </div>

          <form
            className="gx-conv-composer"
            onSubmit={(event) => {
              event.preventDefault();
              onSend(draft);
              setDraft("");
              reveal();
            }}
          >
            <button aria-label="Add" className="gx-conv-round" type="button">
              <PlusGlyph />
            </button>
            <input
              aria-label="Message"
              className="gx-conv-field"
              name="message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                platform === "macos" ? "iMessage" : "Type a message..."
              }
              value={draft}
            />
            <button
              aria-label="Send with an emoji"
              className="gx-conv-glyph"
              type="button"
            >
              <SmileGlyph />
            </button>
            <button
              aria-label="Attach a file"
              className="gx-conv-glyph"
              type="button"
            >
              <BlockIcon name="paperclip" size={15} />
            </button>
            <button
              aria-label="Send message"
              className="gx-conv-send"
              type="submit"
            >
              <SendGlyph />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

/** The block's preview: the reducer, then the macOS window at its state. */
export function ConversationsRender() {
  const [state, dispatch] = useReducer(
    conversationsReducer,
    initialConversationsState,
  );

  return (
    <ConversationsSurface
      onSearch={(query) => dispatch({ type: "search", query })}
      onSelect={(id) => dispatch({ type: "select", id })}
      onSend={(text) => dispatch({ type: "send", text })}
      onToggleRail={() => dispatch({ type: "toggle-rail" })}
      platform="macos"
      state={state}
    />
  );
}

/** One window in a given platform dress; the deck picks a dress per card. */
export function ConversationWindow({
  platform,
}: {
  readonly platform: ConversationPlatform;
}) {
  const [state, dispatch] = useReducer(
    conversationsReducer,
    initialConversationsState,
  );

  return (
    <ConversationsSurface
      onSearch={(query) => dispatch({ type: "search", query })}
      onSelect={(id) => dispatch({ type: "select", id })}
      onSend={(text) => dispatch({ type: "send", text })}
      onToggleRail={() => dispatch({ type: "toggle-rail" })}
      platform={platform}
      state={state}
    />
  );
}

export const conversationsPackages = [
  "@gpuixui/components",
  "@gpuixui/primitives",
  "@gpuixui/icons",
] as const;

/** The recipe a consumer copies. */
export const conversationsSource = `import { Avatar } from "@gpuixui/components/avatar";
import { Button, Input, ScrollArea, Stack, Text } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";

const conversations = [
  { id: "gon", name: "Gon Freecss", preview: "Gotcha covered!", when: "Yesterday" },
  { id: "killua", name: "Killua Zoldyck", preview: "Is your mind blown? 🤯", when: "Sunday" },
  // …the rest of the list
];

export function MessagesWindow() {
  return (
    <Stack direction="column" style={{ height: 540 }}>
      <Stack direction="row" gap="2xs" style={{ padding: "12px 14px" }}>
        {/* The traffic lights are the window's chrome, not a component. */}
        <Stack direction="row" gap="2xs" aria-hidden="true">…</Stack>
      </Stack>

      <Stack direction="row" grow>
        <Stack direction="column" gap="2xs" style={{ width: 330 }}>
          <Stack direction="row" gap="sm" align="center">
            <Input label="Search conversations" placeholder="Search" />
            <Icon name="panel-left" />
          </Stack>
          <ScrollArea>
            {conversations.map((conversation) => (
              <Stack direction="row" gap="sm" align="center" key={conversation.id}>
                <Avatar name={conversation.name} size="sm" />
                <Stack direction="column" gap="2xs" grow>
                  <Text role="label">{conversation.name}</Text>
                  <Text role="caption" tone="muted">{conversation.preview}</Text>
                </Stack>
                <Text role="caption" tone="muted">{conversation.when}</Text>
              </Stack>
            ))}
          </ScrollArea>
        </Stack>

        <Stack direction="column" grow>
          <Stack direction="row" justify="between" align="center">
            <Button variant="ghost" aria-label="New message">
              <Icon name="pencil" />
            </Button>
            <Stack direction="row" gap="2xs" align="center">
              <Avatar name="Killua Zoldyck" size="sm" />
              <Text role="label">Killua Zoldyck</Text>
            </Stack>
            <Button variant="ghost">Video</Button>
          </Stack>
          <ScrollArea grow>
            {open.messages.map((message) => (
              <Text key={message.id} role="body">{message.text}</Text>
            ))}
          </ScrollArea>
          <Stack direction="row" gap="sm" align="center">
            <Button variant="ghost" aria-label="Add">
              <Icon name="plus" />
            </Button>
            <Input label="Message" placeholder="iMessage" />
            <Button variant="ghost">Emoji</Button>
            <Button variant="ghost">Attach</Button>
            <Button variant="primary">Send</Button>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}

// An incoming bubble is the secondary role, an outgoing one is the success
// role on macOS, the primary role on Windows and the info role on Linux, and
// the chosen row is the primary, selected or success-soft fill respectively.
// The list filters on the name and the preview, a sent message appends to the
// open thread, and the window keeps its height and scrolls its log.`;

function Glyph({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function ComposeGlyph() {
  return (
    <Glyph>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </Glyph>
  );
}

function VideoGlyph() {
  return (
    <Glyph>
      <path d="m22 8-6 4 6 4Z" />
      <rect height="12" rx="2" width="14" x="2" y="6" />
    </Glyph>
  );
}

function PhoneGlyph() {
  return (
    <Glyph>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2.1Z" />
    </Glyph>
  );
}

function ChatGlyph() {
  return (
    <Glyph>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3-.6L4 21l1.7-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
    </Glyph>
  );
}

function PeopleGlyph() {
  return (
    <Glyph>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M18 14.5a5.5 5.5 0 0 1 3.5 5.5" />
    </Glyph>
  );
}

function GearGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </Glyph>
  );
}

function PlusGlyph() {
  return (
    <Glyph>
      <path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}

function SmileGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </Glyph>
  );
}

function SendGlyph() {
  return (
    <Glyph>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </Glyph>
  );
}

/** The delivered mark: two blue checks, in every dress. */
function Ticks() {
  return (
    <span aria-hidden="true" className="gx-conv-ticks">
      <Glyph>
        <path d="m1 12 4 4 8-9" />
        <path d="m9 12 4 4 8-9" />
      </Glyph>
    </span>
  );
}
