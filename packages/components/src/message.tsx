/** @jsxImportSource @gpuix/react */
/**
 * Message: one row of a conversation.
 *
 * Ported from shadcn/ui's `Message` and `MessageGroup`
 * (`registry/bases/ui/message.tsx`): the row owns the author, avatar, metadata
 * and alignment; `MessageContent` is the column between the avatar and the
 * bubble; `Bubble` is the visible surface and is always a child, never built
 * here. That split is the point — a bubble can be quoted, grouped or reused on
 * its own, and a message is the layout around it.
 *
 * The data slots the earlier row carried stay as props on `MessageContent`
 * (reasoning, tool calls, citations, streaming) because they are data, not
 * markup: presence is the only switch, and a restored record's absent slot
 * paints nothing. They sit outside the bubble surface — the bubble is the
 * caller's child — so a trace can be read without being painted into the reply.
 *
 * Actions are **the consumer's**: `MessageActions` renders no control unless a
 * handler is supplied, because the runtime publishes no clipboard write.
 */

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

/** Who a row is from, as the guard reads it. The default is `assistant`. */
const MessageVariants = Schema.Literals(["user", "assistant", "system"]);

/** Who a row is from. The default is `assistant`. */
export type MessageVariant = typeof MessageVariants.Type;

/** The author line each variant derives, and the avatar's name. */
const AUTHOR: Readonly<Record<MessageVariant, string>> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

/**
 * The row a stored variant name paints.
 *
 * A variant arrives with a saved transcript as often as a literal: a role this
 * release renamed or dropped reaches the component as a name the union no
 * longer carries. `AUTHOR[variant]` answered `undefined`, so the row published
 * no accessible name; a name the table does not carry reads as the documented
 * default, `assistant`.
 */
const rowVariant = (variant: unknown): MessageVariant =>
  Schema.is(MessageVariants)(variant) ? variant : "assistant";

/** The inline side a row takes. */
const MessageAlignments = Schema.Literals(["start", "end"]);

/** The inline side a row takes. */
export type MessageAlign = typeof MessageAlignments.Type;

/** The alignment a stored name paints; the variant's own side when absent. */
const rowAlign = (align: unknown, variant: MessageVariant): MessageAlign =>
  Schema.is(MessageAlignments)(align)
    ? align
    : variant === "user"
      ? "end"
      : "start";

/**
 * The rows a saved reply's slot carries: only a list is a list.
 *
 * A transcript restored from storage writes `null` where it carried no slot;
 * `.map`/`.length` on it threw out of the render and took the whole row down.
 */
const listOf = <A,>(value: ReadonlyArray<A> | undefined): ReadonlyArray<A> =>
  Array.isArray(value) ? value : [];

/** How a tool call ended, as the guard reads it. */
const MessageToolStatuses = Schema.Literals(["running", "complete", "error"]);

/** How a tool call ended. */
export type MessageToolStatus = typeof MessageToolStatuses.Type;

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

/** What a part derives from the row. */
interface MessageContextValue {
  readonly variant: MessageVariant;
  readonly align: MessageAlign;
  /** The author's name, and the avatar's name. */
  readonly author: string;
  /** The formatted time the caller supplied, if any. */
  readonly timestamp: string | undefined;
  /** Extra metadata the header paints after the timestamp. */
  readonly meta: ReactNode;
  /** The avatar's picture, when the caller supplied one. */
  readonly avatarSrc: string | undefined;
}

const MessageContext = createContext<MessageContextValue | undefined>(
  undefined,
);

/** The row a part belongs to. Throws when there is none. */
const useMessage = (): MessageContextValue => {
  const value = useContext(MessageContext);
  if (value === undefined) {
    throw new Error("Message parts must be used inside Message");
  }
  return value;
};

/** The tool's status word. */
const TOOL_STATUS: Readonly<Record<MessageToolStatus, string>> = {
  running: "Running",
  complete: "Done",
  error: "Failed",
};

/** The word a status this release cannot name paints. */
const TOOL_STATUS_UNKNOWN = "Unknown";

/** The status a saved tool call paints. */
const toolStatusWord = (status: unknown): string =>
  Schema.is(MessageToolStatuses)(status)
    ? TOOL_STATUS[status]
    : TOOL_STATUS_UNKNOWN;

/** {@link Message} props. */
export interface MessageProps extends Omit<Props, "children"> {
  /**
   * Who the row is from. Default `"assistant"`; a name this release does not
   * ship reads as that default.
   */
  readonly variant?: MessageVariant;
  /**
   * The row's side. Default `"end"` for a user and `"start"` otherwise.
   */
  readonly align?: MessageAlign;
  /** The author's name. Defaults to the variant's word. */
  readonly author?: string;
  /** A formatted timestamp. It is the caller's own string; no locale is applied. */
  readonly timestamp?: string;
  /** Extra metadata painted after the timestamp. */
  readonly meta?: ReactNode;
  /** The avatar's picture; `MessageAvatar` shows the author's initials without it. */
  readonly avatarSrc?: string;
  /** The row's accessible name. Default is the author. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * One conversation row. The metadata is read once here and shared with the
 * header and the avatar, so a row cannot publish two different authors.
 */
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
            // The runtime has no `flex-row-reverse` utility for this seam.
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

/** {@link MessageAvatar} props. */
export interface MessageAvatarProps extends Omit<Props, "children"> {
  /** The name to show, overriding the row's author. */
  readonly name?: string;
  /** A picture, overriding the row's `avatarSrc`. */
  readonly src?: string;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
}

/** The row's avatar, named and pictured by the row unless overridden. */
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

/** {@link MessageHeader} props. */
export interface MessageHeaderProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
}

/**
 * The author and timestamp line above the bubble. The root owns the words; the
 * part only paints them, so a header cannot disagree with the avatar.
 */
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

/** {@link MessageFooter} props. */
export interface MessageFooterProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The under-bubble line: actions, delivery state, anything the row keeps. */
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

/** What the content draws. */
export interface MessageContentState {
  readonly variant: MessageVariant;
  readonly align: MessageAlign;
  readonly streaming: boolean;
}

/** {@link MessageContent} props. */
export interface MessageContentProps extends Omit<Props, "children" | "style"> {
  /** The body: a `Bubble`, or plain prose for a trace row. */
  readonly children?: ReactNode;
  /** Collapsed reasoning, closed by default. A blank one paints no panel. */
  readonly reasoning?: string;
  /** The tool calls the reply made, in order. A non-list carries no calls. */
  readonly toolCalls?: ReadonlyArray<MessageToolCall>;
  /** The citations the reply used. A non-list carries no citations. */
  readonly sources?: ReadonlyArray<MessageSource>;
  /** Show the streaming marker while tokens are still arriving. */
  readonly streaming?: boolean;
  /** The marker's copy. Default `"Streaming…"`; a blank one reads as the default. */
  readonly streamingLabel?: string;
  /** The reasoning disclosure's copy. Default `"Reasoning"`. */
  readonly reasoningLabel?: string;
  /** The citations list's accessible name. Default `"Sources"`. */
  readonly sourcesLabel?: string;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  /** A style, or a function of the row's variant, side and streaming state. */
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
 * The slot column between the avatar and the row's edge. The caller composes
 * `MessageHeader`, `Bubble` and `MessageFooter` inside it; the data slots are
 * props and sit outside the bubble.
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
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
}

/** The action row. It renders nothing when no handler can serve a control. */
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

/** {@link MessageGroup} props. */
export interface MessageGroupProps extends Omit<Props, "children"> {
  /** The gap between rows. Default the theme's `sm` (6px). */
  readonly gap?: number;
  /** A Tailwind class string, joined after the recipe. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** Consecutive rows from one sender. */
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

/** Inventory record, mirrored into `COMPONENTS.md`. */
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
