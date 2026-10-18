/**
 * Multi-step form example: a two-step checkout.
 *
 * The draft lives here; `MultiStepForm` validates one step on the way forward
 * and decodes the whole thing only on the last step. `onSubmit` receives the
 * decoded `Checkout` class, so the success line reads the typed value.
 */

import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useState } from "react";
import { Field, FieldInput } from "../src/field.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  MultiStepForm,
  type MultiStepFormStep,
} from "../src/multi-step-form.js";

const AccountFields = Schema.Struct({ email: Schema.NonEmptyString });
const BillingFields = Schema.Struct({ card: Schema.NonEmptyString });

class Checkout extends Schema.Class<Checkout>("Checkout")({
  email: Schema.NonEmptyString,
  card: Schema.NonEmptyString,
}) {}

const steps = [
  {
    id: "account",
    label: "Account",
    description: "Email",
    schema: AccountFields,
  },
  {
    id: "billing",
    label: "Billing",
    description: "Payment",
    schema: BillingFields,
  },
] as const satisfies readonly [MultiStepFormStep, ...MultiStepFormStep[]];

/** A two-step checkout: validate each step, then decode the whole draft. */
export const MultiStepFormExample = () => {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [placed, setPlaced] = useState<Option.Option<string>>(Option.none());

  return (
    <MultiStepForm
      schema={Checkout}
      value={{ email, card }}
      steps={steps}
      onSubmit={(checkout) => setPlaced(Option.some(checkout.email))}
      label="Checkout"
      style={{ width: 360 }}
    >
      {(form) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {form.step.id === "account" ? (
            <Field
              label="Email"
              description="We never share it"
              error={form.errorFor("email")}
            >
              <FieldInput
                value={email}
                onChange={(event) => setEmail(event.value ?? "")}
              />
            </Field>
          ) : (
            <Field
              label="Card"
              description="A test number; nothing is charged"
              error={form.errorFor("card")}
            >
              <FieldInput
                value={card}
                onChange={(event) => setCard(event.value ?? "")}
              />
            </Field>
          )}
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <Button onClick={form.back} disabled={form.isFirst || form.pending}>
              Back
            </Button>
            <Button
              onClick={form.isLast ? form.submit : form.next}
              disabled={form.pending}
            >
              {form.isLast ? "Place order" : "Continue"}
            </Button>
          </div>
          {Option.match(placed, {
            onNone: () => null,
            onSome: (address) => (
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {`Order placed for ${address}`}
              </text>
            ),
          })}
        </div>
      )}
    </MultiStepForm>
  );
};
