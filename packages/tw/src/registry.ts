import { Order, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Str from "effect/String";
import type { StyleDesc } from "@gpuix/react";
import type { Theme } from "@gpuixui/tokens";
import { BASE_ALIASES } from "./aliases.js";
import { unsupportedReasons } from "./unsupported.js";
import { resolveUtility } from "./utilities.js";

export type TwBucket = "focus" | "invalid" | "disabled" | "open" | "closed";

export interface TwState {
  readonly hasIcon?: boolean;

  readonly iconSide?: "start" | "end";

  readonly expanded?: boolean;

  readonly behind?: boolean;

  readonly limited?: boolean;
}

export type TwUtilityResolver = (
  theme: Theme,
  value?: string,
) => StyleDesc | number | undefined;

export type TwVariantResolver = (
  variants: ReadonlyArray<string>,
  state: TwState,
) => TwBucket | undefined;

export interface TwRegistryConfig {
  readonly utilities?: Readonly<Record<string, TwUtilityResolver>>;
  readonly variants?: ReadonlyArray<TwVariantResolver>;
  readonly aliases?: Readonly<Record<string, string>>;
  readonly unsupported?: Readonly<Record<string, string>>;
}

export interface TwRegistry {
  readonly utilities: Readonly<Record<string, TwUtilityResolver>>;
  readonly variants: ReadonlyArray<TwVariantResolver>;
  readonly aliases: Readonly<Record<string, string>>;
  readonly unsupported: Readonly<Record<string, string>>;
}

const DEFAULTS: TwRegistry = {
  utilities: {},
  variants: [],
  aliases: BASE_ALIASES,
  unsupported: unsupportedReasons,
};

export const defaultRegistry: TwRegistry = DEFAULTS;

export const createTwRegistry = (
  config: TwRegistryConfig = {},
): TwRegistry => ({
  utilities: R.union(
    DEFAULTS.utilities,
    config.utilities ?? {},
    (_default, next) => next,
  ),
  variants: Arr.appendAll(DEFAULTS.variants, config.variants ?? []),
  aliases: R.union(
    DEFAULTS.aliases,
    config.aliases ?? {},
    (_default, next) => next,
  ),
  unsupported: R.union(
    DEFAULTS.unsupported,
    config.unsupported ?? {},
    (_default, next) => next,
  ),
});

export const registryAlias = (
  registry: TwRegistry,
  utility: string,
): Option.Option<string> => R.get(registry.aliases, utility);

export const registryReason = (
  registry: TwRegistry,
  token: string,
): Option.Option<string> => R.get(registry.unsupported, token);

const families = (
  utilities: Readonly<Record<string, TwUtilityResolver>>,
): ReadonlyArray<readonly [string, TwUtilityResolver]> =>
  pipe(
    R.toEntries(utilities),
    Arr.sort(
      Order.mapInput(
        Order.Number,
        (entry: readonly [string, TwUtilityResolver]) => -entry[0].length,
      ),
    ),
  );

const asShape = (resolved: StyleDesc | number): StyleDesc =>
  P.isNumber(resolved) ? { width: resolved, height: resolved } : resolved;

export const resolveRegistryUtility = (
  registry: TwRegistry,
  name: string,
  theme: Theme,
): StyleDesc | undefined => {
  const exact = R.get(registry.utilities, name);
  if (Option.isSome(exact)) {
    const resolved = exact.value(theme);
    if (resolved !== undefined) return asShape(resolved);
  }

  const family = Arr.findFirst(families(registry.utilities), ([key]) =>
    Str.startsWith(`${key}-`)(name),
  );
  return Option.match(family, {
    onNone: () => resolveUtility(name, theme),
    onSome: ([key, resolve]) => {
      const resolved = resolve(
        theme,
        Str.slice(key.length + 1, name.length)(name),
      );
      return resolved === undefined
        ? resolveUtility(name, theme)
        : asShape(resolved);
    },
  });
};
