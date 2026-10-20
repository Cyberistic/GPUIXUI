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
 * A word with repeated letters collapsed. Collapsing is what makes a doubled
 * letter — itself the typo — count once (`botton` → `boton`, `accordions` →
 * `acordion`), so `acordian` is one substitution from Accordions rather than
 * two.
 */
const collapse = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/(.)\1+/g, "$1");

/**
 * A word's typo identity: lower-case, repeated letters collapsed, then the
 * shared stem.
 */
export const typoKey = (value: string): string => stem(collapse(value));

/**
 * Every spelling a word is compared by: the stemmed key the real matcher uses,
 * then the raw collapsed word. The stem alone hides a suffix typo — `theming`
 * keys to `them` while `themnig` keys to itself, three edits apart, although
 * the spellings are one adjacent transposition apart — and the raw spelling
 * alone would make every inflection look like an error.
 */
export const typoForms = (value: string): ReadonlyArray<string> => {
  const collapsed = collapse(value);
  const key = typoKey(value);
  return key === collapsed ? [collapsed] : [key, collapsed];
};

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

/** Four characters are the shortest word that can name a page (plan 431). */
const MIN_TYPO_LENGTH = 4;

/** A word *inside* a longer name needs five, or `code` names `Dark mode`. */
const MIN_WORD_TYPO_LENGTH = 5;

/**
 * `true` when any spelling of `left` is one edit from any spelling of `right`
 * (`typoForms`). A form shorter than four characters is not compared: three
 * letters are too weak to name a page.
 */
export const formsWithinOneEdit = (left: string, right: string): boolean => {
  const leftForms = typoForms(left).filter(
    (form) => form.length >= MIN_TYPO_LENGTH,
  );
  const rightForms = typoForms(right).filter(
    (form) => form.length >= MIN_TYPO_LENGTH,
  );
  return leftForms.some((leftForm) =>
    rightForms.some((rightForm) => withinOneEdit(leftForm, rightForm)),
  );
};

/**
 * A name a query can misspell. A component name and an alias also match by a
 * word inside them (`seach` names Search input); a page title matches as a
 * whole name or phrase only, because a word of a short title (`Site search`,
 * `Component API`) is generic evidence that would tie with the component that
 * word really names (plan 610).
 */
export interface TypoName {
  readonly name: string;
  readonly url: string;
  readonly kind: "name" | "page" | "alias";
}

/** The one page a one-edit query names. */
export interface TypoTarget {
  readonly url: string;
  readonly name: string;
  /** `0` whole name, `1` whole alias, `2` a name word, `3` an alias word. */
  readonly tier: number;
  /** `true` when every word of the query named a word of the whole target. */
  readonly phrase: boolean;
}

/**
 * The tier a single word earns. A whole name beats a whole alias, which beats a
 * word of a name, which beats a word of an alias: a title outranks editorial
 * vocabulary, and a name that is the query outranks a word inside a longer one
 * (`botton` reaches Buttons, not Button groups). An exact spelling is not a
 * typo — the real ranker already owns it.
 */
const targetTier = (query: string, target: TypoName): number | undefined => {
  const name = target.name.trim().toLowerCase();
  const whole =
    name !== query && formsWithinOneEdit(query, name)
      ? target.kind === "alias"
        ? 1
        : 0
      : undefined;
  const word =
    target.kind !== "page" &&
    splitWords(name).some(
      (part) =>
        query.length >= MIN_WORD_TYPO_LENGTH &&
        part.length >= MIN_WORD_TYPO_LENGTH &&
        part !== query &&
        formsWithinOneEdit(query, part),
    )
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
 * The tier a phrase earns (plan 608). Word *i* of the query is compared with
 * word *i* of the whole name or alias: a typo does not reorder a name
 * (`group button` is not `button group`), and a query with an invented extra
 * noun (`acordian panel`) is not a typo of a one-word title. Every word must
 * match exactly or within one edit, and at least one word must differ, because
 * an all-exact phrase is a real match the ranker already scores.
 */
const phraseTier = (
  words: ReadonlyArray<string>,
  target: TypoName,
): number | undefined => {
  const nameWords = splitWords(target.name);
  if (words.length < 2 || nameWords.length !== words.length) return undefined;
  const matches = words.map((word, index) => {
    const nameWord = nameWords[index];
    return nameWord !== undefined &&
      (word === nameWord || formsWithinOneEdit(word, nameWord))
      ? nameWord === word
        ? "exact"
        : "typo"
      : undefined;
  });
  if (matches.some((match) => match === undefined)) return undefined;
  return matches.includes("typo")
    ? target.kind === "alias"
      ? 1
      : 0
    : undefined;
};

/**
 * The page a one-edit query names, or `undefined`.
 *
 * A single word is matched against the whole name, then each word of it. A
 * phrase is matched word by word against the whole name or alias (plan 608): a
 * typo tier over an arbitrary sentence would guess, but a phrase whose every
 * word lines up with the same name is the same evidence a single word is. Two
 * URLs tied at the winning tier mean the query is ambiguous and is not promoted
 * at all — never guess between two plausible names.
 */
export const typoMatch = (
  query: string,
  names: ReadonlyArray<TypoName>,
): TypoTarget | undefined => {
  const raw = query.trim().toLowerCase();
  if (raw.length < MIN_TYPO_LENGTH) return undefined;
  const words = splitWords(raw);
  if (words.length === 0) return undefined;

  const tierOf = (target: TypoName): number | undefined =>
    words.length === 1 ? targetTier(raw, target) : phraseTier(words, target);

  const best = new Map<string, TypoTarget>();
  names.forEach((target) => {
    const tier = tierOf(target);
    if (tier === undefined) return;
    const current = best.get(target.url);
    if (current === undefined || tier < current.tier) {
      best.set(target.url, {
        url: target.url,
        name: target.name,
        tier,
        phrase: words.length > 1,
      });
    }
  });

  const targets = [...best.values()];
  if (targets.length === 0) return undefined;
  const lowest = Math.min(...targets.map((target) => target.tier));
  const winners = targets.filter((target) => target.tier === lowest);
  return winners.length === 1 ? winners[0] : undefined;
};
