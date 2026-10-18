/**
 * Toast input decoding.
 *
 * The bugs these guard: a missing tone decoding to `undefined` instead of the
 * documented `info` default, an empty title queuing an invisible toast, an
 * unknown tone reaching the viewport, and a `duration` that silently decodes to
 * the wrong magnitude.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { ToastInput } from "./model.js";

const decode = Schema.decodeUnknownEffect(ToastInput);

describe("ToastInput", () => {
  it.effect("defaults the tone and the optional fields", () =>
    Effect.gen(function* () {
      const input = yield* decode({ title: "Saved" });
      expect(input.title).toBe("Saved");
      expect(input.tone).toBe("info");
      expect(Option.isNone(input.description)).toBe(true);
      expect(Option.isNone(input.duration)).toBe(true);
    }),
  );

  it.effect("keeps a description and a tone that were given", () =>
    Effect.gen(function* () {
      const input = yield* decode({
        title: "Upload failed",
        description: "Check the network",
        tone: "danger",
      });
      expect(input.tone).toBe("danger");
      expect(Option.getOrElse(input.description, () => "")).toBe(
        "Check the network",
      );
    }),
  );

  it.effect("decodes a duration to the value it names", () =>
    Effect.gen(function* () {
      const input = yield* decode({
        title: "Saved",
        duration: Duration.seconds(3),
      });
      expect(Option.map(input.duration, Duration.toMillis)).toEqual(
        Option.some(3000),
      );
    }),
  );

  it.effect("rejects an empty title", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(decode({ title: "" }));
      expect(Schema.isSchemaError(error)).toBe(true);
    }),
  );

  it.effect("rejects an unknown tone", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        decode({ title: "Saved", tone: "purple" }),
      );
      expect(Schema.isSchemaError(error)).toBe(true);
    }),
  );

  it.effect("rejects a title that is not a string", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(decode({ title: 42 }));
      expect(Schema.isSchemaError(error)).toBe(true);
    }),
  );
});
