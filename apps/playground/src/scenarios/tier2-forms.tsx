/**
 * `tier2-forms` — the shipped Tier 2 form parts from `@gpuixui/components`,
 * mounted by a consumer and driven natively.
 *
 * The package's own suites prove each part; this scenario proves the consumer
 * path (the published root import through `tsconfig.vendor.json`, plan `330`
 * §3), the shipped token theme and the workflow a form row actually has:
 * validate on the consumer's command, show the schema's own message in place of
 * the description, disable a whole group, and submit the decoded value.
 *
 * Validation runs through `Effect.runSync` in a click handler — the boundary
 * `docs/field.md` names, not a hidden auto-validate.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useWindowSize } from "@gpuix/react";
import {
  Field,
  FieldInput,
  Fieldset,
  Form,
} from "../../vendor/packages/components/src/index.js";
import { Button } from "../../vendor/packages/components/src/internal/button.js";
import { validate } from "../../vendor/packages/components/src/validation/logic.js";
import { useTheme } from "@gpuixui/tokens/react";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { fieldText } from "../a11y.js";
import {
  ariaOf,
  focusedId,
  painted,
  read,
  readoutField,
  styleOf,
  text,
} from "./probes.js";

/** The workspace slug the field validates: lowercase words joined by hyphens. */
const Slug = Schema.NonEmptyString.check(
  Schema.makeFilter((value: string) => value.includes("-"), {
    identifier: "WorkspaceSlugCheck",
    title: "Workspace slug",
    description: "A lowercase slug containing at least one hyphen.",
    message: "Use lowercase words joined by a hyphen",
  }),
);

export const EMAIL_MESSAGE = "Use at least three characters";

const Email = Schema.NonEmptyString.check(
  Schema.makeFilter((value: string) => value.length >= 3, {
    identifier: "SignupEmailCheck",
    title: "Signup email",
    description: "An address with at least three characters.",
    message: EMAIL_MESSAGE,
  }),
);

class Signup extends Schema.Class<Signup>("Signup")({
  email: Email,
  name: Schema.NonEmptyString,
}) {}

const Probe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<Option.Option<string>>(Option.none());
  const [title, setTitle] = useState("");
  const [street, setStreet] = useState("1 Infinite Loop");
  const [city, setCity] = useState("Cupertino");
  const [edits, setEdits] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [submits, setSubmits] = useState(0);
  const [created, setCreated] = useState<string | null>(null);

  return (
    <div
      testId="tier2-forms-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Body>shipped Tier 2 forms</Body>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.xl,
          flexGrow: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
            width: 420,
          }}
        >
          <Field
            testId="slug-field"
            label="Workspace URL"
            description="Lowercase words joined by hyphens"
            error={Option.getOrUndefined(error)}
          >
            <FieldInput
              testId="slug-input"
              aria-id="slug-input"
              value={slug}
              onChange={(event) => setSlug(event.value ?? "")}
            />
          </Field>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: theme.spacing.sm,
            }}
          >
            <Button testId="slug-fill" onClick={() => setSlug("my-workspace")}>
              Fill valid
            </Button>
            <Button testId="slug-break" onClick={() => setSlug("NotSlug")}>
              Fill invalid
            </Button>
            <Button
              testId="slug-validate"
              variant="primary"
              onClick={() => setError(Effect.runSync(validate(Slug)(slug)))}
            >
              Validate
            </Button>
          </div>
          <Field testId="title-field" label="Project title" required>
            <FieldInput
              testId="title-input"
              aria-id="title-input"
              value={title}
              onChange={(event) => setTitle(event.value ?? "")}
            />
          </Field>
          <Fieldset legend="Billing address" aria-id="billing-group">
            <Field label="Street">
              <FieldInput
                testId="billing-street"
                value={street}
                onChange={(event) => setStreet(event.value ?? "")}
              />
            </Field>
            <Field label="City">
              <FieldInput
                testId="billing-city"
                value={city}
                onChange={(event) => setCity(event.value ?? "")}
              />
            </Field>
          </Fieldset>
          <Fieldset legend="Shipping address" aria-id="shipping-group" disabled>
            <Field label="Street">
              <FieldInput
                testId="shipping-street"
                value="1 Infinite Loop"
                onChange={() => setEdits((count) => count + 1)}
              />
            </Field>
            <Field label="City">
              <FieldInput
                testId="shipping-city"
                value="Cupertino"
                onChange={() => setEdits((count) => count + 1)}
              />
            </Field>
          </Fieldset>
          <Button testId="focus-after-disabled">After the group</Button>
        </div>
        <div style={{ width: 420 }}>
          <Form
            schema={Signup}
            value={{ email, name }}
            onSubmit={(signup) => {
              setSubmits((count) => count + 1);
              setCreated(signup.email);
            }}
            pending={pending}
            label="Create account"
            testId="signup-form"
          >
            {(form) => (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: theme.spacing.lg,
                }}
              >
                <Field label="Email" description="We never share it">
                  <FieldInput
                    testId="form-email"
                    value={email}
                    onChange={(event) => setEmail(event.value ?? "")}
                  />
                </Field>
                <Field label="Name">
                  <FieldInput
                    testId="form-name"
                    value={name}
                    onChange={(event) => setName(event.value ?? "")}
                  />
                </Field>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: theme.spacing.sm,
                  }}
                >
                  <Button
                    testId="form-submit"
                    variant="primary"
                    disabled={form.pending}
                    onClick={form.submit}
                  >
                    Create account
                  </Button>
                  <Button
                    testId="form-hold"
                    onClick={() => setPending((value) => !value)}
                  >
                    {pending ? "Resume" : "Hold"}
                  </Button>
                </div>
                {created === null ? null : (
                  <text testId="form-created">{`Created ${created}`}</text>
                )}
              </div>
            )}
          </Form>
        </div>
      </div>
      <Readout testId="tier2-forms-readout">
        {Arr.join(
          [
            `slug=${slug === "" ? "none" : slug}`,
            `error=${Option.isSome(error) ? "set" : "none"}`,
            `title=${title === "" ? "none" : title}`,
            `street=${street}`,
            `city=${city}`,
            `edits=${edits}`,
            `email=${email === "" ? "none" : email}`,
            `name=${name === "" ? "none" : name}`,
            `pending=${pending}`,
            `submits=${submits}`,
            `created=${created ?? "none"}`,
            `disabled=${theme.colors.disabled}`,
          ],
          " ",
        )}
      </Readout>
    </div>
  );
};

export const tier2FormsScenario: PlaygroundScenario = {
  id: "tier2-forms",
  title: "Tier 2 forms: Field validation, Fieldset disable and Form submit",
  capability: "tier2",
  view: () => <Probe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "the forms frame is painted",
        painted(ctx, "tier2-forms-frame"),
      );

      // 1. Field: description, consumer-driven validation, error replacement.
      yield* ctx.expectContains(
        "the field paints its label and description",
        read(ctx, "slug-field"),
        "Lowercase words joined by hyphens",
      );
      ctx.host.click("slug-fill");
      yield* ctx.expectContains(
        "the consumer fills the value",
        read(ctx, "tier2-forms-readout"),
        "slug=my-workspace",
      );
      yield* ctx.expectContains(
        "filling the value does not validate",
        read(ctx, "tier2-forms-readout"),
        "error=none",
      );
      ctx.host.click("slug-validate");
      yield* ctx.expectContains(
        "a valid value keeps the description",
        read(ctx, "slug-field"),
        "Lowercase words joined by hyphens",
      );
      ctx.host.click("slug-break");
      yield* ctx.expectContains(
        "editing an invalid value does not validate",
        read(ctx, "tier2-forms-readout"),
        "error=none",
      );
      ctx.host.click("slug-validate");
      yield* ctx.expectContains(
        "the consumer run reports the error",
        read(ctx, "tier2-forms-readout"),
        "error=set",
      );
      yield* ctx.expectContains(
        "the error is the schema's own message",
        read(ctx, "slug-field"),
        "Use lowercase words joined by a hyphen",
      );
      yield* ctx.expectEqual(
        "the error replaces the description",
        read(ctx, "slug-field").includes("Lowercase words joined by hyphens"),
        false,
      );
      const slugNode = yield* ctx.expectSome(
        "the field input is exposed",
        ariaOf(ctx, "slug-input"),
      );
      yield* ctx.expectEqual(
        "the field input is a text field",
        fieldText(slugNode.role),
        "TextInput",
      );
      yield* ctx.expectEqual(
        "the field input takes the label as its name",
        fieldText(slugNode.label),
        "Workspace URL",
      );
      yield* ctx.expectEqual(
        "the invalid input announces its message",
        fieldText(slugNode.description),
        "Use lowercase words joined by a hyphen",
      );

      // 2. Required: a clean label, a Required description, a painted marker.
      const titleNode = yield* ctx.expectSome(
        "the required input is exposed",
        ariaOf(ctx, "title-input"),
      );
      yield* ctx.expectEqual(
        "the required input keeps a clean name",
        fieldText(titleNode.label),
        "Project title",
      );
      yield* ctx.expectEqual(
        "the required input announces the requirement",
        fieldText(titleNode.description),
        "Required",
      );
      yield* ctx.expectContains(
        "the required marker paints",
        read(ctx, "title-field"),
        "*",
      );

      // 3. Fieldset: a named group; disabled reaches its inputs.
      const billing = yield* ctx.expectSome(
        "the enabled group is exposed",
        ariaOf(ctx, "billing-group"),
      );
      yield* ctx.expectEqual(
        "the enabled group is an AccessKit Group",
        fieldText(billing.role),
        "Group",
      );
      yield* ctx.expectEqual(
        "the group is named by its legend",
        fieldText(billing.label),
        "Billing address",
      );
      const shipping = yield* ctx.expectSome(
        "the disabled group is exposed",
        ariaOf(ctx, "shipping-group"),
      );
      yield* ctx.expectEqual(
        "the disabled group keeps its name",
        fieldText(shipping.label),
        "Shipping address",
      );
      const disabledColour = text(
        readoutField(ctx, "tier2-forms-readout", "disabled"),
      );
      yield* ctx.expectEqual(
        "the disabled input paints the disabled token",
        Option.getOrElse(
          Option.flatMap(
            styleOf(ctx, "shipping-street"),
            (style) => style.backgroundColor,
          ),
          () => "none",
        ),
        disabledColour,
      );
      ctx.host.click("shipping-street");
      ctx.host.key("x");
      yield* ctx.expectContains(
        "a disabled input refuses an edit",
        read(ctx, "tier2-forms-readout"),
        "edits=0",
      );
      ctx.host.click("billing-city");
      ctx.host.focusNext();
      yield* ctx.expectEqual(
        "the disabled inputs leave the tab order",
        focusedId(ctx),
        "focus-after-disabled",
      );

      // 4. Form: messages on an invalid submit, decoded value on a valid one.
      ctx.host.click("form-submit");
      yield* ctx.expectContains(
        "an invalid submit paints the schema's message",
        read(ctx, "signup-form"),
        EMAIL_MESSAGE,
      );
      yield* ctx.expectContains(
        "an invalid submit does not reach the consumer",
        read(ctx, "tier2-forms-readout"),
        "submits=0",
      );
      ctx.host.click("form-email");
      ctx.host.key("a d a");
      ctx.host.click("form-name");
      ctx.host.key("g p u i");
      yield* ctx.expectContains(
        "typing reaches the consumer's value",
        read(ctx, "tier2-forms-readout"),
        "email=ada",
      );
      ctx.host.click("form-submit");
      yield* ctx.expectContains(
        "a valid submit reports once",
        read(ctx, "tier2-forms-readout"),
        "submits=1",
      );
      yield* ctx.expectContains(
        "the success line paints the decoded value",
        read(ctx, "form-created"),
        "Created ada",
      );
      yield* ctx.expectEqual(
        "a successful submit clears the messages",
        read(ctx, "signup-form").includes(EMAIL_MESSAGE),
        false,
      );
      ctx.host.click("form-hold");
      yield* ctx.expectContains(
        "the consumer can hold the form pending",
        read(ctx, "tier2-forms-readout"),
        "pending=true",
      );
      ctx.host.click("form-submit");
      yield* ctx.expectContains(
        "a pending form refuses to submit",
        read(ctx, "tier2-forms-readout"),
        "submits=1",
      );
      ctx.host.click("form-hold");
      yield* ctx.expectContains(
        "the consumer can release the form",
        read(ctx, "tier2-forms-readout"),
        "pending=false",
      );
    }),
};
