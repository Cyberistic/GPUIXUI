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
