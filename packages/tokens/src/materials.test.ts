import { describe, expect, it } from "vitest";
import {
  darkTheme,
  extendTheme,
  lightTheme,
  materialFallback,
  materialFill,
  materialNames,
  platformTheme,
  platformNames,
  retroTheme,
  themeOverrides,
} from "./index.js";

const mac = platformTheme(lightTheme, "darwin");

describe("materialFill", () => {
  it("paints darwin's translucent sidebar in its blurred window", () => {
    expect(mac.window).toBe("blurred");
    expect(materialFill(mac, "sidebar")).toBe("#E9E9EF99");
    expect(materialFill(platformTheme(darkTheme, "darwin"), "hud")).toBe(
      "#1C1C1EB3",
    );
  });

  it("paints every fallback in an opaque window", () => {
    const opaque = extendTheme(mac, { window: "opaque" });
    expect(materialNames.map((name) => materialFill(opaque, name))).toEqual(
      materialNames.map((name) => opaque.colors[materialFallback[name]]),
    );
  });

  it("paints every fallback when the reader asks for less transparency", () => {
    const reduced = extendTheme(mac, { reduceTransparency: true });
    expect(materialFill(reduced, "sidebar")).toBe(mac.colors.muted);
    expect(materialFill(reduced, "sheet")).toBe(mac.colors.card);
  });

  it("leaves every other platform and look on today's opaque roles", () => {
    const others = [
      ...platformNames
        .filter((name) => name !== "darwin")
        .map((name) => platformTheme(darkTheme, name)),
      lightTheme,
      retroTheme(platformTheme(lightTheme, "darwin"), "luna"),
    ];
    expect(
      others.flatMap((theme) =>
        materialNames
          .filter(
            (name) =>
              materialFill(theme, name) !==
              theme.colors[materialFallback[name]],
          )
          .map((name) => `${theme.name}: ${name}`),
      ),
    ).toEqual([]);
  });

  it("round-trips a material edit through themeOverrides", () => {
    const edited = extendTheme(mac, { materials: { sidebar: "#00000040" } });
    expect(themeOverrides(edited, mac)).toEqual({
      materials: { sidebar: "#00000040" },
    });
  });
});
