/**
 * Browser preview for the Mention input page.
 *
 * The shipped field derives its query from the text — the last `@` that starts
 * the text or follows whitespace, with nothing after it — because 0.11.0
 * exposes no caret position. Candidates are the consumer's; the list ranks them
 * prefix-first and the item inserts `@value `.
 *
 * ## Why the field is a painted mirror
 *
 * A mention has to read as a link *inside the field*, and an `<input>` or
 * `<textarea>` paints one colour for its whole value: there is no way to style
 * the Nth character. So the composer is two layers that share one type scale:
 * a `div` that paints the runs, and the real `textarea` above it with
 * transparent ink and a visible caret. The reader types into the real field;
 * the colour they see is the mirror. The runtime has the same limit, which is
 * why the component reports the mention rather than painting it.
 *
 * The box below the field is the component's own surface: a popover recipe with
 * an avatar, the name, the handle and the role, the matched run in the accent
 * role, an empty state when nothing matches, and the keys the row answers to.
 */

import { useMemo, useRef, useState } from "react";

/** One candidate: the person, their handle and what they do. */
export interface MentionPerson {
  readonly name: string;
  readonly handle: string;
  readonly role: string;
}

/** The names the caller offers, as a real candidate list would. */
export const MENTION_PEOPLE: ReadonlyArray<MentionPerson> = [
  { name: "Ada Lovelace", handle: "ada", role: "Design systems" },
  { name: "Grace Hopper", handle: "grace", role: "Platform" },
  { name: "Katherine Johnson", handle: "katherine", role: "Research" },
  { name: "Alan Turing", handle: "alan", role: "Compute" },
];

/** A run of the field: plain text, or a mention that reads as a link. */
export type MentionRun =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "mention";
      readonly handle: string;
      readonly name: string;
    };

/** The active token: the index of its `@` and the text typed after it. */
export interface OpenToken {
  readonly start: number;
  readonly query: string;
}

/**
 * The last `@` token, when one is open.
 *
 * The rule is the component's `mentionQuery`: the last `@` that starts the text
 * or follows whitespace, with no whitespace after it. It is correct while
 * typing at the end, which is the limitation the page names.
 */
export const openToken = (text: string): OpenToken | undefined => {
  const at = text.lastIndexOf("@");
  if (at < 0) return undefined;
  const before = at === 0 ? "" : text.slice(at - 1, at);
  const query = text.slice(at + 1);
  if (before !== "" && before !== " " && before !== "\n") return undefined;
  if (query.includes(" ") || query.includes("\n")) return undefined;
  return { start: at, query };
};

/** Rank candidates: prefix matches first, then substrings, each in turn. */
export const rankPeople = (
  people: ReadonlyArray<MentionPerson>,
  query: string,
): ReadonlyArray<MentionPerson> => {
  const needle = query.toLowerCase();
  const matches = people.filter(
    (person) =>
      person.name.toLowerCase().includes(needle) ||
      person.handle.toLowerCase().includes(needle),
  );
  const prefixes = matches.filter(
    (person) =>
      person.name.toLowerCase().startsWith(needle) ||
      person.handle.toLowerCase().startsWith(needle),
  );
  const rest = matches.filter((person) => !prefixes.includes(person));
  return [...prefixes, ...rest];
};

/**
 * The runs a committed field paints.
 *
 * A mention is a `@handle` that names someone in the candidate list; anything
 * else is text. An unknown `@name` stays text, because a link that points at
 * nobody is not a link.
 *
 * The handle's grammar stops before a trailing full stop: `@ada.` ends a
 * sentence, and a rule that swallowed the dot would name the handle `ada.`
 * and paint a mention as plain text.
 */
export const mentionRuns = (
  text: string,
  people: ReadonlyArray<MentionPerson>,
): ReadonlyArray<MentionRun> =>
  text
    .split(/(@[a-z0-9._-]*[a-z0-9_-])/gi)
    .filter((part) => part !== "")
    .map((part) => {
      const handle = part.startsWith("@") ? part.slice(1) : undefined;
      const person =
        handle === undefined
          ? undefined
          : people.find(
              (candidate) =>
                candidate.handle.toLowerCase() === handle.toLowerCase(),
            );
      return person === undefined
        ? { kind: "text" as const, text: part }
        : {
            kind: "mention" as const,
            handle: person.handle,
            name: person.name,
          };
    });

/** The handle a mention inserts, and the space the field adds after it. */
export const completeWith = (person: MentionPerson): string =>
  `@${person.handle} `;

/** The initials a disc paints. */
export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter((part) => part !== "")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

/**
 * The halves of a label around the matched run, so the match can be painted in
 * the accent role without a second copy of the string.
 */
export const matchParts = (
  label: string,
  query: string,
): {
  readonly before: string;
  readonly match: string;
  readonly after: string;
} => {
  const at =
    query === "" ? -1 : label.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return { before: label, match: "", after: "" };
  return {
    before: label.slice(0, at),
    match: label.slice(at, at + query.length),
    after: label.slice(at + query.length),
  };
};

const KEYS = "↑↓ to move · ↵ to insert · esc to dismiss";

export function MentionInputDemo() {
  const [text, setText] = useState("Ship it with @katherine ");
  const [dismissed, setDismissed] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const field = useRef<HTMLTextAreaElement | null>(null);

  const token = openToken(text);
  const open = !dismissed && token !== undefined;
  const ranked = useMemo(
    () =>
      open && token !== undefined
        ? rankPeople(MENTION_PEOPLE, token.query)
        : [],
    [open, token],
  );
  const active =
    ranked.length === 0
      ? 0
      : ((highlighted % ranked.length) + ranked.length) % ranked.length;
  const runs = mentionRuns(text, MENTION_PEOPLE);
  const query = token?.query ?? "";

  const complete = (person: MentionPerson): void => {
    if (token === undefined) return;
    setText(`${text.slice(0, token.start)}${completeWith(person)}`);
    setDismissed(false);
    setHighlighted(0);
    field.current?.focus();
  };

  return (
    <div className="gx-mention">
      <div className="gx-mention-card">
        <div className="gx-mention-head">
          <p className="gx-mention-title">Comment</p>
          <p className="gx-mention-hint">{`${runs.filter((run) => run.kind === "mention").length} mentioned`}</p>
        </div>

        <div className="gx-mention-composer">
          {/* The painted layer: the reader sees these runs, the field below
              owns the caret and the keys. Both are the same box, font and
              leading, so a run cannot slide against the text it mirrors. */}
          <div aria-hidden="true" className="gx-mention-mirror">
            {runs.map((run, index) =>
              run.kind === "mention" ? (
                <a
                  className="gx-mention-run"
                  href={`#${run.handle}`}
                  key={index}
                  onClick={(event) => event.preventDefault()}
                  tabIndex={-1}
                  title={run.name}
                >
                  {`@${run.handle}`}
                </a>
              ) : (
                <span key={index}>{run.text}</span>
              ),
            )}
            {/* A trailing space keeps the mirror's last line measurable. */}
            {"\u200b"}
          </div>
          <textarea
            aria-autocomplete="list"
            aria-expanded={open}
            aria-label="Comment"
            className="gx-mention-input"
            onChange={(event) => {
              setText(event.currentTarget.value);
              setDismissed(false);
              setHighlighted(0);
            }}
            onKeyDown={(event) => {
              if (!open || ranked.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlighted(active + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlighted(active - 1);
              } else if (event.key === "Enter") {
                event.preventDefault();
                const person = ranked[active];
                if (person !== undefined) complete(person);
              } else if (event.key === "Escape") {
                setDismissed(true);
              }
            }}
            placeholder="Mention someone with @"
            ref={field}
            rows={2}
            spellCheck={false}
            value={text}
          />
        </div>

        {open && token !== undefined ? (
          <div aria-label="Mentions" className="gx-mention-list" role="listbox">
            {ranked.length === 0 ? (
              <p className="gx-mention-empty" role="status">
                {`No one matches “${query}”.`}
              </p>
            ) : (
              ranked.map((person, index) => {
                const name = matchParts(person.name, query);
                const handle = matchParts(person.handle, query);
                return (
                  <button
                    aria-selected={index === active}
                    className="gx-mention-item"
                    data-highlighted={index === active ? "" : undefined}
                    key={person.handle}
                    onClick={() => complete(person)}
                    /* A press must not blur the field: the token is still open
                       when the row reads it. */
                    onMouseDown={(event) => event.preventDefault()}
                    role="option"
                    type="button"
                  >
                    <span aria-hidden="true" className="gx-mention-disc">
                      {initialsOf(person.name)}
                    </span>
                    <span className="gx-mention-identity">
                      <span className="gx-mention-name">
                        {name.before}
                        <mark>{name.match}</mark>
                        {name.after}
                      </span>
                      <span className="gx-mention-handle">
                        @{handle.before}
                        <mark>{handle.match}</mark>
                        {handle.after}
                        <span className="gx-mention-sep"> · </span>
                        {person.role}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
            {ranked.length > 0 ? (
              <p className="gx-mention-keys">{KEYS}</p>
            ) : null}
          </div>
        ) : null}

        <div className="gx-mention-foot">
          <p className="gx-mention-readout">
            {token === undefined
              ? "Type @ to mention someone."
              : `Matching “${token.query}” against ${MENTION_PEOPLE.length} people.`}
          </p>
          <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}

export const mentionInputDemoSource = `import { useState } from "react";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "@gpuixui/components";

const people = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
];

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
          <MentionInputItem
            key={person.value}
            value={person.value}
            label={person.label}
          />
        ))}
      </MentionInputList>
    </MentionInput>
  );
};`;
