import { useState } from "react";
import {
  accept,
  canSubmit,
  checkAddress,
  checkName,
  createdLabel,
  EMPTY_DRAFT,
  visibleMessages,
  type FormDraft,
} from "./form-preview";

const SAVE_MS = 700;

const PreviewField = ({
  id,
  label,
  value,
  hint,
  message,
  readOnly = false,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly message?: string;
  readonly readOnly?: boolean;
  readonly onChange: (next: string) => void;
}) => (
  <div
    className={
      message === undefined
        ? "gx-field-block"
        : "gx-field-block gx-field-block-invalid"
    }
  >
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
    {message === undefined ? (
      <p className="gx-field-desc">{hint}</p>
    ) : (
      <p className="gx-field-error" role="alert">
        {message}
      </p>
    )}
  </div>
);

const messageFor = (
  draft: FormDraft,
  field: "email" | "name",
  attempted: boolean,
): string | undefined => {
  if (!attempted) return undefined;
  const check =
    field === "email" ? checkAddress(draft.email) : checkName(draft.name);
  return check.accepted ? undefined : check.message;
};

export const FormWorkflow = () => {
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const messages = visibleMessages(draft, attempted);

  const submit = () => {
    if (pending) return;
    setAttempts(attempts + 1);
    if (!canSubmit(draft, false)) {
      setAttempted(true);
      setCreated(null);
      return;
    }
    setAttempted(false);
    setPending(true);

    window.setTimeout(() => {
      setPending(false);
      setCreated(createdLabel(accept(draft)));
    }, SAVE_MS);
  };

  return (
    <div className="gx-demo gx-form">
      <form
        className="gx-form-card"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="gx-form-title">Create account</p>
        <PreviewField
          hint="We never share it."
          id="gx-form-workflow-email"
          label="Email"
          message={messageFor(draft, "email", attempted)}
          onChange={(email) => setDraft({ ...draft, email })}
          readOnly={pending}
          value={draft.email}
        />
        <PreviewField
          hint="How the account is labelled."
          id="gx-form-workflow-name"
          label="Name"
          message={messageFor(draft, "name", attempted)}
          onChange={(name) => setDraft({ ...draft, name })}
          readOnly={pending}
          value={draft.name}
        />
        <div className="gx-form-actions">
          <button
            className="gx-btn gx-btn-primary"
            disabled={pending}
            type="submit"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
          {created === null ? null : (
            <p className="gx-form-success" role="status">
              {created}
            </p>
          )}
        </div>
        <p className="gx-form-readout" role="status">
          attempts={attempts} pending={pending ? "yes" : "no"} messages=
          {messages.length}
        </p>
      </form>
    </div>
  );
};

export const FormStates = () => {
  const empty = EMPTY_DRAFT;
  const failed: FormDraft = { email: "hunter", name: "" };
  const fixed: FormDraft = { email: "hunter@example.com", name: "" };
  const accepted: FormDraft = { email: "hunter@example.com", name: "Hunter" };

  return (
    <div className="gx-form-states">
      <div className="gx-form-state">
        <p className="gx-form-state-label">Before a submit</p>
        <div className="gx-form-state-body">
          <PreviewField
            hint="We never share it."
            id="gx-form-state-pristine-email"
            label="Email"
            onChange={() => undefined}
            value={empty.email}
          />
          <PreviewField
            hint="How the account is labelled."
            id="gx-form-state-pristine-name"
            label="Name"
            onChange={() => undefined}
            value={empty.name}
          />
        </div>
      </div>
      <div className="gx-form-state">
        <p className="gx-form-state-label">A failed submit</p>
        <div className="gx-form-state-body">
          <PreviewField
            hint="We never share it."
            id="gx-form-state-failed-email"
            label="Email"
            message={messageFor(failed, "email", true)}
            onChange={() => undefined}
            value={failed.email}
          />
          <PreviewField
            hint="How the account is labelled."
            id="gx-form-state-failed-name"
            label="Name"
            message={messageFor(failed, "name", true)}
            onChange={() => undefined}
            value={failed.name}
          />
        </div>
      </div>
      <div className="gx-form-state">
        <p className="gx-form-state-label">One field fixed</p>
        <div className="gx-form-state-body">
          <PreviewField
            hint="We never share it."
            id="gx-form-state-fixed-email"
            label="Email"
            onChange={() => undefined}
            value={fixed.email}
          />
          <PreviewField
            hint="How the account is labelled."
            id="gx-form-state-fixed-name"
            label="Name"
            message={messageFor(fixed, "name", true)}
            onChange={() => undefined}
            value={fixed.name}
          />
        </div>
      </div>
      <div className="gx-form-state">
        <p className="gx-form-state-label">Pending</p>
        <div className="gx-form-state-body">
          <PreviewField
            hint="We never share it."
            id="gx-form-state-pending-email"
            label="Email"
            onChange={() => undefined}
            readOnly
            value={accepted.email}
          />
          <PreviewField
            hint="How the account is labelled."
            id="gx-form-state-pending-name"
            label="Name"
            onChange={() => undefined}
            readOnly
            value={accepted.name}
          />
          <button className="gx-btn gx-btn-primary" disabled type="button">
            Creating…
          </button>
        </div>
      </div>
    </div>
  );
};

export const formWorkflowSource = `import { Effect, Schema } from "effect";
import { useState } from "react";
import { Form } from "@gpuixui/components/form";
import { Field, FieldInput } from "@gpuixui/components/field";
import { Button } from "@gpuixui/components/button";

const Address = Schema.String.check(
  Schema.makeFilter((value: string) => value.includes("@"), {
    identifier: "AddressHasAtCheck",
    title: "Address has @",
    description: "An address that contains \`@\`.",
    message: "Enter an address with an @",
  }),
);

const Account = Schema.Struct({
  email: Address,
  name: Schema.NonEmptyString,
});

export const CreateAccount = () => {
  const [draft, setDraft] = useState({ email: "", name: "" });
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const save = (account: typeof Account.Type) => {
    setPending(true);
    // The caller's own async save; Form never starts one.
    Effect.runPromise(createAccount(account)).then((id) => {
      setPending(false);
      setCreated(id);
    });
  };

  return (
    <Form
      label="Create account"
      pending={pending}
      schema={Account}
      value={draft}
      onSubmit={save}
    >
      {(form) => (
        <>
          <Field label="Email" description="We never share it.">
            <FieldInput
              value={draft.email}
              onChange={(event) =>
                setDraft({ ...draft, email: event.value ?? "" })
              }
            />
          </Field>
          <Field label="Name">
            <FieldInput
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.value ?? "" })
              }
            />
          </Field>
          <Button disabled={form.pending} onClick={form.submit}>
            {form.pending ? "Creating…" : "Create account"}
          </Button>
          {created === null ? null : <text>Created {created}</text>}
        </>
      )}
    </Form>
  );
};`;

export const formStatesSource = `import { Schema } from "effect";
import { useState } from "react";
import { Form } from "@gpuixui/components/form";
import { Field, FieldInput } from "@gpuixui/components/field";
import { Button } from "@gpuixui/components/button";

const Account = Schema.Struct({
  email: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
});

export const Pending = () => {
  const [draft, setDraft] = useState({
    email: "hunter@example.com",
    name: "Hunter",
  });

  return (
    // \`pending\` refuses a submit, so a second press cannot start a second save.
    <Form pending label="Create account" schema={Account} value={draft} onSubmit={() => undefined}>
      {(form) => (
        <>
          <Field label="Email">
            <FieldInput value={draft.email} onChange={() => undefined} />
          </Field>
          <Field label="Name">
            <FieldInput value={draft.name} onChange={() => undefined} />
          </Field>
          <Button disabled={form.pending} onClick={form.submit}>
            {form.pending ? "Creating…" : "Create account"}
          </Button>
        </>
      )}
    </Form>
  );
};`;
