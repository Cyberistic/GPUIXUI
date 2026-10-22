import { themes } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeHex as componentNormalizeHex } from "../../../../../packages/components/src/color/hex";
import {
  brandSwatches,
  chosenRole,
  choose,
  commit,
  defaultSwatches,
  describe as describePicker,
  isDraftValid,
  normalizeHex,
  sameHex,
  swatchRoles,
} from "./color-picker-preview";

/**
 * The color picker preview's rules: the hex grammar, the commit split and the
 * swatch's tab stop.
 *
 * All three are invisible in a drawing — a preview that accepted `#abcd`, kept
 * an invalid draft as the value, or moved a roving highlight would still look
 * like a picker. The grammar is therefore executed beside the component's own
 * normaliser, and the tab stop and the default roles are read from the source
 * the page documents. The component is the authority.
 */

const root = new URL(
  "../../../../../packages/components/src/",
  import.meta.url,
);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const component = read("color-picker.tsx");
const componentHex = read("color/hex.ts");

const page = readFileSync(
  new URL("../../../content/docs/components/color-picker.mdx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

/** The component's normal form, read without importing its `Option` module. */
const componentNormal = (input: string): string | undefined => {
  const normal = componentNormalizeHex(input);
  return normal._tag === "Some" ? normal.value : undefined;
};

describe("the hex grammar", () => {
  it("commits exactly what the component's normaliser commits", () => {
    const inputs = [
      "#abc",
      "abc",
      "#AABBCC",
      "AABBCC",
      "  #AaBbCc  ",
      "#abcd",
      "#aabbccdd",
      "zzz",
      "#",
      "#12345",
      "rgb(0, 0, 0)",
      "",
    ];

    const drift = inputs
      .filter((input) => normalizeHex(input) !== componentNormal(input))
      .map(
        (input) =>
          `${JSON.stringify(input)}: preview ${String(normalizeHex(input))}, component ${String(componentNormal(input))}`,
      );

    expect(drift).toEqual([]);
    expect(inputs.slice(0, 5).map((input) => normalizeHex(input))).toEqual([
      "#aabbcc",
      "#aabbcc",
      "#aabbcc",
      "#aabbcc",
      "#aabbcc",
    ]);
    expect(inputs.slice(5).map((input) => normalizeHex(input))).toEqual(
      inputs.slice(5).map(() => undefined),
    );
  });

  it("keeps the component's own rule where the preview's copy lives", () => {
    // The preview is a copy, so the source it copies must still say the same
    // things: a leading `#` stripped, lowercase, a three-digit expansion and a
    // six-digit normal form.
    expect(componentHex).toContain("Str.replace(/^#/");
    expect(componentHex).toContain("Str.toLowerCase");
    expect(componentHex).toContain("bare.length === 3");
    expect(componentHex).toContain("^#[0-9a-f]{6}$");
    expect(componentHex).toContain("isHexColor(value)");
  });
});

describe("the commit", () => {
  it("holds a typed value until commit, then normalises it once", () => {
    expect(commit("#ABC", "#000000")).toEqual({
      value: "#aabbcc",
      draft: "#aabbcc",
      changed: true,
    });
    expect(commit(" #aabbcc ", "#aabbcc")).toEqual({
      value: "#aabbcc",
      draft: "#aabbcc",
      changed: false,
    });
  });

  it("reverts an invalid draft instead of committing it", () => {
    // The component's own `commit` keeps `value` and puts the draft back to it,
    // including on `Enter`; the invalid text never becomes the value.
    expect(commit("zzz", "#5f4bdb")).toEqual({
      value: "#5f4bdb",
      draft: "#5f4bdb",
      changed: false,
    });
    expect(isDraftValid("zzz")).toBe(false);
    expect(isDraftValid("#abcd")).toBe(false);
    expect(isDraftValid("#5f4bdb")).toBe(true);
  });

  it("commits a swatch at once, even a colour the parser does not own", () => {
    expect(choose("#ABC", "#000000")).toEqual({
      value: "#aabbcc",
      draft: "#aabbcc",
      changed: true,
    });
    // The component falls back to the caller's string rather than dropping the
    // press, so a var() or a named colour a caller passes still commits.
    expect(choose("var(--brand)", "#000000")).toEqual({
      value: "var(--brand)",
      draft: "var(--brand)",
      changed: true,
    });
  });
});

describe("the swatches", () => {
  it("names a chosen value by its normal form, not the text typed", () => {
    expect(sameHex("#ABC", "#aabbcc")).toBe(true);
    expect(sameHex("#abc", "#abcd")).toBe(false);
    expect(
      chosenRole(defaultSwatches(themes.light), themes.light.colors.primary),
    ).toBe("primary");
    expect(chosenRole(defaultSwatches(themes.light), "#123456")).toBe(
      undefined,
    );
  });

  it("keeps the six defaults on the roles and order the component reads", () => {
    const start = component.indexOf("const defaultSwatches");
    const defaults = component.slice(
      start,
      component.indexOf("/**", start + 1),
    );
    const roles = [...defaults.matchAll(/theme\.colors\.([A-Za-z]+)/g)].map(
      (match) => match[1],
    );

    expect(roles).toEqual([...swatchRoles]);
    expect(defaultSwatches(themes.light).map((swatch) => swatch.value)).toEqual(
      swatchRoles.map((role) => themes.light.colors[role]),
    );
  });

  it("gives every swatch its own tab stop, with no arrow-key grid", () => {
    // The package page said a reader could Tab or *arrow* onto a swatch; the
    // component installs no arrow handler. The curated page states the real
    // policy, so both the source and the page are read.
    expect(component).toContain("tabIndex={disabled ? -1 : 0}");
    expect(component).toContain("aria-selected={selected}");
    expect(component).not.toContain("ArrowRight");
    expect(component).not.toContain("ArrowLeft");
    expect(page).toContain("**every cell is its own tab stop**");
    expect(page).toContain("no arrow-key");
  });

  it("prints the readout the workflow shows", () => {
    expect(describePicker("#5f4bdb", "zzz")).toBe(
      "value=#5f4bdb draft=zzz invalid",
    );
    expect(describePicker("#5f4bdb", "#ABC")).toBe(
      "value=#5f4bdb draft=#ABC valid",
    );
  });
});

describe("the caller's palette", () => {
  it("is not the theme's six roles, so the page says who checks the mark", () => {
    expect(brandSwatches).toHaveLength(4);
    expect(
      brandSwatches.filter((swatch) =>
        swatchRoles.some((role) => role === swatch.role),
      ),
    ).toEqual([]);
    expect(page).toContain("caller's palette is the caller's to check");
  });
});
