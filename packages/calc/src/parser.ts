import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { fraction } from "mathjs";
import { failure, type CalculatorFailure } from "./failure.js";
import type { InputToken } from "./input/token.js";
import { startsOperand } from "./input/token.js";

export type Expr =
  | {
      readonly _tag: "number";

      readonly text: string;
      readonly value: number;
      readonly exact: Option.Option<ReturnType<typeof fraction>>;
    }
  | { readonly _tag: "constant"; readonly name: string }
  | { readonly _tag: "variable"; readonly name: string }
  | {
      readonly _tag: "binary";
      readonly op: string;
      readonly left: Expr;
      readonly right: Expr;
    }
  | { readonly _tag: "unary"; readonly op: "-" | "+"; readonly value: Expr }
  | { readonly _tag: "percent"; readonly value: Expr }
  | { readonly _tag: "postfix"; readonly op: string; readonly value: Expr }
  | {
      readonly _tag: "call";
      readonly name: string;
      readonly args: ReadonlyArray<Expr>;
    }
  | { readonly _tag: "sequence"; readonly items: ReadonlyArray<Expr> }
  | {
      readonly _tag: "format";
      readonly value: Expr;
      readonly format: "rect" | "polar";
    }
  | {
      readonly _tag: "sexagesimal";
      readonly degrees: Expr;
      readonly minutes: Option.Option<Expr>;
      readonly seconds: Option.Option<Expr>;
    }
  | { readonly _tag: "baseTag"; readonly value: Expr; readonly base: number };

type Parsed = { readonly _tag: "ok"; readonly expr: Expr } | CalculatorFailure;

const ok = (expr: Expr): Parsed => ({ _tag: "ok", expr });

const integer = (value: number): Expr => ({
  _tag: "number",
  text: String(value),
  value,
  exact: Option.some(fraction(value)),
});

const MAX_DEPTH = 100;

class Stream {
  readonly tokens: ReadonlyArray<InputToken>;
  index = 0;

  constructor(tokens: ReadonlyArray<InputToken>) {
    this.tokens = tokens;
  }

  at(offset = 0): Option.Option<InputToken> {
    return Option.fromUndefinedOr(this.tokens[this.index + offset]);
  }

  is(id: string, offset = 0): boolean {
    return Option.exists(this.at(offset), (held) => held.id === id);
  }

  take(): Option.Option<InputToken> {
    const held = this.at();
    if (Option.isSome(held)) this.index += 1;
    return held;
  }

  takeIf(id: string): boolean {
    if (!this.is(id)) return false;
    this.index += 1;
    return true;
  }

  digitAt(offset = 0): boolean {
    return Option.exists(this.at(offset), (held) => held.kind === "digit");
  }
}

const syntax = (stream: Stream): CalculatorFailure =>
  failure("Syntax", undefined, stream.index);

const parseSequence = (stream: Stream, depth: number): Parsed => {
  const first = parseRelation(stream, depth);
  if (first._tag !== "ok") return first;
  return sequenceTail(stream, [first.expr], depth);
};

const sequenceTail = (
  stream: Stream,
  items: ReadonlyArray<Expr>,
  depth: number,
): Parsed => {
  if (!stream.takeIf(":")) return ok({ _tag: "sequence", items });
  const next = parseRelation(stream, depth);
  if (next._tag !== "ok") return next;
  return sequenceTail(stream, Arr.append(items, next.expr), depth);
};

const parseRelation = (stream: Stream, depth: number): Parsed => {
  const left = parseOr(stream, depth);
  if (left._tag !== "ok") return left;
  if (!stream.takeIf("=")) return left;
  const right = parseOr(stream, depth);
  if (right._tag !== "ok") return right;
  return ok({ _tag: "binary", op: "=", left: left.expr, right: right.expr });
};

const parseOr = (stream: Stream, depth: number): Parsed => {
  const left = parseAnd(stream, depth);
  if (left._tag !== "ok") return left;
  return orTail(stream, left.expr, depth);
};

const orTail = (stream: Stream, left: Expr, depth: number): Parsed =>
  Option.match(
    Option.filter(
      stream.at(),
      (held) => held.id === "or" || held.id === "xor" || held.id === "xnor",
    ),
    {
      onNone: () => ok(left),
      onSome: (held) => {
        stream.take();
        const right = parseAnd(stream, depth);
        if (right._tag !== "ok") return right;
        return orTail(
          stream,
          { _tag: "binary", op: held.id, left, right: right.expr },
          depth,
        );
      },
    },
  );

const parseAnd = (stream: Stream, depth: number): Parsed => {
  const left = parseAdditive(stream, depth);
  if (left._tag !== "ok") return left;
  return andTail(stream, left.expr, depth);
};

const andTail = (stream: Stream, left: Expr, depth: number): Parsed => {
  if (!stream.takeIf("and")) return ok(left);
  const right = parseAdditive(stream, depth);
  if (right._tag !== "ok") return right;
  return andTail(
    stream,
    { _tag: "binary", op: "and", left, right: right.expr },
    depth,
  );
};

const percentValue = (expr: Expr): Option.Option<Expr> =>
  expr._tag === "percent" ? Option.some(expr.value) : Option.none();

const combineAdd = (op: "+" | "-", left: Expr, right: Expr): Expr =>
  Option.match(percentValue(right), {
    onNone: () => ({ _tag: "binary", op, left, right }),
    onSome: (value) => ({
      _tag: "binary",
      op,
      left,
      right: {
        _tag: "binary",
        op: "×",
        left,
        right: {
          _tag: "binary",
          op: "÷",
          left: value,
          right: integer(100),
        },
      },
    }),
  });

const combineMultiply = (op: "×" | "÷", left: Expr, right: Expr): Expr =>
  Option.match(percentValue(right), {
    onNone: () => ({ _tag: "binary", op, left, right }),
    onSome: (value) =>
      op === "×"
        ? {
            _tag: "binary",
            op: "×",
            left,
            right: {
              _tag: "binary",
              op: "÷",
              left: value,
              right: {
                _tag: "number",
                text: "100",
                value: 100,
                exact: Option.some(fraction(100)),
              },
            },
          }
        : {
            _tag: "binary",
            op: "×",
            left: {
              _tag: "binary",
              op: "÷",
              left,
              right: value,
            },
            right: {
              _tag: "number",
              text: "100",
              value: 100,
              exact: Option.some(fraction(100)),
            },
          },
  });

const parseAdditive = (stream: Stream, depth: number): Parsed => {
  const left = parseTerm(stream, depth);
  if (left._tag !== "ok") return left;
  return additiveTail(stream, left.expr, depth);
};

const additiveTail = (stream: Stream, left: Expr, depth: number): Parsed =>
  Option.match(
    Option.filter(stream.at(), (held) => held.id === "+" || held.id === "-"),
    {
      onNone: () => ok(left),
      onSome: (held) => {
        stream.take();
        const right = parseTerm(stream, depth);
        if (right._tag !== "ok") return right;
        const op = held.id === "+" ? "+" : "-";
        return additiveTail(stream, combineAdd(op, left, right.expr), depth);
      },
    },
  );

const parseTerm = (stream: Stream, depth: number): Parsed => {
  const left = parseDot(stream, depth);
  if (left._tag !== "ok") return left;
  return termTail(stream, left.expr, depth);
};

const termTail = (stream: Stream, left: Expr, depth: number): Parsed => {
  if (stream.takeIf("×10^")) {
    const exponent = parseUnary(stream, depth);
    if (exponent._tag !== "ok") return exponent;
    return termTail(
      stream,
      {
        _tag: "binary",
        op: "×",
        left,
        right: {
          _tag: "binary",
          op: "^",
          left: integer(10),
          right: exponent.expr,
        },
      },
      depth,
    );
  }
  return Option.match(
    Option.filter(stream.at(), (held) => held.id === "×" || held.id === "÷"),
    {
      onNone: () => ok(left),
      onSome: (held) => {
        stream.take();
        const right = parseDot(stream, depth);
        if (right._tag !== "ok") return right;
        const op = held.id === "×" ? "×" : "÷";
        return termTail(stream, combineMultiply(op, left, right.expr), depth);
      },
    },
  );
};

const parseDot = (stream: Stream, depth: number): Parsed => {
  const left = parsePermutation(stream, depth);
  if (left._tag !== "ok") return left;
  return dotTail(stream, left.expr, depth);
};

const dotTail = (stream: Stream, left: Expr, depth: number): Parsed => {
  if (!stream.takeIf("•")) return ok(left);
  const right = parsePermutation(stream, depth);
  if (right._tag !== "ok") return right;
  return dotTail(
    stream,
    { _tag: "binary", op: "•", left, right: right.expr },
    depth,
  );
};

const parsePermutation = (stream: Stream, depth: number): Parsed => {
  const left = parseImplicit(stream, depth);
  if (left._tag !== "ok") return left;
  return permutationTail(stream, left.expr, depth);
};

const permutationTail = (stream: Stream, left: Expr, depth: number): Parsed =>
  Option.match(
    Option.filter(
      stream.at(),
      (held) => held.id === "nPr" || held.id === "nCr" || held.id === "∠",
    ),
    {
      onNone: () => ok(left),
      onSome: (held) => {
        stream.take();
        const right = parseImplicit(stream, depth);
        if (right._tag !== "ok") return right;
        return permutationTail(
          stream,
          { _tag: "binary", op: held.id, left, right: right.expr },
          depth,
        );
      },
    },
  );

const parseImplicit = (stream: Stream, depth: number): Parsed => {
  const left = parseUnary(stream, depth);
  if (left._tag !== "ok") return left;
  return implicitTail(stream, left.expr, depth);
};

const implicitTail = (stream: Stream, left: Expr, depth: number): Parsed =>
  Option.match(stream.at(), {
    onNone: () => ok(left),
    onSome: (held) =>
      startsOperand(held)
        ? (() => {
            const right = parseUnary(stream, depth);
            if (right._tag !== "ok") return right;
            return implicitTail(
              stream,
              { _tag: "binary", op: "×", left, right: right.expr },
              depth,
            );
          })()
        : ok(left),
  });

const parseUnary = (stream: Stream, depth: number): Parsed => {
  if (stream.takeIf("-")) {
    const value = parseUnary(stream, depth);
    return value._tag === "ok"
      ? ok({ _tag: "unary", op: "-", value: value.expr })
      : value;
  }
  if (stream.takeIf("+")) {
    const value = parseUnary(stream, depth);
    return value._tag === "ok"
      ? ok({ _tag: "unary", op: "+", value: value.expr })
      : value;
  }
  return parsePower(stream, depth);
};

const parsePower = (stream: Stream, depth: number): Parsed => {
  const base = parsePostfix(stream, depth);
  if (base._tag !== "ok") return base;
  if (!stream.takeIf("^")) return base;
  const exponent = parseUnary(stream, depth);
  if (exponent._tag !== "ok") return exponent;
  return ok({ _tag: "binary", op: "^", left: base.expr, right: exponent.expr });
};

const parsePostfix = (stream: Stream, depth: number): Parsed => {
  const primary = parsePrimary(stream, depth);
  if (primary._tag !== "ok") return primary;
  return postfixTail(stream, primary.expr);
};

const POSTFIX_IDS: ReadonlyArray<string> = [
  "x²",
  "x³",
  "x⁻¹",
  "!",
  "%",
  "°",
  "′",
  "″",
  "rad",
  "grad",
  "base:d",
  "base:h",
  "base:b",
  "base:o",
  "fmt:rect",
  "fmt:polar",
];

const BASE_OF: Readonly<Record<string, number>> = {
  "base:d": 10,
  "base:h": 16,
  "base:b": 2,
  "base:o": 8,
};

const postfixTail = (stream: Stream, value: Expr): Parsed =>
  Option.match(stream.at(), {
    onNone: () => ok(value),
    onSome: (held) => {
      if (!Arr.contains(POSTFIX_IDS, held.id) && !held.id.startsWith("conv:")) {
        return ok(value);
      }
      stream.take();
      if (held.id === "fmt:rect" || held.id === "fmt:polar") {
        return postfixTail(stream, {
          _tag: "format",
          value,
          format: held.id === "fmt:rect" ? "rect" : "polar",
        });
      }
      if (held.id === "%") {
        return postfixTail(stream, { _tag: "percent", value });
      }
      const base = BASE_OF[held.id];
      if (base !== undefined) {
        return postfixTail(stream, { _tag: "baseTag", value, base });
      }
      return postfixTail(stream, { _tag: "postfix", op: held.id, value });
    },
  });

const parsePrimary = (stream: Stream, depth: number): Parsed => {
  if (depth > MAX_DEPTH) return failure("Stack", undefined, stream.index);
  return Option.match(stream.at(), {
    onNone: () => syntax(stream),
    onSome: (held) => {
      if (held.kind === "digit") return parseNumber(stream);
      if (held.id === "(") {
        stream.take();
        const inside = parseSequence(stream, depth + 1);
        if (inside._tag !== "ok") return inside;
        if (!stream.takeIf(")")) return syntax(stream);
        return ok(inside.expr);
      }
      if (held.kind === "function") {
        stream.take();
        return parseCall(stream, held.id, depth + 1);
      }
      if (held.kind === "constant" || held.kind === "variable") {
        stream.take();
        return ok(
          held.kind === "constant"
            ? { _tag: "constant", name: held.id }
            : { _tag: "variable", name: held.id },
        );
      }
      if (held.id === "Ran#") {
        stream.take();
        return ok({ _tag: "call", name: "Ran#", args: [] });
      }
      return syntax(stream);
    },
  });
};

const parsePlainNumber = (stream: Stream): Parsed => {
  const text = readNumberText(stream);
  const value = Number(text);
  if (!Number.isFinite(value)) return failure("Math", undefined, stream.index);
  return ok({
    _tag: "number",
    text,
    value,
    exact: Option.some(fraction(text)),
  });
};

const parseNumber = (stream: Stream): Parsed => {
  const plain = parsePlainNumber(stream);
  if (plain._tag !== "ok") return plain;
  const numberNode = plain.expr;

  const degrees = stream.takeIf("°");
  const minuteMark = !degrees && stream.takeIf("′");
  if (degrees || minuteMark) {
    const minutes = degrees ? parsePlainNumber(stream) : ok(numberNode);
    if (minutes._tag !== "ok") return minutes;
    if (minuteMark) {
      if (stream.digitAt()) {
        const seconds = parsePlainNumber(stream);
        if (seconds._tag !== "ok") return seconds;
        stream.takeIf("″");
        return ok({
          _tag: "sexagesimal",
          degrees: integer(0),
          minutes: Option.some(numberNode),
          seconds: Option.some(seconds.expr),
        });
      }
      return ok({
        _tag: "sexagesimal",
        degrees: integer(0),
        minutes: Option.some(numberNode),
        seconds: Option.none(),
      });
    }
    if (stream.takeIf("′")) {
      const seconds = parsePlainNumber(stream);
      if (seconds._tag !== "ok") return seconds;
      stream.takeIf("″");
      return ok({
        _tag: "sexagesimal",
        degrees: numberNode,
        minutes: Option.some(minutes.expr),
        seconds: Option.some(seconds.expr),
      });
    }
    return ok({
      _tag: "sexagesimal",
      degrees: numberNode,
      minutes: Option.some(minutes.expr),
      seconds: Option.none(),
    });
  }
  return ok(numberNode);
};

const readNumberText = (stream: Stream): string => {
  let text = "";
  let seenPeriod = false;
  const read = (): string =>
    Option.match(stream.at(), {
      onNone: () => text,
      onSome: (held) => {
        if (held.kind !== "digit") return text;
        if (held.id === ".") {
          if (seenPeriod) return text;
          seenPeriod = true;
        }
        stream.take();
        text = `${text}${held.id}`;
        return read();
      },
    });
  return read();
};

const parseCall = (stream: Stream, name: string, depth: number): Parsed => {
  if (stream.takeIf(")")) return ok({ _tag: "call", name, args: [] });
  const first = parseSequence(stream, depth);
  if (first._tag !== "ok") return first;
  return callTail(stream, name, [first.expr], depth);
};

const callTail = (
  stream: Stream,
  name: string,
  args: ReadonlyArray<Expr>,
  depth: number,
): Parsed => {
  if (stream.takeIf(")")) return ok({ _tag: "call", name, args });
  if (!stream.takeIf(",")) return syntax(stream);
  const next = parseSequence(stream, depth);
  if (next._tag !== "ok") return next;
  return callTail(stream, name, Arr.append(args, next.expr), depth);
};

export const parse = (tokens: ReadonlyArray<InputToken>): Parsed => {
  const stream = new Stream(tokens);
  const parsed = parseSequence(stream, 0);
  if (parsed._tag !== "ok") return parsed;
  if (stream.index < tokens.length) return syntax(stream);
  return parsed;
};

export const formatOverride = (expr: Expr): Option.Option<"rect" | "polar"> => {
  const walk = (node: Expr): Option.Option<"rect" | "polar"> => {
    if (node._tag === "format") return Option.some(node.format);
    if (node._tag === "binary") {
      return Option.orElse(walk(node.left), () => walk(node.right));
    }
    if (
      node._tag === "unary" ||
      node._tag === "percent" ||
      node._tag === "postfix"
    ) {
      return walk(node.value);
    }
    if (node._tag === "call") {
      return Arr.reduce(
        node.args,
        Option.none<"rect" | "polar">(),
        (found, arg) => Option.orElse(found, () => walk(arg)),
      );
    }
    if (node._tag === "sequence") {
      return Arr.reduce(
        node.items,
        Option.none<"rect" | "polar">(),
        (found, item) => Option.orElse(found, () => walk(item)),
      );
    }
    return Option.none();
  };
  return walk(expr);
};

export const variablesOf = (expr: Expr): ReadonlyArray<string> => {
  const collect = (node: Expr): ReadonlyArray<string> => {
    if (node._tag === "variable") return [node.name];
    if (node._tag === "binary")
      return [...collect(node.left), ...collect(node.right)];
    if (
      node._tag === "unary" ||
      node._tag === "percent" ||
      node._tag === "postfix"
    )
      return collect(node.value);
    if (node._tag === "call")
      return Arr.flatMap(node.args, (arg) => collect(arg));
    if (node._tag === "sequence")
      return Arr.flatMap(node.items, (item) => collect(item));
    if (node._tag === "format" || node._tag === "baseTag")
      return collect(node.value);
    if (node._tag === "sexagesimal") {
      return [
        ...collect(node.degrees),
        ...Option.match(node.minutes, {
          onNone: () => [],
          onSome: collect,
        }),
        ...Option.match(node.seconds, {
          onNone: () => [],
          onSome: collect,
        }),
      ];
    }
    return [];
  };
  return Arr.dedupe(collect(expr));
};
