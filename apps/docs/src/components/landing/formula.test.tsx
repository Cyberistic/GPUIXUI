/**
 * The landing's recipe line.
 *
 * The hero said what the library looks like and the lineage graph said how it
 * is composed, but the line a reader recognises — GPUI + React + shadcn +
 * Base UI + Tailwind = GPUIxUI — was nowhere on the page. This holds the
 * equation to its five parts and its result, in order, so a part cannot be
 * dropped or renamed without the guard failing by name.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingFormula } from "./deck";

const markup = renderToStaticMarkup(<LandingFormula />);
const parts = ["GPUI", "React", "shadcn", "Base UI", "Tailwind"];

describe("the landing's recipe line", () => {
  it("names the five parts in order, each before its plus", () => {
    const positions = parts.map((part) => markup.indexOf(`>${part}<`));

    expect(positions.every((position) => position > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(markup.match(/landing-formula-op/g)).toHaveLength(5);
  });

  it("resolves to the library's name", () => {
    expect(markup).toContain('class="landing-formula-result">GPUIxUI<');
    expect(markup.indexOf(">GPUIxUI<")).toBeGreaterThan(
      markup.indexOf(">Tailwind<"),
    );
  });
});
