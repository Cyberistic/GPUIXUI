import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activates } from "./selection-preview";
import {
  changedLabel,
  changedRows,
  closeSection,
  defaultPolicy,
  describePolicy,
  editNote,
  editPolicy,
  initialDisclosure,
  MAX_BUDGET,
  MIN_BUDGET,
  nextOpen,
  openSection,
  setBudget,
  stepBudget,
} from "./collapsible-preview";

/**
 * The collapsible preview's state contract and keyboard edges.
 *
 * The two rules a drawing cannot show are the reason this model exists: the
 * caller's values survive a collapse because they are outside the body, and the
 * body's own note does not because the body unmounts. The disabled trigger is
 * the third: it refuses every route, including closing a section it did not
 * open. The activation edges are read from the component's own key module
 * rather than trusted, because the wrong edge toggles twice.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const keyboard = readFileSync(
  new URL(
    "../../../../../packages/components/src/internal/key.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("the collapsible preview", () => {
  it("reads the two activation edges off the component's key decisions", () => {
    expect(keyboard).toContain("if (event.isHeld === true) return false;");
    expect(keyboard).toContain(
      'if (event.key === "enter") return phase === "down";',
    );
    expect(keyboard).toContain(
      'return event.key === "space" && phase === "up";',
    );

    expect(activates("Enter", "down")).toBe(true);
    expect(activates("Enter", "up")).toBe(false);
    expect(activates(" ", "up")).toBe(true);
    expect(activates(" ", "down")).toBe(false);
    expect(activates("Enter", "down", true)).toBe(false);
    expect(activates(" ", "up", true)).toBe(false);
  });

  it("keeps the caller's policy through a collapse and drops the body's note", () => {
    const edited = editNote(
      setBudget(
        editPolicy(initialDisclosure, {
          ...defaultPolicy,
          backoff: "linear",
        }),
        2,
      ),
      "keep this until the body closes",
    );

    expect(edited.note).toBe("keep this until the body closes");
    expect(edited.policy.budget).toBe(MAX_BUDGET);

    const closed = closeSection(edited);
    expect(closed.open).toBe(false);
    expect(closed.note).toBe("");
    // The policy is the caller's, so closing the body changed nothing about it.
    expect(closed.policy).toEqual({
      ...defaultPolicy,
      budget: MAX_BUDGET,
      backoff: "linear",
    });

    const reopened = openSection(closed);
    expect(reopened.open).toBe(true);
    expect(reopened.note).toBe("");
    expect(reopened.policy).toEqual(closed.policy);
  });

  it("refuses a disabled trigger on every route, open or closed", () => {
    // Closed: the press must not open it. Open: the press must not close it
    // either — the trigger's press path is gated before the state moves.
    expect(nextOpen(false, true)).toBe(false);
    expect(nextOpen(true, true)).toBe(true);
    expect(nextOpen(false, false)).toBe(true);
    expect(nextOpen(true, false)).toBe(false);
  });

  it("clamps the retry budget instead of stepping past either end", () => {
    expect(stepBudget(MIN_BUDGET, -1)).toBe(MIN_BUDGET);
    expect(stepBudget(MIN_BUDGET, 1)).toBe(MIN_BUDGET + 1);
    expect(stepBudget(MAX_BUDGET, 1)).toBe(MAX_BUDGET);
    expect(stepBudget(MAX_BUDGET, -1)).toBe(MAX_BUDGET - 1);
    expect(stepBudget(3, -99)).toBe(MIN_BUDGET);
    expect(stepBudget(3, 99)).toBe(MAX_BUDGET);
  });

  it("counts only the fields that differ from the defaults", () => {
    expect(changedRows(defaultPolicy)).toEqual([]);
    expect(changedLabel(defaultPolicy)).toBe("Defaults");

    const budget = { ...defaultPolicy, budget: MAX_BUDGET };
    expect(changedRows(budget)).toEqual(["retry budget"]);
    expect(changedLabel(budget)).toBe("1 of 3 changed");

    const backoff = { ...defaultPolicy, backoff: "linear" as const };
    expect(changedRows(backoff)).toEqual(["backoff"]);

    const jitter = { ...defaultPolicy, jitter: true };
    expect(changedRows(jitter)).toEqual(["jitter"]);

    expect(changedRows({ budget: 1, backoff: "linear", jitter: true })).toEqual(
      ["retry budget", "backoff", "jitter"],
    );
    expect(changedLabel({ budget: 1, backoff: "linear", jitter: true })).toBe(
      "3 of 3 changed",
    );
  });

  it("prints the policy in one fixed order", () => {
    expect(describePolicy(defaultPolicy)).toBe(
      "Retry 3 · exponential · jitter off",
    );
    expect(describePolicy({ budget: 5, backoff: "linear", jitter: true })).toBe(
      "Retry 5 · linear · jitter on",
    );
  });

  it("changes only the budget a step asked for", () => {
    const stepped = setBudget(initialDisclosure, 1);
    expect(stepped.policy).toEqual({ ...defaultPolicy, budget: 4 });
    expect(stepped.open).toBe(false);
    expect(stepped.note).toBe("");
  });
});
