import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  type DeclaredType,
  type PropsIndex,
  declarationIn,
  indexProps,
  propsOf,
  typeNames,
} from "./source.js";

const repoRoot = new URL("../../../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, repoRoot)), "utf8");

const primitives = indexProps([
  { pkg: "primitives", dir: new URL("../../primitives/src/", import.meta.url) },
]);

const both = indexProps([
  { pkg: "components", dir: new URL("../../components/src/", import.meta.url) },
  { pkg: "primitives", dir: new URL("../../primitives/src/", import.meta.url) },
]);

const fixture = (
  entries: ReadonlyArray<readonly [string, Omit<DeclaredType, "file" | "pkg">]>,
): PropsIndex => ({
  roots: ["fixture"],
  declarations: new Map(
    Arr.map(
      entries,
      ([name, declared]) =>
        [
          name,
          new Map([
            ["fixture", { ...declared, file: `${name}.ts`, pkg: "fixture" }],
          ]),
        ] as const,
    ),
  ),
});

describe("the props reader the page contracts share", () => {
  it("reads fields, an inherited alias and a quoted address", () => {
    const input = propsOf("InputProps", primitives);
    expect({
      own: Arr.contains(input, "value"),
      inherited: Arr.contains(input, "onChange"),
      quoted: Arr.contains(input, "aria-id"),
      unknown: Arr.contains(input, "aria-expanded"),
    }).toEqual({
      own: true,
      inherited: true,
      quoted: true,

      unknown: false,
    });
    expect(Arr.length(typeNames(primitives))).toBeGreaterThan(150);
  });

  it("resolves a name the roots share in the package that named it", () => {
    const fromComponents = propsOf("FieldProps", both, "components");
    const fromPrimitives = propsOf("FieldProps", both, "primitives");
    expect({
      components: Arr.contains(fromComponents, "error"),
      componentsBorrows: Arr.contains(fromComponents, "value"),
      primitives: Arr.contains(fromPrimitives, "value"),
      primitivesBorrows: Arr.contains(fromPrimitives, "error"),
    }).toEqual({
      components: true,
      componentsBorrows: false,
      primitives: true,
      primitivesBorrows: false,
    });
    expect(Option.isSome(declarationIn("FieldProps", both, "components"))).toBe(
      true,
    );
    expect(
      Option.isSome(declarationIn("FieldProps", primitives, "components")),
    ).toBe(false);
  });

  it("subtracts an Omit and descends a parenthesised branch", () => {
    const index = fixture([
      ["BaseProps", { props: ["visible", "hidden"], parents: [] }],
      ["ExtraProps", { props: ["extra"], parents: [] }],
      [
        "UnionProps",
        { props: [], parents: [], alias: "(BaseProps & ExtraProps)" },
      ],
      [
        "OmittedProps",
        { props: [], parents: [], alias: 'Omit<BaseProps, "hidden">' },
      ],
      ["CycleA", { props: [], parents: [], alias: "CycleB" }],
      ["CycleB", { props: [], parents: [], alias: "CycleA" }],
    ]);
    expect(propsOf("UnionProps", index)).toEqual(
      expect.arrayContaining(["visible", "hidden", "extra"]),
    );
    expect(propsOf("OmittedProps", index)).toEqual(["visible"]);

    expect(propsOf("CycleA", index)).toEqual([]);
  });

  it("is imported by both page contracts instead of copied into them", () => {
    const consumers = [
      "packages/components/src/api.test.ts",
      "packages/primitives/src/docs.test.ts",
    ];
    const problems = Arr.flatMap(consumers, (path) => {
      const source = read(path);
      const manifest = read(path.replace(/\/src\/.*$/, "/package.json"));
      return [
        ...(source.includes('from "@gpuixui/testing"')
          ? []
          : [`${path}: does not import @gpuixui/testing`]),
        ...(source.includes("Source.propsOf(")
          ? []
          : [`${path}: does not resolve props through Source.propsOf`]),
        ...["const propsOf", "const declaredTypes", "const INTERFACE_HEADER"]
          .filter((reader) => source.includes(reader))
          .map((reader) => `${path}: declares its own ${reader}`),
        ...(manifest.includes('"@gpuixui/testing"')
          ? []
          : [`${path}: the package does not declare @gpuixui/testing`]),
      ];
    });
    expect(problems).toEqual([]);
  });
});
