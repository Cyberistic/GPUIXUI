import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BadgeStatesBody, BadgeWorkflowBody } from "./badge-demo";

/**
 * The badge previews, as they render.
 *
 * A demo that dropped a variant from the gallery, drew a state with the wrong
 * fill, or let the panel print a row the model does not contain would still
 * build. These cases hold the markup to the model and the style sheet to the
 * theme's roles, and they check the one thing the page promises about the pill:
 * it is out of the pointer, so the row around it is the press target.
 */

const workflow = renderToStaticMarkup(<BadgeWorkflowBody />);
const states = renderToStaticMarkup(<BadgeStatesBody />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the style sheet. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the deployments panel preview", () => {
  it("draws every deployment with its word and its branch label", () => {
    expect((workflow.match(/class="gx-badge-deploy"/g) ?? []).length).toBe(6);
    expect(workflow).toContain(
      "6 deployments · 1 passed, 2 failed, 1 running, 1 queued, 1 stale",
    );
    const missing = [
      "Passed",
      "Failed",
      "Running",
      "Queued",
      "Stale",
    ].filter((word) => !workflow.includes(`>${word}</span>`));

    expect(missing).toEqual([]);
    // A branch names something and is the one outline pill; a state is never
    // drawn with the variant that has no fill to carry it.
    expect((workflow.match(/gx-badge-outline/g) ?? []).length).toBe(6);
  });

  it("puts the status pill inside the row that owns the press", () => {
    const rows = workflow.split('<li class="gx-badge-deploy">').slice(1);

    expect(rows.length).toBe(6);
    expect(
      rows.filter(
        (row) =>
          !row.includes('class="gx-badge-deploy-row"') ||
          !row.includes('aria-pressed="false"'),
      ),
    ).toEqual([]);
    // The one selectable thing in a row is the row; the pills are spans.
    expect(workflow.match(/<span[^>]*data-badge="true"/g)?.length).toBe(12);
  });

  it("opens on every row, with the eager-pill control off", () => {
    expect(workflow).toContain(">All</button>");
    expect(workflow).toContain("Press a row, or the pill inside it");
    expect(workflow).toContain('type="checkbox"');
    expect(workflow).not.toContain('data-eager=""');
    expect(workflow).not.toContain("data-selected");
  });

  it("says the panel is composition, not a component", () => {
    expect(workflow).toContain("the preview&#x27;s");
    expect(workflow).toContain("<code>Badge</code> draws one pill");
  });
});

describe("the badge states preview", () => {
  it("draws all seven variants and both sizes, each labelled", () => {
    const missing = [
      "neutral",
      "primary",
      "success",
      "warning",
      "danger",
      "info",
      "outline",
    ].flatMap((variant) =>
      states.includes(`gx-badge-${variant}`) &&
      states.includes(`>${variant}</span>`)
        ? []
        : [variant],
    );

    expect(missing).toEqual([]);
    expect(states).toContain("gx-badge-sm");
    expect(states).toContain("gx-badge-md");
    expect(states).toContain(">sm</span>");
    expect(states).toContain(">md</span>");
  });

  it("measures the outline pill on the three washes a row wears", () => {
    const missing = ["page", "hover", "selected"].filter(
      (wash) => !states.includes(`data-wash="${wash}"`),
    );

    expect(missing).toEqual([]);
    expect(block('.gx-badge-stage[data-wash="page"]')).toContain(
      "background: var(--background)",
    );
    expect(block('.gx-badge-stage[data-wash="hover"]')).toContain(
      "background: var(--hover)",
    );
    expect(block('.gx-badge-stage[data-wash="selected"]')).toContain(
      "background: var(--selected)",
    );
  });

  it("draws every state with the fill its variant names", () => {
    const states_ = states.split(">States</p>")[1] ?? "";

    expect(states_).toContain("gx-badge-success");
    expect(states_).toContain("gx-badge-danger");
    expect(states_).toContain("gx-badge-info");
    expect(states_).toContain("gx-badge-neutral");
    expect(states_).toContain("gx-badge-warning");
    // The tint is never the only signal: each pill prints its word.
    expect(states_).toContain(">Passed<");
    expect(states_).toContain(">Stale<");
  });

  it("paints the pill from the theme, never a literal colour", () => {
    expect(block(".gx-badge-neutral")).toContain("background: var(--muted)");
    expect(block(".gx-badge-primary")).toContain("background: var(--primary)");
    expect(block(".gx-badge-success")).toContain(
      "background: var(--success-soft)",
    );
    expect(block(".gx-badge")).toContain("border-radius: 9999px");
    expect(block(".gx-badge")).toContain("pointer-events: none");
  });
});
