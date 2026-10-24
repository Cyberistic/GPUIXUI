/**
 * The props types a package's source declares, read from the repository.
 *
 * Two page contracts hold a page's `## API` tables to the source: the
 * primitives' suite and the components' suite. Both resolved an interface's own
 * fields through `extends`, an alias's intersection, a parenthesised branch and
 * an `Omit` with a reader of their own, so one fix landed in one copy and the
 * other drifted. This module is that reader, once.
 *
 * It is a **test-time repository read**: `node:fs` directly, no Effect platform
 * layer, because both callers are plain vitest cases and a guard that needed a
 * runtime provided could stop being the check that any host can run. It never
 * touches the GPUix binding, so it stays in the platform-free half of this
 * package.
 *
 * The reader is deliberately a shape reader, not a TypeScript program: a props
 * type is an interface's fields, its parents, or an alias body, and a name no
 * root declares is the runtime's own surface (`Props`, `ChildProps`, the
 * floating helpers) — not this repository's to document.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";

/**
 * One source tree to read, and the package name a declaration is filed under.
 *
 * The name is not displayed: it is the preference key, so a type both packages
 * declare (`FieldProps`) resolves first in the package that named it.
 */
export interface PropsRoot {
  readonly pkg: string;
  readonly dir: URL;
}

/** A props type as its source declares it: fields, parents, or an alias body. */
export interface DeclaredType {
  /** The file that declares it, relative to its root — `field.tsx`, `list/row.ts`. */
  readonly file: string;
  /** The root this declaration came from, so its own parents resolve there first. */
  readonly pkg: string;
  readonly props: ReadonlyArray<string>;
  readonly parents: ReadonlyArray<string>;
  /** An alias's right-hand side, when the declaration is a `type`. */
  readonly alias?: string;
}

/** Every declaration the roots carry: by type name, then by declaring package. */
export interface PropsIndex {
  /** The roots in the order they were indexed, the fallback resolution order. */
  readonly roots: ReadonlyArray<string>;
  readonly declarations: ReadonlyMap<string, ReadonlyMap<string, DeclaredType>>;
}

/** An interface header, however its `extends` list is wrapped. */
const INTERFACE_HEADER =
  /(?:^|\n)(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g;

/** A type alias header; its body is taken up to the terminating `;`. */
const TYPE_ALIAS = /(?:^|\n)(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g;

/** `readonly name?:` and `readonly "aria-id"?:`, the shape every prop is written in. */
const PROP_SIGNATURE =
  /(?:readonly\s+|^[ \t]*)(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/gm;

/** The prop names one object type's body declares. */
const signatureNames = (body: string): ReadonlyArray<string> =>
  Arr.filterMap(Arr.fromIterable(body.matchAll(PROP_SIGNATURE)), (match) =>
    Result.succeed(match[1] ?? match[2] ?? ""),
  );

/**
 * The text between a `{` and its matching `}`, comments and all.
 *
 * A bracket scan is the one place an index walk says more than a combinator
 * can: it stops at the first balanced close instead of visiting the rest of the
 * file. A prop's doc comment contains braces of its own, which a character
 * class cannot track.
 */
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

/**
 * An alias body, up to the `;` that ends it at its own level.
 *
 * Only bracketing is tracked: a function type's `=>` would look like the close
 * of a generic to a `<>` counter, and a `;` inside an inline object is behind a
 * `{`. This is the same first-balanced-close scan as {@link balancedBody}.
 */
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

/** The members of an intersection or union, split only at its own level. */
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

/**
 * The interfaces an `extends` clause names, split at its own commas.
 *
 * A generic's comma belongs to the generic — `Omit<InputProps, "style">` is one
 * parent, not two — so an unclosed `<` keeps the split waiting. Splitting on
 * commas alone read the cross-package parent as `Omit<InputProps` plus a stray
 * `"style">`, so a field's inherited surface resolved to nothing.
 */
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

/** Every source file under one root whose declarations a page's props read from. */
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

/** One source file's text, relative to its root. */
const readSource = (dir: URL, file: string): string =>
  readFileSync(fileURLToPath(new URL(file, dir)), "utf8");

/**
 * Indexes every props declaration the roots carry, by name and package.
 *
 * A name two roots both declare keeps both. A later declaration of one name in
 * one package replaces the earlier one, the rule a duplicate interface already
 * breaks at compile time.
 */
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

/** Every type name the index carries, in the order its roots declared them. */
export const typeNames = (index: PropsIndex): ReadonlyArray<string> =>
  Arr.fromIterable(index.declarations.keys());

/** The declaration `pkg` makes for `name`, when it makes one. */
export const declarationIn = (
  name: string,
  index: PropsIndex,
  pkg: string,
): Option.Option<DeclaredType> =>
  Option.fromNullishOr(index.declarations.get(name)?.get(pkg));

/**
 * The declaration a name resolves to, from the package that named it out.
 *
 * `from` is tried first, then the roots in the order they were indexed, so a
 * cross-package parent resolves inside the package that wrote it and a shared
 * name resolves in the package whose page is being held.
 */
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

/**
 * Every prop a type carries, through `extends`, an alias intersection, a
 * parenthesised branch of a union, and an `Omit`.
 *
 * A name no root declares is the runtime's own surface (`Props` and the
 * floating helpers): its properties are not this repository's to document, so
 * it contributes nothing. `seen` keeps a cycle from recursing. The result is
 * not deduplicated — a caller that needs names as a set builds one.
 */
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

/** One alias member or parent, through a grouping parenthesis, an object, or an `Omit`. */
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
