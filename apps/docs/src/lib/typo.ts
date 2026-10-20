/**
 * One-edit typo matching for ⌘K (plan 607).
 *
 * The lexical index tolerates most misspellings — it still returns *a* page for
 * `botton` and `theem` — but it cannot say the query is one edit from a name,
 * so an incidental prose or suffix match decides (measured 2026-10-20:
 * `botton` → Toggle, `theem` → Values API, `acordian` → nothing). This module
 * answers one question: which single page does a one-edit query name? The
 * ranker scores it below every real match (`TYPO_MATCH_RANK` in `search.ts`),
 * so a genuine match always wins.
 *
 * Native arrays and loops are deliberate: `src/architecture.test.ts` forbids
 * `effect` in every non-test module, the same exception `search.ts` records.
 */

/**
 * The stem `search.ts` matches names by (plan 585), shared so the real matcher
 * and the typo tier cannot disagree about what a word is. Suffixes only: an
 * exact and prefix tier still decides a real match first.
 */
export const stem = (word: string): string => {
  if (word.length < 4) return word;
  const plural = word
    .replace(/ies$/, "y")
    .replace(/(?:s|x|z|ch|sh)es$/, "")
    .replace(/(?<!s|u|i)s$/, "");
  const gerund = plural.replace(/ing$/, "").replace(/([a-z])\1$/, "$1");
  const derived = gerund.replace(/(?:able|ible|ed)$/, "");
  const base = derived.length >= 3 ? derived : gerund;
  return base.length > 3 ? base.replace(/e$/, "") : base;
};

/** Camel-case, dotted, hyphenated and spaced names as lower-case words. */
export const splitWords = (value: string): ReadonlyArray<string> =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);

/**
 * A word's typo identity: lower-case, repeated letters collapsed, then the
 * shared stem. Collapsing first is what makes a doubled letter — itself the
 * typo — count once (`botton` → `boton`, `accordions` → `acordion`), so
 * `acordian` is one substitution from Accordions rather than two.
 */
export const typoKey = (value: string): string =>
  stem(
    value
      .trim()
      .toLowerCase()
      .replace(/(.)\1+/g, "$1"),
  );

/** The `typoKey` of every word in a name. */
export const typoWords = (name: string): ReadonlyArray<string> =>
  splitWords(name).map(typoKey);

/**
 * `true` when `left` and `right` are at most one edit apart: a substitution,
 * an insertion, a deletion, or one adjacent transposition (Damerau, not plain
 * Levenshtein — `dropdwon` is one typo, not two).
 */
export const withinOneEdit = (left: string, right: string): boolean => {
  if (left === right) return true;
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  if (Math.abs(leftChars.length - rightChars.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let edited = false;
  while (leftIndex < leftChars.length && rightIndex < rightChars.length) {
    if (leftChars[leftIndex] === rightChars[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    if (edited) return false;
    edited = true;
    const transposed =
      leftChars[leftIndex + 1] === rightChars[rightIndex] &&
      leftChars[leftIndex] === rightChars[rightIndex + 1];
    if (transposed) {
      leftIndex += 2;
      rightIndex += 2;
    } else if (leftChars.length > rightChars.length) {
      leftIndex += 1;
    } else if (rightChars.length > leftChars.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return leftChars.length - leftIndex + (rightChars.length - rightIndex) <= 1;
};

/** A name a query can misspell; `alias` is editorial vocabulary. */
export interface TypoName {
  readonly name: string;
  readonly url: string;
  readonly kind: "name" | "alias";
}

/** The one page a one-edit query names. */
export interface TypoTarget {
  readonly url: string;
  readonly name: string;
  /** `0` whole name, `1` whole alias, `2` a name word, `3` an alias word. */
  readonly tier: number;
}

/**
 * The tier this target earns. A whole name beats a whole alias, which beats a
 * word of a name, which beats a word of an alias: a title outranks editorial
 * vocabulary, and a name that is the query outranks a word inside a longer one
 * (`botton` reaches Buttons, not Button groups). An exact spelling is not a
 * typo — the real ranker already owns it.
 */
const targetTier = (
  query: string,
  needle: string,
  target: TypoName,
): number | undefined => {
  const name = target.name.trim().toLowerCase();
  const whole =
    name !== query &&
    typoKey(name).length >= 4 &&
    withinOneEdit(needle, typoKey(name))
      ? target.kind === "name"
        ? 0
        : 1
      : undefined;
  const word = splitWords(name).some((part) => {
    const key = typoKey(part);
    return part !== query && key.length >= 4 && withinOneEdit(needle, key);
  })
    ? target.kind === "name"
      ? 2
      : 3
    : undefined;
  const tiers = [whole, word].filter(
    (tier): tier is number => tier !== undefined,
  );
  return tiers.length === 0 ? undefined : Math.min(...tiers);
};

/**
 * The page a one-edit query names, or `undefined`.
 *
 * Only a single word is matched: a phrase keeps the token rules, and a typo
 * tier over every word of a sentence would guess. Two URLs tied at the winning
 * tier mean the query is ambiguous and is not promoted at all — never guess
 * between two plausible names.
 */
export const typoMatch = (
  query: string,
  names: ReadonlyArray<TypoName>,
): TypoTarget | undefined => {
  const raw = query.trim().toLowerCase();
  if (raw.length < 4 || /\s/.test(raw)) return undefined;
  const needle = typoKey(raw);
  if (needle.length < 4) return undefined;

  const best = new Map<string, TypoTarget>();
  names.forEach((target) => {
    const tier = targetTier(raw, needle, target);
    if (tier === undefined) return;
    const current = best.get(target.url);
    if (current === undefined || tier < current.tier) {
      best.set(target.url, { url: target.url, name: target.name, tier });
    }
  });

  const targets = [...best.values()];
  if (targets.length === 0) return undefined;
  const lowest = Math.min(...targets.map((target) => target.tier));
  const winners = targets.filter((target) => target.tier === lowest);
  return winners.length === 1 ? winners[0] : undefined;
};
