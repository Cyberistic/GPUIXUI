import { it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  compositeOver,
  contrastRatio,
  dialogSurfacePairs,
  elevationSurfaces,
  selectionPairs,
  selectionPressPairs,
  selectionSoftPairs,
  softPanelTextPairs,
  stateFillSurfacePairs,
} from "./contrast.js";
import { elevationShadow } from "./elevation.js";
import { shippedThemes } from "./shipped-themes.js";

type Entry = (typeof shippedThemes)[number];
type Colors = Entry["theme"]["colors"];

it("probes", () => {
  const lines: Array<string> = [];
  const where = (entry: Entry) =>
    `${entry.source}${"platform" in entry ? `-${entry.platform}` : ""}${"recipe" in entry ? `-${entry.recipe}` : ""} ${entry.theme.mode} ${entry.theme.contrast}`;

  const pairMin = (
    label: string,
    f: keyof Colors,
    b: keyof Colors,
    measure: (colors: Colors) => number,
  ) => {
    let best = { ratio: Number.POSITIVE_INFINITY, where: "" };
    shippedThemes.forEach((entry) => {
      const ratio = measure(entry.theme.colors);
      if (ratio < best.ratio) best = { ratio, where: where(entry) };
    });
    lines.push(`${label}: ${best.ratio.toFixed(4)} at ${best.where}`);
  };
  const plainPair = (f: keyof Colors, b: keyof Colors) => (colors: Colors) =>
    contrastRatio(colors[f], colors[b]);

  lines.push("== plain row pairs (single pair, min across sets) ==");
  pairMin("foreground/selected", "foreground", "selected", plainPair("foreground", "selected"));
  pairMin("popoverForeground/selected", "popoverForeground", "selected", plainPair("popoverForeground", "selected"));
  pairMin("popoverForeground/selectedActive", "popoverForeground", "selectedActive", plainPair("popoverForeground", "selectedActive"));
  pairMin("selectedForeground/active", "selectedForeground", "active", plainPair("selectedForeground", "active"));
  pairMin("selectedForeground/accent", "selectedForeground", "accent", plainPair("selectedForeground", "accent"));
  pairMin("primaryText/selected", "primaryText", "selected", plainPair("primaryText", "selected"));
  pairMin("primaryText/accent", "primaryText", "accent", plainPair("primaryText", "accent"));
  pairMin("primaryText/active", "primaryText", "active", plainPair("primaryText", "active"));

  lines.push("== 5.69 pair list [accent, selected] ==");
  let rowBest = { ratio: Number.POSITIVE_INFINITY, where: "", pair: ["", ""] };
  shippedThemes.forEach((entry) => {
    ([["primaryText", "accent"], ["primaryText", "selected"]] as const).forEach(([f, b]) => {
      const ratio = contrastRatio(entry.theme.colors[f], entry.theme.colors[b]);
      if (ratio < rowBest.ratio) rowBest = { ratio, where: where(entry), pair: [f, b] };
    });
  });
  lines.push(`${rowBest.ratio.toFixed(4)} at ${rowBest.where} ${rowBest.pair.join("/")}`);

  pairMin("softPanel min", "primaryText", "destructiveSoft", (colors) =>
    Math.min(...softPanelTextPairs.map(([f, b]) => contrastRatio(colors[f], colors[b]))),
  );
  lines.push(
    `softPanel list min: ${Math.min(
      ...shippedThemes.map((entry) =>
        Math.min(...softPanelTextPairs.map(([f, b]) => contrastRatio(entry.theme.colors[f], entry.theme.colors[b]))),
      ),
    ).toFixed(4)}`,
  );

  lines.push("== soft pair groups (washed) ==");
  const washed = (f: keyof Colors, b: keyof Colors) => (colors: Colors) =>
    contrastRatio(colors[f], compositeOver(colors.selection, colors[b]));
  pairMin("foreground group", "foreground", "infoSoft", (colors) =>
    Math.min(
      ...selectionSoftPairs
        .filter(([f]) => f === "foreground")
        .map(([f, b]) => washed(f, b)(colors)),
    ),
  );
  pairMin("mutedForeground group", "mutedForeground", "destructiveSoft", (colors) =>
    Math.min(
      ...selectionSoftPairs
        .filter(([f]) => f === "mutedForeground")
        .map(([f, b]) => washed(f, b)(colors)),
    ),
  );

  lines.push("== selectionPairs washed minimum ==");
  let selBest = { ratio: Number.POSITIVE_INFINITY, where: "", pair: ["", ""] };
  shippedThemes.forEach((entry) => {
    selectionPairs.forEach(([f, b]) => {
      const ratio = washed(f, b)(entry.theme.colors);
      if (ratio < selBest.ratio) selBest = { ratio, where: where(entry), pair: [f, b] };
    });
  });
  lines.push(`${selBest.ratio.toFixed(4)} at ${selBest.where} ${selBest.pair.join("/")} (n=${selectionPairs.length})`);

  lines.push("== stateFill input ==");
  let fillBest = { ratio: Number.POSITIVE_INFINITY, where: "", pair: ["", ""] };
  shippedThemes.forEach((entry) => {
    stateFillSurfacePairs
      .filter(([, b]) => b === "input")
      .forEach(([f, b]) => {
        const ratio = contrastRatio(entry.theme.colors[f], entry.theme.colors[b]);
        if (ratio < fillBest.ratio) fillBest = { ratio, where: where(entry), pair: [f, b] };
      });
  });
  lines.push(`${fillBest.ratio.toFixed(4)} at ${fillBest.where} ${fillBest.pair.join("/")}`);

  lines.push("== dialog face (overlay at its own alpha) ==");
  let faceBest = { ratio: Number.POSITIVE_INFINITY, where: "", pair: ["", ""] };
  shippedThemes.forEach((entry) => {
    const colors = entry.theme.colors;
    dialogSurfacePairs.forEach(([f, b]) => {
      const ratio = contrastRatio(colors[f], compositeOver(colors.overlay, colors[b]));
      if (ratio < faceBest.ratio) faceBest = { ratio, where: where(entry), pair: [f, b] };
    });
  });
  lines.push(`${faceBest.ratio.toFixed(4)} at ${faceBest.where} ${faceBest.pair.join("/")} (n=${dialogSurfacePairs.length})`);
  lines.push(
    `dialogSurfacePairs backgrounds: ${dialogSurfacePairs.map(([, b]) => b).join(", ")}`,
  );

  lines.push("== elevation levels ==");
  (["sm", "md", "lg"] as const).forEach((level) => {
    let best = { ratio: Number.POSITIVE_INFINITY, where: "", surface: "" };
    let added = { ratio: Number.POSITIVE_INFINITY, where: "", surface: "" };
    shippedThemes.forEach((entry) => {
      const shadow = elevationShadow(entry.theme, level);
      if (shadow === undefined) return;
      elevationSurfaces.forEach((surface) => {
        const ratio = contrastRatio(
          compositeOver(shadow.color, entry.theme.colors[surface]),
          entry.theme.colors[surface],
        );
        if (ratio < best.ratio) best = { ratio, where: where(entry), surface };
        if ((surface === "selected" || surface === "input") && ratio < added.ratio) {
          added = { ratio, where: where(entry), surface };
        }
      });
    });
    lines.push(
      `${level} all: ${best.ratio.toFixed(4)} at ${best.where} ${best.surface}; added surfaces: ${added.ratio.toFixed(4)} at ${added.where} ${added.surface}`,
    );
  });

  lines.push("== cross ==");
  const identityLight = shippedThemes.find(
    (entry) => entry.source === "identity" && entry.theme.mode === "light" && entry.theme.contrast === "default",
  );
  if (identityLight !== undefined) {
    const border = identityLight.theme.colors.warningSoftBorder;
    lines.push(`identity light warningSoftBorder = ${border}`);
    shippedThemes.forEach((entry) => {
      if (entry.theme.mode !== "light" || entry.theme.contrast !== "default") return;
      lines.push(
        `${where(entry)} active=${contrastRatio(border, entry.theme.colors.active).toFixed(4)} warningSoft=${contrastRatio(border, entry.theme.colors.warningSoft).toFixed(4)}`,
      );
    });
  }

  writeFileSync("/private/tmp/opencode/probe4.txt", lines.join("\n"));
});
