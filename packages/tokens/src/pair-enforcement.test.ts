/**
 * Guards the hole plan 754 fixes: the contract published 44 pair lists, and two
 * guarantees held them — every list is unique (plan 349) and every `*Pairs`
 * export is listed in one compile-checked record (plan 546) — but neither said
 * a listed pair is *measured*. A list added to the inventory and never added to
 * one of `themeContrastFailures`'s walks passed uniqueness, passed
 * `check-types`, and its pairs were exempt from every public check.
 *
 * The guard plants each published pair's own colours on the shipped light theme
 * and fails unless a public check reports that pair, so "listed" and "enforced"
 * are the same set. The dialog face is the one walk that composites first: its
 * face is planted as the scrimmed surface, and its face-on-itself pair is
 * planted through the scrim.
 *
 * The second case proves the predicate can fail: a composition no walk measures
 * is reported unenforced.
 */
import { describe, expect, it } from "vitest";
import * as Tokens from "./index.js";
import {
  compositeOver,
  extendTheme,
  getTheme,
  themeContrastFailures,
  themeHighlightFailures,
  type ContrastFailure,
  type ContrastPair,
  type HighlightFailure,
  type Theme,
} from "./index.js";
import { publishedPairLists } from "./published-pair-lists.js";

const base = getTheme("light");

const plant = ([foreground, background]: ContrastPair): Theme =>
  extendTheme(base, { colors: { [foreground]: base.colors[background] } });

const plantFace = ([, background]: ContrastPair): Theme =>
  extendTheme(base, {
    colors: {
      popover: compositeOver(base.colors.overlay, base.colors[background]),
    },
  });

/**
 * The face-on-itself composition — a dialog over the page's own floating
 * surface — has one role on both sides, so setting the face to the composite
 * moves the composite too. Painting the scrim as the face is the plant that
 * reaches it.
 */
const plantScrim = ([foreground]: ContrastPair): Theme =>
  extendTheme(base, { colors: { overlay: base.colors[foreground] } });

const namesPair = (
  pair: ContrastPair,
  failure: ContrastFailure | HighlightFailure,
): boolean =>
  "foreground" in failure &&
  failure.foreground === pair[0] &&
  ("background" in failure
    ? failure.background === pair[1]
    : failure.surface === pair[1]);

const enforced = (pair: ContrastPair, name: string): boolean => {
  const plants =
    name === "dialogSurfacePairs"
      ? [plantFace(pair), plantScrim(pair)]
      : [plant(pair)];
  return plants.some((theme) =>
    [...themeContrastFailures(theme), ...themeHighlightFailures(theme)].some(
      (failure) => namesPair(pair, failure),
    ),
  );
};

/**
 * Every published composition once, with a list that carries it. The aggregate
 * `contrastPairs` repeats most of the others, and `selectionPairs` repeats a
 * `background`/`card` pair from the plain walks, so the same plant would be
 * measured dozens of times for one answer.
 */
const compositions = (): ReadonlyArray<{
  readonly name: string;
  readonly pair: ContrastPair;
}> => {
  const seen = new Set<string>();
  return Object.entries(publishedPairLists).flatMap(([name, pairs]) =>
    pairs.flatMap((pair) => {
      const key = `${pair[0]}|${pair[1]}`;
      if (seen.has(key)) {
        return [];
      }
      seen.add(key);
      return [{ name, pair }];
    }),
  );
};

describe("every published pair is enforced", () => {
  it("is reported by a public check when the theme paints it wrong", () => {
    const missing = compositions()
      .filter(({ name, pair }) => !enforced(pair, name))
      .map(({ name, pair }) => `${name}: ${pair.join("/")}`);

    expect(missing).toEqual([]);
  });

  it("reports an unenforced composition, so the guard can fail", () => {
    const unenforced: ContrastPair = ["warning", "infoSoft", "body"];

    expect(enforced(unenforced, "plantedPairs")).toBe(false);
    // A pair a public check does measure, through the mark list.
    expect(enforced(["primary", "card", "mark"], "plantedPairs")).toBe(true);
  });

  it("lists every exported pair list, so a new one is enforced too", () => {
    const exported = Object.keys(Tokens).filter((name) =>
      name.endsWith("Pairs"),
    );

    expect(new Set(Object.keys(publishedPairLists))).toEqual(new Set(exported));
  });
});
