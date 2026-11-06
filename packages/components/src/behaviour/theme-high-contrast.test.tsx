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

interface Painted {
  readonly id: number;
  readonly type: string;
  readonly testId?: string;
  readonly style: Readonly<Record<string, unknown>>;
  readonly children: ReadonlyArray<Painted>;
}

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

const isColour = (value: string): boolean =>
  /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);

const rgbOf = (colour: string): string => colour.slice(0, 7).toUpperCase();

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

interface PaintedColour {
  readonly colour: string;
  readonly type: string;
  readonly testId?: string;
}

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

const exampleIdOf = (path: string): string =>
  path.replace(/^examples\//, "").replace(/\.example\.tsx$/, "");

const contentExamples: ReadonlyArray<string> = ["color-picker"];

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

const gallery = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {Arr.map(exampleIds, (id) => {
      const Example = examples[id];
      return Example === undefined ? null : <Example key={id} />;
    })}
  </div>
);

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
  it(
    "paint every Tier 2 example in roles of the active palette",
    { timeout: 120_000 },
    () => {
      expect(
        Arr.filter(exampleIds, (id) => examples[id] === undefined),
      ).toEqual([]);

      expect(exampleIds.length).toBeGreaterThan(30);
      const audit = (name: string, theme: Tokens.Theme): void => {
        const root = renderComponent(gallery(), theme);
        try {
          const colours = paintedColours(root.renderer);

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
