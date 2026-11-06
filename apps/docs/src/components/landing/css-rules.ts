/**
 * Reading a stylesheet's own rules, for the landing's layout guards.
 *
 * The landing's layout is CSS, and its guards read that CSS rather than
 * screenshot it. Two things need care:
 *
 * - A rule's *selector* matters. `.landing-grid-tile-chart { ... }` and
 *   `.landing-grid > .landing-grid-tile-chart { ... }` are different rules,
 *   and a substring search cannot tell them apart.
 * - The `columns` property is a substring of `grid-template-columns`, so a
 *   plain search for `columns:` flags the grid's own column track.
 *
 * These helpers read the stylesheet as the cascade sees it: a rule is matched
 * on its whole selector, and a property is matched as a declaration.
 */

import * as Option from "effect/Option";

/** One rule in a stylesheet: its selector and its declarations. */
export interface CssRule {
  readonly selector: string;
  readonly declarations: string;
}

/**
 * Every rule in a stylesheet, with its selector kept intact.
 *
 * A rule inside a media query keeps its own selector. A flat scan of
 * `{ ... }` pairs cannot: it matches the at-rule's whole block and reads the
 * inner rule's selector as the at-rule's body. Matching the *innermost*
 * rules — the ones whose body holds no brace — reads the inner rule's own
 * selector, and an at-rule's body is the rules inside it.
 *
 * A comment sits between the previous rule and this one, so it is stripped
 * from the front of the selector.
 */
export const cssRules = (css: string): ReadonlyArray<CssRule> =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, " ").trim(),
    declarations: (match[2] ?? "").trim(),
  }));

/**
 * The rules a selector matches, on any of its selector-list parts.
 *
 * A rule's selector may be a list (`.a, .b { ... }`); a match on any part
 * counts, which is what the cascade does.
 */
export const rulesFor = (
  css: string,
  selector: string,
): ReadonlyArray<CssRule> =>
  cssRules(css).filter((rule) =>
    rule.selector
      .split(",")
      .map((part) => part.trim())
      .includes(selector),
  );

/**
 * The multi-column `columns` property, and nothing else.
 *
 * `grid-template-columns` contains the same letters, so the property is
 * matched on its own, at the start of a declaration.
 */
export const hasMultiColumn = (declarations: string): boolean =>
  /(^|[\s;{])columns\s*:/.test(declarations);

/** The `width` a rule declares, in pixels, when it declares one. */
export const widthInPixels = (declarations: string): Option.Option<number> =>
  Option.fromNullishOr(
    declarations.match(/(?:^|[\s;{])width:\s*(\d+)px/)?.[1],
  ).pipe(Option.map((value) => Number.parseInt(value, 10)));
