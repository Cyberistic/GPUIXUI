/**
 * The release runtime's focus-event gap must stay documented and guarded.
 *
 * The bug this guards (plan `583`): on the published 0.10.0 build native focus
 * moves and `getFocusedElementId()` tracks it, but no `onFocus`/`onBlur` is
 * delivered. The capability table first called focus events "supported", the
 * README blamed a main-derived artifact, and no page told a reader. A doc that
 * overstates the runtime authorises a component that cannot work, so the
 * verdict, the notice on every focusable page and the README's provenance are
 * asserted here; reverting any of them fails by name.
 *
 * Plan `590` then restored the rings through a tracker, so a page must say both
 * things: the events are still missing, and the ring paints through
 * `getFocusedElementId()`.
 */

import { Effect, FileSystem, Option, Path, pipe } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

const file = (path: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const pathService = yield* Path.Path;
    return yield* fileSystem.readFileString(
      pathService.join(import.meta.dirname, "..", "..", "..", ...path),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readCapabilities = () => file(["docs", "gpuix-capabilities.md"]);
const readReadme = () => file(["packages", "primitives", "README.md"]);

/** The marker every focusable page carries; the link is the shared evidence. */
const NOTICE = "**Release-runtime focus:**";
const LINK = "gpuix-capabilities.md#focus-events";

/** One page per control whose chrome paints a ring (plan `084`) plus its trigger. */
const FOCUSABLE_PAGES: ReadonlyArray<string> = [
  "button",
  "icon-button",
  "toggle",
  "toggle-group",
  "checkbox",
  "checkbox-group",
  "switch",
  "input",
  "textarea",
  "number-field",
  "otp-field",
  "select",
  "slider",
  "range-slider",
  "radio-group",
  "rating",
  "scroll-area",
  "info-tip",
  "tooltip",
  "surface",
];

const pagesDir = ["packages", "primitives", "docs"] as const;

const readPage = (name: string) => file([...pagesDir, `${name}.mdx`]);

/** The lines between one heading and the next heading of any level. */
const section = (doc: string, heading: string): string => {
  const lines = Str.split("\n")(doc);
  const start = Arr.findFirstIndex(lines, (line) =>
    Str.startsWith(heading)(line),
  );
  return Option.match(start, {
    onNone: () => "",
    onSome: (index) =>
      pipe(
        Arr.drop(lines, index + 1),
        Arr.takeWhile((line) => !Str.startsWith("#")(line)),
        Arr.join("\n"),
      ),
  });
};

/** The limits-table row whose capability cell contains `capability`. */
const rowFor = (doc: string, capability: string): string =>
  pipe(
    Str.split("\n")(doc),
    Arr.findFirst((line) =>
      pipe(
        line,
        Str.startsWith("|"),
        (starts) => starts && Str.includes(capability)(line),
      ),
    ),
    Option.getOrElse(() => ""),
  );

describe("release-runtime focus events", () => {
  it("records focus events as partial, not supported", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    const row = rowFor(doc, "Pointer, keyboard, focus and scroll events");
    expect(row).toContain("partial");
    expect(row).toContain("onFocus");
    expect(row).toContain("getFocusedElementId");
    expect(Str.includes("| **supported** |")(row)).toBe(false);
  });

  it("records the measurement that proves it", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    const evidence = section(doc, "### Focus events");
    expect(evidence).toContain("onFocus");
    expect(evidence).toContain("getFocusedElementId");
    expect(evidence).toContain("19");
    expect(evidence).toContain("583");
  });

  it("states the limitation on every focusable page", async () => {
    const missing = await Effect.runPromise(
      Effect.forEach(
        FOCUSABLE_PAGES,
        (name) =>
          Effect.map(readPage(name), (page) =>
            Str.includes(NOTICE)(page) && Str.includes(LINK)(page)
              ? Option.none()
              : Option.some(`${name}.mdx`),
          ),
        { concurrency: 1 },
      ),
    );
    expect(Arr.getSomes(missing)).toStrictEqual([]);
  });

  it("states the tracker that restores the ring on every focusable page", async () => {
    const missing = await Effect.runPromise(
      Effect.forEach(
        FOCUSABLE_PAGES,
        (name) =>
          Effect.map(readPage(name), (page) =>
            Str.includes("native-focus tracker")(page) &&
            Str.includes("590")(page)
              ? Option.none()
              : Option.some(`${name}.mdx`),
          ),
        { concurrency: 1 },
      ),
    );
    expect(Arr.getSomes(missing)).toStrictEqual([]);
  });

  it("lets no page promise a focus ring without the notice", async () => {
    // Plan 583's regression direction: a new page (or a restored paragraph)
    // that says the ring paints would be false for a 0.10.0 consumer.
    const directory = await Effect.runPromise(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        return yield* fileSystem.readDirectory(
          path.join(
            import.meta.dirname,
            "..",
            "..",
            "..",
            "packages",
            "primitives",
            "docs",
          ),
        );
      }).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
      ),
    );
    const offenders = await Effect.runPromise(
      Effect.forEach(
        Arr.filter(directory, Str.endsWith(".mdx")),
        (name) =>
          Effect.map(readPage(Str.replace(/\.mdx$/u, "")(name)), (page) =>
            Str.includes("focus ring")(page) && !Str.includes(NOTICE)(page)
              ? Option.some(name)
              : Option.none(),
          ),
        { concurrency: 1 },
      ),
    );
    expect(Arr.getSomes(offenders)).toStrictEqual([]);
  });

  it("names the release-tag build, not an artifact excuse", async () => {
    const readme = await Effect.runPromise(readReadme());
    expect(readme).toContain("583-release-runtime-focus.md");
    expect(readme).toContain("release-tag");
    expect(readme).toContain("focusVisible=0");
    expect(readme).toContain("native-focus tracker");
    expect(readme).toContain("590");
    expect(Str.includes("locally built `main`-derived binding")(readme)).toBe(
      false,
    );
  });
});
