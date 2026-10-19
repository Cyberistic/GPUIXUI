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
import { SCENE_TEXT } from "../../../preview/scenes";

/**
 * Guards plan 572: the live-preview smoke looks for `SCENE_TEXT.form` after it
 * presses submit, and `Form` paints whatever the schema's own formatter
 * returns. Nothing compared the two, so a changed message annotation or a
 * changed expectation would leave the scene waiting for text the form can
 * never paint; these tests fail in either direction.
 */
describe("the form scene's expectation", () => {
  it("is the message the schema formatter produces for an empty address", () => {
    const message = Result.match(Schema.decodeUnknownResult(FormEmail)(""), {
      onFailure: (error) => SchemaIssue.makeFormatterDefault()(error.issue),
      onSuccess: () => "",
    });
    expect(message).toBe(FORM_MESSAGE);
  });

  it("is the text the live scene waits for", () => {
    expect(SCENE_TEXT.form).toBe(FORM_MESSAGE);
  });

  it("rejects the scene's starting value at the address field", () => {
    const decoded = Schema.decodeUnknownResult(FormValues)(EMPTY_FORM);
    expect(Result.isFailure(decoded)).toBe(true);
  });
});
