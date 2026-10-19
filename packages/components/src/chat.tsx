/**
 * Chat: the conversation scaffold.
 *
 * `Chat` owns the status contract and the two intents that can leave the
 * composer (submit, stop); the **app** owns the async work, the message list and
 * the text it sends. `ChatMessages` composes `MessageScroller` so streaming rows
 * follow only while the reader is pinned — the pin rule is not reimplemented
 * here. `ChatComposer` is a real `<textarea>`: Enter sends, Shift+Enter stays a
 * newline, Escape stops while work is in flight, Stop replaces Send while a
 * request is running, and the field paints the token focus ring while it holds
 * focus. The stopping Escape is claimed, so a chat inside a dialog
 * does not close the dialog too (plan 514).
 *
 * 0.10.0 has no attachments picker on an input, so `onAttach` is the caller's
 * control and the component only renders the trigger. There is no `aria-live`:
 * the error banner is `role="alert"` because that is the role AccessKit reports.
 */

import type { EventPayload, Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  Children,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  ChatStatus,
  beginSubmit,
  canStop,
  canSubmit,
  stopStream,
  type ChatStatus as Status,
} from "./chat/logic.js";
import { EmptyState } from "./empty-state.js";
import { Button } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { claimEvent } from "./internal/event-claim.js";
import { isDismiss } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  focusRing,
  textStyle,
  toneSurface,
  useTheme,
} from "./internal/theme.js";
import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "./message-scroller.js";

/** The intents and status every part reads; throws outside a {@link Chat}. */
interface ChatContextValue {
  readonly status: Status;
  readonly submit: (text: string) => void;
  readonly stop: () => void;
  readonly onAttach: (() => void) | undefined;
  readonly attachLabel: string;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/** The chat a part belongs to. Throws when there is none. */
const useChat = (): ChatContextValue => {
  const value = useContext(ChatContext);
  if (value === undefined) {
    throw new Error("Chat parts must be used inside Chat");
  }
  return value;
};

/** {@link Chat} props. */
export interface ChatProps extends Omit<Props, "children" | "onSubmit"> {
  /** The conversation's accessible name. */
  readonly label: string;
  /** The app-owned status. */
  readonly status: Status;
  /** Reports the status the component would move to; the app may override. */
  readonly onStatusChange?: (status: Status) => void;
  /** Sends a trimmed, non-empty draft. Only called while {@link canSubmit}. */
  readonly onSubmit: (text: string) => void;
  /** Stops the request. Only called while {@link canStop}. */
  readonly onStop?: () => void;
  /** Renders an Attach control when provided. */
  readonly onAttach?: () => void;
  /** The Attach control's label. Default `"Attach files"`. */
  readonly attachLabel?: string;
  readonly children?: PartChildren;
}

/** The conversation root: status, intents and the named group. */
export const Chat = ({
  label,
  status,
  onStatusChange,
  onSubmit,
  onStop,
  onAttach,
  attachLabel = "Attach files",
  children,
  style,
  ...rest
}: ChatProps) => {
  const theme = useTheme();
  assertParts(chatRoot, children);

  const submit = (text: string): void => {
    if (!canSubmit(status)) return;
    onSubmit(text);
    onStatusChange?.(beginSubmit(status));
  };

  const stop = (): void => {
    if (!canStop(status)) return;
    onStop?.();
    onStatusChange?.(stopStream(status));
  };

  return (
    <ChatContext.Provider
      value={{ status, submit, stop, onAttach, attachLabel }}
    >
      <div
        {...rest}
        role="group"
        aria-label={label}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.md,
            width: "100%",
            minHeight: 0,
          },
          style,
        )}
      >
        {children}
      </div>
    </ChatContext.Provider>
  );
};

/** {@link ChatMessages} props. */
export interface ChatMessagesProps extends Omit<Props, "children"> {
  /** The transcript's accessible name. Default `"Conversation"`. */
  readonly label?: string;
  readonly children?: ReactNode;
}

/** The transcript: a pinned-follow scroller around the caller's rows. */
export const ChatMessages = ({
  label = "Conversation",
  children,
  style,
  testId,
  ...rest
}: ChatMessagesProps) => {
  const theme = useTheme();

  return (
    <MessageScroller
      label={label}
      testId={testId}
      {...rest}
      style={mergeStyles({ flexGrow: 1, minHeight: 0 }, style)}
    >
      <MessageScrollerViewport
        testId={testId === undefined ? undefined : `${testId}-viewport`}
        style={{
          flexGrow: 1,
          minHeight: 160,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Children.map(children, (child) => (
          <MessageScrollerItem>{child}</MessageScrollerItem>
        ))}
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest />
    </MessageScroller>
  );
};

/** {@link ChatComposer} props. */
export interface ChatComposerProps extends Omit<
  Props,
  "children" | "onChange" | "onSubmit"
> {
  /** The field's accessible name. */
  readonly label: string;
  /** Placeholder text. */
  readonly placeholder?: string;
  /** The Send label. Default `"Send"`. */
  readonly submitLabel?: string;
  /** The Stop label. Default `"Stop"`. */
  readonly stopLabel?: string;
  /** The controlled draft. `undefined` means uncontrolled. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
}

/** The composer: a textarea, Send or Stop, and an optional Attach control. */
export const ChatComposer = ({
  label,
  placeholder = "Send a message…",
  submitLabel = "Send",
  stopLabel = "Stop",
  value,
  defaultValue = "",
  onValueChange,
  autoFocus = false,
  onFocus,
  onBlur,
  style,
  onKeyDown,
  ...rest
}: ChatComposerProps) => {
  const theme = useTheme();
  const { status, submit, stop, onAttach, attachLabel } = useChat();
  const [draft, setDraft] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
  // runs on mount; seed the state or the ring never lights (plans 388, 536).
  const [focused, setFocused] = useState(autoFocus);

  const send = (): void => {
    const text = draft.trim();
    if (text === "" || !canSubmit(status)) return;
    submit(text);
    setDraft("");
  };

  const failed = ChatStatus.guards.error(status);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        width: "100%",
      }}
    >
      {failed ? (
        <div
          role="alert"
          style={{
            ...toneSurface(theme, "danger"),
            ...textStyle(theme, "body"),
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.md,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.sm,
            borderRadius: theme.radius.md,
          }}
        >
          <text>{status.message}</text>
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: theme.spacing.sm,
          width: "100%",
        }}
      >
        <textarea
          {...rest}
          aria-label={label}
          placeholder={placeholder}
          value={draft}
          minRows={1}
          maxRows={6}
          autoFocus={autoFocus}
          onChange={(event) => setDraft(event.value ?? "")}
          onSubmit={(event: EventPayload) => {
            // Shift+Enter is a newline; the runtime reports it through the same
            // submit event, so the modifier is the only thing that separates them.
            if (event.modifiers?.shift === true) return;
            send();
          }}
          onKeyDown={(event: EventPayload) => {
            if (isDismiss(event) && canStop(status)) {
              claimEvent(event);
              stop();
            }
            onKeyDown?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={mergeStyles(
            {
              ...textStyle(theme, "body"),
              flexGrow: 1,
              paddingLeft: theme.spacing.md,
              paddingRight: theme.spacing.md,
              paddingTop: theme.spacing.sm,
              paddingBottom: theme.spacing.sm,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.background,
              color: theme.colors.foreground,
              ...(focused ? focusRing(theme) : {}),
            },
            style,
          )}
        />
        {onAttach === undefined ? null : (
          <Button variant="ghost" size="md" onClick={onAttach}>
            {attachLabel}
          </Button>
        )}
        {canStop(status) ? (
          <Button variant="secondary" size="md" onClick={stop}>
            {stopLabel}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            disabled={!canSubmit(status) || draft.trim() === ""}
            onClick={send}
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

/** {@link ChatEmpty} props. */
export interface ChatEmptyProps extends Omit<Props, "children"> {
  /** What is missing, in a few words. */
  readonly title: string;
  /** Why it is missing, or what to do about it. */
  readonly description?: string;
  /** The way out: usually a Button. */
  readonly action?: ReactNode;
}

/** The empty conversation slot. It renders when the caller places it. */
export const ChatEmpty = ({
  title,
  description,
  action,
  ...rest
}: ChatEmptyProps) => (
  <EmptyState
    title={title}
    description={description}
    action={action}
    {...rest}
  />
);

/** Every part, so a misplaced sibling is named by the root. */
const chatParts: ReadonlyArray<PartComponent> = [
  Chat,
  ChatMessages,
  ChatComposer,
  ChatEmpty,
];

const chatRoot: PartsContract = {
  parent: "Chat",
  family: chatParts,
  accepts: chatParts.filter((part) => part !== Chat),
  hint: "Place the part directly inside Chat.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const chatMeta = {
  name: "Chat (AI conversation)",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "not virtualized in v1: every message row renders (MessageScroller limitation)",
    "no attachments picker: onAttach renders a control the caller wires",
    "no aria-live: new rows and the error alert are not announced by 0.10.0",
    "Enter and Escape come from the runtime; Shift+Enter needs the submit event's modifier",
  ],
  docs: "docs/chat.mdx",
  example: "examples/chat.example.tsx",
  testFile: "src/behaviour/chat.test.tsx",
} as const;
