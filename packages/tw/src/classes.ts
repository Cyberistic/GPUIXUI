/**
 * Tailwind class string → GPUix `StyleDesc`.
 *
 * `cn` does the joining and conflict resolution first, exactly as shadcn uses
 * it. The result keeps the state buckets a GPUix component applies itself
 * (`focus`, `invalid`, `disabled`, `open`/`closed`), because 0.10.0 has no
 * `focusVisible`/`data-*` style properties.
 *
 * `cn-*` hooks are expanded from the registry's alias table before `cn` runs,
 * so a caller's utility still beats the recipe. Component state
 * (`has-[>svg]`, `data-expanded`, …) is resolved from the optional `state`
 * argument instead of being guessed.
 */

import { cn } from "cn";
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import type { StyleDesc } from "@gpuix/react";
import type { Theme } from "@gpuixui/tokens";
import {
  createTwRegistry,
  defaultRegistry,
  registryAlias,
  registryReason,
  resolveRegistryUtility,
  type TwBucket,
  type TwRegistry,
  type TwRegistryConfig,
  type TwState,
} from "./registry.js";
import { isRing, ringColor, ringShadow, ringWidth } from "./utilities.js";

export type { TwBucket, TwState } from "./registry.js";

/** Every bucket the compiler writes. */
type Bucket = TwBucket | "base" | "hover" | "active";

/** The resolved class string. */
export interface TwResult {
  readonly style: StyleDesc;
  readonly focus: StyleDesc;
  readonly invalid: StyleDesc;
  readonly disabled: StyleDesc;
  readonly open: StyleDesc;
  readonly closed: StyleDesc;
  /** Motion-only utilities (`animate-in`, `fade-in-0`, `duration-100`, …). */
  readonly motion: ReadonlyArray<string>;
  /** Responsive prefixes, recorded for a later breakpoint pass. */
  readonly responsive: ReadonlyArray<string>;
  /** Classes the native runtime cannot express (with the class spelled out). */
  readonly unsupported: ReadonlyArray<string>;
}

type StateStyle = NonNullable<StyleDesc["hover"]>;

interface Ring {
  readonly width?: number;
  readonly color?: string;
}

interface Pass {
  readonly result: TwResult;
  readonly rings: Map<Bucket, Ring>;
}

interface Split {
  readonly variants: ReadonlyArray<string>;
  readonly utility: string;
}

interface SplitState {
  readonly depth: number;
  readonly start: number;
  readonly variants: ReadonlyArray<string>;
}

const empty = (): TwResult => ({
  style: {},
  focus: {},
  invalid: {},
  disabled: {},
  open: {},
  closed: {},
  motion: [],
  responsive: [],
  unsupported: [],
});

/** A shallow merge, with the two native pseudo-states merged recursively. */
export const mergeTwStyle = (base: StyleDesc, next: StyleDesc): StyleDesc => {
  const hover =
    base.hover === undefined && next.hover === undefined
      ? undefined
      : { ...base.hover, ...next.hover };
  const active =
    base.active === undefined && next.active === undefined
      ? undefined
      : { ...base.active, ...next.active };
  return {
    ...base,
    ...next,
    ...(hover === undefined ? {} : { hover }),
    ...(active === undefined ? {} : { active }),
  };
};

/** A state style is a plain style; the helper keeps the TypeScript shape. */
const state = (base: StateStyle | undefined, next: StyleDesc): StateStyle => ({
  ...base,
  ...next,
});

/** Splits `dark:hover:bg-accent` at the top-level colons only. */
const splitVariants = (token: string): Split => {
  const initial: SplitState = { depth: 0, start: 0, variants: [] };
  const split = Arr.reduce(
    Str.split(token, ""),
    initial,
    (current, character, index) => {
      if (character === "[" || character === "(") {
        return { ...current, depth: current.depth + 1 };
      }
      if (character === "]" || character === ")") {
        return { ...current, depth: current.depth - 1 };
      }
      if (character === ":" && current.depth === 0) {
        return {
          ...current,
          variants: Arr.append(
            current.variants,
            Str.slice(current.start, index)(token),
          ),
          start: index + 1,
        };
      }
      return current;
    },
  );
  return {
    variants: split.variants,
    utility: Str.slice(split.start, token.length)(token),
  };
};

const RESPONSIVE = new Set(["sm", "md", "lg", "xl", "2xl"]);
const MOTION = /^(animate-|fade-|zoom-|slide-|duration-|ease-)/;
const UNSUPPORTED_VARIANT = new Set([
  "selection",
  "file",
  "placeholder",
  "supports-backdrop-filter",
  "group",
  "peer",
  "*",
]);

/**
 * Whether a state variant matches the component's state.
 *
 * `undefined` means the variant is not state-bearing. A variant we cannot
 * derive honestly stays out of this table and remains unsupported.
 */
const stateVariant = (variant: string, state: TwState): boolean | undefined =>
  Match.value(variant).pipe(
    Match.when("has-[>svg]", () => state.hasIcon === true),
    Match.when(
      "has-data-[icon=inline-start]",
      () => state.iconSide === "start",
    ),
    Match.when("has-data-[icon=inline-end]", () => state.iconSide === "end"),
    Match.when("data-expanded", () => state.expanded === true),
    Match.when("aria-expanded", () => state.expanded === true),
    Match.when("data-behind", () => state.behind === true),
    Match.when("data-limited", () => state.limited === true),
    Match.orElse(() => undefined),
  );

/** The bucket a variant list writes to, or why it is skipped. */
const bucketOf = (
  variants: ReadonlyArray<string>,
  registry: TwRegistry,
  state: TwState,
): Bucket | "skip" | "unsupported" => {
  const custom = Arr.reduce(
    registry.variants,
    Option.none<TwBucket>(),
    (found, resolve) =>
      Option.isSome(found)
        ? found
        : Option.fromNullishOr(resolve(variants, state)),
  );
  if (Option.isSome(custom)) return custom.value;

  if (Arr.some(variants, (variant) => variant === "dark")) return "skip";
  if (
    Arr.some(
      variants,
      (variant) =>
        UNSUPPORTED_VARIANT.has(variant) || Str.startsWith("[&")(variant),
    )
  ) {
    return "unsupported";
  }
  return Option.match(Arr.last(variants), {
    onNone: () => "base",
    onSome: (last) => {
      const matched = stateVariant(last, state);
      if (matched !== undefined) return matched ? "base" : "skip";
      if (last === "focus" || last === "focus-visible") return "focus";
      if (last === "aria-invalid") return "invalid";
      if (last === "disabled") return "disabled";
      if (last === "hover") return "hover";
      if (last === "active") return "active";
      if (last === "data-open" || last === "data-[state=open]") return "open";
      if (last === "data-closed" || last === "data-[state=closed]") {
        return "closed";
      }
      if (Str.startsWith("data-[side=")(last)) return "base";
      if (RESPONSIVE.has(last)) return "base";
      return "unsupported";
    },
  });
};

/** Expands `cn-*` hooks into their recipes, keeping the caller's modifiers. */
const expandAliases = (className: string, registry: TwRegistry): string =>
  pipe(
    Str.split(className, /\s+/),
    Arr.filter(Str.isNonEmpty),
    Arr.flatMap((token) => {
      const { variants, utility } = splitVariants(token);
      return Option.match(registryAlias(registry, utility), {
        onNone: () => [token],
        onSome: (recipe) =>
          pipe(
            Str.split(recipe, /\s+/),
            Arr.filter(Str.isNonEmpty),
            Arr.map((part) =>
              Arr.length(variants) === 0
                ? part
                : `${Arr.join(variants, ":")}:${part}`,
            ),
          ),
      });
    }),
    Arr.join(" "),
  );

/** Parses a ring utility into its width and colour, if it is one. */
const ringOf = (utility: string, theme: Theme): Ring | undefined => {
  if (!isRing(utility)) return undefined;
  const width = ringWidth(utility);
  const color = width === undefined ? ringColor(theme, utility) : undefined;
  if (width === undefined && color === undefined) return undefined;
  return {
    ...(width === undefined ? {} : { width }),
    ...(color === undefined ? {} : { color }),
  };
};

/** Writes a resolved style into a named state bucket. */
const setBucket = (
  result: TwResult,
  bucket: TwBucket,
  next: StyleDesc,
): TwResult =>
  Match.value(bucket).pipe(
    Match.when("focus", () => ({
      ...result,
      focus: mergeTwStyle(result.focus, next),
    })),
    Match.when("invalid", () => ({
      ...result,
      invalid: mergeTwStyle(result.invalid, next),
    })),
    Match.when("disabled", () => ({
      ...result,
      disabled: mergeTwStyle(result.disabled, next),
    })),
    Match.when("open", () => ({
      ...result,
      open: mergeTwStyle(result.open, next),
    })),
    Match.when("closed", () => ({
      ...result,
      closed: mergeTwStyle(result.closed, next),
    })),
    Match.exhaustive,
  );

/** Writes a resolved style into any bucket, including hover/active. */
const apply = (result: TwResult, bucket: Bucket, next: StyleDesc): TwResult =>
  Match.value(bucket).pipe(
    Match.when("base", () => ({
      ...result,
      style: mergeTwStyle(result.style, next),
    })),
    Match.when("hover", () => ({
      ...result,
      style: {
        ...result.style,
        hover: state(result.style.hover, next),
      },
    })),
    Match.when("active", () => ({
      ...result,
      style: {
        ...result.style,
        active: state(result.style.active, next),
      },
    })),
    Match.orElse((value) => setBucket(result, value, next)),
  );

const addRing = (
  rings: Map<Bucket, Ring>,
  bucket: Bucket,
  ring: Ring,
): Map<Bucket, Ring> => {
  const current = rings.get(bucket) ?? {};
  const next = new Map(rings);
  next.set(bucket, {
    width: ring.width ?? current.width,
    color: ring.color ?? current.color,
  });
  return next;
};

/**
 * Resolves a class string to the native style and its state buckets.
 *
 * The optional `state` makes `has-[>svg]`, `has-data-[icon=*]`,
 * `data-expanded`, `data-behind`, `data-limited` and `aria-expanded` honest:
 * they apply only when the component says they do.
 */
export const classesToStyle = (
  className: string | undefined,
  theme: Theme,
  registry: TwRegistry = defaultRegistry,
  state: TwState = {},
): TwResult => {
  const expanded = expandAliases(className ?? "", registry);
  const tokens = Arr.filter(Str.split(cn(expanded), /\s+/), Str.isNonEmpty);
  const passed = Arr.reduce(
    tokens,
    {
      result: empty(),
      rings: new Map<Bucket, Ring>(),
    } satisfies Pass,
    (current, token) => {
      const { variants, utility } = splitVariants(token);
      if (Option.isSome(registryReason(registry, token))) {
        return {
          ...current,
          result: {
            ...current.result,
            unsupported: Arr.append(current.result.unsupported, token),
          },
        };
      }

      const bucket = bucketOf(variants, registry, state);
      if (bucket === "skip") return current;
      if (bucket === "unsupported") {
        return {
          ...current,
          result: {
            ...current.result,
            unsupported: Arr.append(current.result.unsupported, token),
          },
        };
      }

      const responsive = Arr.filter(variants, (variant) =>
        RESPONSIVE.has(variant),
      );
      const result =
        Arr.length(responsive) === 0
          ? current.result
          : {
              ...current.result,
              responsive: Arr.append(current.result.responsive, token),
            };

      if (MOTION.test(utility)) {
        return {
          ...current,
          result: { ...result, motion: Arr.append(result.motion, token) },
        };
      }

      const ring = ringOf(utility, theme);
      if (ring !== undefined) {
        return {
          ...current,
          result,
          rings: addRing(current.rings, bucket, ring),
        };
      }

      const resolved = resolveRegistryUtility(registry, utility, theme);
      if (resolved === undefined) {
        // A responsive token is recorded for the later breakpoint pass; its
        // utility is not an unsupported class just because it is named-only.
        if (Arr.length(responsive) > 0) return { ...current, result };
        return {
          ...current,
          result: {
            ...result,
            unsupported: Arr.append(result.unsupported, token),
          },
        };
      }

      return { ...current, result: apply(result, bucket, resolved) };
    },
  );

  return Arr.reduce(
    Arr.fromIterable(passed.rings),
    passed.result,
    (result, [bucket, ring]) =>
      ring.width === undefined
        ? result
        : apply(result, bucket, ringShadow(theme, ring.width, ring.color)),
  );
};

/** Why a class cannot resolve, including the registry's custom reasons. */
export const unsupportedReason = (
  className: string,
  registry: TwRegistry = defaultRegistry,
): string | undefined =>
  Option.getOrUndefined(registryReason(registry, className));

/** A registry with `classesToStyle` bound to it. */
export interface TwCompiler {
  readonly registry: TwRegistry;
  readonly classesToStyle: (
    className: string | undefined,
    theme: Theme,
    state?: TwState,
  ) => TwResult;
  readonly unsupportedReason: (className: string) => string | undefined;
}

/** Builds a bound compiler for a consumer's utilities, variants and aliases. */
export const createTw = (config: TwRegistryConfig = {}): TwCompiler => {
  const registry = createTwRegistry(config);
  return {
    registry,
    classesToStyle: (className, theme, state) =>
      classesToStyle(className, theme, registry, state),
    unsupportedReason: (className) => unsupportedReason(className, registry),
  };
};
