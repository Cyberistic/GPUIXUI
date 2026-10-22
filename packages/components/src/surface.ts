/**
 * What the package's entry costs to load.
 *
 * `@gpuixui/components` is consumed from source — its `exports` map points at
 * `./src/index.ts` — so a consumer's toolchain reads every module the barrel
 * reaches, not just the component it imports. The barrel re-exports every
 * family, so that graph, not one file, is the package's import cost: a component that
 * reaches a new package is paid for by every consumer of the entry.
 *
 * The measurement is a static walk, not a build. It scans each module's
 * **runtime** import specifiers (`import type` is erased, so it costs nothing),
 * resolves the ones the caller can resolve, and sums the source bytes it
 * reached. Those bytes are what a toolchain reads and parses; a minifier's
 * output is a build concern and nothing here claims it.
 *
 * The walker takes its filesystem through {@link SurfaceIO}, so the rule is
 * testable with literal sources; `src/surface.test.ts` is the only reader of the
 * real tree, and `src/surface.budget.ts` records the numbers it holds.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";

/** A module the entry reaches, the package that owns it and its source bytes. */
export interface SurfaceModule {
  readonly path: string;
  readonly group: string;
  readonly bytes: number;
}

/** One package's share of the graph. */
export interface SurfaceGroup {
  readonly name: string;
  readonly modules: number;
  readonly bytes: number;
}

/** An external package the measured package imports, with its import sites. */
export interface SurfaceDependency {
  readonly name: string;
  readonly imports: number;
}

/** The graph the entry reaches, and every way it could not be measured. */
export interface Surface {
  readonly modules: ReadonlyArray<SurfaceModule>;
  readonly groups: ReadonlyArray<SurfaceGroup>;
  readonly dependencies: ReadonlyArray<SurfaceDependency>;
  /** A relative specifier that resolved to no file: an import the build would break on. */
  readonly unresolved: ReadonlyArray<string>;
  /** A resolved module whose source could not be read, reported rather than dropped. */
  readonly unreadable: ReadonlyArray<string>;
}

/** How the walker reaches files and decides what a module belongs to. */
export interface SurfaceIO {
  /** A module's source, `None` when it cannot be read. */
  readonly read: (path: string) => Option.Option<string>;
  /** The file a specifier names, `None` for a package outside the measured tree. */
  readonly resolve: (from: string, specifier: string) => Option.Option<string>;
  /** The package a module belongs to, for example `@gpuixui/components`. */
  readonly group: (path: string) => string;
}

/** The package part of a bare specifier; `None` for a relative path. */
export const packageName = (specifier: string): Option.Option<string> => {
  if (Str.startsWith(".")(specifier) || Str.startsWith("/")(specifier)) {
    return Option.none();
  }
  const parts = Str.split("/")(specifier);
  return Str.startsWith("@")(specifier)
    ? Option.map(
        Arr.get(parts, 1),
        (name) => `${Arr.headNonEmpty(parts)}/${name}`,
      )
    : Arr.head(parts);
};

/** A commented line is prose, not a statement — JSDoc examples import by name. */
const COMMENT = /^(?:\/\/|\*|\/\*)/;
/** `import type` / `export type … from` is erased and reaches no module. */
const TYPE_ONLY = /^(?:import|export)\s+type\b/;
/** An import or a re-export with its specifier on the same line. */
const INLINE =
  /^(?:import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|export\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+["']([^"']+)["'])/;
/** An import or re-export whose braced clause continues on the next lines. */
const OPEN_CLAUSE =
  /^(?:import|export)\s+(?:type\s+)?(?:\*\s+as\s+\w+\s*)?(?:\w+\s*,\s*)?\{[^}]*$/;
/** The closing line of a multi-line clause. */
const FROM = /^\}?\s*from\s*["']([^"']+)["']/;
/** A literal dynamic import, wherever it sits on the line. */
const DYNAMIC = /\bimport\s*\(\s*["']([^"']+)["']/g;

/** A statement whose specifier has not been seen yet. */
type Pending = "runtime" | "type";

interface Scan {
  readonly pending: Option.Option<Pending>;
  readonly specifiers: ReadonlyArray<string>;
}

const withSpecifier = (state: Scan, specifier: string): Scan => ({
  pending: Option.none(),
  specifiers: Arr.append(state.specifiers, specifier),
});

/** One trimmed line of a module, folded into the specifiers found so far. */
const step = (state: Scan, raw: string): Scan => {
  const line = Str.trim(raw);
  if (Str.isEmpty(line) || COMMENT.test(line)) return state;

  return Option.match(state.pending, {
    onSome: (kind) => {
      const from = FROM.exec(line);
      if (from) {
        return kind === "runtime"
          ? withSpecifier(state, from[1] ?? "")
          : { pending: Option.none(), specifiers: state.specifiers };
      }
      // A `}` with no `from` closes a local re-export, not a clause.
      return Str.startsWith("}")(line)
        ? { pending: Option.none(), specifiers: state.specifiers }
        : state;
    },
    onNone: () => {
      if (TYPE_ONLY.test(line)) {
        return OPEN_CLAUSE.test(line)
          ? { pending: Option.some("type"), specifiers: state.specifiers }
          : state;
      }
      const inline = INLINE.exec(line);
      if (inline) {
        return withSpecifier(state, inline[1] ?? inline[2] ?? "");
      }
      if (OPEN_CLAUSE.test(line)) {
        return {
          pending: Option.some("runtime"),
          specifiers: state.specifiers,
        };
      }
      const dynamic = Arr.fromIterable(line.matchAll(DYNAMIC)).map(
        (match) => match[1] ?? "",
      );
      return Arr.match(dynamic, {
        onEmpty: () => state,
        onNonEmpty: (specifiers) => ({
          pending: state.pending,
          specifiers: Arr.appendAll(state.specifiers, specifiers),
        }),
      });
    },
  });
};

/**
 * Every runtime import specifier a module names, in source order.
 *
 * A type-only statement, a commented-out import and a non-literal dynamic import
 * are all absent: the first two reach no module and the third cannot be resolved
 * without running the module.
 */
export const runtimeSpecifiers = (source: string): ReadonlyArray<string> => {
  const scan = (
    lines: ReadonlyArray<string>,
    state: Scan,
  ): ReadonlyArray<string> =>
    Arr.match(lines, {
      onEmpty: () => state.specifiers,
      onNonEmpty: (rest) =>
        scan(Arr.tailNonEmpty(rest), step(state, Arr.headNonEmpty(rest))),
    });
  return scan(Str.split("\n")(source), {
    pending: Option.none(),
    specifiers: [],
  });
};

interface Walk {
  readonly modules: HashMap.HashMap<string, SurfaceModule>;
  readonly dependencies: HashMap.HashMap<string, number>;
  readonly unresolved: HashSet.HashSet<string>;
  readonly unreadable: HashSet.HashSet<string>;
}

const emptyWalk = (): Walk => ({
  modules: HashMap.empty(),
  dependencies: HashMap.empty(),
  unresolved: HashSet.empty(),
  unreadable: HashSet.empty(),
});

/** A package the root's own modules import, counted once per import site. */
const addDependency = (state: Walk, name: string): Walk => ({
  ...state,
  dependencies: HashMap.set(
    state.dependencies,
    name,
    Option.getOrElse(HashMap.get(state.dependencies, name), () => 0) + 1,
  ),
});

const walk = (
  entry: string,
  root: string,
  io: SurfaceIO,
  state: Walk,
): Walk => {
  if (
    HashMap.has(state.modules, entry) ||
    HashSet.has(state.unreadable, entry)
  ) {
    return state;
  }
  return Option.match(io.read(entry), {
    onNone: () => ({
      ...state,
      unreadable: HashSet.add(state.unreadable, entry),
    }),
    onSome: (source) => {
      const group = io.group(entry);
      const here: Walk = {
        ...state,
        modules: HashMap.set(state.modules, entry, {
          path: entry,
          group,
          bytes: new TextEncoder().encode(source).byteLength,
        }),
      };
      return Arr.reduce(runtimeSpecifiers(source), here, (next, specifier) =>
        Option.match(io.resolve(entry, specifier), {
          onSome: (target) => walk(target, root, io, next),
          onNone: () =>
            Option.match(packageName(specifier), {
              onSome: (name) =>
                group === root ? addDependency(next, name) : next,
              onNone: () => ({
                ...next,
                unresolved: HashSet.add(
                  next.unresolved,
                  `${entry} -> ${specifier}`,
                ),
              }),
            }),
        }),
      );
    },
  });
};

const byPath = Order.mapInput(
  Order.String,
  (module: SurfaceModule) => module.path,
);
const byName = Order.mapInput(
  Order.String,
  (value: { readonly name: string }) => value.name,
);

const groupSummaries = (
  modules: ReadonlyArray<SurfaceModule>,
): ReadonlyArray<SurfaceGroup> =>
  pipe(
    modules,
    Arr.reduce(HashMap.empty<string, SurfaceGroup>(), (groups, module) => {
      const seen = Option.getOrElse(HashMap.get(groups, module.group), () => ({
        name: module.group,
        modules: 0,
        bytes: 0,
      }));
      return HashMap.set(groups, module.group, {
        name: seen.name,
        modules: seen.modules + 1,
        bytes: seen.bytes + module.bytes,
      });
    }),
    HashMap.values,
    Arr.fromIterable,
    (groups) => Arr.sort(groups, byName),
  );

/** Walk `entry` and everything it reaches. */
export const measureSurface = (entry: string, io: SurfaceIO): Surface => {
  const state = walk(entry, io.group(entry), io, emptyWalk());
  const modules = pipe(
    state.modules,
    HashMap.values,
    Arr.fromIterable,
    (values) => Arr.sort(values, byPath),
  );
  return {
    modules,
    groups: groupSummaries(modules),
    dependencies: pipe(
      state.dependencies,
      HashMap.entries,
      Arr.fromIterable,
      Arr.map(([name, imports]) => ({ name, imports })),
      (dependencies) => Arr.sort(dependencies, byName),
    ),
    unresolved: pipe(state.unresolved, Arr.fromIterable, (values) =>
      Arr.sort(values, Order.String),
    ),
    unreadable: pipe(state.unreadable, Arr.fromIterable, (values) =>
      Arr.sort(values, Order.String),
    ),
  };
};
