import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  VALIDATION_DESCRIPTION,
  VALIDATION_MESSAGE,
  submitSlug,
  validationReadout,
} from "./validation.js";

const messageFor = (value: string): string =>
  Option.getOrElse(submitSlug(value), () => "none");

describe("the validation the probe submits", () => {
  it("rejects an empty field with the pattern's own message", () => {
    expect(messageFor("")).toBe(VALIDATION_MESSAGE);
  });

  it("accepts a single lowercase word", () => {
    expect(submitSlug("design")).toEqual(Option.none());
  });

  it("rejects a value that keeps its words but breaks the separators", () => {
    expect(messageFor("design system")).toBe(VALIDATION_MESSAGE);
    expect(messageFor("design--system")).toBe(VALIDATION_MESSAGE);
  });

  it("accepts hyphen-joined words", () => {
    expect(submitSlug("design-system-2")).toEqual(Option.none());
  });

  it("prints the state the checks read", () => {
    expect(validationReadout(Option.none(), Option.none(), 0)).toBe(
      "error=none applied=none submits=0",
    );
    expect(
      validationReadout(
        Option.some(VALIDATION_MESSAGE),
        Option.some("design"),
        3,
      ),
    ).toBe(`error=${VALIDATION_MESSAGE} applied=design submits=3`);
  });

  it("keeps the description and the message apart, so the field can swap them", () => {
    expect(VALIDATION_DESCRIPTION).not.toBe(VALIDATION_MESSAGE);
    expect(VALIDATION_DESCRIPTION.includes(VALIDATION_MESSAGE)).toBe(false);
  });
});
