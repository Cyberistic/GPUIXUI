/**
 * Browser previews for the Stepper page.
 *
 * The shipped stepper is a read-only list: it derives each step's status from
 * the one `value` the app passes and holds no state of its own. The preview
 * cannot mount it (the library renders through GPUix), so it mirrors the
 * contract with HTML and says so: the marker is `controlHeight.md` round, the
 * three statuses paint the roles `markerPalette` names, and the value is the
 * app's — the flow's Next runs the step's check first, so the indicator never
 * shows a step the reader has not answered.
 *
 * The rules live in `stepper-preview.ts` so a test can fail on them; this file
 * only renders them. The Code tab always shows the native usage.
 */

import { useState } from "react";
import {
  advance,
  back,
  checkStep,
  describe,
  edit,
  initialFlow,
  restart,
  statuses,
  STEPS,
  type Flow,
  type StepStatus,
} from "./stepper-preview";

/** One step in the list: a numbered marker, its name and its description. */
const Step = ({
  index,
  status,
}: {
  readonly index: number;
  readonly status: StepStatus;
}) => {
  const spec = STEPS[index];
  if (spec === undefined) return null;

  return (
    <li className="gx-stepper-step" data-status={status}>
      <span className="gx-stepper-marker">{index + 1}</span>
      <span className="gx-stepper-text">
        <span className="gx-stepper-label">{spec.label}</span>
        <span className="gx-stepper-description">{spec.description}</span>
      </span>
    </li>
  );
};

/** The list alone, for the states preview. */
const StepList = ({
  orientation = "horizontal",
  value,
}: {
  readonly orientation?: "horizontal" | "vertical";
  readonly value: number;
}) => (
  <ol className="gx-stepper-list" data-orientation={orientation}>
    {statuses(value).map((status, index) => (
      <Step index={index} key={index} status={status} />
    ))}
  </ol>
);

/** The body of one step: the field it asks for, or the review summary. */
const StepBody = ({
  flow,
  onDraft,
}: {
  readonly flow: Flow;
  readonly onDraft: (name: string, seats: string) => void;
}) => {
  const check = checkStep(flow.step, flow.draft);
  const message = check.accepted ? undefined : check.message;

  if (flow.step === 1) {
    return (
      <div
        className={
          message === undefined
            ? "gx-field-block"
            : "gx-field-block gx-field-block-invalid"
        }
      >
        <label className="gx-field-label" htmlFor="gx-stepper-name">
          Workspace name
        </label>
        <input
          className="gx-field"
          id="gx-stepper-name"
          onChange={(event) => onDraft(event.target.value, flow.draft.seats)}
          readOnly={flow.created}
          value={flow.draft.name}
        />
        <p className="gx-field-desc">The name your team sees.</p>
        {message === undefined ? null : (
          <p className="gx-field-error" role="alert">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (flow.step === 2) {
    return (
      <div
        className={
          message === undefined
            ? "gx-field-block"
            : "gx-field-block gx-field-block-invalid"
        }
      >
        <label className="gx-field-label" htmlFor="gx-stepper-seats">
          Seats
        </label>
        <input
          className="gx-field"
          id="gx-stepper-seats"
          onChange={(event) => onDraft(flow.draft.name, event.target.value)}
          readOnly={flow.created}
          value={flow.draft.seats}
        />
        <p className="gx-field-desc">Billable members, the owner included.</p>
        {message === undefined ? null : (
          <p className="gx-field-error" role="alert">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <dl className="gx-stepper-review">
      <dt>Name</dt>
      <dd>{flow.draft.name.trim()}</dd>
      <dt>Seats</dt>
      <dd>{flow.draft.seats.trim()}</dd>
    </dl>
  );
};

/** Create a workspace: a step the reader can leave only when it is answered. */
export const StepperWorkflow = () => {
  const [flow, setFlow] = useState<Flow>(initialFlow);
  const [refusals, setRefusals] = useState(0);
  const [notice, setNotice] = useState("");

  const next = () => {
    const result = advance(flow);
    setNotice(result.message);
    if (result.flow === flow) setRefusals(refusals + 1);
    setFlow(result.flow);
  };

  const draft = (name: string, seats: string) =>
    setFlow((current) => edit(current, { name, seats }));

  return (
    <div className="gx-demo gx-demo-column gx-stepper-scene">
      <p className="gx-demo-label">Create a workspace</p>
      <div className="gx-stepper-card">
        <p className="gx-stepper-title">Create a workspace</p>
        <p className="gx-stepper-lede">
          Three steps, one value: the app moves it, the stepper only paints it.
        </p>
        <div className="gx-stepper">
          <StepList value={flow.step} />
        </div>
        <StepBody flow={flow} onDraft={draft} />
        <div className="gx-stepper-actions">
          <button
            className="gx-btn gx-btn-outline"
            disabled={flow.step === 1 || flow.created}
            onClick={() => {
              setNotice("");
              setFlow(back(flow));
            }}
            type="button"
          >
            Back
          </button>
          {flow.created ? (
            <button
              className="gx-btn gx-btn-secondary"
              onClick={() => {
                setNotice("");
                setRefusals(0);
                setFlow(restart());
              }}
              type="button"
            >
              Create another
            </button>
          ) : (
            <button
              className="gx-btn gx-btn-primary"
              onClick={next}
              type="button"
            >
              {flow.step === STEPS.length ? "Create workspace" : "Next"}
            </button>
          )}
        </div>
        {notice === "" ? null : (
          <p className="gx-field-error" role="alert">
            {notice}
          </p>
        )}
        <p className="gx-stepper-readout" role="status">
          {describe(flow)} refusals={refusals}
        </p>
        <p className="gx-stepper-note">
          Next runs the step&rsquo;s check before the value moves, so the
          indicator never shows a step the reader has not answered. The check
          and the value are both the app&rsquo;s; the stepper derives the
          statuses from the number it is handed.
        </p>
      </div>
    </div>
  );
};

/** One labelled group of markers, for the states preview. */
const StateGroup = ({
  label,
  orientation = "horizontal",
  value,
}: {
  readonly label: string;
  readonly orientation?: "horizontal" | "vertical";
  readonly value: number;
}) => (
  <div className="gx-stepper-state">
    <p className="gx-stepper-state-label">{label}</p>
    <div className="gx-stepper" data-orientation={orientation}>
      <StepList orientation={orientation} value={value} />
    </div>
  </div>
);

/** The derived statuses, both orientations, and a value the steps do not bound. */
export const StepperStates = () => (
  <div className="gx-demo gx-demo-column gx-stepper-scene">
    <StateGroup label="value = 1 — first step current" value={1} />
    <StateGroup label="value = 2 — first complete" value={2} />
    <StateGroup label="value = 3 — the last step current" value={3} />
    <StateGroup
      label="value = 0 — no step complete, nothing clamped"
      value={0}
    />
    <StateGroup
      label="value = 4 — every step complete, nothing clamped"
      value={4}
    />
    <StateGroup label="vertical" orientation="vertical" value={2} />
    <p className="gx-stepper-note">
      The component compares the raw numbers: a value below the first step
      leaves all of them upcoming, and a value past the last leaves all of them
      complete. Nothing clamps it, because a stepper cannot know how many steps
      a workflow has.
    </p>
  </div>
);

export const stepperWorkflowSource = `import { useState } from "react";
import { Stepper, StepperStep } from "@gpuixui/components";

const steps = [
  { label: "Workspace", description: "Name and handle" },
  { label: "Seats", description: "How many people" },
  { label: "Review", description: "Create it" },
];

export const CreateWorkspace = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");

  return (
    <>
      {/* The statuses are derived from \`step\`; there is no status prop. */}
      <Stepper label="Create a workspace" value={step}>
        {steps.map((entry, index) => (
          <StepperStep
            description={entry.description}
            key={entry.label}
            label={entry.label}
            value={index + 1}
          />
        ))}
      </Stepper>
      <input
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      {/* The app runs the check, then moves the value it owns. */}
      <button
        onClick={() => name.trim() !== "" && setStep(step + 1)}
        type="button"
      >
        Next
      </button>
    </>
  );
};`;

export const stepperStatesSource = `import { Stepper, StepperStep } from "@gpuixui/components";

<>
  <Stepper label="Step 1" value={1}>
    <StepperStep label="Workspace" value={1} />
    <StepperStep label="Seats" value={2} />
    <StepperStep label="Review" value={3} />
  </Stepper>
  <Stepper label="Vertical" orientation="vertical" value={2}>
    <StepperStep label="Workspace" value={1} />
    <StepperStep label="Seats" value={2} />
    <StepperStep label="Review" value={3} />
  </Stepper>
  {/* Nothing clamps the value: 0 leaves every step upcoming. */}
  <Stepper label="No step reached" value={0}>
    <StepperStep label="Workspace" value={1} />
    <StepperStep label="Seats" value={2} />
    <StepperStep label="Review" value={3} />
  </Stepper>
</>;`;
