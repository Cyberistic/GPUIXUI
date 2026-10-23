import {
  platformTypes,
  retroNames,
  retroStyles,
  themes,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  lookFromSearch,
  lookLabel,
  lookOrder,
  lookSearch,
  modeFromSearch,
  modeLabel,
  modeOrder,
  modeSearch,
  parseLook,
  parseMode,
  parsePlatform,
  platformFromSearch,
  platformLabel,
  platformOrder,
  platformSearch,
  previewMode,
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

describe("the palette query parameter", () => {
  it("accepts every mode the library ships and rejects anything else", () => {
    expect(modeOrder.map((mode) => parseMode(mode))).toEqual([...modeOrder]);
    // A mistyped URL must not resolve to a palette the library does not have.
    expect(parseMode("sepia")).toBeUndefined();
    expect(parseMode("Dark")).toBeUndefined();
    expect(parseMode("")).toBeUndefined();
    expect(parseMode(null)).toBeUndefined();
    expect(parseMode(undefined)).toBeUndefined();
  });

  it("offers exactly the modes the library ships, identity first", () => {
    // A mode added to `@gpuixui/tokens` without a switch entry would be a
    // palette a reader cannot see, and a stale entry would offer nothing.
    expect([...modeOrder].toSorted()).toEqual(Object.keys(themes).toSorted());
    expect(modeOrder[0]).toBe(previewMode);
  });

  it("reads the mode out of a query string", () => {
    expect(modeFromSearch("?mode=light")).toBe("light");
    expect(modeFromSearch("?platform=win32&mode=dark")).toBe("dark");
    expect(modeFromSearch("?mode=sepia")).toBeUndefined();
    expect(modeFromSearch("")).toBeUndefined();
  });

  it("writes the mode back as a query parameter", () => {
    expect(modeSearch("light")).toBe("?mode=light");
    // A value written into a URL must survive the round trip.
    expect(modeFromSearch(modeSearch("dark"))).toBe("dark");
  });

  it("labels both palettes the way the switch shows them", () => {
    expect(modeLabel("dark")).toBe("Dark");
    expect(modeLabel("light")).toBe("Light");
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

  it("keeps the base theme every role a component reads", () => {
    const themed = resolvePlatformTheme("win32");

    // A platform variant may change a role's value, never drop the role.
    expect(Object.keys(themed.colors).toSorted()).toEqual(
      Object.keys(themes.dark.colors).toSorted(),
    );
    expect(Object.keys(themed.radius).toSorted()).toEqual(
      Object.keys(themes.dark.radius).toSorted(),
    );
    // The name carries the platform, so a preview can say which one it shows.
    expect(themed.name).toContain(platformTypes.win32.label);
  });

  it("follows the requested mode", () => {
    const light = resolvePlatformTheme("linux", "light");

    expect(light.mode).toBe("light");
    expect(light.typography.mono).toBe(platformTypes.linux.mono);
  });

  it("resolves the platform's own paint, not the docs'", () => {
    // Whatever the library styles per platform — families today, and the
    // palette, radius and density as the platform variants land — the preview
    // reads it from here rather than carrying values of its own.
    const mac = resolvePlatformTheme("darwin");
    const windows = resolvePlatformTheme("win32");

    expect(mac.typography.mono).not.toBe(windows.typography.mono);
    expect(mac.name).not.toBe(windows.name);
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

describe("the authored look", () => {
  it("offers every look the library ships, and the platform's own style", () => {
    // A look added to `@gpuixui/tokens` without a switch entry would be a style
    // a reader cannot see; the list is the library's, not a copy of it.
    expect(lookOrder).toEqual(["native", ...retroNames]);
    expect(lookOrder.map((look) => parseLook(look))).toEqual([...lookOrder]);
  });

  it("rejects a look the library does not ship", () => {
    expect(parseLook("classic")).toBeUndefined();
    expect(parseLook("luna ")).toBeUndefined();
    expect(parseLook(null)).toBeUndefined();
    expect(parseLook(undefined)).toBeUndefined();
  });

  it("reads and writes the look as its own query parameter", () => {
    expect(lookFromSearch("?look=luna")).toBe("luna");
    expect(lookFromSearch("?platform=win32&look=aero")).toBe("aero");
    expect(lookFromSearch("?look=platform")).toBeUndefined();
    expect(lookFromSearch("")).toBeUndefined();
    expect(lookFromSearch(`?look=${lookSearch("aero")}`)).toBe("aero");
  });

  it("labels every look the library ships, with no two sharing a name", () => {
    // The labels are `retroStyles`' own; a look added to the library must reach
    // the page, and two looks that read as one would make a `?look=` link
    // ambiguous. `native` is the switch's own style, not an authored look.
    const labels = lookOrder
      .filter((look) => look !== "native")
      .map((look) => lookLabel(look));

    expect(labels).toEqual(retroNames.map((name) => retroStyles[name].label));
    expect(new Set(labels).size).toBe(retroNames.length);
    expect(labels.filter((label) => label.trim().length === 0)).toEqual([]);
    expect(lookLabel("native")).toBe("Platform");
  });

  it("paints the look's palette, radii and families over the platform", () => {
    const luna = resolvePlatformTheme("darwin", "dark", "luna");

    expect(luna.colors.background).toBe(
      retroStyles.luna.colors.dark.background,
    );
    expect(luna.radius).toEqual(retroStyles.luna.radius);
    expect(luna.typography.mono).toBe(retroStyles.luna.mono);
    expect(luna.name).toContain(retroStyles.luna.label);
  });

  it("keeps the platform's own style when no look is chosen", () => {
    const native = resolvePlatformTheme("win32");

    expect(native.name).toBe(
      resolvePlatformTheme("win32", "dark", "native").name,
    );
    expect(native.name).toContain(platformTypes.win32.label);
    expect(native.name).not.toContain(retroStyles.luna.label);
  });

  it("keeps every role the preview bridge publishes", () => {
    const luna = resolvePlatformTheme("linux", "light", "luna");

    // A bridge iterates the roles; a look that dropped one would paint an
    // unstyled preview without failing anywhere else.
    expect(Object.keys(luna.colors).toSorted()).toEqual(
      Object.keys(themes.light.colors).toSorted(),
    );
    expect(luna.mode).toBe("light");
  });

  it("distinguishes the two looks, so the picker's positions differ", () => {
    const luna = resolvePlatformTheme("default", "dark", "luna");
    const aero = resolvePlatformTheme("default", "dark", "aero");

    expect(luna.colors.background).not.toBe(aero.colors.background);
    expect(luna.name).not.toBe(aero.name);
  });
});
