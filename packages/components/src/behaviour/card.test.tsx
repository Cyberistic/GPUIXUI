/**
 * Card behaviour, driven through the real GPUix test renderer.
 *
 * The bugs these guard: a variant that does not change the surface treatment; a
 * part that renders nothing; the title losing its heading role or level; and a
 * consumer's `style` losing to the variant instead of overriding it.
 *
 * Runs wherever GPUix publishes a native binding, which on 2026-10-17 includes
 * this Intel Mac because plan 140's locally built `darwin-x64` binding is in the
 * store; `nub run --filter @gpuixui/components test:behaviour` is how it is run.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../card.js";
import { nodesWithRole } from "../internal/a11y.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";

const settingsCard = (
  <Card testId="card">
    <CardHeader testId="card-header">
      <CardTitle testId="card-title">Pro plan</CardTitle>
      <CardDescription testId="card-description">
        Renews monthly
      </CardDescription>
    </CardHeader>
    <CardContent testId="card-content">Invoices and seats</CardContent>
    <CardFooter testId="card-footer">Cancel</CardFooter>
  </Card>
);

describe("Card", () => {
  it("renders its parts' text in tree order", () => {
    const card = renderComponent(settingsCard);

    expect(card.renderer.getAllText()).toEqual([
      "Pro plan",
      "Renews monthly",
      "Invoices and seats",
      "Cancel",
    ]);

    card.unmount();
  });

  it("borders when outlined, floats when elevated and does neither when plain", () => {
    const outline = renderComponent(<Card testId="card" />);
    expect(outline.renderer.findByTestId("card")?.style.borderWidth).toBe(
      darkTheme.borderWidth.thin,
    );
    expect(
      outline.renderer.findByTestId("card")?.style.boxShadow,
    ).toBeUndefined();
    outline.unmount();

    const elevated = renderComponent(<Card testId="card" variant="elevated" />);
    expect(
      elevated.renderer.findByTestId("card")?.style.boxShadow,
    ).toBeDefined();
    expect(
      elevated.renderer.findByTestId("card")?.style.borderWidth,
    ).toBeUndefined();
    elevated.unmount();

    const plain = renderComponent(<Card testId="card" variant="plain" />);
    expect(
      plain.renderer.findByTestId("card")?.style.boxShadow,
    ).toBeUndefined();
    expect(
      plain.renderer.findByTestId("card")?.style.borderWidth,
    ).toBeUndefined();
    plain.unmount();
  });

  it("announces the title as a level-3 heading", () => {
    const card = renderComponent(settingsCard);
    const headings = nodesWithRole(card.renderer, "heading");

    expect(headings).toHaveLength(1);
    expect(headings.map((node) => node.level)).toEqual([Option.some(3)]);
    expect(headings.map((node) => node.name)).toEqual(["Pro plan"]);

    card.unmount();
  });

  it("lets a consumer's style win over the variant", () => {
    const card = renderComponent(
      <Card testId="card" style={{ backgroundColor: "#ffffff" }} />,
    );

    expect(card.renderer.findByTestId("card")?.style.backgroundColor).toBe(
      "#ffffff",
    );

    card.unmount();
  });

  it("paints the card surface from the theme, in both themes", () => {
    const dark = renderComponent(<Card testId="card" />, "dark");
    expect(dark.renderer.findByTestId("card")?.style.backgroundColor).toBe(
      darkTheme.colors.card,
    );
    dark.unmount();

    const light = renderComponent(<Card testId="card" />, "light");
    expect(light.renderer.findByTestId("card")?.style.backgroundColor).toBe(
      lightTheme.colors.card,
    );
    light.unmount();
  });
});
