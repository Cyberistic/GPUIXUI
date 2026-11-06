import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";

export interface SurfaceModule {
  readonly path: string;
  readonly group: string;
  readonly bytes: number;
}

export interface SurfaceGroup {
  readonly name: string;
  readonly modules: number;
  readonly bytes: number;
}

export interface SurfaceDependency {
  readonly name: string;
  readonly imports: number;
}

export interface Surface {
  readonly modules: ReadonlyArray<SurfaceModule>;
  readonly groups: ReadonlyArray<SurfaceGroup>;
  readonly dependencies: ReadonlyArray<SurfaceDependency>;

  readonly unresolved: ReadonlyArray<string>;

  readonly unreadable: ReadonlyArray<string>;
}

export interface SurfaceIO {
  readonly read: (path: string) => Option.Option<string>;

  readonly resolve: (from: string, specifier: string) => Option.Option<string>;

  readonly group: (path: string) => string;
}

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

const COMMENT = /^(?:\/\/|\*|\/\*)/;

const TYPE_ONLY = /^(?:import|export)\s+type\b/;

const INLINE =
  /^(?:import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|export\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+["']([^"']+)["'])/;

const OPEN_CLAUSE =
  /^(?:import|export)\s+(?:type\s+)?(?:\*\s+as\s+\w+\s*)?(?:\w+\s*,\s*)?\{[^}]*$/;

const FROM = /^\}?\s*from\s*["']([^"']+)["']/;

const DYNAMIC = /\bimport\s*\(\s*["']([^"']+)["']/g;

type Pending = "runtime" | "type";

interface Scan {
  readonly pending: Option.Option<Pending>;
  readonly specifiers: ReadonlyArray<string>;
}

const withSpecifier = (state: Scan, specifier: string): Scan => ({
  pending: Option.none(),
  specifiers: Arr.append(state.specifiers, specifier),
});

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
