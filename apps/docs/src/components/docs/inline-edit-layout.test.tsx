import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineEditStates, InlineEditWorkflow } from "./inline-edit-demo";

/**
 * The inline edit drawings keep their row's box.
 *
 * The bug: the display is the recipe's `sm` action and the editor its `md`
 * field, so entering the edit state grew the row and pushed the status line, the
 * app's message and the hint under it down by the difference. The status line
 * also sized the scene, so the whole row moved sideways whenever the focus it
 * names changed, and the app's refusal — the one line a commit can add — took
 * its height from the hint it sits above. The row now reserves the taller
 * recipe height and centres both states in it, the scene has a width of its own,
 * and the refusal keeps its line whether or not it has words.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replaceAll(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the one rule whose selector list names `selector`. */
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
    // The slot is the taller of the two recipes, and the editor is the taller:
    // the display is centred in it, so neither state can move the lines below.
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
    // The control is the row's child, not the scene's or the tile's.
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
