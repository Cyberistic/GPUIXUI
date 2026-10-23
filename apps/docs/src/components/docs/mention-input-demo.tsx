/**
 * Browser preview for the Mention input page.
 *
 * The shipped field derives its query from the text — the last `@` that starts
 * the text or follows whitespace, with nothing after it — because 0.11.0
 * exposes no caret position. Candidates are the consumer's; the list ranks them
 * prefix-first and the item inserts `@value `. The preview reproduces that rule
 * so a typed `@` opens the ranked surface and a press completes the token.
 */

import { useState } from "react";

const people = ["ada", "grace", "katherine", "alan"] as const;

function queryOf(text: string): { start: number; query: string } | undefined {
  const at = text.lastIndexOf("@");
  if (at < 0) return undefined;
  const before = at === 0 ? "" : text.slice(at - 1, at);
  const query = text.slice(at + 1);
  if (before !== "" && before !== " " && before !== "\n") return undefined;
  if (query.includes(" ") || query.includes("\n")) return undefined;
  return { start: at, query };
}

function rank(
  values: ReadonlyArray<string>,
  query: string,
  maxVisible: number,
): ReadonlyArray<string> {
  const needle = query.toLowerCase();
  const matches = values.filter((value) =>
    value.toLowerCase().includes(needle),
  );
  const prefixes = matches.filter((value) =>
    value.toLowerCase().startsWith(needle),
  );
  const rest = matches.filter(
    (value) => !value.toLowerCase().startsWith(needle),
  );
  return [...prefixes, ...rest].slice(0, Math.max(0, maxVisible));
}

export function MentionInputDemo() {
  const [text, setText] = useState("Ship it with ");
  const [dismissed, setDismissed] = useState(false);
  const query = queryOf(text);
  const open = !dismissed && query !== undefined;
  const ranked =
    open && query !== undefined ? rank(people, query.query, 6) : [];

  const complete = (value: string): void => {
    if (query === undefined) return;
    setText(`${text.slice(0, query.start)}@${value} `);
    setDismissed(false);
  };

  return (
    <div className="gx-mention">
      <div className="gx-mention-card">
        <p className="gx-mention-title">Comment</p>
        <div className="gx-mention-field">
          <input
            aria-label="Comment"
            className="gx-mention-input"
            onChange={(event) => {
              setText(event.currentTarget.value);
              setDismissed(false);
            }}
            placeholder="Mention someone with @"
            value={text}
          />
        </div>
        {open && ranked.length > 0 ? (
          <div className="gx-mention-list" aria-label="Mentions" role="group">
            {ranked.map((value, index) => (
              <button
                aria-selected={index === 0}
                className="gx-mention-item"
                data-highlighted={index === 0 ? "" : undefined}
                key={value}
                onClick={() => complete(value)}
                type="button"
              >
                @{value}
              </button>
            ))}
          </div>
        ) : null}
        <p className="gx-mention-readout">
          {query === undefined ? "no open token" : `query: "${query.query}"`}
        </p>
      </div>
      <p className="gx-mention-note">
        The query comes from the text, not the caret; a space typed while the
        list is open is consumed by the runtime. Press a row to insert{" "}
        <code>@name </code>.
      </p>
    </div>
  );
}

export const mentionInputDemoSource = `import { useState } from "react";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "@gpuixui/components";

const people = ["ada", "grace", "katherine", "alan"];

export const CommentField = () => {
  const [comment, setComment] = useState("");

  return (
    <MentionInput
      label="Comment"
      value={comment}
      onValueChange={setComment}
      onMention={(name) => notify(name)}
    >
      <MentionInputList>
        {people.map((person) => (
          <MentionInputItem key={person} value={person} />
        ))}
      </MentionInputList>
    </MentionInput>
  );
};`;
