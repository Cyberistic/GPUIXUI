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

export const revealed = (text: string, words: number): string => {
  const all = text.split(" ");
  return words >= all.length
    ? text
    : all.slice(0, Math.max(0, words)).join(" ");
};

export const wordCount = (text: string): number => text.split(" ").length;
