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

const tokenImport =
  /import\s*\{[^}]*\bdisabledOpacity\b[^}]*\}\s*from\s*"@gpuixui\/tokens"/;

const fadeShares = (
  source: string,
  file: string = source,
): ReadonlyArray<number | "not-the-constant"> =>
  [...source.matchAll(/style\.opacity = (disabledOpacity|[\d.]+)/g)].map(
    ([, written]) =>
      written === "disabledOpacity"
        ? tokenImport.test(file)
          ? disabledOpacity
          : "not-the-constant"
        : Number(written),
  );

describe("disabledOpacity", () => {
  it("is a design constant rather than a theme group", () => {
    expect(disabledOpacity).toBe(0.5);

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

    expect(tw).toContain("disabled:opacity-50");
  });

  it("measures the tightest field placement the shipped styles paint", () => {
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
    [...shipped, ...styled, ...looks].forEach((theme) => {
      expect(disabledFadeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("composites the label over the faded fill, not over the page", () => {
    const primary = disabledFadeFailures(lightTheme, 2).find(
      ({ fill }) => fill === "primary",
    );

    expect(primary?.ratio).toBeCloseTo(1.57, 2);
    expect(primary?.floor).toBe(2);
  });

  it("reports a label painted into its own faded fill", () => {
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
    const actions = ["primary", "destructive", "secondary"];
    const offPage = disabledFadePairs
      .filter(({ fill }) => actions.includes(fill))
      .filter(({ over }) => over !== "background")
      .map(({ fill, over }) => `${fill}/${over}`);

    expect(offPage).toEqual([]);
  });

  it("measures the card the fade does not carry", () => {
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
      "1.484",
      "1.485",
      "1.480",
    ]);
  });

  it("replaces the fade with the pair the contract already measures", () => {
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

  it("answers no pair for a theme that lost the roles, not a throw", () => {
    expect(disabledAction({})).toBeUndefined();
    expect(disabledAction({ colors: { disabled: "#E3E3E8" } })).toBeUndefined();

    expect(
      disabledAction({
        colors: { disabled: "#E3E3E8", disabledForeground: "#767A82" },
      }),
    ).toEqual({ backgroundColor: "#E3E3E8", color: "#767A82" });
  });
});

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
    expect(painters.control).toContain("disabledAction(theme)");
    expect(painters.recipe).toContain(
      "disabled:bg-disabled disabled:text-disabled-foreground",
    );
    expect(painters.menuRow).toContain("theme.colors.disabledForeground");

    expect(painters.componentButton).toContain("@gpuixui/primitives/button");
    expect(painters.control).toContain(
      "variant.filledAction === undefined ? undefined : disabledAction(theme)",
    );
    expect(painters.control).toContain("style.opacity = ");
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
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain(
        "composite hint on its `muted` toolbar at **1.96:1**",
      );
    });
    const inventory = flat(read("../../../.agents/slop/COMPONENTS.md"));
    expect(inventory).toContain("the four strips a field sits on");
    expect(inventory).toContain(
      "composite hint on its muted toolbar at 1.96:1",
    );
  });

  it("names the painters that still fade", () => {
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("`@gpuixui/tw`");
      expect(text, page).toContain("`packages/primitives/src/core/style.ts`");
      expect(text, page).toContain("`disabledOpacity`");
    });
  });

  it("names the one recipe set still on the fade, not two and a Button", () => {
    expect(painters.recipe).toContain(
      "disabled:bg-disabled disabled:text-disabled-foreground",
    );
    expect(painters.componentButton).toContain("@gpuixui/primitives/button");
    expect(painters.componentButton).not.toContain("opacity");
    expect(painters.twRecipes).toContain("disabled:opacity-50");

    Object.entries(pages).forEach(([page, text]) => {
      expect(text, `${page}: the retracted interlock`).not.toContain(
        "the two recipe sets and the components'",
      );
      expect(
        text,
        `${page} no longer names the one recipe set left on the fade`,
      ).toContain("`@gpuixui/tw`'s copyable `button` recipe");
    });

    const inventory = read("../../../.agents/slop/COMPONENTS.md")
      .split("\n")
      .find((line) => line.startsWith("| Contrast contract |"));
    expect(inventory, "the Contrast contract row").toBeDefined();
    expect(
      inventory,
      "the row still names the components Button as a fade painter",
    ).not.toContain("`opacity: disabledOpacity`");
    expect(inventory).toContain("`@gpuixui/tw`'s recipes");
  });

  it("reads the share each fade actually writes", () => {
    const shares = fadeShares(painters.control);
    expect(shares.length, "the fades in the primitives' core style").toBe(3);
    shares.forEach((share, index) => {
      expect(share, `primitive fade ${index + 1}`).toBe(disabledOpacity);
    });
    const recipeShare = /disabled:opacity-(\d+)/.exec(painters.twRecipes);
    expect(recipeShare?.[1], "the tw recipe's fade").toBe(
      String(disabledOpacity * 100),
    );
  });

  it("reads the fade's share whether it is written or imported", () => {
    const imported = 'import { disabledOpacity } from "@gpuixui/tokens";\n';
    expect(fadeShares(`${imported}style.opacity = 0.5;`)).toEqual([
      disabledOpacity,
    ]);
    expect(fadeShares(`${imported}style.opacity = disabledOpacity;`)).toEqual([
      disabledOpacity,
    ]);
    expect(fadeShares(`${imported}style.opacity = 0.4;`)).toEqual([0.4]);
    expect(fadeShares("style.opacity = disabledOpacity;")).toEqual([
      "not-the-constant",
    ]);
    expect(
      fadeShares(
        'import { disabledOpacity } from "./disabled.js";\nstyle.opacity = disabledOpacity;',
      ),
    ).toEqual(["not-the-constant"]);
  });

  it("holds the components action to a translation, not a second painter", () => {
    expect(painters.componentButton).toContain("@gpuixui/primitives/button");
    expect(painters.componentButton).not.toContain("opacity");
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("delegates");
      expect(text, page).not.toContain("fading its ghost");
      expect(text, page).not.toContain("token constant rather than a copied");
    });
  });

  it("retracts the painters that no longer fade", () => {
    const retracted = [
      "the primitives' core styles instead fade",
      "`opacity = 0.5` helpers in `packages/primitives/src/core/style.ts`",
      "a menu row's own `opacity`",
      "Adopting the pair in the recipes and the primitive cores",
      "Replacing the fade in the recipes and the primitive cores remains",
      "(`packages/components/src/internal/button.tsx`, `opacity: 0.5`)",
      "while a ghost keeps the fade (`packages/components/src/internal/button.tsx`)",
      "and the components' `Button` fading its ghost at `disabledOpacity`",
    ];

    Object.entries(pages).forEach(([page, text]) => {
      retracted.forEach((sentence) => {
        expect(text, `${page}: ${sentence}`).not.toContain(sentence);
      });
    });
  });

  it("names the components Button's two disabled paths, not a whole-control fade", () => {
    const start = painters.control.indexOf("if (spec.disabled === true) {");
    const branch = painters.control.slice(
      start,
      painters.control.indexOf("} else {", start),
    );
    expect(branch).toContain("disabledAction(theme)");

    expect(fadeShares(branch, painters.control)).toEqual([disabledOpacity]);

    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("filled variant");
      expect(text, page).toContain("`disabledAction(theme)`");
      expect(text, page).toContain("`disabledOpacity`");
      expect(text, page).toContain("keeps the fade");
    });
  });
});
