/**
 * The MultiStepForm preview: the gates, the step arithmetic and the markup the
 * page mounts.
 *
 * The bugs these guard are the ones a wizard preview gets wrong while still
 * looking right: a submit that skips the last step's gate (the job the page
 * distinguishes from `Form`'s decode), a refusal painted against a step it was
 * not raised on, a Back that carries the message forward, a preview that leaves
 * every step mounted with its controls in the tab path, and a page that ships
 * the native source in its Code tab but mounts no drawing.
 *
 * The reads are synchronous because this is a test boundary, the same way the
 * site's other suite guards read a checked-in page.
 */

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  advance,
  back,
  describeWizard,
  EMPTY_WIZARD_DRAFT,
  gateOf,
  initialWizard,
  NAME_MESSAGE,
  passGate,
  PORT_MESSAGE,
  ACCEPT_MESSAGE,
  stepOf,
  submit,
  visibleRefusal,
  WIZARD_STEPS,
  type WizardDraft,
  type WizardState,
} from "./multi-step-form-preview";
import { MultiStepFormBody } from "./multi-step-form-demo";

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const at = (
  step: number,
  overrides: Partial<WizardState> = {},
): WizardState => ({
  ...initialWizard,
  step,
  ...overrides,
});

const named: WizardDraft = { ...EMPTY_WIZARD_DRAFT, name: "studio" };
const ported: WizardDraft = { ...named, port: "3000" };
const accepted: WizardDraft = { ...ported, accepted: true };

const markup = (state: WizardState, draft: WizardDraft): string =>
  renderToStaticMarkup(<MultiStepFormBody draft={draft} state={state} />);

describe("the wizard preview's gates", () => {
  it("refuses a name the pattern does not accept", () => {
    expect(gateOf(1, EMPTY_WIZARD_DRAFT)).toEqual({
      _tag: "Refuse",
      message: NAME_MESSAGE,
    });
    expect(gateOf(1, { ...EMPTY_WIZARD_DRAFT, name: "Studio Lab" })).toEqual({
      _tag: "Refuse",
      message: NAME_MESSAGE,
    });
    expect(gateOf(1, named)).toEqual(passGate);
  });

  it("accepts only a port inside the inclusive range", () => {
    const refused = ["1023", "65536", "80a", ""];
    const acceptedPorts = ["1024", "3000", "65535"];

    expect(refused.map((port) => gateOf(2, { ...named, port }))).toEqual(
      refused.map(() => ({ _tag: "Refuse", message: PORT_MESSAGE })),
    );
    expect(acceptedPorts.map((port) => gateOf(2, { ...named, port }))).toEqual(
      acceptedPorts.map(() => passGate),
    );
  });

  it("reviews only an accepted checklist", () => {
    expect(gateOf(3, ported)).toEqual({
      _tag: "Refuse",
      message: ACCEPT_MESSAGE,
    });
    expect(gateOf(3, accepted)).toEqual(passGate);
  });
});

describe("the wizard preview's arithmetic", () => {
  it("advances only past a passing gate, and remembers the step that refused", () => {
    const refused = advance(initialWizard, EMPTY_WIZARD_DRAFT);

    expect(refused.step).toBe(1);
    expect(visibleRefusal(refused)).toEqual({
      _tag: "Refused",
      step: 1,
      message: NAME_MESSAGE,
    });

    const moved = advance(refused, named);
    expect(moved.step).toBe(2);
    expect(visibleRefusal(moved)).toEqual({ _tag: "None" });
  });

  it("clears the refusal on Back and floors at the first step", () => {
    const refused = advance(
      at(2, {
        refusal: { _tag: "Refused", step: 2, message: PORT_MESSAGE },
      }),
      named,
    );
    const returned = back(refused);

    expect(returned.step).toBe(1);
    expect(visibleRefusal(returned)).toEqual({ _tag: "None" });
    expect(back(returned)).toEqual(returned);
  });

  it("paints a refusal only on the step that raised it", () => {
    const refusal = {
      _tag: "Refused",
      step: 1,
      message: NAME_MESSAGE,
    } as const;

    expect(visibleRefusal(at(1, { refusal }))).toEqual(refusal);
    expect(visibleRefusal(at(2, { refusal }))).toEqual({ _tag: "None" });
  });

  it("submits only from the last step, and reruns its gate", () => {
    const early = submit(initialWizard, accepted);
    expect(early.submission).toEqual({ _tag: "Idle" });

    const refused = submit(at(3), ported);
    expect(refused.submission).toEqual({ _tag: "Idle" });
    expect(visibleRefusal(refused)).toEqual({
      _tag: "Refused",
      step: 3,
      message: ACCEPT_MESSAGE,
    });

    const done = submit(at(3), accepted);
    expect(done.submission).toEqual({
      _tag: "Submitted",
      label: "created studio:3000",
    });
    expect(describeWizard(done)).toBe(
      "step=3/3 refusal=none submitted=created studio:3000",
    );
  });

  it("holds a stored step inside the steps it has", () => {
    // The component's own clamp, read from its source, so a preview that
    // stopped clamping would fail even if the examples stayed inside 1…3.
    expect(read("packages/components/src/wizard/logic.ts")).toContain(
      "Math.min(Math.max(named, 1), count)",
    );
    expect(stepOf(0, WIZARD_STEPS.length)).toBe(1);
    expect(stepOf(99, WIZARD_STEPS.length)).toBe(WIZARD_STEPS.length);
    expect(stepOf(Number.NaN, WIZARD_STEPS.length)).toBe(1);
    expect(stepOf(2.7, WIZARD_STEPS.length)).toBe(2);
    expect(stepOf(1, 0)).toBe(1);
  });

  it("mirrors the two places the component runs a gate", () => {
    // `advance` and `submit` each run the gate; a preview that ran it only on
    // Next would teach a submit that skips the last step's check.
    const component = read("packages/components/src/multi-step-form.tsx");
    const calls = component.match(/guard\(step\)/g) ?? [];

    expect(calls).toHaveLength(2);
    const preview = read(
      "apps/docs/src/components/docs/multi-step-form-preview.ts",
    );
    expect(preview.match(/gateOf\(current, draft\)/g) ?? []).toHaveLength(2);
  });
});

describe("the preview's markup", () => {
  it("mounts only the current step's content", () => {
    const first = markup(at(1), EMPTY_WIZARD_DRAFT);
    expect(first).toContain('id="gx-multi-step-name"');
    expect(first).not.toContain('id="gx-multi-step-port"');
    expect(first).not.toContain('id="gx-multi-step-review"');

    const last = markup(at(3), accepted);
    expect(last).toContain('id="gx-multi-step-review"');
    expect(last).toContain('id="gx-multi-step-accept"');
    expect(last).not.toContain('id="gx-multi-step-name"');
    expect(last).not.toContain('id="gx-multi-step-port"');
  });

  it("paints a refusal as an alert and no submit report", () => {
    const refused = markup(
      at(1, {
        refusal: { _tag: "Refused", step: 1, message: NAME_MESSAGE },
      }),
      EMPTY_WIZARD_DRAFT,
    );

    expect(refused).toContain('role="alert"');
    expect(refused).toContain(NAME_MESSAGE);
    expect(refused).not.toContain('id="gx-multi-step-created"');
  });

  it("offers one primary action: Next before the last step, Submit on it", () => {
    const first = markup(at(1), EMPTY_WIZARD_DRAFT);
    expect(first).toContain('id="gx-multi-step-next"');
    expect(first).not.toContain('id="gx-multi-step-submit"');
    expect(first).toContain('id="gx-multi-step-back"');

    const last = markup(at(3), accepted);
    expect(last).toContain('id="gx-multi-step-submit"');
    expect(last).not.toContain('id="gx-multi-step-next"');
  });

  it("reports the state the model describes", () => {
    const done = submit(at(3), accepted);
    expect(markup(done, accepted)).toContain("created studio:3000");
    expect(markup(at(2), ported)).toContain("step=2/3");
    expect(markup(at(2), ported)).toContain('data-status="current"');
  });
});

describe("the page that mounts the preview", () => {
  it("mounts the drawing and keeps its native source", () => {
    const page = read("packages/components/docs/multi-step-form.mdx");

    expect(page).toContain(
      '<ComponentPreview name="multi-step-form-workflow" />',
    );
    expect(page).toContain("@gpuixui/components");
    expect(page).toContain("## API");
    expect(page).toContain("## Limitations");
  });

  it("registers a demo with a native snippet a reader can copy", () => {
    const registry = read("apps/docs/src/components/docs/demos.tsx");
    const demo = read("apps/docs/src/components/docs/multi-step-form-demo.tsx");

    expect(registry).toContain('"multi-step-form-workflow"');
    expect(registry).toContain("multiStepFormWorkflowSource");
    expect(demo).toContain(
      'import { MultiStepForm } from "@gpuixui/components"',
    );
    expect(demo).toContain("gate: () =>");
    expect(demo).toContain("Option.some");
  });
});
