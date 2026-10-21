import { platformTypes, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  parsePlatform,
  platformFromSearch,
  platformLabel,
  platformOrder,
  platformSearch,
  resolvePlatformTheme,
} from "./platform";

describe("the platform query parameter", () => {
  it("accepts every platform the library names and rejects anything else", () => {
    expect(platformOrder.map((platform) => parsePlatform(platform))).toEqual([
      ...platformOrder,
    ]);

    // A mistyped URL must not resolve to a platform the library does not have.
    expect(parsePlatform("windows")).toBeUndefined();
    expect(parsePlatform("darwin ")).toBeUndefined();
    expect(parsePlatform("")).toBeUndefined();
    expect(parsePlatform(null)).toBeUndefined();
    expect(parsePlatform(undefined)).toBeUndefined();
  });

  it("offers exactly the platforms the library names, so none is unreachable", () => {
    // A platform added to `@gpuixui/tokens` without a switch entry would be a
    // look a reader cannot see.
    expect(Object.keys(platformTypes).toSorted()).toEqual(
      [...platformOrder].toSorted(),
    );
  });

  it("reads the platform out of a query string", () => {
    expect(platformFromSearch("?platform=win32")).toBe("win32");
    expect(platformFromSearch("?theme=dark&platform=linux")).toBe("linux");
    expect(platformFromSearch("?platform=nope")).toBeUndefined();
    expect(platformFromSearch("")).toBeUndefined();
  });

  it("writes the platform back as a query parameter", () => {
    expect(platformSearch("darwin")).toBe("?platform=darwin");
    // A value written into a URL must survive the round trip.
    expect(platformFromSearch(platformSearch("linux"))).toBe("linux");
  });
});

describe("the platform theme", () => {
  it("takes the platform's monospace family from the library", () => {
    expect(resolvePlatformTheme("darwin").typography.mono).toBe(
      platformTypes.darwin.mono,
    );
    expect(resolvePlatformTheme("linux").typography.mono).toBe(
      platformTypes.linux.mono,
    );
    expect(resolvePlatformTheme("win32").typography.mono).toBe(
      platformTypes.win32.mono,
    );
  });

  it("keeps the base theme's colours, scales and density", () => {
    const themed = resolvePlatformTheme("win32");

    expect(themed.colors).toEqual(themes.dark.colors);
    expect(themed.density).toEqual(themes.dark.density);
    expect(themed.radius).toEqual(themes.dark.radius);
    // The name carries the platform, so a preview can say which one it shows.
    expect(themed.name).toContain(platformTypes.win32.label);
  });

  it("follows the requested mode", () => {
    const light = resolvePlatformTheme("linux", "light");

    expect(light.colors).toEqual(themes.light.colors);
    expect(light.mode).toBe("light");
    expect(light.typography.mono).toBe(platformTypes.linux.mono);
  });

  it("labels the platforms the way the library does", () => {
    expect(platformLabel("darwin")).toBe("macOS");
    expect(platformLabel("win32")).toBe("Windows");
    expect(platformLabel("default")).toBe("Default");
  });

  it("names every platform, so the switch always repaints", () => {
    const names = platformOrder.map(
      (platform) => resolvePlatformTheme(platform).name,
    );

    // A shared name would make two switch positions indistinguishable.
    expect(new Set(names).size).toBe(platformOrder.length);
    expect(names[0]).toContain(platformLabel("darwin"));
    expect(names[2]).toContain(platformLabel("win32"));
  });
});
