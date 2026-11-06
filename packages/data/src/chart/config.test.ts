/**
 * The chart's config: the labels, the icons and the colours, in one table.
 *
 * These cases guard the claims the seam makes:
 *
 * - the config is **decoupled from the data** — one table can be shared by
 *   several charts, and a theme can own the colours;
 * - a chart that names a config **and** a data paints the series the two
 *   make, and the categories the data names;
 * - a chart that names no config keeps the caller's own series, so the
 *   config is an addition rather than a replacement;
 * - a config the parser cannot read is read as **absence**, not as a crash.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  categoriesFromData,
  configColour,
  configEntries,
  configLabel,
  datumNumber,
  seriesFromConfig,
  type ChartConfig,
  type ChartRow,
} from "./config.js";

const config: ChartConfig = {
  desktop: { label: "Desktop", color: "#2563eb" },
  mobile: { label: "Mobile", theme: { light: "#60a5fa", dark: "#a78bfa" } },
};

const data: ReadonlyArray<ChartRow> = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
];

describe("a chart's config", () => {
  it("names the series the config declares, in the config's order", () => {
    const series = seriesFromConfig(config, data);
    expect(Arr.map(series, (one) => one.key)).toEqual(["desktop", "mobile"]);
    expect(Arr.map(series, (one) => one.label)).toEqual(["Desktop", "Mobile"]);
  });

  it("reads each series' numbers by the key the config names", () => {
    const series = seriesFromConfig(config, data);
    expect(series[0]?.values).toEqual([186, 305, 237]);
    expect(series[1]?.values).toEqual([80, 200, 120]);
  });

  it("names the categories the data carries", () => {
    expect(categoriesFromData(data)).toEqual(["January", "February", "March"]);
  });

  it("reads a value the data does not carry as zero, not as a hole", () => {
    // A series with no numbers yet keeps its slot — the legend still names it.
    const series = seriesFromConfig({ visitors: {} }, [{ month: "January" }]);
    expect(series[0]?.values).toEqual([0]);
  });

  it("reads a field that is not a number as no value", () => {
    expect(
      Option.isNone(
        datumNumber({ month: "January", desktop: "many" }, "desktop"),
      ),
    ).toBe(true);
    expect(
      Option.getOrElse(datumNumber({ desktop: 12 }, "desktop"), () => 0),
    ).toBe(12);
  });

  it("reads a series' colour in the mode asked for", () => {
    expect(
      Option.getOrElse(configColour(config["desktop"], "light"), () => ""),
    ).toBe("#2563eb");
    // The per-mode table wins where it names the mode.
    expect(
      Option.getOrElse(configColour(config["mobile"], "light"), () => ""),
    ).toBe("#60a5fa");
    expect(
      Option.getOrElse(configColour(config["mobile"], "dark"), () => ""),
    ).toBe("#a78bfa");
  });

  it("reads a blank label as the key the series is stored by", () => {
    // A label is content before it is a literal: a table missing its row
    // answers "", and a saved chart can restore a series with no words.
    expect(configLabel("revenue", { label: "  " })).toBe("revenue");
    expect(configLabel("revenue", undefined)).toBe("revenue");
    expect(configLabel("revenue", { label: "Revenue" })).toBe("Revenue");
  });

  it("reads a blank colour as no colour", () => {
    // A blank is absence: a colour the runtime would drop is not a colour.
    expect(Option.isNone(configColour({ color: "   " }, "light"))).toBe(true);
    expect(Option.isNone(configColour({}, "light"))).toBe(true);
  });

  it("reads a table with a hole as an entry with no words", () => {
    // A table a store wrote can carry a hole: the key is there and the entry
    // is not. The key still names the series.
    const hole: ChartConfig = { desktop: { label: "Desktop" } };
    const entries = configEntries({ ...hole, mobile: undefined });
    expect(Arr.map(entries, ([key]) => key)).toEqual(["desktop", "mobile"]);
    expect(entries[1]?.[1].label).toBeUndefined();
  });

  it("names no series for a table that names none", () => {
    expect(seriesFromConfig(undefined, data)).toEqual([]);
    expect(seriesFromConfig({}, data)).toEqual([]);
  });
});
