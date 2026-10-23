/**
 * Holds the `multi-step-form-lifecycle` fixture, its view and the claims it
 * prints.
 *
 * The bug this guards: Tier 5's *multi-step forms* row is marked `?` because a
 * wizard is composition — the shipped `Form`, `Stepper`, `Field` and `Checkbox`
 * — and nothing had measured the layers a caller writes between them. The
 * first measured pass found that a `Form` whose schema failure is reported on a
 * field path could not be submitted again: form-core kept that error in the
 * field's meta, the next field-validation pass never cleared it, and the form
 * returned before re-running the schema. The components half fixed it (a `Form`
 * clears the per-field `onSubmit` errors its own validator owns), so the probe
 * now asserts the recovery: a refused review records no submit, and the
 * re-accepted one reaches the caller a second time. The README must not return
 * to the measured-limit wording.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { validate } from "@gpuixui/components/validation/logic";
import {
  MULTI_STEP_IDS,
  MULTI_STEP_NAME_MESSAGE,
  MULTI_STEP_PORT_MESSAGE,
  MULTI_STEP_STEPS,
  MULTI_STEP_TERMS_MESSAGE,
  Port,
  WorkspaceName,
  WorkspaceSetup,
  appliedReadout,
  emptyMultiStepDraft,
  multiStepReadout,
  nextStep,
  previousStep,
  stepError,
} from "./multi-step.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const view = read("./scenarios.tsx");
const readme = read("../../README.md");

/** The step's refusal, read as a string for a readable assertion. */
const refusal = (step: 1 | 2 | 3, value: string): string =>
  Option.getOrElse(stepError(step, { name: value, port: value }), () => "none");

describe("the two gates", () => {
  it("gates the name on the schema's own rule, and nothing on the review", () => {
    expect(refusal(1, "")).toBe(MULTI_STEP_NAME_MESSAGE);
    expect(refusal(1, "Ab")).toBe(MULTI_STEP_NAME_MESSAGE);
    expect(refusal(1, "desk")).toBe("none");
    expect(refusal(1, "design-system")).toBe("none");
    // The review's acceptance is the form's rule, so its step gate is open.
    expect(refusal(3, "")).toBe("none");
  });

  it("gates the port to the unprivileged range", () => {
    expect(refusal(2, "1023")).toBe(MULTI_STEP_PORT_MESSAGE);
    expect(refusal(2, "1024")).toBe("none");
    expect(refusal(2, "65535")).toBe("none");
    expect(refusal(2, "65536")).toBe(MULTI_STEP_PORT_MESSAGE);
    expect(refusal(2, "12ab")).toBe(MULTI_STEP_PORT_MESSAGE);
  });

  it("prints the message each schema would paint", () => {
    expect(Effect.runSync(validate(WorkspaceName)(""))).toEqual(
      Option.some(MULTI_STEP_NAME_MESSAGE),
    );
    expect(Effect.runSync(validate(Port)("70000"))).toEqual(
      Option.some(MULTI_STEP_PORT_MESSAGE),
    );
  });

  it("decodes the record only when the review is accepted", () => {
    const decode = Schema.decodeUnknownOption(WorkspaceSetup);
    expect(
      Option.isSome(decode({ name: "desk", port: "3000", accepted: true })),
    ).toBe(true);
    expect(
      Option.isSome(decode({ name: "desk", port: "3000", accepted: false })),
    ).toBe(false);
  });
});

describe("the wizard's movement", () => {
  it("clamps at both ends", () => {
    expect(nextStep(1)).toBe(2);
    expect(nextStep(3)).toBe(3);
    expect(previousStep(1)).toBe(1);
    expect(previousStep(3)).toBe(2);
  });

  it("names its steps in order", () => {
    expect([...MULTI_STEP_STEPS]).toEqual(["Name", "Port", "Review"]);
  });
});

describe("the readouts", () => {
  it("spells an empty draft as none and carries the acceptance", () => {
    expect(multiStepReadout(1, emptyMultiStepDraft, false, 0)).toBe(
      "step=1 name=none port=none accepted=false submits=0",
    );
    expect(multiStepReadout(3, { name: "desk", port: "3000" }, true, 1)).toBe(
      "step=3 name=desk port=3000 accepted=true submits=1",
    );
  });

  it("reports the decoded record the form handed over", () => {
    expect(appliedReadout(Option.none())).toBe("applied=none");
    expect(
      appliedReadout(
        Option.some(
          WorkspaceSetup.make({
            name: "desk",
            port: "3000",
            accepted: true,
          }),
        ),
      ),
    ).toBe("applied=desk:3000");
  });
});

describe("the view and the registry", () => {
  it("keeps the ids apart", () => {
    expect(new Set(Object.values(MULTI_STEP_IDS)).size).toBe(
      Object.keys(MULTI_STEP_IDS).length,
    );
  });

  it("drives the two gates through the fixture rather than inline copies", () => {
    expect(view).toContain("stepError(step, draft)");
    expect(view).toContain("setStep(nextStep(step))");
    expect(view).toContain("setStep(previousStep(step))");
    expect(view).toContain("schema={WorkspaceSetup}");
  });

  it("registers the probe as an input measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "multi-step-form-lifecycle",
      title:
        "Input: a multi-step form gates each step, keeps its draft across Back, and submits only the record its schema decodes",
      capability: "input",
    });
  });
});

describe("the README", () => {
  it("documents the measurement under the version it was made on", () => {
    expect(readme).toContain(
      "### `multi-step-form-lifecycle` — measured on 0.11.0 here",
    );
    expect(readme).toContain(MULTI_STEP_TERMS_MESSAGE);
    // The fix's own proof is named so the window case cannot drift from it.
    // Prose wraps, so the sentences are read from one flat line.
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("submits a corrected value after a schema failure");
    expect(flat).toContain("submits=2");
  });

  it("does not report the repaired retry as a measured limit", () => {
    // The retracted claim: a reader was told a wizard could never submit again
    // after one schema failure. Either sentence returning fails this case.
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).not.toContain("cannot submit again after a schema failure");
    expect(flat).not.toContain("never reaches the caller");
    expect(flat).toContain("clears the per-field `onSubmit` errors");
  });

  it("prints the checks the probe actually asserts", () => {
    const steps = view.slice(view.indexOf("const multiStepSteps"));
    const body = steps.slice(0, steps.indexOf("const checkboxSteps"));
    const asserted = Arr.length(
      Arr.filter(
        Arr.fromIterable(body.matchAll(/ctx\.expect\w+\(/g)),
        () => true,
      ),
    );
    expect(readme).toContain(`${asserted} checks`);
  });
});
