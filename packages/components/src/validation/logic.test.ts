/**
 * Field validation messages.
 *
 * The bugs these guard: a message invented by this package instead of taken
 * from the schema's own `message` annotation; `validateAll` reporting one
 * composite blob instead of a message per failing field; the messages arriving
 * in an arbitrary order; and a message repeated once per failing field.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { validate, validateAll } from "./logic.js";

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

class TwiceSame extends Schema.Class<TwiceSame>("TwiceSame")({
  email: Address,
  backup: Address,
}) {}

describe("validate", () => {
  it.effect("returns the schema's own message", () =>
    Effect.gen(function* () {
      const message = yield* validate(Address)("nope");
      expect(message).toEqual(Option.some(addressMessage));
    }),
  );

  it.effect("is none for a value the schema accepts", () =>
    Effect.gen(function* () {
      expect(yield* validate(Address)("ada@example.com")).toEqual(
        Option.none(),
      );
    }),
  );
});

describe("validateAll", () => {
  it.effect("reports one message per failing field, in field order", () =>
    Effect.gen(function* () {
      const emptyMessage = yield* Effect.flip(
        Schema.decodeUnknownEffect(Schema.NonEmptyString)(""),
      );
      const messages = yield* validateAll(Signup)({ email: "nope", name: "" });

      expect(Arr.length(messages)).toBe(2);
      expect(messages[0]).toBe(addressMessage);
      expect(messages[1]).toBe(emptyMessage.message);
    }),
  );

  it.effect("deduplicates a message two fields share", () =>
    Effect.gen(function* () {
      const messages = yield* validateAll(TwiceSame)({
        email: "nope",
        backup: "also-nope",
      });

      expect(messages).toEqual([addressMessage]);
    }),
  );

  it.effect("is empty for a value the schema accepts", () =>
    Effect.gen(function* () {
      const messages = yield* validateAll(Signup)({
        email: "ada@example.com",
        name: "Ada",
      });

      expect(messages).toEqual([]);
    }),
  );
});
