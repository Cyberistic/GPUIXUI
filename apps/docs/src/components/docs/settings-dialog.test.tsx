import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  SettingsDialogRender,
  clampFontSize,
  initialThemeSettings,
  messageLayouts,
  selectLayout,
  setFontSize,
  toggleDarkMode,
} from "./settings-dialog";

/**
 * The settings dialog block.
 *
 * The markup guards hold the modal to the parts a reader is told to look for:
 * the two panes, every nav row, the three theme controls and their initial
 * state. The pure helpers are the controls' rules — the switch flips only the
 * switch, the slider clamps to the label's range, and a layout choice changes
 * only the layout — and the style guard keeps every state on paint, so the
 * panel cannot move under the pointer.
 */

const markup = renderToStaticMarkup(<SettingsDialogRender />);

const navLabels = [
  "Profiles",
  "Appearance",
  "Notifications",
  "User Profile",
  "Team",
  "Security",
  "Maintenance",
];

describe("settings dialog markup", () => {
  it("is a modal dialog with both panes and the section nav", () => {
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Settings");
    expect(markup).toContain("Search settings");
    for (const label of navLabels) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain("Reusable tool bundles");
    expect(markup).toContain("Settings sections");
  });

  it("collapses the section nav to an icon strip", () => {
    // The bug guarded: the dialog's nav pane had no way to give its 260px
    // back. The shared toggle carries the state, and the labels are the ones
    // the sheet fades when the pane is collapsed.
    expect(markup).toContain('data-collapsed="false"');
    expect(markup).toContain('aria-label="Collapse sidebar"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("gx-set-nav-text gx-rail-label");
    expect(markup).toContain('aria-label="Appearance"');
  });

  it("marks Appearance active and every row keeps its description", () => {
    expect(markup).toContain('aria-current="page"');
    expect(markup.match(/aria-current="page"/g)?.length).toBe(1);
    expect(markup).toContain('data-active="true"');
    expect(markup).toContain("Theme, font size and layout");
    expect(markup).toContain("Sessions, keys and two-factor");
  });

  it("prints the theme heading and the three controls", () => {
    expect(markup).toContain("Theme");
    expect(markup).toContain("Customize the look and feel of the application");
    expect(markup).toContain("Dark Mode");
    expect(markup).toContain("Font Size");
    expect(markup).toContain("Message Layout");
  });

  it("starts the switch on, the slider at 15px and Classic selected", () => {
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain('data-on="true"');
    expect(markup).toContain("15px");
    expect(markup).toContain(`min="${FONT_SIZE_MIN}"`);
    expect(markup).toContain(`max="${FONT_SIZE_MAX}"`);
    expect(markup).toContain('value="15"');
  });

  it("offers both layouts as a radio group with their descriptions", () => {
    expect(markup).toContain('role="radiogroup"');
    expect(markup.match(/role="radio"/g)?.length).toBe(messageLayouts.length);
    expect(markup.match(/aria-checked="true"/g)?.length).toBe(2);
    expect(markup).toContain("Classic");
    expect(markup).toContain("Compact");
    expect(markup).toContain("Cards with headers and content sections");
    expect(markup).toContain("Dense rows linked by a timeline rail");
  });
});

describe("the theme controls", () => {
  it("flips the switch without touching the font size or layout", () => {
    expect(toggleDarkMode(initialThemeSettings)).toEqual({
      darkMode: false,
      fontSize: 15,
      layout: "classic",
    });
    expect(toggleDarkMode(toggleDarkMode(initialThemeSettings))).toEqual(
      initialThemeSettings,
    );
  });

  it("sets the font size to the slider's value", () => {
    expect(setFontSize(initialThemeSettings, 18)).toEqual({
      darkMode: true,
      fontSize: 18,
      layout: "classic",
    });
  });

  it("clamps the font size to the range and rounds to whole pixels", () => {
    expect(clampFontSize(FONT_SIZE_MAX + 4)).toBe(FONT_SIZE_MAX);
    expect(clampFontSize(FONT_SIZE_MIN - 4)).toBe(FONT_SIZE_MIN);
    expect(clampFontSize(15.6)).toBe(16);
    expect(clampFontSize(Number.NaN)).toBe(initialThemeSettings.fontSize);
  });

  it("selects a layout without touching the other settings", () => {
    expect(selectLayout(initialThemeSettings, "compact")).toEqual({
      darkMode: true,
      fontSize: 15,
      layout: "compact",
    });
    expect(selectLayout(initialThemeSettings, "compact").layout).toBe(
      "compact",
    );
  });

  it("keeps every control's change independent", () => {
    const configured = selectLayout(
      setFontSize(toggleDarkMode(initialThemeSettings), 17),
      "compact",
    );

    expect(configured).toEqual({
      darkMode: false,
      fontSize: 17,
      layout: "compact",
    });
  });
});

/** One authored rule block from `blocks.css`, from its selector to its brace. */
const cssRule = (selector: string): string => {
  const css = readFileSync(
    fileURLToPath(new URL("../../styles/blocks.css", import.meta.url)),
    "utf8",
  );
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no rule for ${selector}`);
  return css.slice(start, css.indexOf("}", start));
};

describe("no state moves the panel", () => {
  it("moves the switch knob by transform, not by resizing the track", () => {
    expect(cssRule(".gx-set-switch")).toContain("width: 38px");
    expect(cssRule('.gx-set-switch[data-on="true"] .gx-set-knob')).toContain(
      "transform: translateX(16px)",
    );
  });

  it("rings the selected layout with a shadow, not a wider border", () => {
    expect(cssRule('.gx-set-layout[aria-checked="true"]')).toContain(
      "box-shadow: inset 0 0 0 2px var(--primary)",
    );
    expect(cssRule('.gx-set-check[data-on="false"]')).toContain(
      "visibility: hidden",
    );
  });

  it("keeps both blocks inside the preview surface", () => {
    expect(cssRule(".gx-set-panel")).toContain("max-width: 100%");
    expect(cssRule(".gx-kan")).toContain("max-width: 100%");
  });
});
