/**
 * Guards the disabled state a control paints by fading itself.
 *
 * The bug this holds: the contract measured the role pair (`disabled` behind
 * `disabledForeground`) and the rest of the library faded the whole control —
 * `disabled:opacity-50` in the recipes, `opacity = 0.5` in the primitive cores —
 * which `contrastRatio` refuses, so the mechanism most controls actually use was
 * measured by nothing. Compositing the fade shows why that mattered: a filled
 * action's label lands between 1.51:1 and 2.83:1, and a high-contrast theme's
 * between 1.74:1 and 2.23:1 — under the 3:1 its variant asks for, which is the
 * measured reason the role pair is the contract and the fade is the deviation.
 *
 * The second bug is a page outliving its painter: both token pages taught that
 * the primitive cores and the menu row faded the state after `controlStyle`
 * painted `disabledAction(theme)` for a filled action, the recipe's disabled
 * bucket became the neutral pair and the menu row painted `disabledForeground`.
 * The pages are held to the sources below, not to the mechanism they once
 * described.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: this is a check over the
 * repository's own Markdown and source, and the package keeps zero runtime
 * dependencies by design.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blend, lightColors } from "./color.js";
import {
  contrastFloors,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import {
  disabledAction,
  disabledFadeFailures,
  disabledFadePairs,
  disabledOpacity,
} from "./disabled.js";
import { fadedPair } from "./fade.js";
import { keyboardDimPairs } from "./focus-dim.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";

const shipped = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
] as const;

/** Every platform style in both modes, then every authored look's two editions. */
const styled = platformNames.flatMap((platform) => [
  platformTheme(themes.light, platform),
  platformTheme(themes.dark, platform),
]);
const looks = retroNames.flatMap((look) => [
  retroTheme(lightTheme, look),
  retroTheme(darkTheme, look),
]);

const measured = (fill: string, over: string): boolean =>
  disabledFadePairs.some((pair) => pair.fill === fill && pair.over === over);

describe("disabledOpacity", () => {
  it("is a design constant rather than a theme group", () => {
    expect(disabledOpacity).toBe(0.5);
    // A brand cannot lower it through `extendTheme`: it is not part of `Theme`.
    expect(Object.keys(lightTheme)).not.toContain("disabledOpacity");
  });
});

describe("disabledFadePairs", () => {
  it("measures every filled action on the page", () => {
    const missing = ["primary", "destructive", "secondary"]
      .filter((fill) => !measured(fill, "background"))
      .map((fill) => `${fill}/background`);

    expect(missing).toEqual([]);
  });

  it("measures a field on every surface, fill and label it paints", () => {
    // A field is two fills — a plain field's `input`, a composite field's page
    // role — and two labels: its value and its hint.
    const missing = (["input", "background"] as const).flatMap((fill) =>
      (["inputForeground", "placeholder"] as const).flatMap((label) =>
        (["background", "card", "popover", "muted"] as const)
          .filter(
            (over) =>
              !disabledFadePairs.some(
                (pair) =>
                  pair.fill === fill &&
                  pair.label === label &&
                  pair.over === over,
              ),
          )
          .map((over) => `${fill}/${label} on ${over}`),
      ),
    );

    expect(missing).toEqual([]);
  });

  it("measures a field's hint on the strips the keyboard dim measures it on", () => {
    // The two mechanisms composite the same field on the same four strips — the
    // page, a card, a popover and the `muted` toolbar or sidebar
    // (`docs/design-system.md` §7). The fade carried three, so a disabled search
    // field in a sidebar was the one faded control with no placement at all,
    // while the dim measured it. A strip one table measures and the other does
    // not is the bug this case holds.
    const strips = (
      pairs: ReadonlyArray<{ readonly label: string; readonly over: string }>,
    ): ReadonlySet<string> =>
      new Set(
        pairs
          .filter(({ label }) => label === "placeholder")
          .map(({ over }) => over),
      );

    const faded = strips(disabledFadePairs);
    expect(faded.has("muted")).toBe(true);
    expect(faded).toEqual(strips(keyboardDimPairs));
  });

  it("reports a hint that fades into a sidebar, not only into a page", () => {
    // A brand with a dark sidebar and a light content area — the desktop layout
    // this table missed. Its composite search field fades its hint into the
    // toolbar at 1.30:1 while the same field on the page still reads 2.03:1, so
    // the strip is what decides the measurement rather than a redundant copy of
    // the page placement.
    const darkSidebar = { colors: { ...lightColors, muted: "#2A2A2A" } };
    const hintOn = (strip: "background" | "muted") =>
      disabledFadeFailures(darkSidebar).find(
        ({ fill, label, over }) =>
          fill === "background" && label === "placeholder" && over === strip,
      );

    expect(hintOn("muted")?.ratio).toBeCloseTo(1.3, 2);
    expect(hintOn("background")).toBeUndefined();
  });

  it("reads each field's fill from the painter that paints it", () => {
    // The table is only honest while the recipes paint those fills: a plain
    // field's `bg-input` (the primitives' `FIELD_BASE`), a composite field's
    // `bg-background` (the shared recipes), and the fade on both. Renaming a
    // recipe or moving a fill fails here before the coverage above can claim a
    // surface nobody paints.
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");
    const recipe = (source: string, name: string): string => {
      const at = source.indexOf(`const ${name}`);
      expect(at, name).toBeGreaterThanOrEqual(0);
      return source.slice(at, source.indexOf(";", at));
    };

    const primitiveField = read("../../primitives/src/recipe/index.ts");
    expect(recipe(primitiveField, "FIELD_BASE")).toContain("bg-input");
    expect(recipe(primitiveField, "FIELD_BASE")).toContain(
      "disabled:opacity-50",
    );

    const tw = read("../../tw/src/recipes.ts");
    [
      "SEARCH_INPUT",
      "TAG_INPUT_ROOT",
      "MENTION_INPUT_FIELD",
      "COLOR_PICKER_INPUT",
      "INLINE_EDIT_INPUT",
      "CHAT_COMPOSER",
    ].forEach((name) => {
      expect(recipe(tw, name), name).toContain("bg-background");
    });
    // A composite field fades with the same share as a plain one.
    expect(tw).toContain("disabled:opacity-50");
  });

  it("measures the tightest field placement the shipped styles paint", () => {
    // The number `docs/tokens.md` prints: a `muted` toolbar is the darkest strip a
    // composite field sits on, so the authored Windows 7 light look's hint on it
    // is the lowest placement in the table. A palette edit that moves it fails
    // here and in the page.
    const tightest = [...shipped, ...styled, ...looks]
      .flatMap((theme) =>
        disabledFadePairs
          .filter(({ fill }) => fill === "input" || fill === "background")
          .map((pair) => {
            const faded = fadedPair(theme.colors, pair, disabledOpacity);
            return {
              theme: theme.name,
              pair: `${pair.fill}/${pair.label} on ${pair.over}`,
              ratio: contrastRatio(faded.label, faded.fill),
            };
          }),
      )
      .reduce((low, entry) =>
        (entry.ratio ?? 0) < (low.ratio ?? 0) ? entry : low,
      );

    expect(tightest.theme).toBe("Light · Windows 7 (Aero)");
    expect(tightest.pair).toBe("background/placeholder on muted");
    expect(tightest.ratio?.toFixed(2)).toBe("1.96");

    // The catalogue prints the same number and names the fills and labels the
    // table measures, so the page cannot teach a placement the report dropped.
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain(
      "composite hint on its `muted` toolbar at **1.96:1**",
    );
    expect(page).toContain("both of its fills and both of its labels");
  });
});

describe("disabledFadeFailures", () => {
  it("passes every shipped, platform and authored theme at the disabled floor", () => {
    // The fade is a mechanism, so it is held to the default disabled floor in
    // every variant; the floor that rises is the role pair's.
    [...shipped, ...styled, ...looks].forEach((theme) => {
      expect(disabledFadeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("composites the label over the faded fill, not over the page", () => {
    const primary = disabledFadeFailures(lightTheme, 2).find(
      ({ fill }) => fill === "primary",
    );

    // 50% primary over white, then 50% of the white label over that: 1.57:1.
    // Measuring the label against the page instead would report ~11:1 and call
    // a disabled button readable.
    expect(primary?.ratio).toBeCloseTo(1.57, 2);
    expect(primary?.floor).toBe(2);
  });

  it("reports a label painted into its own faded fill", () => {
    // A label equal to the faded fill is the erased state: the control is there,
    // its text is not. `edge` is that composited fill, so the faded label is the
    // same colour.
    const erased = blend(
      lightColors.primary,
      lightColors.background,
      1 - disabledOpacity,
    );
    const broken = {
      colors: { ...lightColors, primaryForeground: erased },
    };

    expect(
      disabledFadeFailures(broken).find(({ fill }) => fill === "primary"),
    ).toMatchObject({
      label: "primaryForeground",
      over: "background",
      ratio: 1,
      floor: contrastFloors.disabled,
    });
  });

  it("reports a role it cannot composite rather than skipping it", () => {
    const translucent = {
      colors: { ...lightColors, primary: "#5F4BDB80" },
    };

    expect(
      disabledFadeFailures(translucent).find(({ fill }) => fill === "primary")
        ?.ratio,
    ).toBeUndefined();
  });

  it("takes a floor, so a stricter brand can run the check it needs", () => {
    expect(disabledFadeFailures(lightTheme, 1)).toEqual([]);
    expect(disabledFadeFailures(lightTheme, 21).length).toBe(
      disabledFadePairs.length,
    );
  });

  it("cannot reach the high-contrast disabled floor at the shipped share", () => {
    // The measurement behind the design decision: a high-contrast theme fades a
    // filled action to ~1.7:1, under the 3:1 its variant's disabled floor asks
    // for, so that theme's `disabled` state is the role pair. The fields are
    // measured on the same floor and some of their placements clear it; the
    // actions are the ones the mechanism cannot carry. If the fade ever clears
    // it for them, this case fails and the documentation moves with it.
    const faded = disabledFadeFailures(
      highContrastLightTheme,
      highContrastFloors.disabled,
    )
      .filter(({ fill }) =>
        ["primary", "destructive", "secondary"].includes(fill),
      )
      .map(({ fill }) => fill);

    expect(faded).toEqual(["primary", "destructive"]);
  });
});

describe("the fade's page scope", () => {
  it("measures a filled action on the page only", () => {
    // A fade's result is a property of the strip behind it, so a filled action
    // is measured where the fade keeps the floor. A card placement would fail
    // four shipped light styles (the case below), so the table cannot gain one.
    // A field is the mechanism's other half: it is measured on every content
    // surface, because its fill is a quiet surface the fade carries there.
    const actions = ["primary", "destructive", "secondary"];
    const offPage = disabledFadePairs
      .filter(({ fill }) => actions.includes(fill))
      .filter(({ over }) => over !== "background")
      .map(({ fill, over }) => `${fill}/${over}`);

    expect(offPage).toEqual([]);
  });

  it("measures the card the fade does not carry", () => {
    // The premise of the scope: the same faded `primary` label clears the floor
    // on the page and lands under it on the card of the four light styles whose
    // page is lighter than their card. A palette that fixes the card makes the
    // scope's documentation wrong, so this case fails with the new numbers.
    const cards = [
      ["macOS light", platformTheme(themes.light, "darwin")],
      ["Linux light", platformTheme(themes.light, "linux")],
      ["Windows 7 (Aero) light", retroTheme(lightTheme, "aero")],
      ["Windows XP (Luna) light", retroTheme(lightTheme, "luna")],
    ] as const;

    const ratios = cards.map(([name, theme]) => {
      const faded = fadedPair(
        theme.colors,
        { fill: "primary", label: "primaryForeground", over: "card" },
        disabledOpacity,
      );
      const ratio = contrastRatio(faded.label, faded.fill);
      expect(ratio, name).toBeLessThan(contrastFloors.disabled);
      return ratio;
    });

    expect(ratios.map((ratio) => ratio?.toFixed(3) ?? "unmeasurable")).toEqual([
      "1.491",
      "1.468",
      "1.485",
      "1.480",
    ]);
  });

  it("replaces the fade with the pair the contract already measures", () => {
    // The alternative the design system calls the contract: the neutral pair a
    // disabled field paints. Its label is not near the floor in any theme — it
    // is the pair `contrastPairs` measures on every surface a control sits on.
    [...shipped, ...styled, ...looks].forEach((theme) => {
      const paint = disabledAction(theme);
      expect(paint, theme.name).toEqual({
        backgroundColor: theme.colors.disabled,
        color: theme.colors.disabledForeground,
      });
      expect(
        contrastRatio(paint.color, paint.backgroundColor),
        theme.name,
      ).toBeGreaterThanOrEqual(contrastFloors.disabled);
    });
  });
});

/**
 * The two pages a consumer reads about the disabled state, and the painters
 * they name. The pages teach which mechanism each package uses, so a page that
 * names a mechanism the source no longer has sends a reader to repaint the
 * state the pages call the contract.
 */
describe("the pages that teach the disabled state", () => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");
  const flat = (text: string): string => text.replace(/\s+/g, " ");

  const pages = {
    "docs/tokens.md": flat(read("../../../docs/tokens.md")),
    "docs/design-system.md": flat(read("../../../docs/design-system.md")),
  } as const;

  const painters = {
    control: read("../../primitives/src/core/style.ts"),
    recipe: read("../../primitives/src/recipe/index.ts"),
    menuRow: read("../../components/src/menu/item.tsx"),
    componentButton: read("../../components/src/internal/button.tsx"),
    twRecipes: read("../../tw/src/recipes.ts"),
  };

  it("reads the painter behind every claim", () => {
    // A guard reading a renamed file would pass by finding nothing.
    expect(painters.control).toContain("disabledAction(theme)");
    expect(painters.recipe).toContain(
      "disabled:bg-disabled disabled:text-disabled-foreground",
    );
    expect(painters.menuRow).toContain("theme.colors.disabledForeground");
    // The fade's share is the token constant, not a literal: the components
    // package's `Button` paints the measured pair on a filled variant and keeps
    // `disabledOpacity` on a ghost, so both mechanisms the page teaches are in
    // the file.
    expect(painters.componentButton).toContain("disabledAction(theme)");
    expect(painters.componentButton).toContain("opacity: disabledOpacity");
    expect(painters.twRecipes).toContain("disabled:opacity-50");
  });

  it("names the pair a filled action and a menu row wear", () => {
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("`disabledAction(theme)`");
      expect(text, page).toContain("paintsFilledSurface");
      expect(text, page).toContain("`packages/components/src/menu/item.tsx`");
    });
  });

  it("prints the strips a field's fade is measured on, and the tightest one", () => {
    // The inventory row printed three strips and a stale 1.95:1 while the
    // catalogue printed 1.99:1, so the row drifted from the report it describes.
    // All three surfaces now name the tightest placement the case above derives,
    // and the row names the fourth strip the table gained.
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain(
        "composite hint on its `muted` toolbar at **1.96:1**",
      );
    });
    const inventory = flat(read("../../../COMPONENTS.md"));
    expect(inventory).toContain("the four strips a field sits on");
    expect(inventory).toContain(
      "composite hint on its muted toolbar at 1.96:1",
    );
  });

  it("names the two painters that still fade", () => {
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("`@gpuixui/tw`");
      expect(text, page).toContain(
        "`packages/components/src/internal/button.tsx`",
      );
    });
  });

  it("retracts the painters that no longer fade", () => {
    // Restoring either page's old sentence fails here rather than sending a
    // reader to fade a state its painter has already replaced with the pair.
    const retracted = [
      "the primitives' core styles instead fade",
      "`opacity = 0.5` helpers in `packages/primitives/src/core/style.ts`",
      "a menu row's own `opacity`",
      "Adopting the pair in the recipes and the primitive cores",
      "Replacing the fade in the recipes and the primitive cores remains",
      "(`packages/components/src/internal/button.tsx`, `opacity: 0.5`)",
    ];

    Object.entries(pages).forEach(([page, text]) => {
      retracted.forEach((sentence) => {
        expect(text, `${page}: ${sentence}`).not.toContain(sentence);
      });
    });
  });

  it("names the components Button's two disabled paths, not a whole-control fade", () => {
    // The components `Button` splits: a filled variant wears the measured pair,
    // a ghost keeps `disabledOpacity`. The page that calls the whole Button a
    // 50% fade sends a reader to repaint a state its filled variants already
    // paint as the contract, so the sentence is read against the branch itself.
    const branch = painters.componentButton.slice(
      painters.componentButton.indexOf("const disabledStyle"),
      painters.componentButton.indexOf("const paintsSurface"),
    );
    expect(branch).toContain("paintsSurface(variant) ? disabledAction(theme)");
    expect(branch).toContain("opacity: disabledOpacity");

    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("filled variant");
      expect(text, page).toContain("`disabledAction(theme)`");
      expect(text, page).toContain("`disabledOpacity`");
      expect(text, page).toContain("keeps the fade");
    });
  });
});
