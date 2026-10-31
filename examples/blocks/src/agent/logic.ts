/**
 * The agent block's rule: sending a prompt appends the reader's turn and the
 * agent's acknowledgement. A blank prompt sends nothing.
 */

import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { Turn } from "./data.js";

export const send = (
  turns: ReadonlyArray<Turn>,
  prompt: string,
): ReadonlyArray<Turn> => {
  const text = Str.trim(prompt);
  if (text === "") return turns;
  const n = turns.length;
  return Arr.appendAll(turns, [
    { id: `t${n + 1}`, from: "you", text },
    {
      id: `t${n + 2}`,
      from: "agent",
      text: `On it — reading the files for “${text}”.`,
    },
  ]);
};

/** The first `words` words of a reply as it streams; all of it at the end. */
export const revealed = (text: string, words: number): string => {
  const all = text.split(" ");
  return words >= all.length
    ? text
    : all.slice(0, Math.max(0, words)).join(" ");
};

/** How many words a reply streams in. */
export const wordCount = (text: string): number => text.split(" ").length;
