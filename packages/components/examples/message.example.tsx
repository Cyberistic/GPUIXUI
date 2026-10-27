/** @jsxImportSource @gpuix/react */
/**
 * Message example: the four slots a reply can carry, in one transcript.
 *
 * A user row, an assistant reply with collapsed reasoning, two tool calls (one
 * still running, one failed), citations, a streaming marker and — only because
 * this example wires them — the copy, retry and feedback actions. Actions with
 * no handler render nothing, which the last row proves.
 */

import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  Message,
  MessageActions,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "../src/message.js";
import { Bubble, BubbleContent } from "../src/bubble.js";

/** A transcript with every slot, and one row left bare. */
export const MessageExample = () => {
  const theme = useTheme();
  const [streaming, setStreaming] = useState(true);
  const [copied, setCopied] = useState("");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        width: 560,
      }}
    >
      <Message
        testId="message-user"
        variant="user"
        timestamp="09:41"
        meta={<text>delivered</text>}
      >
        <MessageAvatar />
        <MessageContent testId="message-user-body">
          <MessageHeader />
          <Bubble align="end" variant="muted">
            <BubbleContent>
              <text>Summarise the release and call the deploy tool.</text>
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>

      <Message testId="message-assistant" variant="assistant" timestamp="09:42">
        <MessageAvatar />
        <MessageContent
          testId="message-assistant-body"
          reasoning="The release notes list three fixes; the deploy tool needs the staging target."
          toolCalls={[
            { name: "read_file", status: "complete", result: "CHANGELOG.md" },
            { name: "deploy", status: "running" },
          ]}
          sources={[
            { label: "CHANGELOG.md", href: "file:///repo/CHANGELOG.md" },
            { label: "Release checklist" },
          ]}
          streaming={streaming}
        >
          <MessageHeader />
          <Bubble>
            <BubbleContent>
              <text>
                Three fixes landed: the overlay order, the focused-row anchor
                and the disabled label.
              </text>
            </BubbleContent>
          </Bubble>
          <MessageFooter>
            <MessageActions
              testId="message-actions"
              onCopy={() => setCopied("Copied the reply")}
              onRetry={() => setStreaming(true)}
              onFeedback={(feedback) => setCopied(`Feedback: ${feedback}`)}
            />
          </MessageFooter>
        </MessageContent>
      </Message>

      <Message testId="message-tool" variant="assistant">
        <MessageAvatar />
        <MessageContent
          testId="message-tool-body"
          toolCalls={[
            {
              name: "deploy",
              status: "error",
              result: "No credentials for staging.",
            },
          ]}
        >
          <MessageHeader />
          <Bubble>
            <BubbleContent>
              <text>
                The deploy failed and needs a token before it can retry.
              </text>
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.sm,
          alignItems: "center",
        }}
      >
        <Button size="sm" onClick={() => setStreaming(!streaming)}>
          {streaming ? "Finish the stream" : "Stream again"}
        </Button>
        <text
          testId="message-readout"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {copied === "" ? "No action yet." : copied}
        </text>
      </div>
    </div>
  );
};
