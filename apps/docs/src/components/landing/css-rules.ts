import * as Option from "effect/Option";

export interface CssRule {
  readonly selector: string;
  readonly declarations: string;
}

export const cssRules = (css: string): ReadonlyArray<CssRule> =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, " ").trim(),
    declarations: (match[2] ?? "").trim(),
  }));

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

export const hasMultiColumn = (declarations: string): boolean =>
  /(^|[\s;{])columns\s*:/.test(declarations);

export const widthInPixels = (declarations: string): Option.Option<number> =>
  Option.fromNullishOr(
    declarations.match(/(?:^|[\s;{])width:\s*(\d+)px/)?.[1],
  ).pipe(Option.map((value) => Number.parseInt(value, 10)));
