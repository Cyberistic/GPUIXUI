import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineEditStates, InlineEditWorkflow } from "./inline-edit-demo";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replaceAll(/\/\*[\s\S]*?\*\//g, "");

const ruleFor = (selector: string): string => {
  const found = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, list]) =>
    (list ?? "").split(",").some((name) => name.trim() === selector),
  );
  return found === undefined
    ? expect.fail(`the sheet has no rule for ${selector}`)
    : (found[2] ?? "");
};

const workflow = renderToStaticMarkup(<InlineEditWorkflow />);
const states = renderToStaticMarkup(<InlineEditStates />);

describe("the inline edit drawings", () => {
  it("puts every control in a row that reserves the editor's height", () => {
    const slot = ruleFor(".gx-inline-slot");

    expect(slot).toContain("align-items: center");
    expect(slot).toContain("height: var(--control-height-md)");
    expect(ruleFor(".gx-inline-input")).toContain(
      "height: var(--control-height-md)",
    );
    expect(ruleFor(".gx-inline-display")).toContain(
      "min-height: var(--control-height-sm)",
    );
  });

  it("wraps the drawn control in that row, in both previews", () => {
    expect(workflow.match(/class="gx-inline-slot"/g)?.length).toBe(1);
    expect(states.match(/class="gx-inline-slot"/g)?.length).toBe(5);

    expect(workflow).toContain('class="gx-inline-slot"><button');
    expect(states).toContain('class="gx-inline-slot"><input');
  });

  it("gives the scene a box the status line cannot resize", () => {
    expect(ruleFor(".gx-inline-scene")).toContain("width: min(360px, 100%)");
  });

  it("reserves the app's message line before it has anything to say", () => {
    expect(workflow).toContain('<span class="gx-inline-refusal"></span>');
    expect(ruleFor(".gx-inline-refusal")).toContain("min-height:");
  });
});
