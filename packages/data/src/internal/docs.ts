import * as Arr from "effect/Array";

export interface TypeRef {
  readonly source: string;

  readonly name: string;
}

export interface PageClaim {
  readonly page: string;

  readonly types: ReadonlyArray<TypeRef>;

  readonly heading: string;

  readonly omit?: ReadonlyArray<string>;
}

export const hostProps: ReadonlySet<string> = new Set([
  "style",
  "ref",
  "testId",
  "aria-label",
  "tabIndex",
]);

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
