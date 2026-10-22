import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TagInputStates, TagInputWorkflow } from "./tag-input-demo";

/**
 * The tag input previews, as they render.
 *
 * The page's two drawings are the only place a reader sees a chip, a budget or
 * a disabled group, and nothing else renders them — a demo that dropped a state
 * or printed the wrong budget would still build. These cases hold the markup to
 * the rules the model owns: the workflow's two chips and its gate, the four
 * states, the cap's wording and the removal control a disabled group must not
 * render.
 */

const workflow = renderToStaticMarkup(<TagInputWorkflow />);
const states = renderToStaticMarkup(<TagInputStates />);

describe("the tag input previews", () => {
  it("renders the workflow's chips, its budget and its gate", () => {
    expect(workflow).toContain(">react</span>");
    expect(workflow).toContain(">gpuix</span>");
    expect(workflow).toContain("2 of 5 keywords · 3 left");
    expect(workflow).toContain("Ready to publish 2 keywords.");
    expect(workflow).toContain('aria-label="Remove react"');
  });

  it("renders four states, each in its own named group", () => {
    const groups = workflow.match(/class="gx-tag-group"/g) ?? [];

    expect(groups).toHaveLength(1);
    expect((states.match(/class="gx-tag-group"/g) ?? []).length).toBe(4);
    const label = (name: string): void => {
      expect(states).toContain(`aria-label="${name}"`);
    };

    [
      "Empty keyword list",
      "Full keyword list",
      "Keywords allowing repeats",
      "Read-only keywords",
    ].forEach(label);
  });

  it("says the cap is reached, not that it is a number left", () => {
    // The bug this guards: a drawing that prints "0 left" beside "limit
    // reached", or a budget that counts the draft.
    expect(states).toContain("5 of 5 keywords · limit reached");
    expect(states).not.toContain("0 left");
  });

  it("renders no removal control inside the disabled group", () => {
    // `docs` is the disabled group's token and belongs to no other state, so a
    // removal control for it is the one a disabled group must not render.
    expect(states).toContain(">docs</span>");
    expect(states).not.toContain('aria-label="Remove docs"');
    // A live group still carries its own, so the absence above is not a typo.
    expect(states).toContain('aria-label="Remove react"');
  });
});
