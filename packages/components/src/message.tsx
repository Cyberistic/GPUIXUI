/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { accessibleName, visibleCopy } from "@gpuixui/primitives/core";
import {
  cn,
  MESSAGE_ACTIONS,
  MESSAGE_CONTENT,
  MESSAGE_FOOTER,
  MESSAGE_GROUP,
  MESSAGE_HEADER,
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
import * as Schema from "effect/Schema";
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
import { textOf } from "./internal/text.js";
import { useTheme } from "./internal/theme.js";

const MessageVariants = Schema.Literals(["user", "assistant", "system"]);

export type MessageVariant = typeof MessageVariants.Type;

const AUTHOR: Readonly<Record<MessageVariant, string>> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

const rowVariant = (variant: unknown): MessageVariant =>
  Schema.is(MessageVariants)(variant) ? variant : "assistant";

const MessageAlignments = Schema.Literals(["start", "end"]);

export type MessageAlign = typeof MessageAlignments.Type;

const rowAlign = (align: unknown, variant: MessageVariant): MessageAlign =>
  Schema.is(MessageAlignments)(align)
    ? align
    : variant === "user"
      ? "end"
      : "start";

const listOf = <A,>(value: ReadonlyArray<A> | undefined): ReadonlyArray<A> =>
  Array.isArray(value) ? value : [];

const MessageToolStatuses = Schema.Literals(["running", "complete", "error"]);

export type MessageToolStatus = typeof MessageToolStatuses.Type;

export interface MessageToolCall {
  readonly name: string;
  readonly status: MessageToolStatus;

  readonly result?: string;
}

export interface MessageSource {
  readonly label: string;

  readonly href?: string;
}

interface MessageContextValue {
  readonly variant: MessageVariant;
  readonly align: MessageAlign;

  readonly author: string;

  readonly timestamp: string | undefined;

  readonly meta: ReactNode;

  readonly avatarSrc: string | undefined;
}

const MessageContext = createContext<MessageContextValue | undefined>(
  undefined,
);

const useMessage = (): MessageContextValue => {
  const value = useContext(MessageContext);
  if (value === undefined) {
    throw new Error("Message parts must be used inside Message");
  }
  return value;
};

const TOOL_STATUS: Readonly<Record<MessageToolStatus, string>> = {
  running: "Running",
  complete: "Done",
  error: "Failed",
};

const TOOL_STATUS_UNKNOWN = "Unknown";

const toolStatusWord = (status: unknown): string =>
  Schema.is(MessageToolStatuses)(status)
    ? TOOL_STATUS[status]
    : TOOL_STATUS_UNKNOWN;

export interface MessageProps extends Omit<Props, "children"> {
  readonly variant?: MessageVariant;

  readonly align?: MessageAlign;

  readonly author?: string;

  readonly timestamp?: string;

  readonly meta?: ReactNode;

  readonly avatarSrc?: string;

  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const Message = ({
  variant: variantProp = "assistant",
  align: alignProp,
  author,
  timestamp,
  meta = null,
  avatarSrc,
  label,
  className,
  children,
  style,
  ...rest
}: MessageProps) => {
  const theme = useTheme();
  assertParts(messageRoot, children);
  const variant = rowVariant(variantProp);
  const align = rowAlign(alignProp, variant);
  const name = accessibleName(textOf(author)) ?? AUTHOR[variant];
  const time = accessibleName(textOf(timestamp));

  return (
    <MessageContext.Provider
      value={{
        variant,
        align,
        author: name,
        timestamp: time,
        meta,
        avatarSrc,
      }}
    >
      <div
        role="group"
        aria-label={accessibleName(textOf(label)) ?? name}
        {...rest}
        style={mergeStyles(
          mergeStyles(recipeStyle(cn(MESSAGE_ROOT, className), theme), {
            flexDirection: align === "end" ? "row-reverse" : "row",
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

export interface MessageAvatarProps extends Omit<Props, "children"> {
  readonly name?: string;

  readonly src?: string;

  readonly className?: string;
}

export const MessageAvatar = ({
  name,
  src,
  className,
  ...rest
}: MessageAvatarProps) => {
  const { author, avatarSrc } = useMessage();
  return (
    <Avatar
      {...rest}
      name={name ?? author}
      src={src ?? avatarSrc}
      size="sm"
      className={className}
    />
  );
};

export interface MessageHeaderProps extends Omit<Props, "children"> {
  readonly className?: string;
}

export const MessageHeader = ({
  className,
  style,
  ...rest
}: MessageHeaderProps) => {
  const theme = useTheme();
  const { author, timestamp, meta } = useMessage();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(MESSAGE_HEADER, className), theme), {
          alignSelf: "flex-start",
        }),
        style,
      )}
    >
      <text>{author}</text>
      {timestamp === undefined ? null : <text>{timestamp}</text>}
      {meta}
    </div>
  );
};

export interface MessageFooterProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

export const MessageFooter = ({
  className,
  children,
  style,
  ...rest
}: MessageFooterProps) => {
  const theme = useTheme();
  const { align } = useMessage();
  assertParts(messageFooter, children);
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(MESSAGE_FOOTER, className), theme), {
          alignSelf: align === "end" ? "flex-end" : "flex-start",
          justifyContent: align === "end" ? "flex-end" : "flex-start",
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface MessageContentState {
  readonly variant: MessageVariant;
  readonly align: MessageAlign;
  readonly streaming: boolean;
}

export interface MessageContentProps extends Omit<Props, "children" | "style"> {
  readonly children?: ReactNode;

  readonly reasoning?: string;

  readonly toolCalls?: ReadonlyArray<MessageToolCall>;

  readonly sources?: ReadonlyArray<MessageSource>;

  readonly streaming?: boolean;

  readonly streamingLabel?: string;

  readonly reasoningLabel?: string;

  readonly sourcesLabel?: string;

  readonly className?: string;

  readonly style?: StateStyle<MessageContentState>;
}

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
            <Icon name="error" size="xs" color={theme.colors.destructive} />
          ) : null}
          <text>{toolStatusWord(call.status)}</text>
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
  const { variant, align } = useMessage();
  assertParts(messageContent, children);
  const calls = listOf(toolCalls);
  const citations = listOf(sources);
  const thought = visibleCopy(textOf(reasoning));
  const streamingWord = accessibleName(textOf(streamingLabel)) ?? "Streaming…";
  const reasoningWord = accessibleName(textOf(reasoningLabel)) ?? "Reasoning";
  const citationsWord = accessibleName(textOf(sourcesLabel)) ?? "Sources";

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(MESSAGE_CONTENT, className), theme), {
          alignItems: align === "end" ? "flex-end" : "flex-start",
        }),
        resolveStyle(style, { variant, align, streaming }),
      )}
    >
      {thought === undefined ? null : (
        <Reasoning text={thought} label={reasoningWord} />
      )}
      {children}
      {calls.map((call) => (
        <ToolCall key={call.name} call={call} />
      ))}
      {citations.length === 0 ? null : (
        <div
          role="list"
          aria-label={citationsWord}
          style={recipeStyle(MESSAGE_SOURCES, theme)}
        >
          {citations.map((source) => (
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
      {streaming ? <StreamingMarker label={streamingWord} /> : null}
    </div>
  );
};

export interface MessageActionsProps extends Omit<Props, "children"> {
  readonly onCopy?: () => void;

  readonly onRetry?: () => void;

  readonly onFeedback?: (feedback: "helpful" | "not-helpful") => void;

  readonly copyLabel?: string;

  readonly retryLabel?: string;

  readonly helpfulLabel?: string;

  readonly notHelpfulLabel?: string;

  readonly className?: string;
}

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

export interface MessageGroupProps extends Omit<Props, "children"> {
  readonly gap?: number;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const MessageGroup = ({
  gap,
  className,
  children,
  style,
  ...rest
}: MessageGroupProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(MESSAGE_GROUP, className), theme), {
          gap: gap ?? theme.spacing.sm,
        }),
        style,
      )}
    >
      {children}
    </div>
  );
};

const messageFamily: ReadonlyArray<PartComponent> = [
  Message,
  MessageAvatar,
  MessageHeader,
  MessageContent,
  MessageFooter,
  MessageActions,
  MessageGroup,
];

const messageRoot: PartsContract = {
  parent: "Message",
  family: messageFamily,
  accepts: [MessageAvatar, MessageContent],
  hint: "Put MessageAvatar and MessageContent directly inside it.",
};

const messageContent: PartsContract = {
  parent: "MessageContent",
  family: messageFamily,
  accepts: [MessageHeader, MessageFooter],
  hint: "Put MessageHeader and MessageFooter directly inside it; the bubble is a child too.",
};

const messageFooter: PartsContract = {
  parent: "MessageFooter",
  family: messageFamily,
  accepts: [MessageActions],
  hint: "Put MessageActions directly inside it.",
};

export const messageMeta = {
  name: "Message",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the bubble is a child (`Bubble`), not built by `MessageContent`: reusing a surface on its own is the point of the split",
    "the reasoning panel grows through `Collapsible`'s measured height (`AutoHeight`), so its height is the body's measurement rather than a fixed box",
    "no aria-labelledby or aria-describedby, so a tool call's result and a citation's href are not associated with the row that names them",
    "no clipboard write, so Copy is the consumer's handler; the runtime's own path is a read-only field the user copies",
    "a citation is a labelled row, not a link: there is no anchor element, and opening an href is the consumer's callback surface",
    "a reply restored from storage is read structurally: a slot that is not a list carries nothing, a blank label or sentence reads as its documented words, and a role a release renamed reads as the assistant default",
  ],
  docs: "docs/message.mdx",
  example: "examples/message.example.tsx",
  testFile: "src/behaviour/message.test.tsx",
} as const;
