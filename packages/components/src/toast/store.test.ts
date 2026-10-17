/**
 * The toast store's queue, cancellation and auto-dismiss, under `TestClock`.
 *
 * The bug this guards: a toast dismissed before its timer elapsed left its
 * timer running, and the timer then dismissed whatever toast held the next id.
 * Ids are monotonic here (so an id is never reused) and `dismiss` cancels its
 * timer, so the queue, the wrap-around of `max`, and the deadline of each
 * toast must all be observable in the assertions below.
 */

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

/** Run `body` against a fresh store; the layer's scope is the test's scope. */
const withStore = (
  body: Effect.Effect<void, Schema.SchemaError, ToastStore>,
  options?: ToastStoreOptions,
) => body.pipe(Effect.provide(layer(options)));

/** A toast that never auto-dismisses, so a test controls its lifetime. */
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

        // The next toast gets the next id, at a later clock time. If ids were
        // reused — or if dismissing had left the first timer alive — this
        // toast would be dismissed when that first deadline arrived.
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

        // `match` keeps the type of the rejection as a value, so the test's
        // own failure channel stays the store's.
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

        // One fiber, so there is no subscription race: the tap pushes inside the
        // stream's own pull chain, and the next pull must deliver the update.
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
});
