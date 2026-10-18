/**
 * The accessibility gate's output is the contract a failing run is read
 * through (plan 512). This guards that an empty sweep is a pass, a violation is
 * a failure, and every line names the page, scheme, rule, element and reason —
 * so the browser check can never fail with a message nobody can act on.
 */
import { describe, expect, it } from "vitest";
import {
  exitCode,
  passLine,
  reportLines,
  type PageReport,
} from "../scripts/accessibility-report.ts";

const violating: PageReport = {
  path: "/docs/capabilities",
  scheme: "dark",
  violations: [
    {
      rule: "scrollable-region-focusable",
      impact: "serious",
      target: ".overflow-x-auto",
      summary:
        "Fix any of the following:\n  Element should have focusable content",
    },
    {
      rule: "scrollable-region-focusable",
      impact: "serious",
      target: "table",
      summary: "Fix any of the following:\n  Element should be focusable",
    },
  ],
};

describe("exitCode", () => {
  it("passes a sweep with no reports", () => {
    expect(exitCode([])).toBe(0);
  });

  it("passes a report whose pages are clean", () => {
    expect(exitCode([{ path: "/", scheme: "light", violations: [] }])).toBe(0);
  });

  it("fails when any page has a violation", () => {
    expect(exitCode([violating])).toBe(1);
  });
});

describe("reportLines", () => {
  it("prints one line per violating element, even under one rule", () => {
    expect(reportLines(violating)).toHaveLength(2);
  });

  it("names the page, scheme, rule, impact and target", () => {
    const [first] = reportLines(violating);
    expect(first).toContain("/docs/capabilities [dark]");
    expect(first).toContain("scrollable-region-focusable (serious)");
    expect(first).toContain(".overflow-x-auto");
  });

  it("keeps axe's first reason and drops the boilerplate below it", () => {
    const [first] = reportLines(violating);
    expect(first).toContain("Element should have focusable content");
    expect(first).not.toContain("Fix any of the following");
  });

  it("still prints a line when axe gives no summary", () => {
    const report: PageReport = {
      path: "/",
      scheme: "light",
      violations: [
        { rule: "list", impact: "serious", target: "ul", summary: "" },
      ],
    };
    expect(reportLines(report)[0]).toContain("no detail");
  });
});

describe("passLine", () => {
  it("states the page and scheme totals the sweep ran", () => {
    expect(passLine(90, 2)).toBe("a11y: 90 pages × 2 schemes, 0 violations");
  });
});
