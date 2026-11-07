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

  const scoped = Arr.some(
    report.capabilities,
    (entry) => entry.status === "unverified",
  )
    ? " (unverified: the run did not cover every probe of that capability)"
    : "";
  return `${ok}/${total} scenarios passed · capabilities: ${capabilities}${scoped}`;
};

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

export const reportJson = (report: SmokeReport): string =>
  Schema.encodeSync(Schema.fromJsonString(SmokeReport))(report);

export const passed = (report: SmokeReport): boolean =>
  Arr.match(report.scenarios, {
    onEmpty: () => false,
    onNonEmpty: (scenarios) =>
      Arr.every(scenarios, (scenario) => worst(scenario.checks) === "ok"),
  });

export const exitCode = (report: SmokeReport): 0 | 1 =>
  Bool.match(passed(report), {
    onFalse: () => 1 as const,
    onTrue: () => 0 as const,
  });
