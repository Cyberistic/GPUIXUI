/**
 * Message: one row of a conversation.
 *
 * Four variants of chrome over one flat part set: a `user` bubble sits on the
 * right with the primary fill, an `assistant` bubble on the left with the muted
 * fill, `system` text is bare and muted. Every slot is a part the consumer
 * places — actions, reasoning, tool calls, sources, attachments, the streaming
 * indicator — so an absent slot renders nothing and no boolean switches it on.
 *
 * The row is a wrapping flex line: the avatar and content fill the first line,
 * and every full-width part (reasoning, tool calls, sources, actions) wraps onto
 * its own line. GPUix has no `:has`/grid lines, so this is the honest layout.
 *
 * Content is `<markdown>` by default (GFM tables and links are on) and plain
 * `<text>` when `format="text"`, which is what a token-by-token stream can use
 * if markdown repaint ever proves unreliable. `onLinkClick` reports the URL; the
 * caller opens it, because 0.10.0 has no `href`.
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import * as Option from "effect/Option";
import { createContext, useContext, type ReactNode } from "react";
import { Avatar } from "./avatar.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible.js";
import { Button } from "./internal/button.js";
import { composedName, controlName, controlNameFrom } from "./internal/name.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { textStyle, useTheme, type Theme } from "./internal/theme.js";

/** Who wrote the row. A closed vocabulary, not a loose string. */
export type MessageVariant = "user" | "assistant" | "system";

/** One tool call a row may report. */
export type MessageToolCallStatus = "pending" | "running" | "done" | "failed";

/** One tool call: its name, where it got to, and its result once there is one. */
export interface MessageToolCall {
  readonly name: string;
  readonly status: MessageToolCallStatus;
  readonly result?: string;
}

/** One citation: a readable label and the URL the caller opens. */
export interface MessageSource {
  readonly label: string;
  readonly url: string;
}

/** One attachment chip: the file's name and optional size/type meta. */
export interface MessageAttachment {
  readonly name: string;
  readonly meta?: string;
}

/** What every part reads: the row's variant and whether it is still arriving. */
interface MessageContextValue {
  readonly variant: MessageVariant;
  readonly streaming: boolean;
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

/** {@link Message} props. */
export interface MessageProps extends Omit<Props, "children"> {
  /** Who wrote it: `user`, `assistant` or `system`. */
  readonly variant: MessageVariant;
  /** Whether the body is still arriving. Default `false`. */
  readonly streaming?: boolean;
  /** The row's accessible name. Defaults to a human phrase for `variant`. */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** The bubble fill, text and border for one variant. */
const bubble = (theme: Theme, variant: MessageVariant): StyleDesc =>
  Match.value(variant).pipe(
    Match.when("user", () => ({
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
    })),
    Match.when("assistant", () => ({
      backgroundColor: theme.colors.muted,
      color: theme.colors.foreground,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
    })),
    Match.when("system", () => ({ color: theme.colors.mutedForeground })),
    Match.exhaustive,
  );

/** The alignment a full-width part takes from the row's variant. */
const block = (theme: Theme, variant: MessageVariant): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  alignItems: variant === "user" ? "flex-end" : "flex-start",
  gap: theme.spacing.xs,
});

/** The row's name when neither the caller nor `label` supplies one. */
const variantName = (variant: MessageVariant): string =>
  Match.value(variant).pipe(
    Match.when("user", () => "User message"),
    Match.when("assistant", () => "Assistant message"),
    Match.when("system", () => "System message"),
    Match.exhaustive,
  );

/**
 * A conversation row: one of the three variants, with any slots below it. The
 * caller names the row — `aria-label` wins, then `label` — and the default is a
 * human phrase for the variant, never the internal token (plan 802).
 */
export const Message = ({
  variant,
  streaming = false,
  label,
  children,
  style,
  ...rest
}: MessageProps) => {
  const theme = useTheme();
  assertParts(messageRoot, children);
  const name = controlNameFrom(rest["aria-label"], [
    label,
    variantName(variant),
  ]);

  return (
    <MessageContext.Provider value={{ variant, streaming }}>
      <div
        {...rest}
        role="group"
        aria-label={name}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: variant === "user" ? "row-reverse" : "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: variant === "user" ? "flex-end" : "flex-start",
            columnGap: theme.spacing.sm,
            rowGap: theme.spacing.xs,
            width: "100%",
          },
          style,
        )}
      >
        {children}
      </div>
    </MessageContext.Provider>
  );
};

/** {@link MessageAvatar} props. */
export interface MessageAvatarProps extends Props {
  /** The author's name, and the initials fallback. */
  readonly name: string;
  /** Image path or URL. Without it the initials show. */
  readonly src?: string;
}

/** The author's identity mark, sized for a row. */
export const MessageAvatar = ({ name, src, ...rest }: MessageAvatarProps) => (
  <Avatar name={name} src={src} size="sm" {...rest} />
);

/** {@link MessageContent} props. */
export interface MessageContentProps extends Omit<
  Props,
  "children" | "onLinkClick"
> {
  /** The body text. */
  readonly text: string;
  /** Default `"markdown"`; `"text"` is the streaming-safe fallback. */
  readonly format?: "markdown" | "text";
  /** Reports a clicked citation/link URL; the caller opens it. */
  readonly onLinkClick?: (url: string) => void;
}

/** The bubble around the body, in the row's variant. */
export const MessageContent = ({
  text,
  format = "markdown",
  onLinkClick,
  style,
  ...rest
}: MessageContentProps) => {
  const theme = useTheme();
  const { variant } = useMessage();

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "body"),
          ...bubble(theme, variant),
          display: "flex",
          flexDirection: "column",
          maxWidth: "78%",
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          borderRadius: theme.radius.lg,
        },
        style,
      )}
    >
      {format === "text" ? (
        <text>{text}</text>
      ) : (
        <markdown
          source={text}
          onLinkClick={(event) => {
            if (event.value !== undefined) onLinkClick?.(event.value);
          }}
        />
      )}
    </div>
  );
};

/** {@link MessageStreaming} props. */
export interface MessageStreamingProps extends Omit<Props, "children"> {
  /**
   * The visible status text, and its name unless the caller authors one.
   * Default `"Streaming"`.
   */
  readonly label?: string;
}

/**
 * A status line that exists only while the row streams. Its visible `label` is
 * also its accessible name; a caller's authored `aria-label` wins whole.
 */
export const MessageStreaming = ({
  label = "Streaming",
  style,
  ...rest
}: MessageStreamingProps) => {
  const theme = useTheme();
  const { variant, streaming } = useMessage();
  if (!streaming) return null;

  const name = controlName(rest["aria-label"], label);

  return (
    <div
      {...rest}
      role="status"
      {...(name === undefined ? {} : { "aria-label": name })}
      style={mergeStyles(
        { ...block(theme, variant), ...textStyle(theme, "caption") },
        style,
      )}
    >
      <text style={{ color: theme.colors.mutedForeground }}>{label}</text>
    </div>
  );
};

/** {@link MessageReasoning} props. */
export interface MessageReasoningProps extends Omit<Props, "children"> {
  /** The reasoning text, as markdown. */
  readonly text: string;
  /** The disclosure label. Default `"Reasoning"`. */
  readonly label?: string;
  /** Start expanded. Default `false`: reasoning is opt-in. */
  readonly defaultOpen?: boolean;
}

/** The model's reasoning, closed by default. */
export const MessageReasoning = ({
  text,
  label = "Reasoning",
  defaultOpen = false,
  style,
  testId,
  ...rest
}: MessageReasoningProps) => {
  const theme = useTheme();
  const { variant } = useMessage();

  return (
    <div
      {...rest}
      testId={testId}
      style={mergeStyles(block(theme, variant), style)}
    >
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger
          testId={testId === undefined ? undefined : `${testId}-trigger`}
          style={{ width: "100%" }}
        >
          {label}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <markdown source={text} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

/** {@link MessageToolCalls} props. */
export interface MessageToolCallsProps extends Omit<Props, "children"> {
  readonly calls: ReadonlyArray<MessageToolCall>;
  /** The group's accessible name. Default `"Tool calls"`. */
  readonly label?: string;
}

/** The status word's colour: failed is destructive, done is success. */
const callStatusColor = (theme: Theme, status: MessageToolCallStatus): string =>
  Match.value(status).pipe(
    Match.when("failed", () => theme.colors.destructive),
    Match.when("done", () => theme.colors.success),
    Match.when("pending", () => theme.colors.mutedForeground),
    Match.when("running", () => theme.colors.info),
    Match.exhaustive,
  );

/**
 * One row per tool call, with its result when the call produced one. The group
 * name is the caller's (`aria-label`, then `label`), and each row is named
 * `"<name>, <status>"` because 0.10.0 does not lift a `div`'s contents into its
 * accessible name (plan 806).
 */
export const MessageToolCalls = ({
  calls,
  label = "Tool calls",
  style,
  "aria-label": authoredName,
  ...rest
}: MessageToolCallsProps) => {
  const theme = useTheme();
  const { variant } = useMessage();
  if (calls.length === 0) return null;
  const name = controlNameFrom(authoredName, [label]);

  return (
    <div
      {...rest}
      role="list"
      {...(name === undefined ? {} : { "aria-label": name })}
      style={mergeStyles(block(theme, variant), style)}
    >
      {calls.map((call) => {
        const rowName = Option.getOrUndefined(
          composedName(undefined, [call.name, call.status]),
        );
        return (
          <div
            key={`${call.name}-${call.status}-${call.result ?? ""}`}
            role="listitem"
            {...(rowName === undefined ? {} : { "aria-label": rowName })}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: theme.spacing["2xs"],
              paddingLeft: theme.spacing.md,
              paddingRight: theme.spacing.md,
              paddingTop: theme.spacing.sm,
              paddingBottom: theme.spacing.sm,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.card,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "label"),
                  color: theme.colors.foreground,
                }}
              >
                {call.name}
              </text>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: callStatusColor(theme, call.status),
                }}
              >
                {call.status}
              </text>
            </div>
            {call.result === undefined ? null : (
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {call.result}
              </text>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** {@link MessageSources} props. */
export interface MessageSourcesProps extends Omit<Props, "children"> {
  readonly sources: ReadonlyArray<MessageSource>;
  /** Opens a citation; the component does not own a browser or a URL opener. */
  readonly onSelect?: (source: MessageSource) => void;
  /** The group's accessible name. Default `"Sources"`. */
  readonly label?: string;
}

/** Citations, as caller-opened buttons: 0.10.0 has no `href` element. */
export const MessageSources = ({
  sources,
  onSelect,
  label = "Sources",
  style,
  testId,
  "aria-label": authoredName,
  ...rest
}: MessageSourcesProps) => {
  const theme = useTheme();
  const { variant } = useMessage();
  if (sources.length === 0) return null;
  const name = controlNameFrom(authoredName, [label]);

  return (
    <div
      {...rest}
      testId={testId}
      role="group"
      {...(name === undefined ? {} : { "aria-label": name })}
      style={mergeStyles(block(theme, variant), style)}
    >
      {sources.map((source, index) => (
        <Button
          key={source.url}
          testId={testId === undefined ? undefined : `${testId}-${index}`}
          variant="ghost"
          size="sm"
          aria-label={`Open source ${source.label}`}
          onClick={() => onSelect?.(source)}
        >
          <text>{source.label}</text>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {source.url}
          </text>
        </Button>
      ))}
    </div>
  );
};

/** {@link MessageAttachments} props. */
export interface MessageAttachmentsProps extends Omit<Props, "children"> {
  readonly attachments: ReadonlyArray<MessageAttachment>;
  /** The group's accessible name. Default `"Attachments"`. */
  readonly label?: string;
}

/**
 * Attachment chips: the name and, when the caller knows it, the size/type. The
 * group name is the caller's (`aria-label`, then `label`), and each chip is named
 * `"<name>"` or `"<name>, <meta>"` because 0.10.0 does not lift a `div`'s contents
 * into its accessible name (plan 806).
 */
export const MessageAttachments = ({
  attachments,
  label = "Attachments",
  style,
  "aria-label": authoredName,
  ...rest
}: MessageAttachmentsProps) => {
  const theme = useTheme();
  const { variant } = useMessage();
  if (attachments.length === 0) return null;
  const name = controlNameFrom(authoredName, [label]);

  return (
    <div
      {...rest}
      role="list"
      {...(name === undefined ? {} : { "aria-label": name })}
      style={mergeStyles(
        { ...block(theme, variant), flexDirection: "row", flexWrap: "wrap" },
        style,
      )}
    >
      {attachments.map((attachment) => {
        const rowName = Option.getOrUndefined(
          composedName(undefined, [attachment.name, attachment.meta ?? ""]),
        );
        return (
          <div
            key={attachment.name}
            role="listitem"
            {...(rowName === undefined ? {} : { "aria-label": rowName })}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.xs,
              paddingLeft: theme.spacing.sm,
              paddingRight: theme.spacing.sm,
              paddingTop: theme.spacing["2xs"],
              paddingBottom: theme.spacing["2xs"],
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.muted,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.foreground,
              }}
            >
              {attachment.name}
            </text>
            {attachment.meta === undefined ? null : (
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {attachment.meta}
              </text>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** {@link MessageActions} props. */
export interface MessageActionsProps extends Omit<Props, "children"> {
  /** The controls the consumer wires: copy, retry, feedback. */
  readonly children?: ReactNode;
}

/** The action row. Renders nothing until the consumer supplies actions. */
export const MessageActions = ({
  children,
  style,
  ...rest
}: MessageActionsProps) => {
  const theme = useTheme();
  const { variant } = useMessage();
  if (children === undefined) return null;

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          ...block(theme, variant),
          flexDirection: "row",
          gap: theme.spacing.xs,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** Every part, so a misplaced sibling is named by the root. */
const messageParts: ReadonlyArray<PartComponent> = [
  Message,
  MessageAvatar,
  MessageContent,
  MessageStreaming,
  MessageReasoning,
  MessageToolCalls,
  MessageSources,
  MessageAttachments,
  MessageActions,
];

const messageRoot: PartsContract = {
  parent: "Message",
  family: messageParts,
  accepts: messageParts.filter((part) => part !== Message),
  hint: "Place the part directly inside Message.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const messageMeta = {
  name: "Message (AI message row)",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "no aria-labelledby/aria-describedby in 0.10.0: the row is named by its variant",
    "sources and markdown links report a URL; the caller opens it because there is no href element",
    "no aria-live: a streaming status line is not announced",
  ],
  docs: "docs/message.mdx",
  example: "examples/message.example.tsx",
  testFile: "src/behaviour/message.test.tsx",
} as const;
