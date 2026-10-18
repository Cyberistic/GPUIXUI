/**
 * Field validation messages.
 *
 * The bugs these guard: a message invented by this package instead of taken
 * from the schema's own `message` annotation; `validateAll` reporting one
 * composite blob instead of a message per failing field; the messages arriving
 * in an arbitrary order; a message repeated once per failing field; and a
 * message with no path, which cannot be attached to the field that produced it.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  fieldMessageAt,
  validate,
  validateAll,
  validateFields,
} from "./logic.js";

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

class Contact extends Schema.Class<Contact>("Contact")({ email: Address }) {}

class Profile extends Schema.Class<Profile>("Profile")({ user: Contact }) {}

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

describe("validateFields", () => {
  it.effect("locates each message at its field path, in field order", () =>
    Effect.gen(function* () {
      const fields = yield* validateFields(Signup)({
        email: "nope",
        name: "",
      });

      expect(Arr.map(fields, (field) => field.path)).toEqual([
        ["email"],
        ["name"],
      ]);
      expect(fields[0]?.message).toBe(addressMessage);
    }),
  );

  it.effect("accumulates a nested path and keeps a root failure at []", () =>
    Effect.gen(function* () {
      const nested = yield* validateFields(Profile)({
        user: { email: "nope" },
      });
      expect(Arr.map(nested, (field) => field.path)).toEqual([
        ["user", "email"],
      ]);

      const root = yield* validateFields(Address)("nope");
      expect(Arr.map(root, (field) => field.path)).toEqual([[]]);
    }),
  );

  it.effect("keeps one entry per path for a message two fields share", () =>
    Effect.gen(function* () {
      const fields = yield* validateFields(TwiceSame)({
        email: "nope",
        backup: "also-nope",
      });

      expect(Arr.map(fields, (field) => field.message)).toEqual([
        addressMessage,
        addressMessage,
      ]);
      expect(Arr.map(fields, (field) => field.path)).toEqual([
        ["email"],
        ["backup"],
      ]);
    }),
  );

  it.effect("finds a message by a key or a path", () =>
    Effect.gen(function* () {
      const fields = yield* validateFields(TwiceSame)({
        email: "nope",
        backup: "also-nope",
      });

      expect(fieldMessageAt(fields, "backup")).toEqual(
        Option.some(addressMessage),
      );
      expect(fieldMessageAt(fields, ["backup"])).toEqual(
        Option.some(addressMessage),
      );
      expect(fieldMessageAt(fields, "missing")).toEqual(Option.none());
    }),
  );
});
