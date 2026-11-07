import { useState } from "react";
import {
  advance,
  back,
  describeWizard,
  EMPTY_WIZARD_DRAFT,
  initialWizard,
  isLastStep,
  refusedOn,
  submit,
  submitted,
  visibleRefusal,
  WIZARD_STEPS,
  type WizardDraft,
  type WizardState,
} from "./multi-step-form-preview";
import { statuses } from "./stepper-preview";

export interface MultiStepFormBodyProps {
  readonly state: WizardState;
  readonly draft: WizardDraft;
  readonly onDraft?: (draft: WizardDraft) => void;
  readonly onAdvance?: () => void;
  readonly onBack?: () => void;
  readonly onSubmit?: () => void;
}

const PreviewField = ({
  id,
  label,
  hint,
  value,
  readOnly = false,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly readOnly?: boolean;
  readonly onChange: (next: string) => void;
}) => (
  <div className="gx-field-block">
    <label className="gx-field-label" htmlFor={id}>
      {label}
    </label>
    <input
      className="gx-field"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      value={value}
    />
    <p className="gx-field-desc">{hint}</p>
  </div>
);

const StepList = ({ step }: { readonly step: number }) => (
  <ol className="gx-stepper-list" data-orientation="horizontal">
    {statuses(step, WIZARD_STEPS.length).map((status, index) => {
      const spec = WIZARD_STEPS[index];
      if (spec === undefined) return null;
      return (
        <li className="gx-stepper-step" data-status={status} key={spec.id}>
          <span className="gx-stepper-marker">{index + 1}</span>
          <span className="gx-stepper-text">
            <span className="gx-stepper-label">{spec.title}</span>
            <span className="gx-stepper-description">{spec.description}</span>
          </span>
        </li>
      );
    })}
  </ol>
);

const StepBody = ({
  state,
  draft,
  onDraft,
}: {
  readonly state: WizardState;
  readonly draft: WizardDraft;
  readonly onDraft: (draft: WizardDraft) => void;
}) => {
  if (state.step === 1) {
    return (
      <PreviewField
        hint="Lowercase letters, digits and hyphens; the name your team sees."
        id="gx-multi-step-name"
        label="Workspace name"
        onChange={(name) => onDraft({ ...draft, name })}
        value={draft.name}
      />
    );
  }

  if (state.step === 2) {
    return (
      <PreviewField
        hint="The port the workspace listens on."
        id="gx-multi-step-port"
        label="Port"
        onChange={(port) => onDraft({ ...draft, port })}
        value={draft.port}
      />
    );
  }

  return (
    <div className="gx-multi-step-review">
      <dl className="gx-stepper-review" id="gx-multi-step-review">
        <dt>Name</dt>
        <dd>{draft.name.trim() === "" ? "—" : draft.name.trim()}</dd>
        <dt>Port</dt>
        <dd>{draft.port.trim() === "" ? "—" : draft.port.trim()}</dd>
      </dl>
      <button
        className={
          draft.accepted ? "gx-btn gx-btn-secondary" : "gx-btn gx-btn-outline"
        }
        id="gx-multi-step-accept"
        onClick={() => onDraft({ ...draft, accepted: true })}
        type="button"
      >
        {draft.accepted ? "Checklist accepted" : "Accept the checklist"}
      </button>
    </div>
  );
};

export const MultiStepFormBody = ({
  state,
  draft,
  onDraft = () => undefined,
  onAdvance = () => undefined,
  onBack = () => undefined,
  onSubmit = () => undefined,
}: MultiStepFormBodyProps) => {
  const refusal = visibleRefusal(state);
  const last = isLastStep(state.step, WIZARD_STEPS.length);
  const submission = state.submission;

  return (
    <div className="gx-demo gx-demo-column gx-stepper-scene">
      <p className="gx-demo-label">Create a workspace</p>
      <div className="gx-stepper-card">
        <p className="gx-stepper-title">Create a workspace</p>
        <div className="gx-stepper">
          <StepList step={state.step} />
        </div>
        <StepBody draft={draft} onDraft={onDraft} state={state} />
        {refusedOn(refusal, state.step) ? (
          <p className="gx-field-error" role="alert">
            {refusal.message}
          </p>
        ) : null}
        <div className="gx-stepper-actions">
          <button
            className="gx-btn gx-btn-outline"
            disabled={state.step === 1}
            id="gx-multi-step-back"
            onClick={onBack}
            type="button"
          >
            Back
          </button>
          {last ? (
            <button
              className="gx-btn gx-btn-primary"
              id="gx-multi-step-submit"
              onClick={onSubmit}
              type="button"
            >
              Create workspace
            </button>
          ) : (
            <button
              className="gx-btn gx-btn-primary"
              id="gx-multi-step-next"
              onClick={onAdvance}
              type="button"
            >
              Next
            </button>
          )}
        </div>
        {submitted(submission) ? (
          <p
            className="gx-form-success"
            id="gx-multi-step-created"
            role="status"
          >
            {submission.label}
          </p>
        ) : null}
        <p
          className="gx-stepper-readout"
          id="gx-multi-step-readout"
          role="status"
        >
          {describeWizard(state)}
        </p>
      </div>
    </div>
  );
};

export const MultiStepFormWorkflow = () => {
  const [state, setState] = useState<WizardState>(initialWizard);
  const [draft, setDraft] = useState<WizardDraft>(EMPTY_WIZARD_DRAFT);

  return (
    <MultiStepFormBody
      draft={draft}
      onAdvance={() => setState((current) => advance(current, draft))}
      onBack={() => setState((current) => back(current))}
      onDraft={setDraft}
      onSubmit={() => setState((current) => submit(current, draft))}
      state={state}
    />
  );
};

export const multiStepFormWorkflowSource = `import { Input } from "@gpuixui/primitives";
import { MultiStepForm } from "@gpuixui/components";
import * as Option from "effect/Option";
import { useState } from "react";

export const CreateWorkspace = () => {
  const [name, setName] = useState("");
  const [port, setPort] = useState("");
  const [accepted, setAccepted] = useState(false);

  return (
    <MultiStepForm
      label="Create a workspace"
      submitLabel="Create workspace"
      steps={[
        {
          id: "name",
          title: "Name",
          content: <Input label="Workspace name" value={name} onChange={setName} />,
          gate: () =>
            /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/.test(name)
              ? Option.none()
              : Option.some("Use 3 to 24 lowercase letters, digits or hyphens"),
        },
        {
          id: "port",
          title: "Port",
          content: <Input label="Port" value={port} onChange={setPort} />,
          gate: () => {
            const usable =
              /^[0-9]+$/.test(port) &&
              Number(port) >= 1024 &&
              Number(port) <= 65535;
            return usable
              ? Option.none()
              : Option.some("Enter a port from 1024 to 65535");
          },
        },
        {
          id: "review",
          title: "Review",
          content: (
            <button onClick={() => setAccepted(true)} type="button">
              Accept the checklist
            </button>
          ),
          gate: () =>
            accepted
              ? Option.none()
              : Option.some("Accept the checklist before creating the workspace"),
        },
      ]}
      onSubmit={() => createWorkspace({ name, port })}
    />
  );
};`;
