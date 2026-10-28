/**
 * Browser preview for the Bubble page — the conversation shadcn's demo draws.
 *
 * The shipped bubble is a GPUix host element, so the page mirrors its geometry
 * with HTML: the reader's surface is the primary fill on the end edge, the
 * agent's bubbles are muted on the start edge, a grouped run joins its inner
 * corners, and a reaction pill crosses the surface's bottom edge by a quarter of
 * its height (the native part's hang). Hover a bubble to reveal its reserved
 * action strip. The variants the conversation does not wear sit in the smaller
 * row beneath it.
 */

import { useState } from "react";

/** One bubble inside a turn. */
interface Part {
  readonly body: string;
  readonly reactions?: string;
  readonly actions?: boolean;
}

/** One sender's turn: one bubble, or a grouped run of them. */
interface Turn {
  readonly align: "start" | "end";
  readonly variant:
    | "default"
    | "secondary"
    | "muted"
    | "tinted"
    | "outline"
    | "ghost"
    | "destructive";
  readonly parts: ReadonlyArray<Part>;
}

const conversation: ReadonlyArray<Turn> = [
  {
    align: "end",
    variant: "default",
    parts: [{ body: "Hey there! what's up?" }],
  },
  {
    align: "start",
    variant: "muted",
    parts: [
      { body: "Hey! Want to see chat bubbles?" },
      {
        body: "I can group messages, switch sides, and keep the whole thread easy to scan.",
        reactions: "👍",
      },
    ],
  },
  {
    align: "end",
    variant: "default",
    parts: [{ body: "Sure. Hit me with your best demo." }],
  },
  {
    align: "start",
    variant: "muted",
    parts: [
      {
        body: "Yes. You are reading a demo that is demoing itself. Very meta. Very on-brand.",
        reactions: "👍🔥👀+2",
        actions: true,
      },
    ],
  },
];

/** The surfaces the conversation does not paint, as chips. */
const otherVariants = [
  "secondary",
  "tinted",
  "outline",
  "destructive",
  "ghost",
] as const;

export function BubbleDemo() {
  const [acted, setActed] = useState("No action yet.");

  return (
    <div className="gx-bubble-scene">
      <div className="gx-bubble-thread" aria-label="Conversation">
        {conversation.map((turn) => (
          <div
            className="gx-bubble-group"
            data-align={turn.align}
            key={turn.parts[0]?.body}
          >
            {turn.parts.map((part, index) => (
              <div
                className="gx-bubble"
                data-align={turn.align}
                data-group={
                  turn.parts.length === 1
                    ? undefined
                    : index === 0
                      ? "first"
                      : index === turn.parts.length - 1
                        ? "last"
                        : "middle"
                }
                key={part.body}
              >
                <p className="gx-bubble-surface" data-variant={turn.variant}>
                  {part.body}
                </p>
                {part.reactions === undefined ? null : (
                  <div
                    aria-label={`Reaction: ${part.reactions}`}
                    className="gx-bubble-reactions"
                    role="img"
                  >
                    {part.reactions}
                  </div>
                )}
                {part.actions ? (
                  <div
                    aria-label="Message actions"
                    className="gx-bubble-actions"
                    role="group"
                  >
                    <button
                      className="gx-btn gx-btn-ghost gx-btn-sm"
                      onClick={() => setActed("Copied the grouped bubble.")}
                      type="button"
                    >
                      Copy
                    </button>
                    <button
                      className="gx-btn gx-btn-ghost gx-btn-sm"
                      onClick={() => setActed("Asked for another reply.")}
                      type="button"
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div aria-label="Other bubble variants" className="gx-bubble-variants">
        {otherVariants.map((variant) => (
          <span
            className="gx-bubble-surface gx-bubble-chip"
            data-variant={variant}
            key={variant}
          >
            {variant}
          </span>
        ))}
      </div>

      <p className="gx-bubble-note" role="status">
        {acted}
      </p>
    </div>
  );
}

export const bubbleDemoSource = `import {
  Bubble,
  BubbleAction,
  BubbleActions,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@gpuixui/components";

export const Thread = ({ turns, copy, retry }) => (
  <>
    {turns.map((turn) =>
      turn.role === "reader" ? (
        <Bubble key={turn.id} align="end">
          <BubbleContent>{turn.body}</BubbleContent>
        </Bubble>
      ) : (
        <BubbleGroup key={turn.id}>
          <Bubble group="first" variant="muted">
            <BubbleContent>{turn.first}</BubbleContent>
            <BubbleActions label="Message actions">
              <BubbleAction label="Copy" onClick={copy} />
              <BubbleAction label="Retry" onClick={retry} />
            </BubbleActions>
          </Bubble>
          <Bubble group="last" variant="muted">
            <BubbleContent>{turn.last}</BubbleContent>
            <BubbleReactions label="Reaction: thumbs up">👍</BubbleReactions>
          </Bubble>
        </BubbleGroup>
      ),
    )}
  </>
);`;
