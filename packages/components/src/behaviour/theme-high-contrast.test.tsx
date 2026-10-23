/**
 * The high-contrast palettes on every shipped example.
 *
 * The both-theme matrix beside this file asserts one role per component under
 * the light and dark palettes; it does not ask whether a component paints a
 * **literal**. `@gpuixui/primitives` learned that lesson on its own tier
 * (`runtime/theme-axes.runtime.test.tsx` mounts every Tier 1 component and asks
 * one question of every applied colour — is it a role of this palette?), after
 * high contrast had been read off seven controls. This package's Tier 2 parts
 * carried the same gap in the other half: a handful of suites compare a role
 * under high contrast (Tabs' rail, the dropdown row's mark), so a hard-coded
 * colour in a badge, an empty state, a message or a picker was a value no suite
 * could see.
 *
 * The scene is the **Tier 2 inventory's examples**, not a hand-built list: a
 * component joins the sweep by shipping an example, and an example is the usage
 * a reader is shown. Every colour any element applies must be a role of the
 * active palette, plus the three documented derivations a theme owns
 * ({@link bandOf}). A literal fails with its own palette and the value, so a
 * regression names the feature it broke.
 *
 * The motion family (plan 600) is left out: its examples deliberately paint a
 * tween's intermediate frames and two of them supply their own gradient stops,
 * so they are content rather than roles and are measured by their own suites.
 * States are left at rest for the same reason — hover and press paints are
 * derived (`filledHover`/`filledPressed`, the pointer washes, the disabled
 * fade), and a derived value is measured by the tokens suite, not by
 * membership. An overlay that only paints when opened is measured by the matrix
 * and its own suite.
 */

import type { TestRoot } from "@gpuix/react/testing";
import * as Tokens from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { Effect } from "effect";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { examples } from "../../examples/index.js";
import { inventory } from "../inventory.js";
import { renderComponent } from "../internal/test-root.js";

/** One node of the retained tree, as the renderer's own dump spells it. */
interface Painted {
  readonly id: number;
  readonly type: string;
  readonly testId?: string;
  readonly style: Readonly<Record<string, unknown>>;
  readonly children: ReadonlyArray<Painted>;
}

/**
 * The renderer's tree dump.
 *
 * Read once per scene: `getElement` rebuilds the whole element map from native
 * on every call, so walking a 1 200-node screen one node at a time measured
 * **68 s** (2026-10-23); one `toJSON()` is a single native read and decodes here.
 */
const Painted: Schema.Codec<Painted, unknown> = Schema.Struct({
  id: Schema.Number,
  type: Schema.String,
  testId: Schema.optional(Schema.String),
  style: Schema.Record(Schema.String, Schema.Unknown).pipe(
    Schema.withDecodingDefault(Effect.succeed({})),
  ),
  children: Schema.Array(
    Schema.suspend((): Schema.Codec<Painted, unknown> => Painted),
  ).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
});

const decodeTree = Schema.decodeUnknownSync(Painted);

/** A 6- or 8-digit hex colour, the only shape a palette role produces. */
const isColour = (value: string): boolean =>
  /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);

/** The RGB part, so a lifted-alpha colour still matches its role. */
const rgbOf = (colour: string): string => colour.slice(0, 7).toUpperCase();

/** Every element the retained tree holds, depth-first from the root. */
const treeOf = (renderer: TestRoot["renderer"]): ReadonlyArray<Painted> => {
  const json = renderer.toJSON();
  if (json === undefined || json === null) return [];
  const root = decodeTree(json);
  const flatten = (node: Painted): ReadonlyArray<Painted> => [
    node,
    ...Arr.flatMap(node.children, flatten),
  ];
  return flatten(root);
};

/** One colour an element applied, with the element that painted it. */
interface PaintedColour {
  readonly colour: string;
  readonly type: string;
  readonly testId?: string;
}

/** Every colour-shaped value the tree applied, in element order. */
const paintedColours = (
  renderer: TestRoot["renderer"],
): ReadonlyArray<PaintedColour> =>
  Arr.flatMap(treeOf(renderer), (element) =>
    Arr.map(
      Arr.filter(
        R.values(element.style),
        (value): value is string =>
          typeof value === "string" && isColour(value),
      ),
      (colour) =>
        element.testId === undefined
          ? { colour: rgbOf(colour), type: element.type }
          : {
              colour: rgbOf(colour),
              type: element.type,
              testId: element.testId,
            },
    ),
  );

/**
 * The example id a Tier 2 record names (`examples/card.example.tsx` → `card`).
 *
 * The record is the one place a component declares its example, so this sweep
 * cannot drift from the inventory: a new Tier 2 row joins the scene by existing.
 */
const exampleIdOf = (path: string): string =>
  path.replace(/^examples\//, "").replace(/\.example\.tsx$/, "");

/**
 * A Tier 2 example whose paint is the **caller's content**, not a theme role.
 *
 * The colour picker's swatches are the colours a consumer supplies — the
 * example hands it Tailwind's palette — so holding them to the active theme
 * would forbid the one thing the control is for. The gradient demos are the
 * motion family's and are out of the scene already for the same reason.
 */
const contentExamples: ReadonlyArray<string> = ["color-picker"];

/** The Tier 2 example ids in a stable order, so a failure names the same set twice. */
const exampleIds = Arr.sort(
  Arr.filterMap(
    Arr.filter(inventory, (meta) => meta.tier === 2),
    (meta) => {
      const id = exampleIdOf(meta.example);
      return Arr.contains(contentExamples, id)
        ? Result.failVoid
        : Result.succeed(id);
    },
  ),
  Order.String,
);

/** The one scene: every Tier 2 example in one root element. */
const gallery = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {Arr.map(exampleIds, (id) => {
      const Example = examples[id];
      return Example === undefined ? null : <Example key={id} />;
    })}
  </div>
);

/**
 * The band a Tier 2 paint may fall in.
 *
 * Every role of the active palette, plus the three colours the token package
 * derives per theme and a component is designed with: `brandText` (a link or a
 * progress fill), `brandTextOn` (a link on a status tint, which is a different
 * colour in 29 of 64 placements) and `selectionOn` (a selectable run inside a
 * tint, whose designed wash leaves the copy under the floor in most dark tints).
 * Those are the documented exceptions; every other derived value belongs to a
 * pointer or disabled state this scene leaves at rest.
 */
const bandOf = (theme: Tokens.Theme): ReadonlyArray<string> => [
  ...Arr.map(R.values(theme.colors), rgbOf),
  rgbOf(Tokens.brandText(theme)),
  ...Arr.map(Tokens.statusTones, (tone) =>
    rgbOf(Tokens.brandTextOn(theme, `${tone}Soft`)),
  ),
  ...Arr.map(Tokens.statusTones, (tone) =>
    rgbOf(Tokens.selectionOn(theme, `${tone}Soft`)),
  ),
];

describe("the high-contrast palettes", () => {
  // Every example is a full screen and the native renderer lays each one out;
  // the default five-second budget is for a unit case, not a whole tier.
  it(
    "paint every Tier 2 example in roles of the active palette",
    { timeout: 120_000 },
    () => {
      // An example the registry does not carry would silently leave the scene.
      expect(
        Arr.filter(exampleIds, (id) => examples[id] === undefined),
      ).toEqual([]);
      // A sweep that lost most of its subjects cannot pass as a whole tier.
      expect(exampleIds.length).toBeGreaterThan(30);
      const audit = (name: string, theme: Tokens.Theme): void => {
        const root = renderComponent(gallery(), theme);
        try {
          const colours = paintedColours(root.renderer);
          // A scene that painted nothing would pass the membership check.
          expect(root.renderer.getAllText().length).toBeGreaterThan(20);
          expect(colours.length).toBeGreaterThan(60);
          const band = bandOf(theme);
          const stray = Arr.filterMap(colours, (painted) =>
            band.includes(painted.colour)
              ? Result.failVoid
              : Result.succeed(painted),
          );
          expect({ name, stray }).toStrictEqual({ name, stray: [] });
        } finally {
          root.unmount();
        }
      };
      audit("high-contrast light", Tokens.highContrastLightTheme);
      audit("high-contrast dark", Tokens.highContrastDarkTheme);
    },
  );
});
