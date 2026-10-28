import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A preview is a picture, not a lecture.
 *
 * Every scene used to carry a paragraph under the drawing explaining the
 * component, its contract or what a control does — the page above it already
 * says all of that — so the picture read as a drawing with a caption. These
 * cases hold the scenes to the rule: a narration class cannot come back, and
 * the style sheet cannot keep a rule for one.
 */

const dir = new URL(".", import.meta.url).pathname;

/** Every narration class the scenes used to carry, none of which survives. */
const proseClasses = `gx-demo-hint gx-toast-hint gx-toast-lede gx-form-lede
  gx-stepper-lede gx-timeline-lede gx-hotkey-note gx-aspect-note gx-avatar-foot
  gx-badge-foot gx-breadcrumb-hint gx-breadcrumb-tile-note gx-trule-hint
  gx-codeedit-hint gx-collapse-hint gx-color-note gx-empty-note gx-fieldset-note
  gx-form-note gx-ig-note gx-item-note gx-label-note gx-message-note
  gx-scroller-note gx-player-hint gx-mention-note gx-md-hint gx-nav-hint
  gx-nav-controls-note gx-nav-tile-note gx-pagination-hint
  gx-pagination-tile-note gx-stepper-note gx-group-hint gx-preview-card-note
  gx-inspector-stage-note gx-search-note gx-time-note gx-timeline-note
  gx-shortcuts-note gx-hovercard-note gx-props-note gx-dock-hint gx-chat-hint
  gx-gradient-copy gx-layout-hint gx-field-note gx-list-meta`
  .split(/\s+/)
  .filter((name) => name !== "");

const scenes = readdirSync(dir)
  .filter((name) => name.endsWith("-demo.tsx") || name === "demos.tsx")
  .concat("table-rule-demos.tsx")
  .map((name) => [name, readFileSync(`${dir}${name}`, "utf8")] as const);

const css = readFileSync(`${dir}../../styles/demos.css`, "utf8");

describe("the preview scenes", () => {
  it("explains nothing in a paragraph", () => {
    const offenders = scenes.flatMap(([name, source]) =>
      proseClasses
        .filter((prose) => source.includes(prose))
        .map((prose) => `${name}: ${prose}`),
    );

    expect(offenders).toEqual([]);
  });

  it("keeps no style rule for a paragraph it no longer draws", () => {
    const rules = proseClasses.filter((prose) => css.includes(`.${prose}`));

    expect(rules).toEqual([]);
  });
});
