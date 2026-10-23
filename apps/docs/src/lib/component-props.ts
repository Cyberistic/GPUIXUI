import { readFileSync, readdirSync } from "node:fs";

/**
 * The props a package component declares, read from its source.
 *
 * A curated page's API table is its most copyable claim, and two directions
 * matter: a name the page prints must exist (`component-page.test.ts` resolves
 * that already) and a prop the component declares must have a row. The second
 * direction is a compiler question — through `extends`, an alias intersection
 * and `Omit` — so the site reads the declarations the way
 * `packages/primitives/src/docs.test.ts` §The primitives API tables does, with
 * the same four rules:
 *
 * - an interface contributes its own fields and its parents';
 * - an alias contributes the members of its intersection or union;
 * - `Omit<T, "a">` subtracts, and a cycle cannot recurse;
 * - a type no scanned package declares is the runtime's own surface (`Props`,
 *   and what `ActionHostProps` omits it from) and stays opaque: its properties
 *   are not this repository's to document.
 *
 * Names collide across packages — `FieldProps` is the primitives package's text
 * field and the components package's labelled field, and `InputProps` is an
 * alias of the first — so a name resolves inside the package that referred to
 * it, then inside the package the page installs from, then anywhere. A flat
 * map would document the wrong component's surface.
 *
 * Node-only, and only the suite imports it, so the site bundle carries neither
 * the reader nor a filesystem call.
 */

/** The packages a curated page documents. */
export const packages = ["primitives", "components", "data"] as const;

/** One of the packages a curated page installs from. */
export type Package = (typeof packages)[number];

const root = new URL("../../../../", import.meta.url);

/** A props type as its source declares it: fields, parents, or an alias body. */
export interface DeclaredType {
  readonly props: ReadonlyArray<string>;
  readonly parents: ReadonlyArray<string>;
  readonly alias?: string;
  /** The package that declares it, so its parents resolve there first. */
  readonly pkg: Package;
}

/** Every declaration the documented packages carry, by name then package. */
export interface TypeIndex {
  readonly byName: ReadonlyMap<string, ReadonlyMap<Package, DeclaredType>>;
  /** The package a page installs from; absent when no page context applies. */
  readonly prefer?: Package;
}

/** An interface header, however its `extends` list is wrapped. */
const INTERFACE_HEADER =
  /(?:^|\n)(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g;

/** A type alias header; its body ends at the `;` at its own level. */
const TYPE_ALIAS = /(?:^|\n)(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g;

/**
 * A `Schema.Class` whose constructor takes its fields as an object literal —
 * the shape the toast draft (`ToastInput`) is declared in.
 */
const SCHEMA_CLASS =
  /(?:^|\n)export\s+class\s+(\w+)\s+extends\s+Schema\.Class<[^>]+>\([^)]*\)\(\s*\{/g;

/** `readonly name?:`, `name?:` and the quoted form a hyphenated prop takes. */
const PROP_SIGNATURE =
  /^\s*(?:readonly\s+)?(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/;

/**
 * The text between a `{` and its matching `}`.
 *
 * A bracket scan says more than a combinator here: it stops at the first
 * balanced close instead of visiting the rest of the file.
 */
const balancedBody = (source: string, open: number): string | undefined => {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return undefined;
};

/** An alias body, up to the `;` that ends it at its own level. */
const aliasBody = (source: string, start: number): string | undefined => {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if ("{([".includes(char)) depth += 1;
    else if ("})]".includes(char)) depth -= 1;
    else if (char === ";" && depth === 0) return source.slice(start, index);
  }
  return undefined;
};

/**
 * The prop names one object type's body declares at its own level.
 *
 * A nested object (`readonly style?: { readonly color: string }`) is a prop's
 * shape, not a set of props, so its members are skipped — depth is read at the
 * start of each line, before the line moves it. Comments are stripped first:
 * a doc comment quotes code (`style={(state) => ({ ... })}`), and its brackets
 * are prose.
 */
const signatureNames = (body: string): ReadonlyArray<string> =>
  body
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .reduce<{ readonly names: ReadonlyArray<string>; readonly depth: number }>(
      (state, line) => {
        const name =
          state.depth === 0
            ? PROP_SIGNATURE.exec(line)
                ?.slice(1)
                .find((part) => part !== undefined)
            : undefined;
        const moved =
          [...line].filter((char) => "{([".includes(char)).length -
          [...line].filter((char) => "})]".includes(char)).length;
        return {
          names: name === undefined ? state.names : [...state.names, name],
          depth: state.depth + moved,
        };
      },
      { names: [], depth: 0 },
    ).names;

/**
 * The members of an intersection or a union, split only at its own level.
 *
 * `(`/`{`/`[` count as nesting; a generic's angle brackets do not, because a
 * function type's `=>` would look like a close.
 */
const typeParts = (body: string): ReadonlyArray<string> => {
  const parts: Array<string> = [];
  let current = "";
  let depth = 0;
  for (const char of body) {
    if ("{([".includes(char)) depth += 1;
    else if ("})]".includes(char)) depth -= 1;
    if ((char === "&" || char === "|") && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  return [...parts, current]
    .map((part) => part.trim())
    .filter((part) => part !== "");
};

/**
 * The interfaces an `extends` clause names, split at its own commas.
 *
 * A generic's comma belongs to the generic — `Omit<MenuItemProps, "onSelect">`
 * is one parent, not two — so an unclosed `<` keeps the split waiting.
 */
const parentParts = (clause: string): ReadonlyArray<string> => {
  const parts: Array<string> = [];
  let current = "";
  let depth = 0;
  let generic = 0;
  for (const char of clause) {
    if ("{([".includes(char)) depth += 1;
    else if ("})]".includes(char)) depth -= 1;
    else if (char === "<") generic += 1;
    else if (char === ">") generic = Math.max(0, generic - 1);
    if (char === "," && depth === 0 && generic === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  return [...parts, current]
    .map((part) => part.trim())
    .filter((part) => part !== "");
};

/**
 * Every props declaration the documented packages carry.
 *
 * `prefer` is the package the page installs from: it wins a name that another
 * package also declares, and a name resolves inside the package that referred
 * to it before either. The other packages are still read, so a parent declared
 * across a boundary (`data`'s table extending `primitives`' field props)
 * resolves.
 */
export const declaredTypes = (prefer?: Package): TypeIndex => {
  const byName = new Map<string, Map<Package, DeclaredType>>();
  const remember = (name: string, declared: DeclaredType): void => {
    const seen = byName.get(name) ?? new Map<Package, DeclaredType>();
    seen.set(declared.pkg, declared);
    byName.set(name, seen);
  };
  for (const pkg of packages) {
    const dir = new URL(`packages/${pkg}/src/`, root);
    for (const name of readdirSync(dir, {
      recursive: true,
      encoding: "utf8",
    })) {
      if (!/\.tsx?$/.test(name) || name.includes(".test.")) continue;
      const source = readFileSync(new URL(name, dir), "utf8");
      for (const match of source.matchAll(INTERFACE_HEADER)) {
        const body = balancedBody(
          source,
          (match.index ?? 0) + match[0].length - 1,
        );
        if (body === undefined) continue;
        remember(match[1] ?? "", {
          props: signatureNames(body),
          parents: parentParts(match[2] ?? ""),
          pkg,
        });
      }
      for (const match of source.matchAll(SCHEMA_CLASS)) {
        const body = balancedBody(
          source,
          (match.index ?? 0) + match[0].length - 1,
        );
        if (body !== undefined)
          remember(match[1] ?? "", {
            props: signatureNames(body),
            parents: [],
            pkg,
          });
      }
      for (const match of source.matchAll(TYPE_ALIAS)) {
        const alias = aliasBody(source, (match.index ?? 0) + match[0].length);
        if (alias !== undefined)
          remember(match[1] ?? "", {
            props: [],
            parents: [],
            alias,
            pkg,
          });
      }
    }
  }
  return prefer === undefined ? { byName } : { byName, prefer };
};

/** The declaration a name resolves to, from the package that named it outward. */
const declarationOf = (
  name: string,
  index: TypeIndex,
  from?: Package,
): DeclaredType | undefined => {
  const declared = index.byName.get(name);
  if (declared === undefined) return undefined;
  for (const pkg of [from, index.prefer, ...packages])
    if (pkg !== undefined) {
      const found = declared.get(pkg);
      if (found !== undefined) return found;
    }
  return undefined;
};

/**
 * One member of a type expression: an inline object, an `Omit`, a parenthesised
 * group, or a named type.
 */
const resolvePart = (
  part: string,
  index: TypeIndex,
  seen: ReadonlySet<string>,
  from?: Package,
): ReadonlyArray<string> => {
  const trimmed = part.trim();
  const grouped = /^\(([\s\S]*)\)$/.exec(trimmed)?.[1];
  if (grouped !== undefined)
    return typeParts(grouped).flatMap((inner) =>
      resolvePart(inner, index, seen, from),
    );
  if (trimmed.startsWith("{") && trimmed.endsWith("}"))
    return signatureNames(trimmed.slice(1, -1));
  const omit = /^Omit<\s*([\w.]+)\s*,\s*([\s\S]+?)\s*>$/.exec(trimmed);
  if (omit !== null) {
    const removed = [...(omit[2] ?? "").matchAll(/"([^"]+)"/g)].map(
      (match) => match[1] ?? "",
    );
    return propsOf(omit[1] ?? "", index, seen, from).filter(
      (prop) => !removed.includes(prop),
    );
  }
  const named = /^([A-Za-z_]\w*)/.exec(trimmed)?.[1];
  return named === undefined ? [] : propsOf(named, index, seen, from);
};

/**
 * Every prop a type carries, through `extends`, an alias intersection or union
 * and `Omit`. A name no scanned package declares is the runtime's own surface
 * and contributes nothing; `seen` keeps a cycle from recursing.
 */
export const propsOf = (
  name: string,
  index: TypeIndex,
  seen: ReadonlySet<string> = new Set(),
  from?: Package,
): ReadonlyArray<string> => {
  if (seen.has(name)) return [];
  const next = new Set(seen).add(name);
  const declared = declarationOf(name, index, from);
  if (declared === undefined) return [];
  if (declared.alias === undefined)
    return [
      ...declared.props,
      ...declared.parents.flatMap((parent) =>
        resolvePart(parent, index, next, declared.pkg),
      ),
    ];
  return typeParts(declared.alias).flatMap((part) =>
    resolvePart(part, index, next, declared.pkg),
  );
};
