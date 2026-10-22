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
  MessageActions,
  MessageAvatar,
  MessageContent,
  MessageRoot,
} from "../src/message.js";

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
      <MessageRoot testId="message-user" variant="user">
        <MessageAvatar />
        <MessageContent testId="message-user-body">
          <text>Summarise the release and call the deploy tool.</text>
        </MessageContent>
      </MessageRoot>

      <MessageRoot testId="message-assistant" variant="assistant">
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
          <text>
            Three fixes landed: the overlay order, the focused-row anchor and
            the disabled label.
          </text>
          <MessageActions
            testId="message-actions"
            onCopy={() => setCopied("Copied the reply")}
            onRetry={() => setStreaming(true)}
            onFeedback={(feedback) => setCopied(`Feedback: ${feedback}`)}
          />
        </MessageContent>
      </MessageRoot>

      <MessageRoot testId="message-tool" variant="assistant">
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
          <text>The deploy failed and needs a token before it can retry.</text>
        </MessageContent>
      </MessageRoot>

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
