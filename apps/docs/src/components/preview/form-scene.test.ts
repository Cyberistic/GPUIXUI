import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import { describe, expect, it } from "vitest";
import {
  EMPTY_FORM,
  FormEmail,
  FormValues,
  FORM_MESSAGE,
} from "../../../preview/form-scene";
import { SCENE_STEP_TEXT, SCENE_TEXT } from "../../../preview/scenes";

/**
 * Guards plans 572 and 573: the live-preview smoke proves both outcomes the
 * Form page documents. The invalid press must paint the schema's own message,
 * and the valid submit must reach `Account created`; `Form` paints whatever the
 * schema formatter returns, so a changed message annotation or a changed
 * expectation would leave the scene waiting for text the form can never paint.
 * These tests fail in either direction.
 */
describe("the form scene's expectations", () => {
  it("is the message the schema formatter produces for an empty address", () => {
    const message = Result.match(Schema.decodeUnknownResult(FormEmail)(""), {
      onFailure: (error) => SchemaIssue.makeFormatterDefault()(error.issue),
      onSuccess: () => "",
    });
    expect(message).toBe(FORM_MESSAGE);
  });

  it("paints the schema message on the first press", () => {
    expect(SCENE_STEP_TEXT.form?.[1]).toBe(FORM_MESSAGE);
  });

  it("paints the submitted state after the valid press", () => {
    expect(SCENE_TEXT.form).toBe("Account created");
  });

  it("rejects the scene's starting value at the address field", () => {
    const decoded = Schema.decodeUnknownResult(FormValues)(EMPTY_FORM);
    expect(Result.isFailure(decoded)).toBe(true);
  });

  it("accepts the value the gesture fills", () => {
    const decoded = Schema.decodeUnknownResult(FormValues)({
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
    expect(Result.isSuccess(decoded)).toBe(true);
  });
});
