import { readFileSync, readdirSync } from "node:fs";

export const packages = ["primitives", "components", "data"] as const;

export type Package = (typeof packages)[number];

const root = new URL("../../../../", import.meta.url);

export interface DeclaredType {
  readonly props: ReadonlyArray<string>;
  readonly parents: ReadonlyArray<string>;
  readonly alias?: string;

  readonly pkg: Package;
}

export interface TypeIndex {
  readonly byName: ReadonlyMap<string, ReadonlyMap<Package, DeclaredType>>;

  readonly prefer?: Package;
}

const INTERFACE_HEADER =
  /(?:^|\n)(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g;

const TYPE_ALIAS = /(?:^|\n)(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g;

const SCHEMA_CLASS =
  /(?:^|\n)export\s+class\s+(\w+)\s+extends\s+Schema\.Class<[^>]+>\([^)]*\)\(\s*\{/g;

const PROP_SIGNATURE =
  /^\s*(?:readonly\s+)?(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/;

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
