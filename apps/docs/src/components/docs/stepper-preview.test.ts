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

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/stepper/logic.ts",
    import.meta.url,
  ),
  "utf8",
);

const bodyOf = (name: string): string => {
  const start = component.indexOf(`export const ${name}`);
  expect(start, `no ${name} in the component's logic`).toBeGreaterThan(-1);
  const rest = component.slice(start);
  const end = rest.indexOf("\nexport ", 1);
  return end === -1 ? rest : rest.slice(0, end);
};

const expected = (current: number, step: number): string => {
  const at = Number.isFinite(current) ? current : 1;
  return step < at ? "complete" : step === at ? "current" : "upcoming";
};

describe("the preview's derived status", () => {
  it("matches the comparison the component makes, for every step and value", () => {
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

  it("names a step the caller left blank, as the component does", () => {
    expect(bodyOf("stepName")).toContain("`Step ${");
  });

  it("marks one current step for every value inside the range", () => {
    const current = [1, 2, 3].map(
      (value) =>
        statuses(value).filter((status) => status === "current").length,
    );

    expect(current).toEqual([1, 1, 1]);

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

    expect(edited.step).toBe(3);
    expect(edited.draft.name).toBe("");
  });

  it("creates the workspace once, on the last step only", () => {
    const review: Flow = { ...named("Gpuix", "4"), step: lastStep() };
    const created = advance(review);

    expect(created.flow.created).toBe(true);
    expect(describeFlow(created.flow)).toBe("created=Gpuix seats=4");

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
