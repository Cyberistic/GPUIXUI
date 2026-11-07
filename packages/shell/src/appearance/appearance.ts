import { Effect, Schema } from "effect";
import * as Duration from "effect/Duration";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import { decodeAppearance, type SystemAppearance } from "./logic.js";

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

export const readAppearance: Effect.Effect<
  SystemAppearance,
  AppearanceReadError,
  ChildProcessSpawner.ChildProcessSpawner
> = Effect.all({
  interfaceStyle: read("-g", "AppleInterfaceStyle"),
  accent: read("-g", "AppleAccentColor"),
  reduceTransparency: read("com.apple.universalaccess", "reduceTransparency"),
}).pipe(Effect.map(decodeAppearance));

export const appearancePoll: Duration.Duration = Duration.seconds(2);

const same = (a: SystemAppearance, b: SystemAppearance): boolean =>
  a.mode === b.mode &&
  a.reduceTransparency === b.reduceTransparency &&
  a.accent._tag === b.accent._tag &&
  (a.accent._tag === "None" || b.accent._tag === "None"
    ? true
    : a.accent.value === b.accent.value);

export const watchAppearance: Stream.Stream<
  SystemAppearance,
  AppearanceReadError,
  ChildProcessSpawner.ChildProcessSpawner
> = Stream.fromEffectSchedule(
  readAppearance,
  Schedule.spaced(appearancePoll),
).pipe(Stream.changesWith(same));
