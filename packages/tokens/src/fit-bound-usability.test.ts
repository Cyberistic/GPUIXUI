/**
 * Guards the defect plan 641 fixes: `themeMetricFailures` compared
 * `iconSize.xs`/`sm` with a line height and `avatarSize.xs` with
 * `density.rowHeight` without asking whether that bound was a usable size. A
 * shipped-light theme with `caption.lineHeight: -1` (or `0`), `label.lineHeight:
 * -1` or `density.rowHeight: -1` reported the correct icon or avatar as an
 * `at-most` failure as well as the broken line or row, sending a consumer to
 * change a value that was already right. The three fits now read their bound
 * through `usableBound`, so only a usable line or row can judge the mark.
 */
import { describe, expect, it } from "vitest";
import {
  themeFailures,
  themeMetricFailures,
  type MetricFailure,
} from "./index.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";

const groupFailures = (theme: Theme, group: MetricFailure["group"]) =>
  themeMetricFailures(theme).filter((failure) => failure.group === group);

const atMost = (
  group: MetricFailure["group"],
  member: string,
  actual: number,
  bound: number,
): MetricFailure => ({ group, member, rule: "at-most", actual, bound });

describe("an unusable fit bound", () => {
  it("does not blame the caption icon for a negative caption line", () => {
    const clipped = extendTheme(getTheme("light"), {
      typography: { caption: { lineHeight: -1 } },
    });

    expect(groupFailures(clipped, "iconSize")).toEqual([]);
    expect(themeMetricFailures(clipped)).toEqual([
      {
        group: "typography",
        member: "caption.lineHeight",
        rule: "at-least",
        actual: -1,
        bound: 12,
      },
    ]);
  });

  it("does not blame the caption icon for a zero caption line", () => {
    const clipped = extendTheme(getTheme("light"), {
      typography: { caption: { lineHeight: 0 } },
    });

    expect(groupFailures(clipped, "iconSize")).toEqual([]);
    expect(themeMetricFailures(clipped)).toEqual([
      {
        group: "typography",
        member: "caption.lineHeight",
        rule: "at-least",
        actual: 0,
        bound: 12,
      },
    ]);
  });

  it("does not blame the label icon for a negative label line", () => {
    const clipped = extendTheme(getTheme("light"), {
      typography: { label: { lineHeight: -1 } },
    });

    expect(groupFailures(clipped, "iconSize")).toEqual([]);
    expect(themeMetricFailures(clipped)).toEqual([
      {
        group: "typography",
        member: "label.lineHeight",
        rule: "at-least",
        actual: -1,
        bound: 13,
      },
    ]);
  });

  it("does not blame the inline avatar for a negative row", () => {
    const cramped = extendTheme(getTheme("light"), {
      density: { rowHeight: -1 },
    });

    expect(groupFailures(cramped, "avatarSize")).toEqual([]);
    expect(groupFailures(cramped, "density")).toContainEqual({
      group: "density",
      member: "rowHeight",
      rule: "positive",
      actual: -1,
      bound: 0,
    });
  });

  it("does not blame the inline avatar for a zero row", () => {
    const cramped = extendTheme(getTheme("light"), {
      density: { rowHeight: 0 },
    });

    expect(groupFailures(cramped, "avatarSize")).toEqual([]);
    expect(groupFailures(cramped, "density")).toContainEqual({
      group: "density",
      member: "rowHeight",
      rule: "positive",
      actual: 0,
      bound: 0,
    });
  });

  it("still reports a real overflow against a usable line", () => {
    const cramped = extendTheme(getTheme("light"), {
      typography: { caption: { fontSize: 9, lineHeight: 10 } },
    });

    expect(groupFailures(cramped, "iconSize")).toEqual([
      atMost("iconSize", "xs", 12, 10),
    ]);
  });

  it("still reports a real overflow against a usable row", () => {
    const cramped = extendTheme(getTheme("light"), {
      avatarSize: { xs: 40, sm: 44, md: 48, lg: 52 },
    });

    expect(groupFailures(cramped, "avatarSize")).toEqual([
      atMost("avatarSize", "xs", 40, 32),
    ]);
  });

  it("carries the same result through the composed check", () => {
    const clipped = extendTheme(getTheme("light"), {
      typography: { caption: { lineHeight: -1 } },
    });
    const metricKinds = themeFailures(clipped).filter(
      (failure) => failure.kind === "metric",
    );

    expect(metricKinds).toHaveLength(1);
    expect(metricKinds[0]).toMatchObject({
      kind: "metric",
      group: "typography",
      member: "caption.lineHeight",
    });

    const cramped = extendTheme(getTheme("light"), {
      density: { rowHeight: -1 },
    });
    const avatarMetrics = themeFailures(cramped).filter(
      (failure) => failure.kind === "metric" && failure.group === "avatarSize",
    );
    expect(avatarMetrics).toEqual([]);
  });

  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });
});
