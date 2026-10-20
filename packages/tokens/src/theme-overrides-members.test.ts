/**
 * Guards the defect plan 758 fixes: `themeOverrides` walked the shipped scale
 * indexes, so a brand that widened a scale kept its extra step in the theme
 * while the diff dropped it. `themeFailures` accepted the widened theme and
 * `themeEdit` returned a pair whose replay was the identity — the copy-and-own
 * artifact silently lost a member. The pair is refused now, so nothing is lost
 * without the caller knowing, and an edit inside the declared members still
 * round-trips.
 *
 * Each widened group is built into a variable first: a fresh object literal is
 * excess-property checked, a spread variable is not, so the theme reaches the
 * diff the way a decoded or copied scale does — no cast and no `any`.
 */
import { describe, expect, it } from "vitest";
import {
  avatarSize,
  borderWidth,
  dimensions,
  extendTheme,
  getTheme,
  iconSize,
  lightColors,
  lightTheme,
  radius,
  spacing,
  themeEdit,
  themeFailures,
  themeOverrides,
  typography,
} from "./index.js";

const choice = { mode: "light" } as const;

/** The identity with one scale widened by a member the base does not declare. */
const widened = {
  spacing: (): ReturnType<typeof extendTheme> => {
    const scale = { ...spacing, "6xl": 96 };
    return extendTheme(lightTheme, { spacing: scale });
  },
  radius: (): ReturnType<typeof extendTheme> => {
    const scale = { ...radius, "2xl": 22 };
    return extendTheme(lightTheme, { radius: scale });
  },
  dimensions: (): ReturnType<typeof extendTheme> => {
    const scale = { ...dimensions, chartMinHeight: 240 };
    return extendTheme(lightTheme, { dimensions: scale });
  },
  borderWidth: (): ReturnType<typeof extendTheme> => {
    const scale = { ...borderWidth, hairline: 0.5 };
    return extendTheme(lightTheme, { borderWidth: scale });
  },
  iconSize: (): ReturnType<typeof extendTheme> => {
    const scale = { ...iconSize, xxl: 40 };
    return extendTheme(lightTheme, { iconSize: scale });
  },
  avatarSize: (): ReturnType<typeof extendTheme> => {
    const scale = { ...avatarSize, xl: 56 };
    return extendTheme(lightTheme, { avatarSize: scale });
  },
  colors: (): ReturnType<typeof extendTheme> => {
    const palette = { ...lightColors, chartGrid: "#EEF1F5" };
    return extendTheme(lightTheme, { colors: palette });
  },
  // A member one level down, inside a text role, is the same class.
  typography: (): ReturnType<typeof extendTheme> => {
    const role = { ...typography.body, letterSpacing: 0 };
    return extendTheme(lightTheme, { typography: { body: role } });
  },
};

describe("the edit artifact refuses an undeclared member", () => {
  it("refuses a spacing step the base does not declare", () => {
    const edited = widened.spacing();

    // The checks bless the widened theme, which is what made the loss silent.
    expect(themeFailures(edited)).toEqual([]);
    expect(themeOverrides(lightTheme, edited)).toBeUndefined();
    expect(themeEdit(choice, edited)).toBeUndefined();
  });

  it("refuses an added member in every group a brand can widen", () => {
    Object.values(widened).forEach((build) => {
      expect(themeOverrides(lightTheme, build())).toBeUndefined();
    });
  });

  it("refuses a base that carries a member the theme does not", () => {
    // Replaying `{}` over the widened theme rebuilds it, not the identity.
    expect(themeOverrides(widened.spacing(), lightTheme)).toBeUndefined();
  });

  it("still round-trips an edit inside the declared members", () => {
    const edited = extendTheme(lightTheme, {
      spacing: { md: 9 },
      radius: { md: 7 },
      name: "Narrow edit",
    });
    const overrides = themeOverrides(lightTheme, edited);

    expect(overrides).not.toBeUndefined();
    expect(extendTheme(lightTheme, overrides ?? {})).toEqual(edited);
    expect(themeEdit(choice, edited)).not.toBeUndefined();
  });

  it("keeps the identity diff of a widened theme", () => {
    const edited = widened.spacing();

    // Its own base carries the member, so there is nothing to express.
    expect(themeOverrides(edited, edited)).toEqual({});
    expect(themeOverrides(getTheme("light"), getTheme("light"))).toEqual({});
  });
});
