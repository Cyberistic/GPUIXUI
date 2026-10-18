/**
 * Guards the upstream class coverage.
 *
 * Bug guarded: a new shadcn class reaches a recipe, resolves to nothing and is
 * silently dropped — or lands in `unsupported` without a recorded reason. The
 * test extracts every class token from the Base UI input/button/dialog/popover/
 * toast sources and the luma blocks that style them, then requires each token
 * to resolve or to be named in `unsupported.ts`.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { lightTheme } from "@gpuixui/tokens";
import { classesToStyle } from "./classes.js";
import { present, read } from "./reference.js";
import { unsupportedClasses, unsupportedReason } from "./unsupported.js";

const hasSource = present("apps/v4/registry/bases/base/ui");

const SOURCES = [
  "input.tsx",
  "button.tsx",
  "dialog.tsx",
  "popover.tsx",
  "toast.tsx",
] as const;

/** The luma blocks that style those five components. */
const LUMA_BLOCKS = [
  "cn-input",
  "cn-button",
  "cn-button-variant-default",
  "cn-button-variant-outline",
  "cn-button-variant-secondary",
  "cn-button-variant-ghost",
  "cn-button-variant-destructive",
  "cn-button-variant-link",
  "cn-button-size-xs",
  "cn-button-size-sm",
  "cn-button-size-default",
  "cn-button-size-lg",
  "cn-button-size-icon",
  "cn-button-size-icon-xs",
  "cn-button-size-icon-sm",
  "cn-button-size-icon-lg",
  "cn-dialog-overlay",
  "cn-dialog-content",
  "cn-dialog-close",
  "cn-dialog-header",
  "cn-dialog-footer",
  "cn-dialog-title",
  "cn-dialog-description",
  "cn-popover-content",
  "cn-popover-content-logical",
  "cn-popover-header",
  "cn-popover-title",
  "cn-popover-description",
  "cn-toast",
] as const;

/** Resumes the scan after a string literal or one nesting level. */
const scan = (
  source: string,
  index: number,
  depth: number,
  found: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  if (index >= source.length) return found;
  if (source[index] === '"') {
    const end = source.indexOf('"', index + 1);
    return end === -1
      ? found
      : scan(
          source,
          end + 1,
          depth,
          Arr.append(found, source.slice(index + 1, end)),
        );
  }
  const next =
    source[index] === "("
      ? depth + 1
      : source[index] === ")"
        ? depth - 1
        : depth;
  if (source[index] === ")" && next === 0) return found;
  return scan(source, index + 1, next, found);
};

/** The string arguments of every `cn(...)` call, quotes respected. */
const cnStrings = (source: string): ReadonlyArray<string> =>
  Arr.flatMap(Arr.fromIterable(source.matchAll(/(?<![.\w])cn\(/g)), (call) =>
    Option.match(Option.fromNullishOr(call.index), {
      onNone: () => [],
      onSome: (index) => scan(source, index, 0, []),
    }),
  );

const tokensOf = (text: string): ReadonlyArray<string> =>
  Arr.filter(Str.split(text, /\s+/), Str.isNonEmpty);

const capture = (match: RegExpMatchArray, index: number): string =>
  Option.getOrElse(Option.fromNullishOr(match[index]), () => "");

const classStrings = (source: string): ReadonlyArray<string> =>
  Arr.appendAll(
    Arr.map(
      Arr.fromIterable(source.matchAll(/className="([^"]*)"/g)),
      (match) => capture(match, 1),
    ),
    cnStrings(source),
  );

const tokens = (): ReadonlyArray<string> => {
  const fromSources = Arr.flatMap(SOURCES, (file) =>
    Arr.flatMap(
      classStrings(read("apps/v4/registry/bases/base/ui", file)),
      (value) => tokensOf(value),
    ),
  );
  const css = read("apps/v4/registry/styles/style-luma.css");
  const known = HashSet.fromIterable(LUMA_BLOCKS);
  const fromLuma = Arr.flatMap(
    Arr.fromIterable(css.matchAll(/\.(cn-[a-z-]+)\s*\{\s*@apply\s+([^;]+);/g)),
    (match) =>
      Option.match(Option.fromNullishOr(match[1]), {
        onNone: () => [],
        onSome: (selector) =>
          HashSet.has(known, selector) ? tokensOf(capture(match, 2)) : [],
      }),
  );
  return Arr.dedupe(Arr.appendAll(fromSources, fromLuma));
};

/** A token the compiler drops, checked against the reason table. */
const withoutReason = (token: string): boolean => {
  const result = classesToStyle(token, lightTheme);
  return (
    result.unsupported.includes(token) && unsupportedReason(token) === undefined
  );
};

/** A token the reason table names, checked against the compiler. */
const withoutClassification = (token: string): boolean =>
  !classesToStyle(token, lightTheme).unsupported.includes(token);

describe.skipIf(!hasSource)("upstream class coverage", () => {
  it("extracts the component corpus", () => {
    const corpus = HashSet.fromIterable(tokens());
    const expected = [
      "p-6",
      "ring-1",
      "bg-input/50",
      "sm:max-w-md",
      "origin-(--transform-origin)",
      "data-[side=top]:slide-in-from-bottom-2",
    ];
    expect(
      Arr.filter(expected, (token) => !HashSet.has(corpus, token)),
    ).toEqual([]);
  });

  it("resolves or records a reason for every class token", () => {
    expect(Arr.filter(tokens(), withoutReason)).toEqual([]);
  });

  it("keeps every recorded reason reachable from the compiler", () => {
    expect(Arr.filter(unsupportedClasses, withoutClassification)).toEqual([]);
  });

  it("names each unsupported class once", () => {
    expect(Arr.length(unsupportedClasses)).toBe(
      HashSet.size(HashSet.fromIterable(unsupportedClasses)),
    );
  });
});
