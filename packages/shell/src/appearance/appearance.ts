/**
 * Read the Mac's appearance settings at the app boundary.
 *
 * The runtime reports none of them (`@gpuixui/runtime` → `systemAppearance`),
 * so the app asks `defaults`, the same store System Settings writes. The OS
 * sends Node no notification when they change, so {@link watchAppearance}
 * polls. A sandboxed `.app` may be denied the global domain; that read fails
 * with {@link AppearanceReadError} rather than falling back to a guess.
 */

import { Effect, Schema } from "effect";
import * as Duration from "effect/Duration";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import { decodeAppearance, type SystemAppearance } from "./logic.js";

/** A `defaults` read the platform refused. */
export class AppearanceReadError extends Schema.TaggedError<AppearanceReadError>()(
  "AppearanceReadError",
  { key: Schema.String, cause: Schema.Unknown },
) {}

const read = (domain: string, key: string) =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    return yield* spawner.string(
      ChildProcess.make("defaults", ["read", domain, key]),
    );
  }).pipe(Effect.mapError((cause) => new AppearanceReadError({ key, cause })));

/** The Mac's accent, Light/Dark choice and Reduce Transparency, read once. */
export const readAppearance: Effect.Effect<
  SystemAppearance,
  AppearanceReadError,
  ChildProcessSpawner.ChildProcessSpawner
> = Effect.all({
  interfaceStyle: read("-g", "AppleInterfaceStyle"),
  accent: read("-g", "AppleAccentColor"),
  reduceTransparency: read("com.apple.universalaccess", "reduceTransparency"),
}).pipe(Effect.map(decodeAppearance));

/** How often {@link watchAppearance} asks again. */
export const appearancePoll: Duration.Duration = Duration.seconds(2);

const same = (a: SystemAppearance, b: SystemAppearance): boolean =>
  a.mode === b.mode &&
  a.reduceTransparency === b.reduceTransparency &&
  a.accent._tag === b.accent._tag &&
  (a.accent._tag === "None" || b.accent._tag === "None"
    ? true
    : a.accent.value === b.accent.value);

/** The appearance now, then each change, polled every {@link appearancePoll}. */
export const watchAppearance: Stream.Stream<
  SystemAppearance,
  AppearanceReadError,
  ChildProcessSpawner.ChildProcessSpawner
> = Stream.fromEffectSchedule(
  readAppearance,
  Schedule.spaced(appearancePoll),
).pipe(Stream.changesWith(same));
