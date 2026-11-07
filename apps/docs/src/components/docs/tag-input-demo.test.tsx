import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TagInputStates, TagInputWorkflow } from "./tag-input-demo";

const workflow = renderToStaticMarkup(<TagInputWorkflow />);
const states = renderToStaticMarkup(<TagInputStates />);

describe("the tag input previews", () => {
  it("renders the workflow's chips, its budget and its gate", () => {
    expect(workflow).toContain(">react</span>");
    expect(workflow).toContain(">gpuix</span>");
    expect(workflow).toContain(">components</span>");
    expect(workflow).toContain("5 of 5 keywords added: the list is full.");
    expect(workflow).toContain("Ready to publish 5 keywords.");
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
    expect(states).toContain("5 of 5 keywords added: the list is full.");
    expect(states).not.toContain("0 left");
  });

  it("renders no removal control inside the disabled group", () => {
    expect(states).toContain(">docs</span>");
    expect(states).not.toContain('aria-label="Remove docs"');

    expect(states).toContain('aria-label="Remove react"');
  });
});
