/**
 * The rule behind plan 388: a suite whose case title claims "every shipped set"
 * or "every shipped theme" must read {@link shippedThemes} rather than rebuild
 * the matrix, so a new platform, recipe or contrast cannot be silently omitted.
 *
 * The rule and its fixtures live beside the suite rather than inside it because
 * the fixtures are test-shaped source, and the repository's `check-tests` scanner
 * reads a `*.test.ts` literal as a test that asserts nothing.
 */

/** One suite file and its source, as the guard reads it. */
export interface SuiteSource {
  /** The suite's file name, used in the failure message. */
  readonly file: string;
  /** The suite's source text. */
  readonly source: string;
}

/**
 * A minimal suite source for the guard's own fixture cases.
 *
 * @param title - The case title to place in the fixture.
 * @param prefix - Source to place before the case, such as an import line.
 */
export const caseSource = (title: string, prefix = ""): string =>
  `${prefix}it("${title}", () => {});`;

/**
 * Whether any case title claims the full shipped set.
 *
 * @param source - A suite's source text.
 */
export const claimsEveryShippedSet = (source: string): boolean =>
  source
    .split("\n")
    .some(
      (line) =>
        /^\s*it(?:\.effect)?\(\s*[`"']/.test(line) &&
        /every shipped (?:set|theme)/i.test(line),
    );

/**
 * Whether the suite imports the enumeration, directly or through the entry.
 *
 * @param source - A suite's source text.
 */
export const readsEnumeration = (source: string): boolean =>
  /import\s*\{[^}]*\bshippedThemes\b[^}]*\}\s*from\s*["']\.\/(?:index|shipped-themes)\.js["']/s.test(
    source,
  );

/**
 * The suites that claim every shipped set without reading the enumeration.
 *
 * @param sources - The suite files to inspect.
 */
export const fullSetClaimOffenders = (
  sources: ReadonlyArray<SuiteSource>,
): ReadonlyArray<string> =>
  sources
    .filter(
      ({ source }) =>
        claimsEveryShippedSet(source) && !readsEnumeration(source),
    )
    .map(({ file }) => file);
