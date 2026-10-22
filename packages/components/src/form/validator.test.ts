/**
 * The `@tanstack/form-core` adoption, run where `window` and `document` are
 * undefined.
 *
 * The bugs these guard: a form reducer that needs a DOM global (so the core
 * could not run in a Node boundary); a field error that appears before its
 * configured cause (submit, change or blur); a whole-value schema failure that
 * lands on the wrong field; a cross-field validator that cannot read its
 * sibling; and a reset that does not restore the initial values.
 */

import { FieldApi, FormApi } from "@tanstack/form-core";
import { describe, expect, it } from "vitest";
import * as Schema from "effect/Schema";
import { fieldSchemaValidator, schemaValidator } from "./validator.js";

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

/** The errors form-core recorded, kept as strings only. */
const messages = (errors: ReadonlyArray<unknown>): ReadonlyArray<string> =>
  errors.filter((error): error is string => typeof error === "string");

describe("@tanstack/form-core in Node", () => {
  it("runs the form reducer where window and document are undefined", () => {
    expect("window" in globalThis).toBe(false);
    expect("document" in globalThis).toBe(false);

    const form = new FormApi({ defaultValues: { email: "" } });
    form.setFieldValue("email", () => "ada@example.com");

    expect(form.getFieldValue("email")).toBe("ada@example.com");
    expect(form.state.isDirty).toBe(true);
  });

  it("shows a field error only after submit, not at mount or change", async () => {
    const form = new FormApi({ defaultValues: { email: "nope" } });
    const field = new FieldApi({
      form,
      name: "email",
      validators: { onSubmit: fieldSchemaValidator(Address) },
    });
    field.mount();

    expect(messages(form.getFieldMeta("email")?.errors ?? [])).toEqual([]);
    field.handleChange(() => "still-nope");
    expect(messages(form.getFieldMeta("email")?.errors ?? [])).toEqual([]);

    await form.validateAllFields("submit");
    expect(messages(form.getFieldMeta("email")?.errors ?? [])).toEqual([
      addressMessage,
    ]);
  });

  it("shows a field error on change when the field validates onChange", () => {
    const form = new FormApi({ defaultValues: { email: "" } });
    const field = new FieldApi({
      form,
      name: "email",
      validators: { onChange: fieldSchemaValidator(Address) },
    });
    field.mount();

    expect(messages(form.getFieldMeta("email")?.errors ?? [])).toEqual([]);
    field.handleChange(() => "nope");
    expect(messages(form.getFieldMeta("email")?.errors ?? [])).toEqual([
      addressMessage,
    ]);
  });

  it("shows a field error on blur when the field validates onBlur", () => {
    const form = new FormApi({ defaultValues: { email: "nope" } });
    const field = new FieldApi({
      form,
      name: "email",
      validators: { onBlur: fieldSchemaValidator(Address) },
    });
    field.mount();

    expect(messages(form.getFieldMeta("email")?.errors ?? [])).toEqual([]);
    field.handleBlur();
    expect(messages(form.getFieldMeta("email")?.errors ?? [])).toEqual([
      addressMessage,
    ]);
  });

  it("maps a schema failure to the field it names", async () => {
    const form = new FormApi({
      defaultValues: { email: "nope", name: "" },
      validators: { onSubmit: schemaValidator(Signup) },
    });

    await form.validate("submit");

    const email = messages(form.getFieldMeta("email")?.errors ?? []);
    const name = messages(form.getFieldMeta("name")?.errors ?? []);

    expect(email).toEqual([addressMessage]);
    expect(name).toEqual(["Expected a value with a length of at least 1"]);
    // Each field carries its own message, never the sibling's.
    expect(email).not.toContain("Expected a value with a length of at least 1");
    expect(name).not.toContain(addressMessage);
  });

  it("lets a field validator read its sibling's value", async () => {
    const form = new FormApi({
      defaultValues: { password: "secret", confirm: "secret" },
    });
    const confirm = new FieldApi({
      form,
      name: "confirm",
      validators: {
        onSubmit: ({ value, fieldApi }) =>
          value === fieldApi.form.getFieldValue("password")
            ? undefined
            : "Passwords do not match",
      },
    });
    confirm.mount();

    await form.validateAllFields("submit");
    expect(messages(form.getFieldMeta("confirm")?.errors ?? [])).toEqual([]);

    form.setFieldValue("confirm", () => "wrong");
    await form.validateAllFields("submit");
    expect(messages(form.getFieldMeta("confirm")?.errors ?? [])).toEqual([
      "Passwords do not match",
    ]);
  });

  it("reset restores the initial values and clears dirty state", () => {
    const form = new FormApi({ defaultValues: { email: "ada@example.com" } });

    form.setFieldValue("email", () => "changed");
    expect(form.getFieldValue("email")).toBe("changed");
    expect(form.state.isDirty).toBe(true);

    form.reset();
    expect(form.getFieldValue("email")).toBe("ada@example.com");
    expect(form.state.isDirty).toBe(false);
    expect(form.state.isTouched).toBe(false);
  });
});
