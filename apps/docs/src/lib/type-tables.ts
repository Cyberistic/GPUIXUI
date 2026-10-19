/**
 * The two pieces of an `<auto-type-table>` that decide whether a component
 * page renders an API table or an empty heading (plan 581).
 */
export interface TypeTableTarget {
  /** The page-relative path to the source file that declares the type. */
  readonly path: string;
  /** The exported props type the table generates. */
  readonly name: string;
}

const AUTO_TYPE_TABLE = /<auto-type-table\b([^>]*)>/g;
const ATTRIBUTE = /([\w-]+)\s*=\s*"([^"]*)"/g;

/** Fenced blocks show the tag as example text; they declare no table. */
const withoutFences = (mdx: string): string =>
  mdx.replace(/^[ \t]*```[^\n]*\n[\s\S]*?^[ \t]*```[^\n]*$/gm, "");

const attributesOf = (source: string): ReadonlyMap<string, string> =>
  new Map(
    [...source.matchAll(ATTRIBUTE)].flatMap((match) => {
      const [, key, value] = match;
      return key === undefined || value === undefined
        ? []
        : [[key, value] as const];
    }),
  );

/**
 * Every real table declaration on a page, in source order. Both attributes are
 * required; a tag that omits one is reported by `malformedTypeTables` instead
 * of disappearing from this list.
 */
export const typeTableTargets = (mdx: string): ReadonlyArray<TypeTableTarget> =>
  [...withoutFences(mdx).matchAll(AUTO_TYPE_TABLE)].flatMap((match) => {
    const attributes = attributesOf(match[1] ?? "");
    const path = attributes.get("path");
    const name = attributes.get("name");
    return path === undefined || name === undefined ? [] : [{ path, name }];
  });

/**
 * Table tags that name a table but carry no `path` or no `name`. An incomplete
 * tag is the same defect as an empty table: it renders nothing, silently.
 */
export const malformedTypeTables = (mdx: string): ReadonlyArray<string> =>
  [...withoutFences(mdx).matchAll(AUTO_TYPE_TABLE)].flatMap((match) => {
    const attributes = attributesOf(match[1] ?? "");
    return attributes.has("path") && attributes.has("name") ? [] : [match[0]];
  });
