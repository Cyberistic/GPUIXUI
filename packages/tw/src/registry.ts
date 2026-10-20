/**
 * The extension registry behind `classesToStyle`.
 *
 * Consumers add Tailwind utilities, variants, recipe aliases and unsupported
 * reasons without editing this package. The default registry carries the
 * built-in table and the luma `cn-*` aliases, so existing call sites keep the
 * same behavior.
 */

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

/** A state bucket a component can apply when its own state matches. */
export type TwBucket = "focus" | "invalid" | "disabled" | "open" | "closed";

/** Component state the compiler can honestly resolve a variant from. */
export interface TwState {
  /** The element contains its own icon (`has-[>svg]`). */
  readonly hasIcon?: boolean;
  /** Which edge carries an inline icon (`has-data-[icon=inline-*]`). */
  readonly iconSide?: "start" | "end";
  /** The owning control is expanded (`data-expanded`, `aria-expanded`). */
  readonly expanded?: boolean;
  /** A stacked element is behind the frontmost one (`data-behind`). */
  readonly behind?: boolean;
  /** The stack is clamped to its visible limit (`data-limited`). */
  readonly limited?: boolean;
}

/**
 * A utility named in {@link TwRegistryConfig.utilities}.
 *
 * The key is matched exactly, or as a family prefix: `tone` handles
 * `tone-40` and receives `"40"` as `value`.
 *
 * A resolver may return a plain `number` instead of a shape: it is a derived
 * length token, bound to a square (`width` and `height`) — the one place a
 * number alone is unambiguous. Derived geometry that is not square (a width, a
 * height, an inset, a negative margin) returns the shape instead.
 */
export type TwUtilityResolver = (
  theme: Theme,
  value?: string,
) => StyleDesc | number | undefined;

/**
 * A custom variant resolver, called before the built-in variant table.
 *
 * Returning `undefined` leaves the token to the next resolver.
 */
export type TwVariantResolver = (
  variants: ReadonlyArray<string>,
  state: TwState,
) => TwBucket | undefined;

/** Custom utilities, variant resolvers, aliases and unsupported reasons. */
export interface TwRegistryConfig {
  readonly utilities?: Readonly<Record<string, TwUtilityResolver>>;
  readonly variants?: ReadonlyArray<TwVariantResolver>;
  readonly aliases?: Readonly<Record<string, string>>;
  readonly unsupported?: Readonly<Record<string, string>>;
}

/** A resolved registry with every extension point merged in. */
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

/** The registry used when none is supplied. */
export const defaultRegistry: TwRegistry = DEFAULTS;

/** Builds a registry from the defaults plus the consumer's extensions. */
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

/** The recipe for a `cn-*` hook, when the registry maps it. */
export const registryAlias = (
  registry: TwRegistry,
  utility: string,
): Option.Option<string> => R.get(registry.aliases, utility);

/** Why a token cannot become a `StyleDesc`, when the registry records it. */
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

/** A numeric resolver's number, bound to a square (`width` and `height`). */
const asShape = (resolved: StyleDesc | number): StyleDesc =>
  P.isNumber(resolved) ? { width: resolved, height: resolved } : resolved;

/** The custom utility for `name`, then the built-in table. */
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
