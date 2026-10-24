/**
 * Reading a page's API table against the props its types declare.
 *
 * Test support only, the shape `internal/a11y.ts` and `internal/interaction.ts`
 * use: a documentation guard is a property of the repository's Markdown, not of
 * anything the package ships, so the reader lives here and the suites that own
 * a page's claims sit beside the page's area.
 *
 * The two directions are the point. A prop added to a type and left out of the
 * page teaches a reader an older API (they write something the component
 * ignores), and a row removed from a table leaves the prop undocumented with
 * every suite green.
 *
 * The reader is deliberately small: it reads the interface's **own** fields —
 * the runtime's `Props` surface is opaque, because it is large, host-supplied
 * and not this page's to enumerate — and it allows the handful of host props a
 * page may name beside them. A union (`PropertyRow`) is read as the fields of
 * its members; an `extends` clause is allowed, a parent type is named as one
 * more reference, and an `Omit` is honoured by naming the omitted fields in the
 * claim.
 */

import * as Arr from "effect/Array";

/** One interface a page's table documents, and the file that declares it. */
export interface TypeRef {
  /** The source file, with its extension, as the claim's reader resolves it. */
  readonly source: string;
  /** The exported interface's name. */
  readonly name: string;
}

/** One page and the types its one table documents. */
export interface PageClaim {
  /** The file under `docs/`, e.g. `tree-view.mdx`. */
  readonly page: string;
  /** The interfaces the table documents; a union names every member. */
  readonly types: ReadonlyArray<TypeRef>;
  /** The `###` heading the table sits under, without backticks. */
  readonly heading: string;
  /** Fields an `extends … Omit<…>` clause takes away from a parent. */
  readonly omit?: ReadonlyArray<string>;
}

/**
 * Names a page may document that the runtime's own `Props` surface supplies.
 *
 * A host prop is passed through the component and is not declared on its own
 * props interface, so a page that lists one (a grid names its `style` and its
 * `ref`) is documenting a real contract, not inventing one.
 */
export const hostProps: ReadonlySet<string> = new Set([
  "style",
  "ref",
  "testId",
  "aria-label",
  "tabIndex",
]);

/** The flat `readonly` fields an exported interface declares. */
export const declaredProps = (
  source: string,
  name: string,
): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${name}(?:<[^>]*>)?(?:\\s+extends[^{]*)?\\s*\\{([\\s\\S]*?)\\n\\}`,
  ).exec(source)?.[1];
  if (body === undefined) throw new Error(`no ${name} interface`);
  return [...body.matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

/**
 * The props one heading's table documents: every backticked token in the first
 * cell, in source order.
 *
 * The section ends at the next heading of the same or a higher level, so a
 * nested shape's table is not counted as part of the component's. A row may
 * document several props at once (`widthOf` / `offsetOf`), so the cell is split
 * rather than read as one name.
 */
export const documentedProps = (
  page: string,
  heading: string,
): ReadonlyArray<string> => {
  const section = new RegExp(
    `^### \`${heading}\`\\n([\\s\\S]*?)(?=^#{2,3} |$(?![\\s\\S]))`,
    "m",
  ).exec(page)?.[1];
  if (section === undefined) throw new Error(`no ${heading} section`);
  return Arr.dedupe(
    [...section.matchAll(/^\| (.+?) \|/gm)].flatMap((match) =>
      [...(match[1] ?? "").matchAll(/`([^`]+)`/g)].flatMap((cell) =>
        (cell[1] ?? "").split(" / ").map((name) => name.trim()),
      ),
    ),
  );
};

/**
 * A page's claims against the types they document, failing with the symmetric
 * difference.
 *
 * A name the page documents that a type does not declare is reported unless it
 * is a {@link hostProps host prop}; a field a type declares and the page omits
 * is always reported.
 */
export const undocumentedProps = (
  claims: ReadonlyArray<PageClaim>,
  readPage: (file: string) => string,
  readSource: (file: string) => string,
): ReadonlyArray<string> =>
  Arr.flatMap(claims, (claim) => {
    const declared = Arr.filter(
      Arr.dedupe(
        Arr.flatMap(claim.types, (type) =>
          declaredProps(readSource(type.source), type.name),
        ),
      ),
      (prop) => !(claim.omit ?? []).includes(prop),
    );
    const documented = documentedProps(readPage(claim.page), claim.heading);
    return [
      ...Arr.filter(declared, (prop) => !documented.includes(prop)).map(
        (prop) => `${claim.heading}: ${prop}`,
      ),
      ...Arr.filter(
        documented,
        (prop) => !declared.includes(prop) && !hostProps.has(prop),
      ).map((prop) => `${claim.heading}: ${prop} is not declared`),
    ];
  });
