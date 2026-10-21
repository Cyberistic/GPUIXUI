/**
 * Guards the figures in `TODO.md`'s live cross-team rows.
 *
 * A live row is the instruction the next workstream follows: what a consumer
 * paints today, what it should paint, and the measured cost of the defect. The
 * rows below are evidence, but their figures are prose no test read, so the
 * plans that moved a role left them behind (plan 831 found three, plan 833 the
 * rest):
 *
 * - `message.tsx`'s status word quoted the identity light `successText` and
 *   `destructiveText` on `card` as 6.63:1 and 7.21:1; plans `366`, `528`, `574`
 *   and `582` moved them to 8.60:1 and 8.70:1.
 * - the `destructiveText` row quoted the solid `destructive` at 4.04–4.28:1 on
 *   the hover wash and 3.29–3.86:1 on the active wash, and the error ink at
 *   ≥5.28:1; today the fill measures 3.81–4.50:1 and 3.36–4.04:1 and the ink
 *   6.37:1 at the tightest.
 * - the ColorPicker row said the `foreground` ring measures 1.56–2.98:1 on
 *   `primary`/`destructive` "in most sets"; today it is 1.57–3.59:1 on `primary`
 *   (under 3:1 in 21 of 24 sets) and 1.97–3.48:1 on `destructive` (18 of 24).
 * - the pressed-selection row named ten of the sixteen sets where `ring` equals
 *   `primary` and quoted 1.02–1.42:1 on `destructive`; the range reaches
 *   1.02–1.61:1.
 *
 * The conclusions still stand — `xText` for a status word, `destructiveText` for
 * an error signal, `contrastRing` for a user-supplied swatch — so this suite
 * holds the numbers, not the advice, and derives every one of them from
 * `shippedThemes` with the checker's own measurement.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compositeOver, contrastRatio } from "./contrast.js";
import { getPlatformRecipeTheme } from "./platform-recipes.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, lightTheme } from "./theme.js";

/** A document read as one line, so a wrapped figure is not a substring. */
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8")
    .replaceAll(/\s+/g, " ")
    .trim();

const ledger = prose("../../../TODO.md");

/** One live cross-team row: from its start to the next live row. */
const liveRow = (start: string): string => {
  const from = ledger.indexOf(start);
  expect(from, start).toBeGreaterThanOrEqual(0);
  const to = ledger.indexOf("`[ ]` Cross-team", from + start.length);
  expect(to, start).toBeGreaterThan(from);
  return ledger.slice(from, to);
};

const ratio = (foreground: string, background: string): number =>
  contrastRatio(foreground, background);

const fixed = (value: number): string => value.toFixed(2);

const light = getTheme("light");

/** The six default-contrast light sets the rows' light figures are drawn from. */
const defaultLight = shippedThemes.filter(
  (shipped) =>
    shipped.theme.mode === "light" && shipped.theme.contrast === "default",
);

const statusRow = liveRow(
  "Cross-team: `components` uses `statusTone(...).text` for inline status",
);
const errorRow = liveRow(
  "Cross-team: `components` uses `destructiveText` for every error signal",
);
const pickerRow = liveRow(
  "Cross-team: `components` gives the ColorPicker's selected swatch",
);
const ringRow = liveRow(
  "Cross-team: `primitives` gives a pressed selection control",
);
const bubbleRow = liveRow("Cross-team: `components` applies `selectionStyle");
const invalidFieldRow = liveRow(
  "Cross-team: `primitives` must not paint an invalid field",
);
const secondaryRow = liveRow(
  "Cross-team: `components` moves the secondary Button",
);
const avatarRow = liveRow(
  "Cross-team: `components` moves the Avatar presence dot",
);
const timelineRow = liveRow(
  "Cross-team: `components` moves the Timeline upcoming dot",
);
const menuBarRow = liveRow(
  "Cross-team: `components` moves the menu row's highlight bar",
);
const menuCheckRow = liveRow(
  "Cross-team: `components` moves the menu checkbox item",
);
const countdownRow = liveRow(
  "Cross-team: `components` paints the Toast countdown",
);
const uncheckedRow = liveRow(
  "Cross-team: `primitives` paints an unchecked checkbox/switch border",
);
const nativeHintRow = liveRow(
  "Cross-team: `primitives` stops trusting `nativeTextTheme`",
);

/** The six default-contrast dark sets the countdown row's claim is about. */
const defaultDark = shippedThemes.filter(
  (shipped) =>
    shipped.theme.mode === "dark" && shipped.theme.contrast === "default",
);

const aeroLight = getPlatformRecipeTheme("aero", "light");

describe("the status word's ink on the identity light card", () => {
  it("states the three roles' current ratios", () => {
    const successText = ratio(light.colors.successText, light.colors.card);
    const infoText = ratio(light.colors.infoText, light.colors.card);
    const destructiveText = ratio(
      light.colors.destructiveText,
      light.colors.card,
    );

    expect(successText).toBeCloseTo(8.603, 3);
    expect(infoText).toBeCloseTo(8.422, 3);
    expect(destructiveText).toBeCloseTo(8.701, 3);

    expect(statusRow).toContain(
      `${fixed(successText)}:1, ${fixed(infoText)}:1 and ${fixed(destructiveText)}:1`,
    );
    // The leading fill figure is still the reason the migration matters.
    expect(statusRow).toContain("4.540:1");
    expect(statusRow).not.toContain("6.63:1");
    expect(statusRow).not.toContain("7.21:1");
  });
});

describe("the solid destructive fill as text on the washes", () => {
  it("states the hover and active ranges, and the one set at the floor", () => {
    const hover = defaultLight.map((shipped) =>
      ratio(shipped.theme.colors.destructive, shipped.theme.colors.hover),
    );
    const active = defaultLight.map((shipped) =>
      ratio(shipped.theme.colors.destructive, shipped.theme.colors.active),
    );

    expect(Math.min(...hover)).toBeCloseTo(3.812, 3);
    expect(Math.max(...hover)).toBeCloseTo(4.502, 3);
    expect(Math.min(...active)).toBeCloseTo(3.357, 3);
    expect(Math.max(...active)).toBeCloseTo(4.036, 3);
    expect(hover.filter((value) => value >= 4.5)).toHaveLength(1);
    expect(active.every((value) => value < 4.5)).toBe(true);

    expect(errorRow).toContain(
      `${fixed(Math.min(...hover))}–${fixed(Math.max(...hover))}:1`,
    );
    expect(errorRow).toContain(
      `${fixed(Math.min(...active))}–${fixed(Math.max(...active))}:1`,
    );
    expect(errorRow).not.toContain("4.04–4.28");
    expect(errorRow).not.toContain("3.29–3.86");
  });

  it("states the error ink's own floor on both washes", () => {
    const washed = defaultLight.flatMap((shipped) => [
      ratio(shipped.theme.colors.destructiveText, shipped.theme.colors.hover),
      ratio(shipped.theme.colors.destructiveText, shipped.theme.colors.active),
    ]);
    const tightest = Math.min(...washed);

    expect(tightest).toBeCloseTo(6.372, 3);
    expect(errorRow).toContain(`≥${fixed(tightest)}:1`);
    expect(errorRow).not.toContain("5.28:1");
  });
});

describe("the ColorPicker's two-tone ring", () => {
  it("states the foreground swatch's 1.000:1 and the two ranges", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(ratio(theme.colors.foreground, theme.colors.foreground)).toBe(1);
    });

    const primary = shippedThemes.map(({ theme }) =>
      ratio(theme.colors.foreground, theme.colors.primary),
    );
    const destructive = shippedThemes.map(({ theme }) =>
      ratio(theme.colors.foreground, theme.colors.destructive),
    );
    const primaryBelow = primary.filter((value) => value < 3).length;
    const destructiveBelow = destructive.filter((value) => value < 3).length;

    expect(Math.min(...primary)).toBeCloseTo(1.565, 3);
    expect(Math.max(...primary)).toBeCloseTo(3.595, 3);
    expect(primaryBelow).toBe(21);
    expect(Math.min(...destructive)).toBeCloseTo(1.974, 3);
    expect(Math.max(...destructive)).toBeCloseTo(3.48, 3);
    expect(destructiveBelow).toBe(18);

    expect(pickerRow).toContain(
      `${fixed(Math.min(...primary))}–${fixed(Math.max(...primary))}:1`,
    );
    expect(pickerRow).toContain(
      `${primaryBelow} of the ${shippedThemes.length}`,
    );
    expect(pickerRow).toContain(
      `${fixed(Math.min(...destructive))}–${fixed(Math.max(...destructive))}:1`,
    );
    expect(pickerRow).toContain(
      `${destructiveBelow} of ${shippedThemes.length}`,
    );
    expect(pickerRow).not.toContain("2.98");
  });

  it("states the tightest ring its own guarantee produces", () => {
    const tightest = Math.min(
      ...shippedThemes.map(({ theme }) =>
        Math.sqrt(ratio(theme.colors.foreground, theme.colors.background)),
      ),
    );

    expect(tightest).toBeCloseTo(3.7016, 3);
    expect(pickerRow).toContain(`${tightest.toFixed(2)}:1`);
  });
});

describe("the derivation is not a restatement", () => {
  it("moves when the palette moves the ink", () => {
    const moved = extendTheme(lightTheme, {
      colors: { successText: lightTheme.colors.card },
    });
    const shipped = ratio(light.colors.successText, light.colors.card);
    const edited = ratio(moved.colors.successText, moved.colors.card);

    expect(edited).toBeLessThan(3);
    expect(edited).not.toBeCloseTo(shipped, 1);
  });

  it("moves when the palette moves a mark's fill", () => {
    const moved = extendTheme(lightTheme, {
      colors: { warning: lightTheme.colors.card },
    });

    expect(ratio(moved.colors.warning, moved.colors.card)).toBeCloseTo(1, 3);
    expect(ratio(light.colors.warning, light.colors.card)).not.toBeCloseTo(
      1,
      1,
    );
  });
});

describe("the pressed selection control's ring", () => {
  it("states the sixteen sets and the destructive range", () => {
    const equalPrimary = shippedThemes.filter(
      ({ theme }) => ratio(theme.colors.ring, theme.colors.primary) === 1,
    );
    const onDestructive = shippedThemes.map(({ theme }) =>
      ratio(theme.colors.ring, theme.colors.destructive),
    );

    expect(equalPrimary).toHaveLength(16);
    expect(Math.min(...onDestructive)).toBeCloseTo(1.024, 3);
    expect(Math.max(...onDestructive)).toBeCloseTo(1.609, 3);

    expect(ringRow).toContain(`16 of the ${shippedThemes.length}`);
    expect(ringRow).toContain(
      `${fixed(Math.min(...onDestructive))}–${fixed(Math.max(...onDestructive))}:1`,
    );
    expect(ringRow).not.toContain("1.02–1.42");
  });
});

describe("the message bubble's invisible selection wash", () => {
  it("states the six palettes where the wash composites onto its own fill", () => {
    const vanishing = shippedThemes
      .filter(
        ({ theme }) =>
          ratio(
            theme.colors.primary,
            compositeOver(theme.colors.selection, theme.colors.primary),
          ) === 1,
      )
      .map(({ theme }) => theme.name);

    expect(vanishing).toEqual([
      "Dark",
      "Light · macOS",
      "Dark · macOS",
      "Light · Linux",
      "Light · Windows",
      "Light · Windows 7",
    ]);
    [
      "identity dark",
      "macOS light and dark",
      "Linux light",
      "Windows light",
      "Aero light",
    ].forEach((palette) => expect(bubbleRow).toContain(palette));
  });
});

describe("the invalid field's painted fill", () => {
  it("states both AAA dark sets and the Aero light set", () => {
    shippedThemes
      .filter(({ theme }) => theme.contrast === "high" && theme.mode === "dark")
      .forEach(({ theme }) =>
        expect(
          ratio(theme.colors.inputForeground, theme.colors.destructive),
        ).toBeCloseTo(1.974, 3),
      );
    expect(
      ratio(aeroLight.colors.inputForeground, aeroLight.colors.destructive),
    ).toBeCloseTo(3.48, 3);

    expect(invalidFieldRow).toContain("**1.97:1**");
    expect(invalidFieldRow).toContain("**3.48:1**");
    expect(invalidFieldRow).toContain("both AAA dark");
  });
});

describe("the secondary control's collapsed step", () => {
  it("states the 23 under-floor pairs and the 19 equal values", () => {
    const step = shippedThemes.map(({ theme }) =>
      ratio(theme.colors.secondary, theme.colors.hover),
    );
    const equal = shippedThemes.filter(
      ({ theme }) => theme.colors.secondary === theme.colors.hover,
    );

    expect(step.filter((value) => value < 1.05)).toHaveLength(23);
    expect(equal).toHaveLength(19);
    expect(secondaryRow).toContain("23 of 24");
    expect(secondaryRow).toContain("19");
  });
});

describe("the two marks painted on the wrong role", () => {
  it("states the avatar's 1.89 and the timeline's 1.036 / 1.014", () => {
    expect(ratio(light.colors.warning, light.colors.card)).toBeCloseTo(1.89, 3);
    expect(ratio(light.colors.muted, light.colors.background)).toBeCloseTo(
      1.036,
      3,
    );
    expect(
      ratio(aeroLight.colors.muted, aeroLight.colors.background),
    ).toBeCloseTo(1.014, 3);

    expect(avatarRow).toContain("**1.89:1**");
    expect(timelineRow).toContain("**1.036:1**");
    expect(timelineRow).toContain("1.014:1");
  });
});

describe("the menu's accent on its own rows", () => {
  it("states both rows' ranges on popover, hover and active", () => {
    const popover = shippedThemes.map(({ theme }) =>
      ratio(theme.colors.accent, theme.colors.popover),
    );
    const hover = shippedThemes.map(({ theme }) =>
      ratio(theme.colors.accent, theme.colors.hover),
    );

    expect(Math.min(...popover)).toBeCloseTo(1.118, 3);
    expect(Math.max(...popover)).toBeCloseTo(1.392, 3);
    expect(Math.min(...hover)).toBeCloseTo(1, 3);
    expect(Math.max(...hover)).toBeCloseTo(1.113, 3);

    expect(menuBarRow).toContain("1.118–1.392:1");
    expect(menuBarRow).toContain("1.000–1.113:1");
    expect(menuCheckRow).toContain("1.11–1.39:1");
    expect(menuCheckRow).toContain("1.00–1.08:1");
  });
});

describe("the Toast countdown's groove", () => {
  it("states the six equal dark sets and the tightest track pair", () => {
    expect(defaultDark).toHaveLength(6);
    defaultDark.forEach(({ theme }) =>
      expect(theme.colors.muted).toBe(theme.colors.popover),
    );

    const measured = shippedThemes.map((shipped) => ({
      name: shipped.theme.name,
      value: ratio(shipped.theme.colors.track, shipped.theme.colors.popover),
    }));
    const tightest = measured.reduce((a, b) => (a.value <= b.value ? a : b));

    expect(tightest.name).toBe("Dark · Windows");
    expect(tightest.value).toBeCloseTo(1.069, 3);
    expect(countdownRow).toContain("**1.000:1**");
    expect(countdownRow).toContain(`${tightest.value.toFixed(3)}:1`);
  });
});

describe("the unchecked control's field fill", () => {
  it("states the white input fill and the five white cards", () => {
    defaultLight.forEach(({ theme }) =>
      expect(theme.colors.input).toBe("#FFFFFF"),
    );
    const whiteCard = defaultLight.filter(
      ({ theme }) => theme.colors.card === "#FFFFFF",
    );

    expect(whiteCard).toHaveLength(5);
    whiteCard.forEach(({ theme }) =>
      expect(ratio(theme.colors.input, theme.colors.card)).toBe(1),
    );
    expect(uncheckedRow).toContain("1.000:1");
    expect(uncheckedRow).toContain("`#FFFFFF`");
  });
});

describe("the native field's own hint", () => {
  it("states the runtime grey's ratio on the light field", () => {
    expect(ratio("#8F8F8F", light.colors.input)).toBeCloseTo(3.234, 3);
    expect(nativeHintRow).toContain("3.23:1");
  });
});
