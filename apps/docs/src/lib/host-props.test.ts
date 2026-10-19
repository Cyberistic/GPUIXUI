import { describe, expect, it } from "vitest";
import {
  accessibilityHostProps,
  hostPropNames,
  hostPropViolations,
  sharedHostProps,
} from "./host-props";
import { installedNativeDeclarations } from "./native-declarations.testing";

/**
 * The bug guarded (plan 587): every component part inherits the runtime's
 * `HostProps`, so `testId`, `onKeyDown` and `onMouseDownOutside` appear in
 * every generated props table — and the docs explain none of them. The shared
 * catalogue is the one authored copy, and it is only honest while it matches
 * the installed `@gpuix/native` declarations in both directions. These tests
 * fail when a dependency adds, renames or removes a host prop, when a row loses
 * its meaning, or when a prop the accessibility page owns is documented twice.
 */
const fixture = `/** A surface. */
export interface HostProps extends BaseProps {
  style?: StyleDesc;
  /** The AccessKit role. */
  role?: string;
  "aria-label"?: string;
  "aria-valuetext"?: string;
  onClick?: (event: EventPayload) => void;
  highlight?: HighlightSpec | HighlightSpec[] | null;
}
export interface InputProps extends HostProps { value?: string }`;

const fixtureShared = [
  { name: "style", summary: "Host styles." },
  { name: "onClick", summary: "A primary click." },
  { name: "highlight", summary: "A text wash." },
];

const fixtureOwned = new Set(["role", "aria-label", "aria-valuetext"]);

const run = (input: {
  readonly declarations?: string;
  readonly shared?: ReadonlyArray<{ name: string; summary: string }>;
  readonly owned?: ReadonlySet<string>;
}) =>
  hostPropViolations({
    declarations: input.declarations ?? fixture,
    shared: input.shared ?? fixtureShared,
    owned: input.owned ?? fixtureOwned,
  });

describe("the shared host props", () => {
  it("parses quoted and plain keys inside HostProps only", () => {
    expect(hostPropNames(fixture)).toEqual([
      "style",
      "role",
      "aria-label",
      "aria-valuetext",
      "onClick",
      "highlight",
    ]);
  });

  it("agrees with the installed package and the accessibility owner", () => {
    expect(
      hostPropViolations({
        declarations: installedNativeDeclarations().join("\n"),
        shared: sharedHostProps,
        owned: accessibilityHostProps,
      }),
    ).toEqual([]);
  });

  it("reports a prop the declarations no longer declare", () => {
    expect(
      run({
        shared: [
          ...fixtureShared,
          { name: "onLongPress", summary: "A long press." },
        ],
      }),
    ).toContain("onLongPress is documented but HostProps does not declare it");
  });

  it("reports a declared prop neither catalogue classifies", () => {
    expect(
      run({ shared: fixtureShared.filter((row) => row.name !== "onClick") }),
    ).toContain(
      "onClick is declared by HostProps but neither catalogue documents it",
    );
  });

  it("reports a prop the accessibility page already owns", () => {
    expect(
      run({
        shared: [...fixtureShared, { name: "role", summary: "Again." }],
      }),
    ).toContain("role is owned by Accessibility but documented here");
  });

  it("reports a duplicate row, a missing summary and a broken parse", () => {
    expect(
      run({
        shared: [
          ...fixtureShared,
          { name: "style", summary: " " },
          { name: "style", summary: "Again." },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        "the shared list repeats a prop",
        "style has no summary",
      ]),
    );
    expect(run({ declarations: "no interface here" })).toContain(
      "the installed declarations declare no HostProps prop",
    );
  });

  it("never documents an accessibility-owned name in the shared rows", () => {
    expect(
      sharedHostProps.filter((row) => accessibilityHostProps.has(row.name)),
    ).toEqual([]);
    expect([...accessibilityHostProps]).toEqual(
      expect.arrayContaining([
        "role",
        "tabIndex",
        "autoFocus",
        "aria-label",
        "aria-valuetext",
      ]),
    );
  });
});
