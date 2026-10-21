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
import { decideActivation, decideMove } from "./core/keyboard.js";
import { decideRating } from "./core/rating.js";
import { typeaheadChar } from "./core/typeahead.js";
import { docTableBlocks, tableCells } from "./testing/index.js";

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

  it("document every Rating movement key, and answer it as the rule does", async () => {
    const page = await Effect.runPromise(readDoc("rating"));
    const labels = documentedKeys(page);
    Arr.forEach(RATING_MOVES, ([label, key, expected]) => {
      expect(labels, `the page documents ${label}`).toContain(label);
      expect(decideRating(3, 5, key), `${label} from 3 of 5`).toStrictEqual(
        Option.some(expected),
      );
    });
  });

  it("answer no Rating key the page does not document", async () => {
    const page = await Effect.runPromise(readDoc("rating"));
    const documented = keyNames(documentedKeys(page));
    const answered = Arr.filter(runtimeKeys(), (key) =>
      Option.isSome(decideRating(3, 5, key)),
    );
    // Both sides exclude the two activation keys, which the page documents but
    // `decideRating` does not answer.
    expect(
      sorted(Arr.filter(answered, (key) => !isActivation(key))),
    ).toStrictEqual(
      sorted(Arr.filter(documented, (key) => !isActivation(key))),
    );
  });

  it("document the Rating activation keys on their own phases", async () => {
    const page = await Effect.runPromise(readDoc("rating"));
    const keys = keyNames(documentedKeys(page));
    expect(keys).toContain("enter");
    expect(keys).toContain("space");
    expect(decideActivation("enter", "down", false)).toBe(true);
    expect(decideActivation("enter", "up", false)).toBe(false);
    expect(decideActivation("space", "up", false)).toBe(true);
    expect(decideActivation("space", "down", false)).toBe(false);
    expect(decideActivation("enter", "down", true)).toBe(false);
    expect(decideActivation("space", "up", true)).toBe(false);
  });

  it("keep the CheckboxGroup activation and arrow rows true", async () => {
    const page = await Effect.runPromise(readDoc("checkbox-group"));
    const labels = documentedKeys(page);
    expect(labels).toContain("Enter");
    expect(labels).toContain("Space");
    expect(labels, "the page documents that arrows are not handled").toContain(
      "arrows",
    );
    expect(decideActivation("space", "up", false)).toBe(true);
    expect(decideActivation("enter", "down", false)).toBe(true);
    // The row owns the role, tab stop and key handlers, and its only key rules
    // are activation and type-ahead. Neither answers an arrow, which is what
    // the page's "not handled" row claims (plan 813).
    Arr.forEach(["up", "down", "left", "right"], (key) => {
      expect(decideActivation(key, "down", false), key).toBe(false);
      expect(Option.isNone(typeaheadChar({ key })), key).toBe(true);
    });
  });
});

/** The runtime's name for each key the pages may document. */
const RUNTIME_KEY: Readonly<Record<string, string>> = {
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowDown: "down",
  Home: "home",
  End: "end",
  Enter: "enter",
  Space: "space",
  Delete: "delete",
  Backspace: "backspace",
};

/** The Rating page's movement rows, and the value each must produce from 3. */
const RATING_MOVES: ReadonlyArray<readonly [string, string, number]> = [
  ["ArrowRight", "right", 4],
  ["ArrowUp", "up", 4],
  ["ArrowLeft", "left", 2],
  ["ArrowDown", "down", 2],
  ["Home", "home", 1],
  ["End", "end", 5],
  ["Delete", "delete", 0],
  ["Backspace", "backspace", 0],
];

/** The keys that activate rather than move a value control. */
const isActivation = (key: string): boolean =>
  key === RUNTIME_KEY.Enter || key === RUNTIME_KEY.Space;

/** A keyboard table's rows, without its header and delimiter row. */
const keyboardRows = (markdown: string): ReadonlyArray<ReadonlyArray<string>> =>
  Arr.match(docTableBlocks(section(markdown, "Keyboard")), {
    onEmpty: () => [],
    onNonEmpty: (blocks) =>
      Arr.map(Arr.drop(Arr.headNonEmpty(blocks), 2), (line) =>
        tableCells(line.text),
      ),
  });

/** Every key name the Keyboard table's first column mentions. */
const documentedKeys = (markdown: string): ReadonlyArray<string> =>
  Arr.flatMap(keyboardRows(markdown), (cells) =>
    Arr.map(
      Str.split("/")(Option.getOrElse(Arr.head(cells), () => "")),
      (label) => Str.trim(Str.replace(/`/g, "")(label)),
    ),
  );

/** The runtime name of a documented key label, when it is one we know. */
const runtimeKeyOf = (label: string): Option.Option<string> =>
  Option.fromNullishOr(RUNTIME_KEY[label]);

/** The runtime names of the documented labels, in page order. */
const keyNames = (labels: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.getSomes(Arr.map(labels, runtimeKeyOf));

/** Every runtime key name this guard knows. */
const runtimeKeys = (): ReadonlyArray<string> =>
  Arr.getSomes(Arr.map(R.keys(RUNTIME_KEY), runtimeKeyOf));

/** Strings in the order a guard compares them. */
const sorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
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
