/**
 * Guards the keyboard tables against the pure rule they describe.
 *
 * The bug guarded (plan `394`): `docs/toggle-group.mdx` listed `←` `↑` and
 * `→` `↓` for both orientations, but `decideMove` answers only the group's own
 * axis, so `↑`/`↓` were inert in a horizontal group (measured: `Up` left focus
 * and value on `Left`, while `Right` moved to `Centre`). Nothing compared a
 * documented key to the rule, so the page promised keys the component never
 * received — the class plans `338` and `360` fixed for other controls.
 *
 * These tests read the pages and the rule and fail by row and key when they
 * disagree: a mixed-axis row, an unqualified row, a documented key the rule
 * ignores, or a cross-axis key the rule accepts.
 */

import { Effect, FileSystem, Option, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { decideMove } from "./core/keyboard.js";

/** The document's arrow glyphs, mapped to the runtime key names. */
const KEYS: Readonly<Record<string, string>> = {
  "←": "left",
  "→": "right",
  "↑": "up",
  "↓": "down",
};

/** The glyphs each orientation answers. */
const AXES = {
  horizontal: ["←", "→"],
  vertical: ["↑", "↓"],
} as const;

type Orientation = keyof typeof AXES;

/** The text of one level-two section, without its heading. */
const section = (markdown: string, heading: string): string => {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const body = markdown.slice(start + heading.length + 3);
  const end = body.indexOf("\n## ");
  return end === -1 ? body : body.slice(0, end);
};

const glyphs = (line: string): ReadonlyArray<string> =>
  Arr.filter(R.keys(KEYS), (glyph) => Str.includes(glyph)(line));

/** A table row that names at least one arrow. */
const arrowRows = (markdown: string): ReadonlyArray<string> =>
  Arr.filter(
    Str.split(section(markdown, "Keyboard"), "\n"),
    (line) =>
      Str.startsWith("|")(line) && Arr.isReadonlyArrayNonEmpty(glyphs(line)),
  );

const orientation = (line: string): Option.Option<Orientation> =>
  Str.includes("(horizontal)")(line)
    ? Option.some("horizontal")
    : Str.includes("(vertical)")(line)
      ? Option.some("vertical")
      : Option.none();

const readDoc = (name: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(
      path.join(import.meta.dirname, "..", "docs", `${name}.mdx`),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("the keyboard pages", () => {
  it("qualify every ToggleGroup arrow row by one axis", async () => {
    const page = await Effect.runPromise(readDoc("toggle-group"));
    const rows = arrowRows(page);
    // One horizontal row and one vertical row: the page no longer offers all
    // four arrows in both orientations.
    expect(Arr.length(rows)).toBe(2);
    expect(sorted(Arr.getSomes(Arr.map(rows, orientation)))).toStrictEqual([
      "horizontal",
      "vertical",
    ]);

    Arr.forEach(rows, (line) => {
      const axis = optionOrFail(orientation(line), line);
      const other = AXES[axis === "horizontal" ? "vertical" : "horizontal"];
      Arr.forEach(glyphs(line), (glyph) => {
        expect(other, `${glyph} in ${line}`).not.toContain(glyph);
      });
    });
  });

  it("deliver every documented arrow, and only on its own axis", async () => {
    const page = await Effect.runPromise(readDoc("toggle-group"));
    Arr.forEach(arrowRows(page), (line) => {
      const axis = optionOrFail(orientation(line), line);
      Arr.forEach(AXES[axis], (glyph) => {
        const key = keyOrFail(glyph);
        expect(
          Option.isSome(decideMove(0, 3, key, axis)),
          `${key} in a ${axis} group`,
        ).toBe(true);
      });
      Arr.forEach(
        AXES[axis === "horizontal" ? "vertical" : "horizontal"],
        (glyph) => {
          const key = keyOrFail(glyph);
          expect(
            Option.isNone(decideMove(0, 3, key, axis)),
            `${key} is inert in a ${axis} group`,
          ).toBe(true);
        },
      );
    });
  });

  it("keep the RadioGroup page, the model, qualified by axis", async () => {
    const page = await Effect.runPromise(readDoc("radio-group"));
    const axes = Arr.getSomes(Arr.map(arrowRows(page), orientation));
    expect(sorted(axes)).toStrictEqual(["horizontal", "vertical"]);
  });
});

/** Orientation labels in the order the guard compares them. */
const sorted = (values: ReadonlyArray<Orientation>): ReadonlyArray<string> =>
  Arr.sort(values, Order.String);

const optionOrFail = <Value>(
  value: Option.Option<Value>,
  line: string,
): Value =>
  Option.getOrElse(value, () =>
    expect.fail(`the row names no orientation: ${line}`),
  );

const keyOrFail = (glyph: string): string =>
  Option.getOrElse(Option.fromNullishOr(KEYS[glyph]), () =>
    expect.fail(`no key for ${glyph}`),
  );
