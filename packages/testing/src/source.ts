import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";

export interface PropsRoot {
  readonly pkg: string;
  readonly dir: URL;
}

export interface DeclaredType {
  readonly file: string;

  readonly pkg: string;
  readonly props: ReadonlyArray<string>;
  readonly parents: ReadonlyArray<string>;

  readonly alias?: string;
}

export interface PropsIndex {
  readonly roots: ReadonlyArray<string>;
  readonly declarations: ReadonlyMap<string, ReadonlyMap<string, DeclaredType>>;
}

const INTERFACE_HEADER =
  /(?:^|\n)(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g;

const TYPE_ALIAS = /(?:^|\n)(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g;

const PROP_SIGNATURE =
  /(?:readonly\s+|^[ \t]*)(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/gm;

const signatureNames = (body: string): ReadonlyArray<string> =>
  Arr.filterMap(Arr.fromIterable(body.matchAll(PROP_SIGNATURE)), (match) =>
    Result.succeed(match[1] ?? match[2] ?? ""),
  );

const balancedBody = (source: string, open: number): Option.Option<string> => {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return Option.some(source.slice(open + 1, index));
    }
  }
  return Option.none();
};

const aliasBody = (source: string, start: number): Option.Option<string> => {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if ("{([".includes(char)) depth += 1;
    else if ("})]".includes(char)) depth -= 1;
    else if (char === ";" && depth === 0)
      return Option.some(source.slice(start, index));
  }
  return Option.none();
};

const typeParts = (body: string): ReadonlyArray<string> => {
  const opened = "{([";
  const closed = "})]";
  const initial: {
    readonly parts: ReadonlyArray<string>;
    readonly current: string;
    readonly depth: number;
  } = { parts: [], current: "", depth: 0 };
  const scanned = Arr.reduce(Arr.fromIterable(body), initial, (state, char) => {
    const depth = opened.includes(char)
      ? state.depth + 1
      : closed.includes(char)
        ? state.depth - 1
        : state.depth;
    return state.depth === 0 && (char === "&" || char === "|")
      ? { parts: [...state.parts, state.current], current: "", depth }
      : { parts: state.parts, current: `${state.current}${char}`, depth };
  });
  return Arr.filter(
    Arr.map([...scanned.parts, scanned.current], Str.trim),
    Str.isNonEmpty,
  );
};

const parentParts = (clause: string): ReadonlyArray<string> => {
  const opened = "{([";
  const closed = "})]";
  const initial: {
    readonly parts: ReadonlyArray<string>;
    readonly current: string;
    readonly depth: number;
    readonly generic: number;
  } = { parts: [], current: "", depth: 0, generic: 0 };
  const scanned = Arr.reduce(
    Arr.fromIterable(clause),
    initial,
    (state, char) => {
      const depth = opened.includes(char)
        ? state.depth + 1
        : closed.includes(char)
          ? state.depth - 1
          : state.depth;
      const generic =
        char === "<"
          ? state.generic + 1
          : char === ">"
            ? Math.max(0, state.generic - 1)
            : state.generic;
      return char === "," && state.depth === 0 && state.generic === 0
        ? {
            parts: [...state.parts, state.current],
            current: "",
            depth,
            generic,
          }
        : {
            parts: state.parts,
            current: `${state.current}${char}`,
            depth,
            generic,
          };
    },
  );
  return Arr.filter(
    Arr.map(Arr.fromIterable([...scanned.parts, scanned.current]), Str.trim),
    Str.isNonEmpty,
  );
};

const sourceFiles = (dir: URL): ReadonlyArray<string> =>
  Arr.filter(
    readdirSync(fileURLToPath(dir), {
      recursive: true,
      encoding: "utf8",
    }),
    (name) =>
      /\.tsx?$/.test(name) &&
      !name.includes(".test.") &&
      !Str.endsWith(".d.ts")(name),
  );

const readSource = (dir: URL, file: string): string =>
  readFileSync(fileURLToPath(new URL(file, dir)), "utf8");

export const indexProps = (roots: ReadonlyArray<PropsRoot>): PropsIndex => {
  const declarations = new Map<string, Map<string, DeclaredType>>();
  const remember = (name: string, declared: DeclaredType): void => {
    const seen = declarations.get(name) ?? new Map<string, DeclaredType>();
    seen.set(declared.pkg, declared);
    declarations.set(name, seen);
  };
  Arr.forEach(roots, ({ pkg, dir }) => {
    Arr.forEach(sourceFiles(dir), (file) => {
      const source = readSource(dir, file);
      Arr.forEach(
        Arr.fromIterable(source.matchAll(INTERFACE_HEADER)),
        (match) => {
          const open = (match.index ?? 0) + match[0].length - 1;
          Option.match(balancedBody(source, open), {
            onNone: () => undefined,
            onSome: (body) =>
              remember(match[1] ?? "", {
                file,
                props: signatureNames(body),
                parents: parentParts(match[2] ?? ""),
                pkg,
              }),
          });
        },
      );
      Arr.forEach(Arr.fromIterable(source.matchAll(TYPE_ALIAS)), (match) => {
        const start = (match.index ?? 0) + match[0].length;
        Option.match(aliasBody(source, start), {
          onNone: () => undefined,
          onSome: (alias) =>
            remember(match[1] ?? "", {
              file,
              props: [],
              parents: [],
              alias,
              pkg,
            }),
        });
      });
    });
  });
  return { roots: Arr.map(roots, (root) => root.pkg), declarations };
};

export const typeNames = (index: PropsIndex): ReadonlyArray<string> =>
  Arr.fromIterable(index.declarations.keys());

export const declarationIn = (
  name: string,
  index: PropsIndex,
  pkg: string,
): Option.Option<DeclaredType> =>
  Option.fromNullishOr(index.declarations.get(name)?.get(pkg));

const declarationOf = (
  name: string,
  index: PropsIndex,
  from?: string,
): Option.Option<DeclaredType> => {
  const declared = index.declarations.get(name);
  if (declared === undefined) return Option.none();
  const order = Arr.dedupe(
    Arr.filter(
      Arr.fromIterable([from, ...index.roots]),
      (pkg): pkg is string => pkg !== undefined && Str.isNonEmpty(pkg),
    ),
  );
  return Option.flatMap(
    Arr.findFirst(order, (pkg) => declared.has(pkg)),
    (pkg) => Option.fromNullishOr(declared.get(pkg)),
  );
};

export const propsOf = (
  name: string,
  index: PropsIndex,
  from?: string,
): ReadonlyArray<string> => propsIn(name, index, new Set(), from);

const propsIn = (
  name: string,
  index: PropsIndex,
  seen: ReadonlySet<string>,
  from?: string,
): ReadonlyArray<string> => {
  if (seen.has(name)) return [];
  const next = new Set([...seen, name]);
  return Option.match(declarationOf(name, index, from), {
    onNone: () => [],
    onSome: (declared) =>
      declared.alias === undefined
        ? [
            ...declared.props,
            ...Arr.flatMap(declared.parents, (parent) =>
              resolvePart(parent, index, next, declared.pkg),
            ),
          ]
        : Arr.flatMap(typeParts(declared.alias), (part) =>
            resolvePart(part, index, next, declared.pkg),
          ),
  });
};

const resolvePart = (
  part: string,
  index: PropsIndex,
  seen: ReadonlySet<string>,
  from: string,
): ReadonlyArray<string> => {
  if (part.startsWith("(") && part.endsWith(")")) {
    return Arr.flatMap(typeParts(part.slice(1, -1)), (inner) =>
      resolvePart(inner, index, seen, from),
    );
  }
  if (part.startsWith("{")) return signatureNames(part);
  const omit = /^Omit<\s*([\w.]+)\s*,\s*([\s\S]+)>$/.exec(part);
  if (omit !== null) {
    const removed = Arr.map(
      Arr.fromIterable((omit[2] ?? "").matchAll(/"([^"]+)"/g)),
      (match) => match[1] ?? "",
    );
    return Arr.filter(
      propsIn(omit[1] ?? "", index, seen, from),
      (prop) => !Arr.contains(removed, prop),
    );
  }
  const named = /^([A-Za-z_]\w*)/.exec(part)?.[1];
  return named === undefined ? [] : propsIn(named, index, seen, from);
};
