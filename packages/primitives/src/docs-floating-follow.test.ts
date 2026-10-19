/**
 * Guards the floating pages against denying the trigger-follow they ship.
 *
 * **The bug guarded (plan `649`).** Plan `645` measured that a layer kept the
 * side chosen for its trigger's old box: a `Tooltip` and a `Select` whose
 * trigger moved from `y 712` to `y 12` while open painted over it. Both wrappers
 * now re-sample the trigger every 100 ms while the layer is open (and sleep
 * while closed), and `runtime/floating-resize.runtime.test.tsx` proves it.
 *
 * The prose was only partly updated: `tooltip.mdx` ended two limitation bullets
 * with "not re-placed" — contradicting its own §Placement body — and
 * `info-tip.mdx` repeated the claim. Nothing compared those sentences to the
 * sampler, so the pages promised a limitation the component does not have.
 *
 * Both directions are held: every old sentence fails by page and line, and
 * removing `useFloatingFollow` from either wrapper (or changing the cadence
 * away from the documented 100 ms) fails by file.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { FLOATING_FOLLOW_MS } from "./core/floating.js";

/** A claim that a moving trigger is not followed. */
const DENIES_FOLLOW = /not re-?placed|never re-?placed|cannot be re-?placed/i;

/** A page that promises the follow must name the cadence it samples at. */
const CADENCE = "100 ms";

/** A sentence that ties the samplers to a trigger that moves under a layer. */
const FOLLOWS_TRIGGER =
  /trigger[\s\S]{0,240}?(100 ms|follow|sampl|re-measur|re-place)/i;

/** The docs pages that promise the follow, beside the README's capability row. */
const PROMISES = ["tooltip.mdx", "info-tip.mdx", "select.mdx"] as const;

const readText = (relative: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(
      path.join(import.meta.dirname, "..", relative),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readDocs = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const directory = path.join(import.meta.dirname, "..", "docs");
  const files = yield* fs.readDirectory(directory);
  return yield* Effect.forEach(
    Arr.filter(files, Str.endsWith(".mdx")),
    (file) =>
      Effect.map(fs.readFileString(path.join(directory, file)), (body) => ({
        file,
        body,
      })),
    { concurrency: 8 },
  );
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** Every line that denies the follow, with its page and 1-based line number. */
const denials = (
  pages: ReadonlyArray<{ readonly file: string; readonly body: string }>,
): ReadonlyArray<string> =>
  Arr.flatMap(pages, ({ file, body }) =>
    Arr.flatMap(Str.split(body, "\n"), (line, index) =>
      DENIES_FOLLOW.test(line) ? [`${file}:${index + 1} ${line.trim()}`] : [],
    ),
  );

describe("the floating trigger-follow contract", () => {
  it("samples a moving trigger on the documented 100 ms cadence", () => {
    expect(FLOATING_FOLLOW_MS).toBe(100);
  });

  it("is not denied by any primitives page, InfoTip included", async () => {
    const pages = await Effect.runPromise(readDocs);
    const readme = await Effect.runPromise(readText("README.md"));
    // Both pages that shipped the false claim must still be present, so a
    // rename cannot make this guard vacuously green.
    expect(Arr.some(pages, (page) => page.file === "tooltip.mdx")).toBe(true);
    expect(Arr.some(pages, (page) => page.file === "info-tip.mdx")).toBe(true);
    expect(
      denials([...pages, { file: "README.md", body: readme }]),
    ).toStrictEqual([]);
  });

  it("keeps the follow promise on every page that makes it", async () => {
    const pages = await Effect.runPromise(readDocs);
    const readme = await Effect.runPromise(readText("README.md"));
    const bodies = new Map([
      ...Arr.map(pages, (page) => [page.file, page.body] as const),
      ["README.md", readme] as const,
    ]);
    const missing = Arr.filter(
      ["tooltip.mdx", "info-tip.mdx", "select.mdx", "README.md"],
      (file) => {
        const body = bodies.get(file);
        return (
          body === undefined ||
          !Str.includes(CADENCE)(body) ||
          !FOLLOWS_TRIGGER.test(body)
        );
      },
    );
    expect(missing).toStrictEqual([]);
    // The three docs pages are the source of the promise; keep the list honest
    // if a page is renamed.
    expect(
      Arr.every(PROMISES, (file) =>
        Arr.some(pages, (page) => page.file === file),
      ),
    ).toBe(true);
  });

  it("keeps the follow sampler in both floating wrappers", async () => {
    const sources = await Effect.runPromise(
      Effect.forEach(
        ["components/Tooltip.tsx", "components/Select.tsx"],
        (file) =>
          Effect.map(readText(`src/${file}`), (body) => ({ file, body })),
        { concurrency: 2 },
      ),
    );
    // A live call, not a commented-out one: the line must begin with the call.
    expect(
      Arr.flatMap(sources, ({ file, body }) =>
        /(?:^|\n)[ \t]*useFloatingFollow\(/.test(body) ? [] : [file],
      ),
    ).toStrictEqual([]);
  });
});
