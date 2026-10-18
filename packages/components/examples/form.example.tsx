/**
 * Form example: a signup form that validates against a schema and shows a real
 * success state.
 *
 * The value stays here — `Form` never reads the runtime for it. `onSubmit`
 * receives the decoded `Signup`, so the example uses the class rather than the
 * draft object.
 */

import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useState } from "react";
import { Field, FieldInput } from "../src/field.js";
import { Form } from "../src/form.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

const addressMessage = "Enter an address with an @";

const Address = Schema.String.check(
  Schema.makeFilter((value: string) => value.includes("@"), {
    identifier: "AddressHasAtCheck",
    title: "Address has @",
    description: "An address that contains `@`.",
    message: addressMessage,
  }),
);

class Signup extends Schema.Class<Signup>("Signup")({
  email: Address,
  name: Schema.NonEmptyString,
}) {}

/** A signup form: two fields, a real submit and a success line. */
export const FormExample = () => {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [created, setCreated] = useState<Option.Option<string>>(Option.none());

  return (
    <Form
      schema={Signup}
      value={{ email, name }}
      onSubmit={(signup) => setCreated(Option.some(signup.email))}
      label="Create account"
      style={{ width: 360 }}
    >
      {(form) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          <Field label="Name" error={form.errorFor("name")}>
            <FieldInput
              value={name}
              onChange={(event) => setName(event.value ?? "")}
            />
          </Field>
          <Button onClick={form.submit}>Create account</Button>
          {Option.match(created, {
            onNone: () => null,
            onSome: (emailAddress) => (
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {`Created ${emailAddress}`}
              </text>
            ),
          })}
        </div>
      )}
    </Form>
  );
};
