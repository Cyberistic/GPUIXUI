import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { operator, OPEN, CLOSE, type InputToken } from "./input/token.js";
import type { MathNode } from "./layout.js";

const text = (value: string): MathNode => ({ kind: "text", text: value });
const caret: MathNode = { kind: "caret" };

export const fractionTemplate: ReadonlyArray<InputToken> = [
  OPEN,
  CLOSE,
  operator("÷"),
  OPEN,
  CLOSE,
];

export const FRACTION_CURSOR = 1;

const matchingClose = (
  tokens: ReadonlyArray<InputToken>,
  open: number,
): Option.Option<number> => {
  const walk = (index: number, depth: number): Option.Option<number> => {
    if (index >= tokens.length) return Option.none();
    if (tokens[index]?.id === "(") return walk(index + 1, depth + 1);
    if (tokens[index]?.id === ")") {
      return depth === 0 ? Option.some(index) : walk(index + 1, depth - 1);
    }
    return walk(index + 1, depth);
  };
  return walk(open + 1, 0);
};

const isFractionStart = (
  tokens: ReadonlyArray<InputToken>,
  index: number,
): Option.Option<{ readonly close: number; readonly end: number }> => {
  if (tokens[index]?.id !== "(") return Option.none();
  return Option.flatMap(matchingClose(tokens, index), (close) => {
    if (tokens[close + 1]?.id !== "÷" || tokens[close + 2]?.id !== "(") {
      return Option.none();
    }
    return Option.map(matchingClose(tokens, close + 2), (end) => ({
      close,
      end,
    }));
  });
};

interface Build {
  readonly node: MathNode;
  readonly placed: boolean;
}

const buildRow = (
  tokens: ReadonlyArray<InputToken>,
  start: number,
  end: number,
  cursor: number,
): Build => {
  const items: MathNode[] = [];
  let placed = false;
  const addCaret = (): void => {
    if (!placed && cursor >= start && cursor <= end) {
      items.push(caret);
      placed = true;
    }
  };
  const walk = (index: number): void => {
    if (index >= end) return;
    if (!placed && cursor === index) {
      items.push(caret);
      placed = true;
    }
    const token = tokens[index];
    if (token === undefined) return;
    if (token.id === "√" || token.id === "∛") {
      const close = matchingClose(tokens, index);
      const contentEnd = Option.getOrElse(close, () => end);
      const inner = buildRow(
        tokens,
        index + 1,
        contentEnd,
        cursor >= index + 1 && cursor <= contentEnd
          ? cursor
          : cursor === index
            ? index + 1
            : -1,
      );
      if (cursor >= index + 1 && cursor <= contentEnd) placed = true;
      items.push({
        kind: "radical",
        radicand: inner.node,
      });
      walk(Math.min(contentEnd + 1, end));
      return;
    }
    const fraction = isFractionStart(tokens, index);
    if (Option.isSome(fraction)) {
      const { close, end: fractionEnd } = fraction.value;
      const numerator = buildRow(
        tokens,
        index + 1,
        close,
        cursor <= close ? Math.max(index + 1, cursor) : -1,
      );
      const denominatorStart = close + 3;
      const denominator = buildRow(
        tokens,
        denominatorStart,
        fractionEnd,
        cursor >= close + 1 ? Math.max(denominatorStart, cursor) : -1,
      );
      if (cursor >= index && cursor <= fractionEnd) placed = true;
      items.push({
        kind: "fraction",
        numerator: numerator.node,
        denominator: denominator.node,
      });
      walk(Math.min(fractionEnd + 1, end));
      return;
    }
    items.push(text(token.text));
    walk(index + 1);
  };
  walk(start);
  addCaret();
  return { node: { kind: "row", items, align: "baseline" }, placed };
};

const withPowers = (
  items: ReadonlyArray<MathNode>,
): ReadonlyArray<MathNode> => {
  const walk = (
    index: number,
    held: ReadonlyArray<MathNode>,
  ): ReadonlyArray<MathNode> => {
    if (index >= items.length) return held;
    const current = items[index];
    const next = items[index + 1];
    if (
      current?.kind === "text" &&
      current.text === "^" &&
      next !== undefined &&
      held.length > 0
    ) {
      const base = held[held.length - 1];
      if (base !== undefined) {
        return walk(index + 2, [
          ...held.slice(0, -1),
          { kind: "script", base, script: next, position: "super" },
        ]);
      }
    }
    return walk(index + 1, current === undefined ? held : [...held, current]);
  };
  return walk(0, []);
};

export const inputLayoutOf = (
  tokens: ReadonlyArray<InputToken>,
  cursor: number,
): MathNode => {
  const built = buildRow(tokens, 0, tokens.length, cursor);
  if (built.node.kind !== "row") return built.node;
  return { ...built.node, items: withPowers(built.node.items) };
};

export const moveInInput = (
  tokens: ReadonlyArray<InputToken>,
  cursor: number,
  direction: -1 | 1,
): number => {
  if (direction === 1) {
    if (
      tokens[cursor]?.id === ")" &&
      tokens[cursor + 1]?.id === "÷" &&
      tokens[cursor + 2]?.id === "("
    ) {
      return Math.min(tokens.length, cursor + 3);
    }
    return Math.min(tokens.length, cursor + 1);
  }
  if (
    tokens[cursor - 1]?.id === "(" &&
    tokens[cursor - 2]?.id === "÷" &&
    tokens[cursor - 3]?.id === ")"
  ) {
    return Math.max(0, cursor - 3);
  }
  return Math.max(0, cursor - 1);
};

export const templateText = (tokens: ReadonlyArray<InputToken>): string =>
  Arr.join(
    Arr.map(tokens, (token) => token.text),
    "",
  );
