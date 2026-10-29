/** @jsxImportSource @gpuix/react */
/**
 * Chat: the conversation scaffold (plan 207).
 *
 * The behaviour is ported from **shadcn/ui's AI Elements `chat`**; the
 * implementation is ours and runs on GPUix host elements. Three parts compose a
 * conversation: `ChatRoot` owns the status and hands the intents to the caller,
 * `ChatMessages` is the `MessageScroller` viewport that follows the tail, and
 * `ChatComposer` is a field with submit and stop.
 *
 * The status is a controlled/uncontrolled value; the rules that move it are
 * `chat/logic.ts`, shared with the caller, so the composer cannot send during a
 * reply and Stop cannot arrive as a submit (both measured in the logic suite and
 * in a window).
 *
 * Two runtime facts shape the composer:
 *
 * - **Enter is the textarea's `onSubmit`.** Without that listener the runtime
 *   consumes Enter as a newline and the app never sees a `keyDown`, so a keydown
 *   handler alone cannot submit.
 * - **Shift+Enter is a newline and reaches no handler** — measured, and exactly
 *   what a composer wants: the runtime inserts it and nothing else happens.
 *
 * The transport is the consumer's: `onSubmit` receives the drafted text, and
 * `onStop`/`onRetry` are the intents the status machine emits.
 */

import type { KeyEvent, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  CHAT_COMPOSER,
  CHAT_COMPOSER_ATTACHMENTS,
  CHAT_COMPOSER_FIELD,
  CHAT_COMPOSER_HINT,
  CHAT_COMPOSER_ROW,
  CHAT_EMPTY,
  CHAT_EMPTY_DESCRIPTION,
  CHAT_EMPTY_TITLE,
  CHAT_HEADER,
  CHAT_HEADER_ACTIONS,
  CHAT_HEADER_COPY,
  CHAT_HEADER_STATUS,
  CHAT_HEADER_TITLE,
  CHAT_MESSAGES,
  CHAT_ROOT,
  cn,
} from "@gpuixui/tw";
import {
  accessibleName,
  spokenSentence,
  visibleCopy,
} from "@gpuixui/primitives/core";
import { Icon } from "@gpuixui/icons";
import * as Option from "effect/Option";
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import * as Machine from "./chat/logic.js";

/**
 * The state machine is public: a consumer driving a stream from its own state
 * uses `chatMove` for the token events, so its status and the component's
 * cannot disagree.
 */
export * from "./chat/logic.js";
import { Button, actionOnColor } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { isDismiss } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  keepContent,
  keyboardRing,
  nativeTextTheme,
  selectionWash,
  statusTone,
  useTheme,
} from "./internal/theme.js";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "./message-scroller.js";
import { textOf } from "./internal/text.js";

/** The words a part publishes when the caller's copy says nothing. */
const DEFAULT_CONVERSATION_LABEL = "Conversation";
const DEFAULT_ERROR = "The reply failed.";
const DEFAULT_EMPTY_TITLE = "Start the conversation";
const DEFAULT_EMPTY_DESCRIPTION = "Messages you send appear here.";
const DEFAULT_COMPOSER_LABEL = "Message";
const DEFAULT_SUBMIT_LABEL = "Send";
const DEFAULT_STOP_LABEL = "Stop";

/** The rules every part reads; throws outside a {@link ChatRoot}. */
interface ChatContextValue {
  readonly status: Machine.ChatStatus;
  /** The conversation's accessible name, used by `ChatMessages`. */
  readonly label: string;
  /** The copy the failed-reply row shows. */
  readonly error: string;
  /** Whether the caller supplied a stop handler. */
  readonly canStop: boolean;
  /** Whether the caller supplied a retry handler. */
  readonly canRetry: boolean;
  /** Ask for a message; refused while a reply is open. */
  readonly submit: (message: string) => void;
  /** End the open reply; refused when there is none. */
  readonly stop: () => void;
  /** Ask for another reply after a failure. */
  readonly retry: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/** The conversation a part belongs to. Throws when there is none. */
const useChat = (): ChatContextValue => {
  const value = useContext(ChatContext);
  if (value === undefined) {
    throw new Error("Chat parts must be used inside ChatRoot");
  }
  return value;
};

/** {@link ChatRoot} props. */
export interface ChatRootProps extends Omit<Props, "children" | "onSubmit"> {
  /** The controlled status. `undefined` means uncontrolled. */
  readonly status?: Machine.ChatStatus;
  /** The uncontrolled starting status. Default `"idle"`. */
  readonly defaultStatus?: Machine.ChatStatus;
  readonly onStatusChange?: (status: Machine.ChatStatus) => void;
  /** The transport: called with the text the reader sent. */
  readonly onSubmit: (message: string) => void;
  /** Stop the open reply. Without it the composer shows no stop control. */
  readonly onStop?: () => void;
  /** Ask for another reply after a failure. */
  readonly onRetry?: () => void;
  /** The failure copy shown above the composer. Default `"The reply failed."`; a blank one reads as the default. */
  readonly error?: string;
  /** The conversation's accessible name. Default `"Conversation"`; a blank name reads as the default. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The conversation root: its status, the intents a part may emit and the
 * `ChatMessages`/`ChatComposer` pair.
 */
export const ChatRoot = ({
  status: statusProp,
  defaultStatus = "idle",
  onStatusChange,
  onSubmit,
  onStop,
  onRetry,
  error,
  label,
  className,
  children,
  style,
  ...rest
}: ChatRootProps) => {
  const theme = useTheme();
  // A name and a failure sentence are copy: an i18n table's missing row, or a
  // record restored from storage, hands over `""` or `"   "`, which is an
  // absence rather than a name. Read once here so the region, the transcript and
  // the failed-reply row cannot disagree.
  const name = accessibleName(textOf(label)) ?? DEFAULT_CONVERSATION_LABEL;
  const failure = spokenSentence(textOf(error), DEFAULT_ERROR);
  const [status, setStatus] = useControllableState({
    value: statusProp,
    defaultValue: defaultStatus,
    onChange: onStatusChange,
  });
  assertParts(chatRoot, children);

  const submit = useCallback(
    (message: string) => {
      const move = Machine.chatMove(status, "submit");
      if (Option.isNone(move.emit)) return;
      setStatus(move.status);
      onSubmit(message);
    },
    [onSubmit, setStatus, status],
  );

  const stop = useCallback(() => {
    const move = Machine.chatMove(status, "stop");
    if (Option.isNone(move.emit)) return;
    setStatus(move.status);
    onStop?.();
  }, [onStop, setStatus, status]);

  const retry = useCallback(() => {
    const move = Machine.chatMove(status, "retry");
    if (Option.isNone(move.emit)) return;
    setStatus(move.status);
    onRetry?.();
  }, [onRetry, setStatus, status]);

  const context = useMemo<ChatContextValue>(
    () => ({
      status,
      label: name,
      error: failure,
      canStop: onStop !== undefined,
      canRetry: onRetry !== undefined,
      submit,
      stop,
      retry,
    }),
    [status, name, failure, onStop, onRetry, submit, stop, retry],
  );

  return (
    <ChatContext.Provider value={context}>
      <div
        role="region"
        aria-label={name}
        {...rest}
        style={mergeStyles(recipeStyle(cn(CHAT_ROOT, className), theme), style)}
      >
        {children}
      </div>
    </ChatContext.Provider>
  );
};

/** {@link ChatHeader} props. */
export interface ChatHeaderProps extends Omit<Props, "children" | "title"> {
  /** The conversation title. Defaults to the root's `label`. */
  readonly title?: string;
  /** One line under the title. Defaults to the status machine's word; the
   * failure sentence replaces it when the last reply failed. */
  readonly description?: string;
  /** Trailing controls: reset, model picker, call actions. */
  readonly actions?: ReactNode;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
}

/** The status word a state paints when the caller writes no description. */
const STATUS_COPY: Readonly<Record<Machine.ChatStatus, string>> = {
  idle: "Ready",
  submitting: "Sending…",
  streaming: "Replying…",
  error: "The reply failed.",
};

/**
 * The fixed header: title, status and actions. The failure sentence lives here
 * rather than in a row between the transcript and the composer, because a row
 * that appears there takes height from the viewport and moves the composer.
 */
export const ChatHeader = ({
  title,
  description,
  actions,
  className,
  style,
  ...rest
}: ChatHeaderProps) => {
  const theme = useTheme();
  const { label, status, error, canRetry, retry } = useChat();
  const name = accessibleName(textOf(title)) ?? label;
  const failed = status === "error";
  const line = failed
    ? error
    : (accessibleName(textOf(description)) ?? STATUS_COPY[status]);

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(CHAT_HEADER, className), theme), {
          flexShrink: 0,
        }),
        style,
      )}
    >
      <div style={recipeStyle(CHAT_HEADER_COPY, theme)}>
        <text style={recipeStyle(CHAT_HEADER_TITLE, theme)}>{name}</text>
        <text
          testId={failed ? "chat-error" : "chat-status"}
          role="status"
          aria-description={failed ? error : undefined}
          style={mergeStyles(recipeStyle(CHAT_HEADER_STATUS, theme), {
            ...(failed
              ? { color: statusTone(theme, "destructive").foreground }
              : {}),
            // One line, always: the header is a fixed row, so a long failure
            // sentence is truncated rather than allowed to push the composer.
            // `lineClamp` paints nothing on 0.11.0; a definite line box with a
            // hidden overflow and an ellipsis is the measured route.
            width: "100%",
            height: 16,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          })}
        >
          {line}
        </text>
      </div>
      <div style={recipeStyle(CHAT_HEADER_ACTIONS, theme)}>
        {actions}
        {failed && canRetry ? (
          <Button testId="chat-error-retry" size="sm" onClick={retry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
};

/** {@link ChatMessages} props. */
export interface ChatMessagesProps extends Omit<Props, "children"> {
  /** Replaces the default empty-conversation panel. */
  readonly empty?: ReactNode;
  /** The empty panel's title. Default `"Start the conversation"`; a blank one reads as the default. */
  readonly emptyTitle?: string;
  /** The empty panel's description. Default `"Messages you send appear here."`; a blank one reads as the default. */
  readonly emptyDescription?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The scrolled transcript: follows the tail, offers the way back, and owns the
 * empty panel. The failure copy is in the header, so this part never loses
 * viewport height when a reply fails. */
export const ChatMessages = ({
  empty,
  emptyTitle,
  emptyDescription,
  className,
  children,
  style,
  ...rest
}: ChatMessagesProps) => {
  const theme = useTheme();
  const { status, label } = useChat();
  const rows = Children.toArray(children);
  const emptyConversation = rows.length === 0;
  // The empty panel's copy is interface copy like a name: a blank title or
  // description lays out a line that says nothing, so it reads as the
  // component's own sentence.
  const title = spokenSentence(textOf(emptyTitle), DEFAULT_EMPTY_TITLE);
  const description = spokenSentence(
    textOf(emptyDescription),
    DEFAULT_EMPTY_DESCRIPTION,
  );

  return (
    <MessageScroller
      label={label}
      streaming={Machine.isChatBusy(status)}
      style={{ flexGrow: 1, flexBasis: 0, flexShrink: 1, minHeight: 0 }}
    >
      <MessageScrollerViewport
        {...rest}
        testId={rest.testId ?? "chat-messages"}
        style={mergeStyles(
          recipeStyle(cn(CHAT_MESSAGES, className), theme),
          style,
        )}
      >
        <MessageScrollerContent>
          {emptyConversation ? (
            <div style={recipeStyle(CHAT_EMPTY, theme)} testId="chat-empty">
              {empty ?? (
                <>
                  <text style={recipeStyle(CHAT_EMPTY_TITLE, theme)}>
                    {title}
                  </text>
                  <text style={recipeStyle(CHAT_EMPTY_DESCRIPTION, theme)}>
                    {description}
                  </text>
                </>
              )}
            </div>
          ) : (
            // A caller's rows are wrapped in the scroller's item boundary, so
            // arrival counting and turn anchoring work without every chat
            // writing the same wrapper. An explicit item is kept, which is how
            // a caller opts into `scrollAnchor`.
            rows.map((child, index) =>
              isValidElement(child) && child.type === MessageScrollerItem ? (
                child
              ) : (
                <MessageScrollerItem key={index}>{child}</MessageScrollerItem>
              ),
            )
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest testId="chat-jump" />
    </MessageScroller>
  );
};

/** What the composer draws. */
export interface ChatComposerState {
  readonly status: Machine.ChatStatus;
  readonly busy: boolean;
  readonly empty: boolean;
  readonly disabled: boolean;
}

/** {@link ChatComposer} props. */
export interface ChatComposerProps extends Omit<
  Props,
  "children" | "onSubmit" | "style"
> {
  /** The controlled draft. `undefined` means uncontrolled. A value that is not text reads as an empty draft. */
  readonly value?: string;
  /** The uncontrolled starting draft. A value that is not text reads as an empty draft. */
  readonly defaultValue?: string;
  /** Every edit, including the clear after a send. */
  readonly onValueChange?: (value: string) => void;
  /** The field's accessible name. Default `"Message"`; a blank name reads as the default. */
  readonly label?: string;
  /** Default `"Send a message…"`. */
  readonly placeholder?: string;
  /** The send control's accessible name. Default `"Send"`; a blank label reads as the default. */
  readonly submitLabel?: string;
  /** Default `"Stop"`; a blank label reads as the default. */
  readonly stopLabel?: string;
  /** One line of hint copy under the field, for example the key contract. A blank line paints nothing. */
  readonly hint?: string;
  /** A row above the field: file chips, model pickers, anything the caller owns. */
  readonly attachments?: ReactNode;
  /** Leave the field out of the tab order and refuse edits. */
  readonly disabled?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the conversation's and the draft's state. */
  readonly style?: StateStyle<ChatComposerState>;
}

/**
 * The message field: Enter sends, Shift+Enter opens a new line, and the stop
 * control replaces Send while a reply is open. A send the machine refuses — a
 * reply already open — leaves the draft where it is, so words nobody received
 * are never cleared.
 */
export const ChatComposer = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  label,
  placeholder = "Send a message…",
  submitLabel,
  stopLabel,
  hint,
  attachments,
  disabled = false,
  className,
  style,
  onKeyDown,
  ...rest
}: ChatComposerProps) => {
  const theme = useTheme();
  const { status, canStop, submit, stop } = useChat();
  // A draft restored from storage, or read out of a saved record, writes `null`
  // where it carried no text; the composer reads `.trim()` off it before
  // anything paints, so anything that is not a string is the empty draft. An
  // absent controlled value still means "uncontrolled".
  const [draft, setDraft] = useControllableState({
    value: valueProp === undefined ? undefined : textOf(valueProp),
    defaultValue: textOf(defaultValue),
    onChange: onValueChange,
  });
  // Names and copy are interface text too: a blank one is an absence, so the
  // field and the two actions keep the words this module documents rather than
  // publishing an unnamed control.
  const name = accessibleName(textOf(label)) ?? DEFAULT_COMPOSER_LABEL;
  const submitWord =
    accessibleName(textOf(submitLabel)) ?? DEFAULT_SUBMIT_LABEL;
  const stopWord = accessibleName(textOf(stopLabel)) ?? DEFAULT_STOP_LABEL;
  const hintCopy = visibleCopy(textOf(hint));
  const busy = Machine.isChatBusy(status);
  const empty = draft.trim() === "";
  const state: ChatComposerState = { status, busy, empty, disabled };
  // The machine is the one authority on whether a send is allowed: while a
  // reply is open it refuses the submit, and the control is Stop instead. A
  // refused send leaves the draft alone — nobody received those words.
  const canSend = !empty && !disabled && Machine.canChatSubmit(status);

  const send = (): void => {
    if (!canSend) return;
    submit(draft);
    setDraft("");
  };

  const fieldStyle = mergeStyles(recipeStyle(CHAT_COMPOSER_FIELD, theme), {
    ...(disabled
      ? { color: theme.colors.disabledForeground }
      : keyboardRing(theme)),
    ...selectionWash(theme),
    ...keepContent,
    minHeight: theme.spacing["2xl"],
  });
  const placeholderHint = fieldHint({ placeholder, disabled }, theme, draft, {
    origin: "host",
    align: "top",
    style: fieldStyle,
  });

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(CHAT_COMPOSER, className), theme), {
          flexShrink: 0,
        }),
        resolveStyle(style, state),
      )}
    >
      {attachments === undefined ? null : (
        <div style={recipeStyle(CHAT_COMPOSER_ATTACHMENTS, theme)}>
          {attachments}
        </div>
      )}
      <div
        testId="chat-composer-row"
        style={recipeStyle(CHAT_COMPOSER_ROW, theme)}
      >
        <div style={hintHost({ flexGrow: 1 })}>
          <textarea
            testId="chat-field"
            aria-label={name}
            // The hint is painted, so the runtime's `aria_placeholder` left
            // with the prop; the empty composer announces the same words.
            aria-description={fieldHelp({ placeholder }, draft)}
            // The composer paints the page role behind its transparent field.
            theme={nativeTextTheme(theme, "background")}
            value={draft}
            readOnly={disabled}
            // The host has no `disabled` prop (the primitives' rule): a disabled
            // field is read-only, out of the tab order, and paints the measured
            // disabled pair rather than a fade.
            tabIndex={disabled ? -1 : 0}
            minRows={1}
            maxRows={6}
            onChange={(event) => setDraft(event.value ?? "")}
            onSubmit={send}
            onKeyDown={(event: KeyEvent) => {
              onKeyDown?.(event);
              // Escape reaches a textarea's keydown (measured); Enter does not,
              // so this is the stop path and not the submit one.
              if (busy && canStop && isDismiss(event)) stop();
            }}
            style={fieldStyle}
          />
          {Option.match(placeholderHint, {
            onNone: () => null,
            onSome: (painted) => renderFieldHint(painted, "chat-field"),
          })}
        </div>
        {busy && canStop ? (
          <Button
            testId="chat-stop"
            size="sm"
            variant="secondary"
            onClick={stop}
          >
            {stopWord}
          </Button>
        ) : (
          <Button
            testId="chat-send"
            size="sm"
            variant="primary"
            disabled={!canSend}
            aria-label={submitWord}
            onClick={send}
          >
            <Icon
              name="send"
              size="sm"
              color={actionOnColor(theme, "primary")}
            />
          </Button>
        )}
      </div>
      {hintCopy === undefined ? null : (
        <text style={recipeStyle(CHAT_COMPOSER_HINT, theme)}>{hintCopy}</text>
      )}
    </div>
  );
};

/** Every part of Chat, so a misplaced sibling is named. */
const chatParts: ReadonlyArray<PartComponent> = [
  ChatRoot,
  ChatHeader,
  ChatMessages,
  ChatComposer,
];

const chatRoot: PartsContract = {
  parent: "ChatRoot",
  family: chatParts,
  accepts: [ChatHeader, ChatMessages, ChatComposer],
  hint: "Put ChatHeader, ChatMessages and ChatComposer directly inside ChatRoot.",
};

/** Inventory record, mirrored into `COMPONENTS.md`. */
export const chatMeta = {
  name: "Chat",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the transport is the consumer's: the component emits submit/stop/retry intents and never talks to a model",
    "Enter reaches the textarea's onSubmit listener; a textarea without it consumes Enter as a newline and no keydown arrives (measured in a window)",
    "Shift+Enter inserts a newline and reaches no handler at all (measured), so a composer cannot distinguish it from a paste",
    "no aria-live, so a new row is painted but not announced; the header's status line is a marker, not a live region",
    "the failure copy is one line in the fixed header (full sentence in aria-description), not a row between the viewport and the composer: a row there took height from the transcript and moved the composer when it appeared",
    "the jump control owns a reserved rail under the viewport, because position: absolute resolves against the mount parent in 0.11.0",
  ],
  docs: "docs/chat.mdx",
  example: "examples/chat.example.tsx",
  testFile: "src/behaviour/chat.test.tsx",
} as const;
