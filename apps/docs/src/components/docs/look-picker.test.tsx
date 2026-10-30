import { readFileSync } from "node:fs";
import { retroNames, retroStyles } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lookLabel, lookOrder, type LookName } from "../../lib/platform";
import { LookPickerBody } from "./look-picker";

/**
 * The authored-look picker.
 *
 * The sidebar switch is the mission's four platform names and deliberately has
 * no look group; `/theming` carries this control instead. The markup guard
 * is the button is a real button with the look's own label and the pressed one
 * marked — a picker that painted a fixed style or offered a name the library
 * does not ship would still render.
 *
 * The press itself is React state in a hydrated browser, so the page's press is
 * measured by `apps/docs/scripts/platform-switch-probe.ts` and held by
 * `src/lib/platform-switch.test.ts`; this file holds the markup and the wiring.
 */

const source = readFileSync(
  new URL("./look-picker.tsx", import.meta.url),
  "utf8",
);

const render = (look: LookName): string =>
  renderToStaticMarkup(
    <LookPickerBody
      look={look}
      onSelect={() => undefined}
      themeName="Dark · macOS · Windows XP (Luna)"
    />,
  );

interface DrawnButton {
  readonly look: string;
  readonly label: string;
  readonly pressed: boolean;
}

/** Every button the picker renders, attributes read independently of order. */
const buttons = (markup: string): ReadonlyArray<DrawnButton> =>
  [...markup.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].map((match) => {
    const attributes = match[1] ?? "";
    return {
      look: /data-look="([^"]+)"/.exec(attributes)?.[1] ?? "",
      label: match[2] ?? "",
      pressed: /aria-pressed="true"/.test(attributes),
    };
  });

describe("the authored-look picker", () => {
  it("renders one button per look, in the order the switch serves", () => {
    const drawn = buttons(render("native"));

    expect(drawn.map((button) => button.look)).toEqual([...lookOrder]);
    expect(drawn.length).toBe(retroNames.length + 1);
  });

  it("labels each look with the library's own label", () => {
    const drawn = buttons(render("native"));
    const expected = lookOrder.map((look) => lookLabel(look));

    expect(drawn.map((button) => button.label)).toEqual(expected);
    expect(expected).toContain(retroStyles.luna.label);
    expect(expected).toContain(retroStyles.aero.label);
    expect(expected).toContain(retroStyles.omarchy.label);
  });

  it("marks only the chosen look pressed", () => {
    const drawn = buttons(render("aero"));
    const pressed = drawn.filter((button) => button.pressed);

    expect(pressed.map((button) => button.look)).toEqual(["aero"]);
  });

  it("names the group a reader and the probe address it by", () => {
    const markup = render("native");

    expect(markup).toContain('aria-label="Authored look"');
    expect(markup).toContain('role="group"');
    expect(markup).toContain("Dark · macOS · Windows XP (Luna)");
  });

  it("wires the buttons to the provider's own look state", () => {
    // The body is pure, so this is where a refactor that dropped the hook or
    // passed a fixed look would be caught; the press path is the probe's.
    expect(source).toContain("usePlatform()");
    expect(source).toContain("onSelect={setLook}");
    expect(source).toContain("onClick={() => onSelect(name)}");
    expect(source).toContain("theme.name");
  });
});
