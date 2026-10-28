/** @jsxImportSource @gpuix/react */
/**
 * Bubble example: the seven surfaces, a grouped run, an avatar slot, a reaction
 * pill on the surface's edge and a hover action strip.
 *
 * Hover a bubble to reveal its actions; the strip is laid out all along, so it
 * fades in without moving anything. The grouped run tightens its gap and each
 * bubble squares the edge it joins.
 */

import { useState } from "react";
import { Avatar } from "../src/avatar.js";
import {
  Bubble,
  BubbleAction,
  BubbleActions,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "../src/bubble.js";
import { useTheme } from "../src/internal/theme.js";

/** One surface, named by its variant. */
const surfaces = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const;

/** A bubble field with the seven surfaces and one grouped run. */
export const BubbleExample = () => {
  const theme = useTheme();
  const [copied, setCopied] = useState("No action yet.");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        width: 560,
      }}
    >
      {surfaces.map((variant) => (
        <Bubble
          key={variant}
          testId={`bubble-${variant}`}
          variant={variant}
          align={variant === "default" ? "end" : "start"}
          avatar={
            variant === "muted" ? (
              <Avatar name="Ada Lovelace" size="sm" />
            ) : undefined
          }
        >
          <BubbleContent testId={`bubble-${variant}-content`}>
            <text>{variant}</text>
          </BubbleContent>
          {variant === "muted" ? (
            <>
              <BubbleReactions label="Reactions: thumbs up and fire">
                <text>👍</text>
                <text>🔥</text>
              </BubbleReactions>
              <BubbleActions label="Reply actions">
                <BubbleAction
                  label="Copy"
                  onClick={() => setCopied("Copied the grouped bubble")}
                />
                <BubbleAction
                  label="Retry"
                  onClick={() => setCopied("Asked for another reply")}
                />
              </BubbleActions>
            </>
          ) : null}
        </Bubble>
      ))}

      <BubbleGroup gap={theme.spacing.xs} testId="bubble-run">
        <Bubble testId="bubble-run-first" group="first">
          <BubbleContent testId="bubble-run-first-content">
            <text>The release is green.</text>
          </BubbleContent>
        </Bubble>
        <Bubble testId="bubble-run-middle" group="middle">
          <BubbleContent testId="bubble-run-middle-content">
            <text>Three fixes landed.</text>
          </BubbleContent>
        </Bubble>
        <Bubble testId="bubble-run-last" group="last">
          <BubbleContent testId="bubble-run-last-content">
            <text>Roll it out.</text>
          </BubbleContent>
        </Bubble>
      </BubbleGroup>

      <text testId="bubble-readout">{copied}</text>
    </div>
  );
};
