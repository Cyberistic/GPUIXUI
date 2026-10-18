/**
 * The accessibility gate's report model (plan 512).
 *
 * The only thing a failing gate shows is text, so the text is pure and tested:
 * one line per violating element, naming the page, the scheme, the rule, the
 * element and axe's first reason. The DOM half stays in `smoke-a11y.ts`.
 */

export type Scheme = "light" | "dark";

/** One element axe rejected, not one rule: two elements are two defects. */
export interface Violation {
  readonly rule: string;
  readonly impact: string;
  readonly target: string;
  readonly summary: string;
}

export interface PageReport {
  readonly path: string;
  readonly scheme: Scheme;
  readonly violations: ReadonlyArray<Violation>;
}

/** The actionable line of axe's `failureSummary`; the rest repeats it. */
const reason = (summary: string): string => {
  const lines = summary
    .split("\n")
    .map((value) => value.trim())
    .filter(
      (value) =>
        value.length > 0 && !/^Fix (any|all) of the following:$/.test(value),
    );
  return lines[0] ?? "no detail";
};

export const reportLines = (report: PageReport): ReadonlyArray<string> =>
  report.violations.map(
    (violation) =>
      `${report.path} [${report.scheme}] ${violation.rule} (${violation.impact}) — ${violation.target}: ${reason(violation.summary)}`,
  );

/** Any violation is a failing site; an empty report is a pass. */
export const exitCode = (reports: ReadonlyArray<PageReport>): 0 | 1 =>
  reports.some((report) => report.violations.length > 0) ? 1 : 0;

/** The closing line of a successful run. */
export const passLine = (pages: number, schemes: number): string =>
  `a11y: ${pages} pages × ${schemes} schemes, 0 violations`;
