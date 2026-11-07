/** @jsxImportSource @gpuix/react */
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

const DEFAULT_CONVERSATION_LABEL = "Conversation";
const DEFAULT_ERROR = "The reply failed.";
const DEFAULT_EMPTY_TITLE = "Start the conversation";
const DEFAULT_EMPTY_DESCRIPTION = "Messages you send appear here.";
const DEFAULT_COMPOSER_LABEL = "Message";
const DEFAULT_SUBMIT_LABEL = "Send";
const DEFAULT_STOP_LABEL = "Stop";

interface ChatContextValue {
  readonly status: Machine.ChatStatus;

  readonly label: string;

  readonly error: string;

  readonly canStop: boolean;

  readonly canRetry: boolean;

  readonly submit: (message: string) => void;

  readonly stop: () => void;

  readonly retry: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const useChat = (): ChatContextValue => {
  const value = useContext(ChatContext);
  if (value === undefined) {
    throw new Error("Chat parts must be used inside ChatRoot");
  }
  return value;
};

export interface ChatRootProps extends Omit<Props, "children" | "onSubmit"> {
  readonly status?: Machine.ChatStatus;

  readonly defaultStatus?: Machine.ChatStatus;
  readonly onStatusChange?: (status: Machine.ChatStatus) => void;

  readonly onSubmit: (message: string) => void;

  readonly onStop?: () => void;

  readonly onRetry?: () => void;

  readonly error?: string;

  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface ChatHeaderProps extends Omit<Props, "children" | "title"> {
  readonly title?: string;

  readonly description?: string;

  readonly actions?: ReactNode;

  readonly className?: string;
}

const STATUS_COPY: Readonly<Record<Machine.ChatStatus, string>> = {
  idle: "Ready",
  submitting: "Sending…",
  streaming: "Replying…",
  error: "The reply failed.",
};

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

export interface ChatMessagesProps extends Omit<Props, "children"> {
  readonly empty?: ReactNode;

  readonly emptyTitle?: string;

  readonly emptyDescription?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface ChatComposerState {
  readonly status: Machine.ChatStatus;
  readonly busy: boolean;
  readonly empty: boolean;
  readonly disabled: boolean;
}

export interface ChatComposerProps extends Omit<
  Props,
  "children" | "onSubmit" | "style"
> {
  readonly value?: string;

  readonly defaultValue?: string;

  readonly onValueChange?: (value: string) => void;

  readonly label?: string;

  readonly placeholder?: string;

  readonly submitLabel?: string;

  readonly stopLabel?: string;

  readonly hint?: string;

  readonly attachments?: ReactNode;

  readonly disabled?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<ChatComposerState>;
}

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

  const [draft, setDraft] = useControllableState({
    value: valueProp === undefined ? undefined : textOf(valueProp),
    defaultValue: textOf(defaultValue),
    onChange: onValueChange,
  });

  const name = accessibleName(textOf(label)) ?? DEFAULT_COMPOSER_LABEL;
  const submitWord =
    accessibleName(textOf(submitLabel)) ?? DEFAULT_SUBMIT_LABEL;
  const stopWord = accessibleName(textOf(stopLabel)) ?? DEFAULT_STOP_LABEL;
  const hintCopy = visibleCopy(textOf(hint));
  const busy = Machine.isChatBusy(status);
  const empty = draft.trim() === "";
  const state: ChatComposerState = { status, busy, empty, disabled };

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
            aria-description={fieldHelp({ placeholder }, draft)}
            theme={nativeTextTheme(theme, "background")}
            value={draft}
            readOnly={disabled}
            tabIndex={disabled ? -1 : 0}
            minRows={1}
            maxRows={6}
            onChange={(event) => setDraft(event.value ?? "")}
            onSubmit={send}
            onKeyDown={(event: KeyEvent) => {
              onKeyDown?.(event);

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
