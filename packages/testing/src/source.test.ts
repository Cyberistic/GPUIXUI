/**
 * The one props reader both page contracts resolve through.
 *
 * The bug guarded: `packages/components/src/api.test.ts` and
 * `packages/primitives/src/docs.test.ts` each held a copy of the same
 * interface/alias reader — `extends`, a parenthesised union, an `Omit`, the
 * quoted `"aria-id"` — so a fix landed in one copy and the other kept the old
 * answer. Nothing failed when they drifted, because each suite only measured
 * pages against its own copy. This suite reads the reader itself (the rules
 * both copies shared, measured on the repository's real declarations) and the
 * two consumers (neither may declare a reader of its own again).
 */
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

/** The primitives' own declarations, the index the primitives' page suite builds. */
const primitives = indexProps([
  { pkg: "primitives", dir: new URL("../../primitives/src/", import.meta.url) },
]);

/** Both packages, the index the components' page suite builds. */
const both = indexProps([
  { pkg: "components", dir: new URL("../../components/src/", import.meta.url) },
  { pkg: "primitives", dir: new URL("../../primitives/src/", import.meta.url) },
]);

/** A one-package index for a declaration written by the case itself. */
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
    // The chain a real field is built from: `InputProps` declares `value`,
    // inherits `onChange` from `ValueChangeProps`, and reaches the quoted
    // `"aria-id"` through `FieldHostProps = ElementHostProps`. A reader that
    // scanned interfaces alone loses the last two and every shape row on the
    // page passes unmeasured.
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
      // The runtime's own prop surface is opaque here by design.
      unknown: false,
    });
    expect(Arr.length(typeNames(primitives))).toBeGreaterThan(150);
  });

  it("resolves a name the roots share in the package that named it", () => {
    // `FieldProps` exists in both packages with different surfaces: the
    // components' labelled field (`label`) and the primitives' input contract
    // (`value`). A single-map reader filed one over the other, so a page was
    // held to the props of the package it does not ship.
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
    // The alias rules, on a declaration written here so the answer cannot move
    // with a shipped type: a parenthesised intersection contributes both sides,
    // and an `Omit` removes the named props from its base.
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
    // A cycle answers nothing rather than recursing until the stack gives out.
    expect(propsOf("CycleA", index)).toEqual([]);
  });

  it("is imported by both page contracts instead of copied into them", () => {
    // The regression: the second copy landed with the components guard, so the
    // rule is measured on the consumers — a suite that grows its own reader
    // again fails here by name.
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
