import { describe, expect, it } from "vitest";
import { platformTypes } from "@gpuixui/tokens";
import {
  applyPlatformToSearch,
  isPlatformName,
  PLATFORM_PARAM,
  platformFromParams,
  platformNames,
  resolvePlatform,
  storedPlatform,
} from "./platform";

/**
 * Guards plan 420's state contract. The failure that matters is a platform
 * choice that leaks between the URL, storage and the default: a shared link
 * that renders the sender's remembered theme, or a `default` choice that
 * pollutes every canonical URL. Every helper here is pure, so the tests cannot
 * pass by accident of a browser environment.
 */
const params = (search: string): URLSearchParams => new URLSearchParams(search);

describe("platformNames", () => {
  it("offers exactly the platforms the token package defines", () => {
    expect(platformNames).toHaveLength(4);
    expect(
      platformNames.every((name) => platformTypes[name].label.length > 0),
    ).toBe(true);
  });

  it("rejects anything the package does not define", () => {
    expect(isPlatformName("win32")).toBe(true);
    expect(isPlatformName("macos")).toBe(false);
    expect(isPlatformName(null)).toBe(false);
  });
});

describe("platformFromParams", () => {
  it("reads a valid platform from the query string", () => {
    expect(platformFromParams(params("?platform=win32"))).toBe("win32");
  });

  it("treats an unknown platform as no choice", () => {
    expect(platformFromParams(params("?platform=macos"))).toBeUndefined();
    expect(platformFromParams(params(""))).toBeUndefined();
  });
});

describe("storedPlatform", () => {
  it("accepts a stored platform and ignores corrupt values", () => {
    expect(storedPlatform("linux")).toBe("linux");
    expect(storedPlatform("Darwin")).toBeUndefined();
    expect(storedPlatform(null)).toBeUndefined();
  });
});

describe("resolvePlatform", () => {
  it("lets a shared URL beat stale storage", () => {
    expect(resolvePlatform("linux", "win32")).toBe("linux");
  });

  it("falls back to storage, then to the default", () => {
    expect(resolvePlatform(undefined, "win32")).toBe("win32");
    expect(resolvePlatform(undefined, undefined)).toBe("default");
  });
});

describe("applyPlatformToSearch", () => {
  it("sets the parameter and keeps unrelated state", () => {
    expect(applyPlatformToSearch("?foo=1", "win32")).toBe(
      `?foo=1&${PLATFORM_PARAM}=win32`,
    );
  });

  it("replaces an existing choice", () => {
    expect(applyPlatformToSearch("?platform=linux", "win32")).toBe(
      "?platform=win32",
    );
  });

  it("removes the parameter for the default theme", () => {
    expect(applyPlatformToSearch("?platform=linux", "default")).toBe("");
    expect(applyPlatformToSearch("?foo=1&platform=linux", "default")).toBe(
      "?foo=1",
    );
  });
});
