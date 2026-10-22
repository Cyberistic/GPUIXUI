/**
 * The suite's human and machine-readable output.
 *
 * `reportJson` goes through `Schema.fromJsonString`, so the report is validated
 * on the way out and can be decoded back with the same schema.
 */
import * as Arr from "effect/Array";
import * as Bool from "effect/Boolean";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import {
  CheckOutcome,
  SmokeReport,
  type CheckResult,
  type ScenarioResult,
} from "./smoke.js";

/** A scenario's verdict, from the worst of its checks. */
type Verdict = "ok" | "FAIL" | "ERROR";

const severity = (outcome: CheckOutcome): Verdict =>
  CheckOutcome.match(outcome, {
    passed: (): Verdict => "ok",
    failed: (): Verdict => "FAIL",
    errored: (): Verdict => "ERROR",
  });

const worst = (checks: ReadonlyArray<CheckResult>): Verdict =>
  Arr.match(checks, {
    onEmpty: () => "ERROR",
    onNonEmpty: (present) => {
      const labels = Arr.map(present, (check) => severity(check.outcome));
      return Arr.contains(labels, "ERROR")
        ? "ERROR"
        : Arr.contains(labels, "FAIL")
          ? "FAIL"
          : "ok";
    },
  });

const failureLines = (scenario: ScenarioResult): ReadonlyArray<string> =>
  Arr.flatMap(
    Arr.filter(scenario.checks, (check) => severity(check.outcome) !== "ok"),
    (check: CheckResult): ReadonlyArray<string> =>
      CheckOutcome.match(check.outcome, {
        passed: () => [],
        failed: (failed) => [
          `  ${scenario.id}  FAIL   ${check.label}\n    ${failed.detail}`,
        ],
        errored: (errored) => [
          `  ${scenario.id}  ERROR  ${check.label}\n    ${errored.detail}`,
        ],
      }),
  );

const summary = (report: SmokeReport): string => {
  const total = Arr.length(report.scenarios);
  const ok = Arr.length(
    Arr.filter(report.scenarios, (scenario) => worst(scenario.checks) === "ok"),
  );
  const capabilities = Arr.join(
    Arr.map(
      report.capabilities,
      (entry) => `${entry.capability}=${entry.status}`,
    ),
    " ",
  );
  // A scoped run (`--only`) says so in words: `unverified` beside a green probe
  // reads as a failure otherwise, while it means the selection did not cover
  // every probe the capability has.
  const scoped = Arr.some(
    report.capabilities,
    (entry) => entry.status === "unverified",
  )
    ? " (unverified: the run did not cover every probe of that capability)"
    : "";
  return `${ok}/${total} scenarios passed · capabilities: ${capabilities}${scoped}`;
};

/** Renders `report` as a human-readable table plus failure detail. */
export const formatReport = (report: SmokeReport): string =>
  Arr.join(
    Arr.appendAll(
      Arr.map(
        report.scenarios,
        (scenario) =>
          `${Str.padEnd(5)(worst(scenario.checks))}  ${Str.padEnd(12)(
            scenario.capability,
          )} ${scenario.id}  ${Math.round(scenario.durationMs)}ms  ${scenario.title}`,
      ),
      Arr.appendAll(Arr.flatMap(report.scenarios, failureLines), [
        summary(report),
      ]),
    ),
    "\n",
  );

/** Encodes `report` as JSON through its schema (EF-19). */
export const reportJson = (report: SmokeReport): string =>
  Schema.encodeSync(Schema.fromJsonString(SmokeReport))(report);

/** True when at least one scenario ran and every scenario passed. */
export const passed = (report: SmokeReport): boolean =>
  Arr.match(report.scenarios, {
    onEmpty: () => false,
    onNonEmpty: (scenarios) =>
      Arr.every(scenarios, (scenario) => worst(scenario.checks) === "ok"),
  });

/** The process exit code for `report`: `0` when everything passed, else `1`. */
export const exitCode = (report: SmokeReport): 0 | 1 =>
  Bool.match(passed(report), {
    onFalse: () => 1 as const,
    onTrue: () => 0 as const,
  });
