import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";

/**
 * Guards the docs theme identity (plan 410 §3): the light and dark themes must
 * expose the *same* semantic roles, and must actually differ. The interesting
 * failure is a role added to one theme only — the site renders correctly in the
 * theme the author checked and silently falls back to a stock Fumadocs value in
 * the other (MISSION: "Verify every component in both themes").
 */
const css = readFileSync(
  fileURLToPath(new URL("./app.css", import.meta.url)),
  "utf8",
);

/** The declarations between `selector {` and its closing brace. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("}", start));
};

const roleNames = (selector: string): ReadonlyArray<string> =>
  Arr.sort(
    Arr.dedupe(
      Arr.map(
        Arr.fromIterable(block(selector).matchAll(/(--color-fd-[a-z-]+):/g)),
        (match) => match[1] ?? "",
      ),
    ),
    Order.String,
  );

const roleValue = (selector: string, role: string): string =>
  block(selector)
    .match(new RegExp(`${role}:\\s*([^;]+);`))?.[1]
    ?.trim() ?? "";

describe("docs theme", () => {
  it("defines the same semantic roles in light and dark", () => {
    const light = roleNames(":root");
    const dark = roleNames(".dark");
    expect(light.length).toBeGreaterThan(0);
    expect({ onlyInLight: Arr.difference(light, dark) }).toEqual({
      onlyInLight: [],
    });
    expect({ onlyInDark: Arr.difference(dark, light) }).toEqual({
      onlyInDark: [],
    });
  });

  it("renders the two themes as distinct palettes", () => {
    // A copy-paste that left both blocks identical would pass the parity check
    // above while the site had only one real theme.
    const differing = ["--color-fd-background", "--color-fd-primary"].filter(
      (role) => roleValue(":root", role) !== roleValue(".dark", role),
    );
    expect(differing).toEqual(["--color-fd-background", "--color-fd-primary"]);
  });
});
