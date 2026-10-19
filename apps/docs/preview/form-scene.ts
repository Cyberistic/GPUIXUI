import * as Schema from "effect/Schema";

/**
 * The form scene's schema, kept JSX-free so a node test can prove the message
 * `Form` paints is the text the live-preview smoke waits for (plan 572).
 */

/** The message Form prints for an address without an `@`. */
export const FORM_MESSAGE = "Enter an address with an @";

/** The field the scene's invalid submit fails on. */
export const FormEmail = Schema.String.check(
  Schema.makeFilter((value: string) => value.includes("@"), {
    identifier: "FormSceneEmailHasAtCheck",
    title: "Form scene email has @",
    description: "An address that contains `@`.",
    message: FORM_MESSAGE,
  }),
);

/** Two fields, so a failed submit is a real composite rather than one leaf. */
export class FormValues extends Schema.Class<FormValues>("FormValues")({
  email: FormEmail,
  name: Schema.NonEmptyString,
}) {}

/** What the scene starts with: an empty address and name. */
export const EMPTY_FORM: { readonly email: string; readonly name: string } = {
  email: "",
  name: "",
};
