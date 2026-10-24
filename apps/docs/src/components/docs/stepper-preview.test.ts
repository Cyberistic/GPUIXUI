import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advance,
  back,
  checkName,
  checkSeats,
  describe as describeFlow,
  edit,
  initialFlow,
  lastStep,
  restart,
  statuses,
  stepStatus,
  STEPS,
  type Flow,
} from "./stepper-preview";

/**
 * The stepper preview's two rules: the status the component derives from one
 * number, and the gate the workflow owns before the number may move.
 *
 * A browser drawing can get either of them wrong without looking wrong — a
 * marker painted from a hard-coded position still reads as progress, and a
 * Next that moves the value before the check passes still looks like a form.
 * The status rule is therefore held to the component's own source, and the gate
 * is measured on the flow it must refuse.
 *
 * Bug guarded: the component learned to repair a `value` no step can answer
 * (`NaN` or an infinity, from arithmetic over a step index) as the first step,
 * while the preview kept the raw comparison and claimed it "clamps nothing" —
 * so a page a reader lands on painted no current marker for a state the
 * shipped stepper paints at step one. The guard also failed on every `Math.max`
 * in the module, which the step-name fallback now legitimately uses; it reads
 * the status rule's own body instead.
 */

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/stepper/logic.ts",
    import.meta.url,
  ),
  "utf8",
);

/** The curated page a reader lands on, flattened for sentence checks. */
const page = readFileSync(
  new URL("../../../content/docs/components/stepper.mdx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

/** The body of one exported function, up to the next export or EOF. */
const bodyOf = (name: string): string => {
  const start = component.indexOf(`export const ${name}`);
  expect(start, `no ${name} in the component's logic`).toBeGreaterThan(-1);
  const rest = component.slice(start);
  const end = rest.indexOf("\nexport ", 1);
  return end === -1 ? rest : rest.slice(0, end);
};

/** The status the rule names, derived independently of the preview's copy. */
const expected = (current: number, step: number): string => {
  const at = Number.isFinite(current) ? current : 1;
  return step < at ? "complete" : step === at ? "current" : "upcoming";
};

describe("the preview's derived status", () => {
  it("matches the comparison the component makes, for every step and value", () => {
    // The rule itself is read from the painter, so a component that clamped or
    // reordered its comparison cannot leave the preview teaching the old one.
    expect(bodyOf("statusOf")).toContain("const at = currentStep(current);");

    const values = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      0,
      1,
      2,
      3,
      4,
      5,
    ];
    const steps = [1, 2, 3];
    const drifted = values.flatMap((current) =>
      steps.flatMap((step) =>
        stepStatus(current, step) === expected(current, step)
          ? []
          : [
              `value ${current} step ${step}: preview says ${stepStatus(current, step)}, the component says ${expected(current, step)}`,
            ],
      ),
    );

    expect(drifted).toEqual([]);
  });

  it("reads a value it cannot name as the first step, and clamps no finite one", () => {
    // The component's one repair: an unreadable current value is the first
    // step. A finite value stays raw, including below the first and past the
    // last — a preview that clamped would look right at 1…3 and lie about the
    // edges.
    expect(bodyOf("currentStep")).toContain(
      "Number.isFinite(value) ? value : 1",
    );
    expect(bodyOf("statusOf")).not.toContain("Math.");

    expect(statuses(Number.NaN)).toEqual(["current", "upcoming", "upcoming"]);
    expect(statuses(Number.POSITIVE_INFINITY)).toEqual([
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(statuses(0)).toEqual(["upcoming", "upcoming", "upcoming"]);
    expect(statuses(STEPS.length + 1)).toEqual([
      "complete",
      "complete",
      "complete",
    ]);
  });

  it("teaches the value it repairs on the page a reader lands on", () => {
    expect(page).toContain("`NaN`");
    expect(page).toContain("reads as the first step");
    expect(page).toContain("never clamped");
  });

  it("names a step the caller left blank, as the component does", () => {
    // The component derives a titleless step's name from its position; the
    // page said every step is named by its label, which is false for a blank
    // one and would leave a reader with an unnamed list item.
    expect(bodyOf("stepName")).toContain("`Step ${");
    expect(page).toContain(
      "a blank label reads as `Step` plus the step's position",
    );
    expect(page).toContain("(`Step 2` for the second)");
  });

  it("marks one current step for every value inside the range", () => {
    const current = [1, 2, 3].map(
      (value) =>
        statuses(value).filter((status) => status === "current").length,
    );

    expect(current).toEqual([1, 1, 1]);
    // And none outside it, which is the honest edge the page prints.
    expect(statuses(0).filter((status) => status === "current")).toEqual([]);
  });
});

describe("the flow's gate", () => {
  const named = (name: string, seats = "2"): Flow => ({
    ...initialFlow,
    draft: { name, seats },
  });

  it("refuses to move while the step's check fails", () => {
    const refused = advance(initialFlow);

    expect(refused.flow.step).toBe(1);
    expect(refused.message).toBe("Give the workspace a name");
    // The stepper is handed the value the gate allowed, so the refusal must
    // leave it where it was rather than paint a step nobody answered.
    expect(statuses(refused.flow.step)[0]).toBe("current");
  });

  it("moves the value only after the check passes, completing the step behind it", () => {
    const moved = advance(named("Gpuix"));

    expect(moved.flow.step).toBe(2);
    expect(moved.message).toBe("");
    expect(statuses(moved.flow.step)).toEqual([
      "complete",
      "current",
      "upcoming",
    ]);
  });

  it("refuses a seat count that is not a whole number of people", () => {
    const refused = ["", "0", "2.5", "two", "-1"].map(checkSeats);

    expect(refused.map((check) => check.accepted)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(checkSeats("1").accepted).toBe(true);
    expect(checkSeats(" 12 ").accepted).toBe(true);
  });

  it("keeps the review step on the seat check it inherits", () => {
    const second: Flow = { ...named("Gpuix", "0"), step: 2 };
    const refused = advance(second);

    expect(refused.flow.step).toBe(2);
    expect(refused.message).toBe("One seat or more, as a whole number");

    const moved = advance({
      ...second,
      draft: { ...second.draft, seats: "4" },
    });
    expect(moved.flow.step).toBe(3);
  });

  it("edits the draft without moving the value", () => {
    const review: Flow = { ...named("Gpuix", "4"), step: 3 };
    const edited = edit(review, { name: "", seats: "4" });

    // The app's rule, not the component's: an edit must not silently step back
    // or forward, even when it makes the current step's check fail.
    expect(edited.step).toBe(3);
    expect(edited.draft.name).toBe("");
  });

  it("creates the workspace once, on the last step only", () => {
    const review: Flow = { ...named("Gpuix", "4"), step: lastStep() };
    const created = advance(review);

    expect(created.flow.created).toBe(true);
    expect(describeFlow(created.flow)).toBe("created=Gpuix seats=4");
    // A second press is a no-op, so a slow reader cannot create two.
    expect(advance(created.flow).flow).toBe(created.flow);
    expect(advance(named("Gpuix")).flow.created).toBe(false);
  });

  it("clamps Back at the first step and freezes a created flow", () => {
    expect(back({ ...initialFlow, step: 1 }).step).toBe(1);
    expect(back({ ...named("Gpuix"), step: 3 }).step).toBe(2);

    const created: Flow = { ...named("Gpuix"), created: true, step: 3 };
    expect(back(created).step).toBe(3);
    expect(edit(created, { name: "Other", seats: "9" }).draft.name).toBe(
      "Gpuix",
    );
  });

  it("prints the readout the page shows", () => {
    const second: Flow = { ...named("Gpuix"), step: 2 };

    expect(describeFlow(second)).toBe(
      "step=2/3 value=2 status=complete,current,upcoming",
    );
    expect(checkName(" ").accepted).toBe(false);
    expect(restart().step).toBe(1);
  });
});
