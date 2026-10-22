/**
 * Message: one row of a conversation (plan 207).
 *
 * The behaviour is ported from **shadcn/ui's AI Elements `message`**; the
 * implementation is ours and runs on GPUix host elements. A row is a variant
 * (`user`, `assistant`, `system`) plus optional slots — reasoning, tool calls,
 * citations and a streaming marker — that are **data props, not booleans and not
 * extra parts**: presence is the only switch, so a slot is rendered when it is
 * supplied and omitted otherwise. The four parts stay the four `docs/component-api.md`
 * §8 names.
 *
 * Variant is the difference a row paints: a user message is a soft bubble on the
 * right of its avatar, an assistant's is plain prose on the left, and a system
 * note is small muted copy. The rules live in `MessageContext`, so a part is
 * never given a duplicated `variant` prop.
 *
 * Actions are **the consumer's**: `MessageActions` renders no control unless a
 * handler is supplied, because the runtime publishes no clipboard write — the
 * capability record's workaround (a read-only field the user copies) is the
 * consumer's to build, and this component only emits the intent.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  MESSAGE_ACTIONS,
  MESSAGE_BUBBLE,
  MESSAGE_BUBBLES,
  MESSAGE_CONTENT,
  MESSAGE_REASONING,
  MESSAGE_REASONING_CONTENT,
  MESSAGE_REASONING_TRIGGER,
  MESSAGE_ROOT,
  MESSAGE_SOURCE,
  MESSAGE_SOURCES,
  MESSAGE_STREAMING,
  MESSAGE_TOOL_CALL,
  MESSAGE_TOOL_CALL_HEAD,
  MESSAGE_TOOL_CALL_NAME,
  MESSAGE_TOOL_CALL_RESULT,
  MESSAGE_TOOL_CALL_STATUS,
} from "@gpuixui/tw";
import { createContext, useContext, type ReactNode } from "react";
import { Avatar } from "./avatar.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible.js";
import { Button } from "./internal/button.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

/** Who a row is from. The default is `assistant`. */
export type MessageVariant = "user" | "assistant" | "system";

/** The author line each variant derives, and the avatar's name. */
const AUTHOR: Readonly<Record<MessageVariant, string>> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

/** How a tool call ended. */
export type MessageToolStatus = "running" | "complete" | "error";

/** One tool call a reply made. */
export interface MessageToolCall {
  /** The tool's name, as the consumer's transport reports it. */
  readonly name: string;
  readonly status: MessageToolStatus;
  /** The call's result or error copy, shown under the status. */
  readonly result?: string;
}

/** One citation a reply used. */
export interface MessageSource {
  /** The citation's visible label. */
  readonly label: string;
  /** The address it points at; painted as the row's description, not a link. */
  readonly href?: string;
}

/** What a part derives from the root. */
interface MessageContextValue {
  readonly variant: MessageVariant;
}

const MessageContext = createContext<MessageContextValue | undefined>(
  undefined,
);

/** The row a part belongs to. Throws when there is none. */
const useMessage = (): MessageContextValue => {
  const value = useContext(MessageContext);
  if (value === undefined) {
    throw new Error("Message parts must be used inside MessageRoot");
  }
  return value;
};

/** The tool's status word. */
const TOOL_STATUS: Readonly<Record<MessageToolStatus, string>> = {
  running: "Running",
  complete: "Done",
  error: "Failed",
};

/** {@link MessageRoot} props. */
export interface MessageRootProps extends Omit<Props, "children"> {
  /** Who the row is from. Default `"assistant"`. */
  readonly variant?: MessageVariant;
  /** The row's accessible name. Default is the variant's author. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** One conversation row: its variant, its avatar and its content. */
export const MessageRoot = ({
  variant = "assistant",
  label,
  className,
  children,
  style,
  ...rest
}: MessageRootProps) => {
  const theme = useTheme();
  assertParts(messageRoot, children);
  const author = AUTHOR[variant];

  return (
    <MessageContext.Provider value={{ variant }}>
      <div
        role="group"
        aria-label={label ?? author}
        {...rest}
        style={mergeStyles(
          mergeStyles(recipeStyle(cn(MESSAGE_ROOT, className), theme), {
            // A user's row is the mirror of an assistant's: avatar on the outer
            // edge, content grown away from it. The runtime has no
            // `flex-row-reverse` utility, so the direction is a state value.
            flexDirection: variant === "user" ? "row-reverse" : "row",
            alignItems: variant === "system" ? "center" : "flex-start",
          }),
          style,
        )}
      >
        {children}
      </div>
    </MessageContext.Provider>
  );
};

/** {@link MessageAvatar} props. */
export interface MessageAvatarProps extends Omit<Props, "children"> {
  /** The name to show, overriding the variant's author. */
  readonly name?: string;
  /** A picture; the initials of `name` show until it paints. */
  readonly src?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The row's avatar, named by the variant unless the caller says otherwise. */
export const MessageAvatar = ({
  name,
  src,
  className,
  ...rest
}: MessageAvatarProps) => {
  const { variant } = useMessage();
  return (
    <Avatar
      {...rest}
      name={name ?? AUTHOR[variant]}
      src={src}
      size="sm"
      className={className}
    />
  );
};

/** What the content draws. */
export interface MessageContentState {
  readonly variant: MessageVariant;
  readonly streaming: boolean;
}

/** {@link MessageContent} props. */
export interface MessageContentProps extends Omit<Props, "children" | "style"> {
  /** The body: prose, or a `<markdown>` element from the consumer. */
  readonly children?: ReactNode;
  /** Collapsed reasoning, closed by default. */
  readonly reasoning?: string;
  /** The tool calls the reply made, in order. */
  readonly toolCalls?: ReadonlyArray<MessageToolCall>;
  /** The citations the reply used. */
  readonly sources?: ReadonlyArray<MessageSource>;
  /** Show the streaming marker while tokens are still arriving. */
  readonly streaming?: boolean;
  /** The marker's copy. Default `"Streaming…"`. */
  readonly streamingLabel?: string;
  /** The reasoning disclosure's copy. Default `"Reasoning"`. */
  readonly reasoningLabel?: string;
  /** The citations list's accessible name. Default `"Sources"`. */
  readonly sourcesLabel?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the row's variant and streaming state. */
  readonly style?: StateStyle<MessageContentState>;
}

/** The reasoning panel: a disclosure that is closed until a reader opens it. */
const Reasoning = ({
  text,
  label,
}: {
  readonly text: string;
  readonly label: string;
}) => {
  const theme = useTheme();

  return (
    <div style={recipeStyle(MESSAGE_REASONING, theme)}>
      <Collapsible>
        <CollapsibleTrigger
          testId="message-reasoning-trigger"
          style={recipeStyle(MESSAGE_REASONING_TRIGGER, theme)}
        >
          <text>{label}</text>
          <Icon
            name="chevron-down"
            size="xs"
            color={theme.colors.mutedForeground}
          />
        </CollapsibleTrigger>
        <CollapsibleContent
          testId="message-reasoning-content"
          style={recipeStyle(MESSAGE_REASONING_CONTENT, theme)}
        >
          <text>{text}</text>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

/** One tool call: its name, its status and its result. */
const ToolCall = ({ call }: { readonly call: MessageToolCall }) => {
  const theme = useTheme();

  return (
    <div style={recipeStyle(MESSAGE_TOOL_CALL, theme)}>
      <div style={recipeStyle(MESSAGE_TOOL_CALL_HEAD, theme)}>
        <text style={recipeStyle(MESSAGE_TOOL_CALL_NAME, theme)}>
          {call.name}
        </text>
        <div style={recipeStyle(MESSAGE_TOOL_CALL_STATUS, theme)}>
          {call.status === "error" ? (
            // The status colour is a mark, measured at the mark floor on the
            // surfaces a card sits on; the word carries the meaning.
            <Icon name="error" size="xs" color={theme.colors.destructive} />
          ) : null}
          <text>{TOOL_STATUS[call.status]}</text>
        </div>
      </div>
      {call.result === undefined ? null : (
        <text style={recipeStyle(MESSAGE_TOOL_CALL_RESULT, theme)}>
          {call.result}
        </text>
      )}
    </div>
  );
};

/** The streaming marker: a measured mark plus the word. */
const StreamingMarker = ({ label }: { readonly label: string }) => {
  const theme = useTheme();

  return (
    <div
      style={recipeStyle(MESSAGE_STREAMING, theme)}
      testId="message-streaming"
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.primary,
          flexShrink: 0,
        }}
      />
      <text>{label}</text>
    </div>
  );
};

/**
 * The row's body and its optional slots. Put `MessageActions` directly inside
 * it; the reasoning, tool-call, citation and streaming slots are props.
 */
export const MessageContent = ({
  children,
  reasoning,
  toolCalls = [],
  sources = [],
  streaming = false,
  streamingLabel = "Streaming…",
  reasoningLabel = "Reasoning",
  sourcesLabel = "Sources",
  className,
  style,
  ...rest
}: MessageContentProps) => {
  const theme = useTheme();
  const { variant } = useMessage();
  assertParts(messageContent, children);

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(MESSAGE_CONTENT, className), theme), {
          alignItems: variant === "user" ? "flex-end" : "flex-start",
        }),
        resolveStyle(style, { variant, streaming }),
      )}
    >
      {reasoning === undefined ? null : (
        <Reasoning text={reasoning} label={reasoningLabel} />
      )}
      <div
        testId="message-bubble"
        style={mergeStyles(
          recipeStyle(cn(MESSAGE_BUBBLE, MESSAGE_BUBBLES[variant]), theme),
          { alignSelf: variant === "user" ? "flex-end" : "flex-start" },
        )}
      >
        {children}
      </div>
      {toolCalls.map((call) => (
        <ToolCall key={call.name} call={call} />
      ))}
      {sources.length === 0 ? null : (
        <div
          role="list"
          aria-label={sourcesLabel}
          style={recipeStyle(MESSAGE_SOURCES, theme)}
        >
          {sources.map((source) => (
            <div
              key={source.label}
              role="listitem"
              {...(source.href === undefined
                ? {}
                : { "aria-description": source.href })}
              style={recipeStyle(MESSAGE_SOURCE, theme)}
            >
              <Icon
                name="link"
                size="xs"
                color={theme.colors.mutedForeground}
              />
              <text>{source.label}</text>
            </div>
          ))}
        </div>
      )}
      {streaming ? <StreamingMarker label={streamingLabel} /> : null}
    </div>
  );
};

/** {@link MessageActions} props. */
export interface MessageActionsProps extends Omit<Props, "children"> {
  /** Copy the message. The consumer owns the clipboard path. */
  readonly onCopy?: () => void;
  /** Ask the transport for another reply. */
  readonly onRetry?: () => void;
  /** Record the reader's verdict on the reply. */
  readonly onFeedback?: (feedback: "helpful" | "not-helpful") => void;
  /** Default `"Copy"`. */
  readonly copyLabel?: string;
  /** Default `"Retry"`. */
  readonly retryLabel?: string;
  /** Default `"Helpful"`. */
  readonly helpfulLabel?: string;
  /** Default `"Not helpful"`. */
  readonly notHelpfulLabel?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/**
 * The action row. It renders **nothing** when no handler is supplied: an
 * affordance that cannot act is worse than no affordance.
 */
export const MessageActions = ({
  onCopy,
  onRetry,
  onFeedback,
  copyLabel = "Copy",
  retryLabel = "Retry",
  helpfulLabel = "Helpful",
  notHelpfulLabel = "Not helpful",
  className,
  style,
  ...rest
}: MessageActionsProps) => {
  const theme = useTheme();

  if (
    onCopy === undefined &&
    onRetry === undefined &&
    onFeedback === undefined
  ) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Message actions"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(MESSAGE_ACTIONS, className), theme),
        style,
      )}
    >
      {onCopy === undefined ? null : (
        <MessageAction label={copyLabel} onPress={onCopy} />
      )}
      {onRetry === undefined ? null : (
        <MessageAction label={retryLabel} onPress={onRetry} />
      )}
      {onFeedback === undefined ? null : (
        <>
          <MessageAction
            label={helpfulLabel}
            onPress={() => onFeedback("helpful")}
          />
          <MessageAction
            label={notHelpfulLabel}
            onPress={() => onFeedback("not-helpful")}
          />
        </>
      )}
    </div>
  );
};

/** One small ghost action. */
const MessageAction = ({
  label,
  onPress,
}: {
  readonly label: string;
  readonly onPress: () => void;
}) => (
  <Button size="sm" variant="ghost" onClick={onPress}>
    {label}
  </Button>
);

/** Every part of Message, so a misplaced sibling is named. */
const messageParts: ReadonlyArray<PartComponent> = [
  MessageRoot,
  MessageAvatar,
  MessageContent,
  MessageActions,
];

const messageRoot: PartsContract = {
  parent: "MessageRoot",
  family: messageParts,
  accepts: [MessageAvatar, MessageContent],
  hint: "Put MessageAvatar and MessageContent directly inside MessageRoot.",
};

const messageContent: PartsContract = {
  parent: "MessageContent",
  family: messageParts,
  accepts: [MessageActions],
  hint: "Put MessageActions directly inside MessageContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const messageMeta = {
  name: "Message",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the reasoning panel grows through `Collapsible`'s measured height (`AutoHeight`), so its first open paints at zero for a frame before it grows",
    "no aria-labelledby or aria-describedby, so a tool call's result and a citation's href are not associated with the row that names them",
    "no clipboard write, so Copy is the consumer's handler; the runtime's own path is a read-only field the user copies",
    "a citation is a labelled row, not a link: there is no anchor element, and opening an href is the consumer's callback surface",
  ],
  docs: "docs/message.mdx",
  example: "examples/message.example.tsx",
  testFile: "src/behaviour/message.test.tsx",
} as const;
