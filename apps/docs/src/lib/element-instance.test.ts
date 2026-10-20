import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  declaredInstanceMembers,
  instanceRows,
  instanceViolations,
  publicInstanceIsInstance,
  refPropType,
} from "./element-instance";
import {
  installedReactHostDeclarations,
  installedReactReconcilerSource,
} from "./react-declarations.testing";
import { generator } from "./type-table-generator";

/**
 * Guards plan 624. Every host part's generated props table carries a `ref?` row
 * and no page explained it, so the contract is stated once on Component API and
 * its instance table is a claim about the installed `@gpuix/react` package.
 * These tests fail when the runtime adds, renames or retypes an `Instance`
 * member, when the `PublicInstance` alias moves, when `Props` stops declaring
 * `ref`, when the reconciler stops attaching `scrollIntoView`, or when the
 * scope sentence ("components take a ref, primitives do not") stops being true
 * — each by the name that drifted, not as a silent blank.
 */
const fixture = `export interface Props extends HostProps {
    key?: Key | null;
    children?: ReactNode;
    ref?: Ref<PublicInstance>;
}
export interface Instance {
    id: number;
    type: ElementType;
    props: Props;
    scrollIntoView?(): void;
}
export type PublicInstance = Instance;`;

const fixtureRows = [
  { name: "id", type: "number", optional: false, summary: "The id." },
  { name: "type", type: "ElementType", optional: false, summary: "The type." },
  { name: "props", type: "Props", optional: false, summary: "The props." },
  {
    name: "scrollIntoView",
    type: "() => void",
    optional: true,
    summary: "Scrolling.",
  },
];

const violations = (input: {
  readonly declarations?: string;
  readonly rows?: ReadonlyArray<(typeof fixtureRows)[number]>;
}) =>
  instanceViolations({
    declarations: input.declarations ?? fixture,
    rows: input.rows ?? fixtureRows,
  });

describe("the element instance contract", () => {
  it("parses fields and optional methods in declaration order", () => {
    expect(declaredInstanceMembers(fixture)).toEqual([
      { name: "id", type: "number", optional: false },
      { name: "type", type: "ElementType", optional: false },
      { name: "props", type: "Props", optional: false },
      { name: "scrollIntoView", type: "() => void", optional: true },
    ]);
  });

  it("reads the ref declaration and the public alias", () => {
    expect(refPropType(fixture)).toBe("Ref<PublicInstance>");
    expect(refPropType(fixture, "InputProps")).toBeUndefined();
    expect(publicInstanceIsInstance(fixture)).toBe(true);
  });

  it("accepts a table that matches the declarations", () => {
    expect(violations({})).toEqual([]);
  });

  it("names a member the runtime declares but the page lost", () => {
    expect(violations({ rows: fixtureRows.slice(0, 3) })).toEqual([
      "Instance.scrollIntoView is declared but not documented",
    ]);
  });

  it("names a row the runtime no longer declares", () => {
    expect(
      violations({
        declarations: fixture.replace("    props: Props;\n", ""),
      }),
    ).toEqual(["Instance.props is documented but not declared"]);
  });

  it("names a member whose type or optionality drifted", () => {
    expect(
      violations({
        declarations: fixture.replace("id: number;", "id: string;"),
      }),
    ).toEqual(["Instance.id is string, documented as number"]);
    expect(
      violations({
        declarations: fixture.replace(
          "scrollIntoView?(): void;",
          "scrollIntoView(): void;",
        ),
      }),
    ).toEqual([
      "Instance.scrollIntoView is () => void, documented as () => void?",
    ]);
  });

  it("fails when PublicInstance stops aliasing Instance", () => {
    expect(
      violations({
        declarations: fixture.replace(
          "export type PublicInstance = Instance;",
          "export type PublicInstance = NodeInstance;",
        ),
      }),
    ).toContain("PublicInstance is not the alias of Instance any more");
  });

  it("matches the installed @gpuix/react declarations", () => {
    const declarations = installedReactHostDeclarations();
    expect(instanceViolations({ declarations, rows: instanceRows })).toEqual(
      [],
    );
  });

  it("keeps ref on every host props type a part can extend", () => {
    const declarations = installedReactHostDeclarations();
    expect(
      ["Props", "InputProps", "TextareaProps", "AnchoredProps"].map((name) => [
        name,
        refPropType(declarations, name),
      ]),
    ).toEqual([
      ["Props", "Ref<PublicInstance>"],
      ["InputProps", "Ref<PublicInstance>"],
      ["TextareaProps", "Ref<PublicInstance>"],
      ["AnchoredProps", "Ref<PublicInstance>"],
    ]);
  });

  it("keeps attaching scrollIntoView to the instance through the renderer", () => {
    const source = installedReactReconcilerSource();
    expect(source).toContain("instance.scrollIntoView = () =>");
    expect(source).toContain(
      "container.nativeRenderer.scrollIntoView?.(instance.id)",
    );
  });

  it("proves the scope claim with the app's own table generator", async () => {
    const repo = fileURLToPath(new URL("../../../../", import.meta.url));
    const [card] = await generator.generateDocumentation(
      { path: `${repo}packages/components/src/card.tsx` },
      "CardProps",
    );
    const [button] = await generator.generateDocumentation(
      { path: `${repo}packages/primitives/src/components/Button.tsx` },
      "ButtonProps",
    );
    const names = (doc: typeof card): ReadonlyArray<string> =>
      doc?.entries.map((entry) => entry.name) ?? [];
    expect(names(card)).toContain("ref");
    expect(names(button)).not.toContain("ref");
  });
});
