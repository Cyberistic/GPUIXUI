import { useMemo, useRef, useState } from "react";

export interface MentionPerson {
  readonly name: string;
  readonly handle: string;
  readonly role: string;
}

export const MENTION_PEOPLE: ReadonlyArray<MentionPerson> = [
  { name: "Ada Lovelace", handle: "ada", role: "Design systems" },
  { name: "Grace Hopper", handle: "grace", role: "Platform" },
  { name: "Katherine Johnson", handle: "katherine", role: "Research" },
  { name: "Alan Turing", handle: "alan", role: "Compute" },
];

export type MentionRun =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "mention";
      readonly handle: string;
      readonly name: string;
    };

export interface OpenToken {
  readonly start: number;
  readonly query: string;
}

export const openToken = (text: string): OpenToken | undefined => {
  const at = text.lastIndexOf("@");
  if (at < 0) return undefined;
  const before = at === 0 ? "" : text.slice(at - 1, at);
  const query = text.slice(at + 1);
  if (before !== "" && before !== " " && before !== "\n") return undefined;
  if (query.includes(" ") || query.includes("\n")) return undefined;
  return { start: at, query };
};

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

export const completeWith = (person: MentionPerson): string =>
  `@${person.handle} `;

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter((part) => part !== "")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

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
          {}
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
            {}
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
