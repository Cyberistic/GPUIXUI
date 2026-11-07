import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import { layer, ToastStore, type ToastStoreOptions } from "./store.js";

const ids = (toasts: ReadonlyArray<{ readonly id: string }>) =>
  Arr.map(toasts, (toast) => toast.id);

const withStore = (
  body: Effect.Effect<void, Schema.SchemaError, ToastStore>,
  options?: ToastStoreOptions,
) => body.pipe(Effect.provide(layer(options)));

const persistent = { title: "Sticky", duration: Duration.infinity } as const;

describe("ToastStore", () => {
  it.effect("pushes a toast with a monotonic id and the decoded tone", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        const first = yield* store.push({ title: "Saved" });
        const second = yield* store.push({
          title: "Saved too",
          tone: "success",
        });

        expect(first.id).toBe("1");
        expect(first.tone).toBe("info");
        expect(Option.isNone(first.description)).toBe(true);
        expect(second.id).toBe("2");
        expect(second.tone).toBe("success");
        expect(ids(yield* store.toasts)).toEqual(["1", "2"]);
      }),
    ),
  );

  it.effect("carries a decoded action label on the queued toast", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        const toast = yield* store.push({
          title: "Message archived",
          action: { label: "Undo" },
        });

        expect(Option.map(toast.action, (action) => action.label)).toEqual(
          Option.some("Undo"),
        );
      }),
    ),
  );

  it.effect("rejects an empty action label and queues nothing", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;

        const rejection = yield* store
          .push({ title: "Archived", action: { label: "" } })
          .pipe(
            Effect.match({
              onFailure: (error) => error,
              onSuccess: () => undefined,
            }),
          );

        expect(Schema.isSchemaError(rejection)).toBe(true);
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("leaves a toast without an action with none", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        const toast = yield* store.push(persistent);

        expect(Option.isNone(toast.action)).toBe(true);
      }),
    ),
  );

  it.effect("keeps the newest toasts and drops the oldest beyond max", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push(persistent);
        yield* store.push(persistent);
        yield* store.push(persistent);

        expect(ids(yield* store.toasts)).toEqual(["2", "3"]);
      }),
      { max: 2 },
    ),
  );

  it.effect("reads a limit it cannot measure as the default", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push(persistent);
        yield* store.push(persistent);
        yield* store.push(persistent);
        yield* store.push(persistent);

        expect(ids(yield* store.toasts)).toEqual(["2", "3", "4"]);
      }),
      { max: Number.NaN },
    ),
  );

  it.effect("reads an unbounded limit as the default", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push(persistent);
        yield* store.push(persistent);
        yield* store.push(persistent);
        yield* store.push(persistent);

        expect(ids(yield* store.toasts)).toEqual(["2", "3", "4"]);
      }),
      { max: Number.POSITIVE_INFINITY },
    ),
  );

  it.effect("dismisses one toast and leaves the rest", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push(persistent);
        yield* store.push(persistent);
        yield* store.push(persistent);

        yield* store.dismiss("2");

        expect(ids(yield* store.toasts)).toEqual(["1", "3"]);
      }),
    ),
  );

  it.effect("dismissAll empties the queue", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push(persistent);
        yield* store.push(persistent);

        yield* store.dismissAll;

        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("auto-dismisses a toast once its duration elapses", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Saved" });

        yield* TestClock.adjust(Duration.seconds(4));
        expect(ids(yield* store.toasts)).toEqual(["1"]);

        yield* TestClock.adjust(Duration.seconds(1));
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("keeps an infinite duration until it is dismissed", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push(persistent);

        yield* TestClock.adjust(Duration.hours(1));

        expect(ids(yield* store.toasts)).toEqual(["1"]);
      }),
    ),
  );

  it.effect("dismisses a shorter duration before a longer one", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Quick", duration: Duration.seconds(1) });
        yield* store.push({ title: "Slow", duration: Duration.seconds(9) });

        yield* TestClock.adjust(Duration.seconds(2));

        expect(ids(yield* store.toasts)).toEqual(["2"]);
      }),
    ),
  );

  it.effect("never lets a cancelled timer dismiss a later toast", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Gone soon" });
        yield* store.dismiss("1");

        yield* TestClock.adjust(Duration.seconds(3));
        yield* store.push({ title: "Survivor" });
        expect(ids(yield* store.toasts)).toEqual(["2"]);

        yield* TestClock.adjust(Duration.seconds(2));
        expect(ids(yield* store.toasts)).toEqual(["2"]);

        yield* TestClock.adjust(Duration.seconds(3));
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("a rejected draft queues nothing", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Kept", duration: Duration.infinity });

        const rejection = yield* store.push({ title: "" }).pipe(
          Effect.match({
            onFailure: (error) => error,
            onSuccess: () => undefined,
          }),
        );

        expect(Schema.isSchemaError(rejection)).toBe(true);
        expect(ids(yield* store.toasts)).toEqual(["1"]);
      }),
    ),
  );

  it.effect("changes emits the current queue first, then each update", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;

        const seen = yield* store.changes.pipe(
          Stream.tap((toasts) =>
            Arr.length(toasts) === 0 ? store.push(persistent) : Effect.void,
          ),
          Stream.take(2),
          Stream.runCollect,
        );

        expect(Arr.map(Arr.fromIterable(seen), ids)).toEqual([[], ["1"]]);
      }),
    ),
  );

  it.effect("pauses the clock and resumes with the remaining time", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Read me" });

        yield* TestClock.adjust(Duration.seconds(2));
        yield* store.pause("1");
        yield* TestClock.adjust(Duration.minutes(1));

        expect(ids(yield* store.toasts)).toEqual(["1"]);

        yield* store.resume("1");
        yield* TestClock.adjust(Duration.millis(2900));
        expect(ids(yield* store.toasts)).toEqual(["1"]);

        yield* TestClock.adjust(Duration.millis(200));
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("pause and resume are no-ops for a toast with no timer", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push(persistent);

        yield* store.pause("1");
        yield* TestClock.adjust(Duration.hours(1));
        yield* store.resume("1");
        yield* TestClock.adjust(Duration.hours(1));

        expect(ids(yield* store.toasts)).toEqual(["1"]);
      }),
    ),
  );

  it.effect("ignores pause and resume for a toast that is already gone", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Gone soon" });
        yield* store.dismiss("1");

        yield* store.pause("1");
        yield* store.resume("1");

        yield* store.push({ title: "Survivor" });
        yield* TestClock.adjust(Duration.seconds(3));
        expect(ids(yield* store.toasts)).toEqual(["2"]);

        yield* TestClock.adjust(Duration.seconds(2));
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("keeps a loading toast until its promise settles", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({
          title: "Importing",
          phase: "loading",
          duration: Duration.seconds(1),
        });

        yield* TestClock.adjust(Duration.hours(1));

        expect(ids(yield* store.toasts)).toEqual(["1"]);
      }),
    ),
  );

  it.effect("settles the same row and starts the answer's clock", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Importing", phase: "loading" });

        const settled = yield* store.update("1", {
          title: "Imported 12 rows",
          tone: "success",
          duration: Duration.seconds(1),
        });

        expect(Option.map(settled, (toast) => toast.id)).toEqual(
          Option.some("1"),
        );
        expect(Option.map(settled, (toast) => toast.phase)).toEqual(
          Option.some("settled"),
        );

        yield* TestClock.adjust(Duration.millis(900));
        expect(ids(yield* store.toasts)).toEqual(["1"]);

        yield* TestClock.adjust(Duration.millis(200));
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("answers None for an answer that outlived its card", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Importing", phase: "loading" });
        yield* store.dismiss("1");

        const settled = yield* store.update("1", {
          title: "Imported",
          tone: "success",
        });

        expect(Option.isNone(settled)).toBe(true);
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("holds a toast pushed while the stack is held", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.hold(true);
        yield* store.push({ title: "Read me" });

        yield* TestClock.adjust(Duration.hours(1));
        expect(ids(yield* store.toasts)).toEqual(["1"]);

        yield* store.hold(false);
        yield* TestClock.adjust(Duration.millis(4_900));
        expect(ids(yield* store.toasts)).toEqual(["1"]);

        yield* TestClock.adjust(Duration.millis(200));
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );

  it.effect("holds a settled promise toast until the stack is released", () =>
    withStore(
      Effect.gen(function* () {
        const store = yield* ToastStore;
        yield* store.push({ title: "Importing", phase: "loading" });
        yield* store.hold(true);
        yield* store.update("1", {
          title: "Imported",
          tone: "success",
          duration: Duration.seconds(1),
        });

        yield* TestClock.adjust(Duration.minutes(1));
        expect(ids(yield* store.toasts)).toEqual(["1"]);

        yield* store.hold(false);
        yield* TestClock.adjust(Duration.seconds(1));
        expect(yield* store.toasts).toEqual([]);
      }),
    ),
  );
});
