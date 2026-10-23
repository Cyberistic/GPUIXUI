import type { PlatformName } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  detectLook,
  detectPlatform,
  lookOrder,
  namesOmarchy,
  openingChoice,
  parseLook,
  platformFamily,
  previewMode,
  type PlatformFamily,
  type PlatformSignals,
  type PreviewChoice,
} from "./platform";
import {
  desktopStorageKey,
  lookStorageKey,
  platformStorageKey,
  readDesktopMarker,
  readRememberedChoice,
  type ChoiceStorage,
} from "./platform-storage";

/**
 * Every visitor opened the docs on the same platform: the switch had no
 * detection, so a Windows or Linux reader compared macOS previews until they
 * found the toggle, and the first visit wrote that macOS default into the store.
 * These cases hold the browser's own report, the store that overrides it and
 * the link that overrides both — and the negative controls that keep one rule
 * from swallowing another.
 */

const signals = (userAgent: string, maxTouchPoints = 0): PlatformSignals => ({
  userAgent,
  maxTouchPoints,
});

const iPhone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const iPadDesktop =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const macOS =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const windows10 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const windows11 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";
const ubuntu =
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";
const fedora =
  "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";
const omarchy = `${ubuntu} Omarchy/1.0`;
const android =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const bot = "Mozilla/5.0 (compatible; GPUIxBot/1.0; +https://example.com/bot)";

interface FakeStorage extends ChoiceStorage {
  readonly values: Map<string, string>;
}

const fakeStorage = (
  entries: ReadonlyArray<readonly [string, string]>,
): FakeStorage => {
  const values = new Map(entries);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

const uaTable: Array<[string, PlatformSignals, PlatformFamily, PlatformName]> =
  [
    ["iPhone", signals(iPhone, 5), "ios", "darwin"],
    ["iPad in desktop mode", signals(iPadDesktop, 5), "ios", "darwin"],
    ["macOS", signals(macOS), "macos", "darwin"],
    ["Windows 10", signals(windows10), "windows", "win32"],
    ["Windows 11", signals(windows11), "windows", "win32"],
    ["Ubuntu", signals(ubuntu), "linux", "linux"],
    ["Fedora", signals(fedora), "linux", "linux"],
    ["Omarchy", signals(omarchy), "linux", "linux"],
    ["unknown", signals(bot), "unknown", "darwin"],
  ];

describe("the platform a user agent reports", () => {
  it.each(uaTable)("reads %s", (_name, agent, family, platform) => {
    expect(platformFamily(agent)).toBe(family);
    expect(detectPlatform(agent)).toBe(platform);
  });

  it("opens a user agent it cannot place on macOS rather than guessing", () => {
    // The fallback is explicit: the site's own identity is macOS.
    expect(detectPlatform(signals(""))).toBe("darwin");
    expect(detectPlatform(signals(bot))).toBe("darwin");
  });
});

describe("the rules that would overreach", () => {
  it("does not read an Android tablet as an iPhone", () => {
    // The iOS rule is the three device names, not every agent with `Mobile`.
    expect(platformFamily(signals(android))).toBe("linux");
    expect(detectPlatform(signals(android))).toBe("linux");
  });

  it("keeps a Mac a Mac at one touch point or none", () => {
    // Desktop mode is the same agent with more than one touch; the count, not
    // the Macintosh string, decides.
    expect(platformFamily(signals(iPadDesktop, 0))).toBe("macos");
    expect(platformFamily(signals(iPadDesktop, 1))).toBe("macos");
  });

  it("does not read a Mac as Windows", () => {
    expect(platformFamily(signals(macOS))).toBe("macos");
    expect(detectPlatform(signals(macOS))).toBe("darwin");
  });

  it("does not read an agent without Linux as a Linux desktop", () => {
    expect(platformFamily(signals(bot))).toBe("unknown");
    expect(platformFamily(signals(android))).toBe("linux");
  });

  it("does not read Ubuntu as Omarchy", () => {
    expect(namesOmarchy(ubuntu)).toBe(false);
    expect(detectLook(namesOmarchy(ubuntu))).toBe("native");
  });
});

describe("the Omarchy look", () => {
  it("names only a look the switch offers, and degrades to Linux's own", () => {
    expect(namesOmarchy(omarchy)).toBe(true);
    // Until `retroStyles` ships the look, the Linux platform style is the
    // answer; a name `lookOrder` does not offer must never be returned.
    expect(lookOrder).toContain(detectLook(true));
    expect(detectLook(true)).toBe(parseLook("omarchy") ?? "native");
    expect(detectLook(false)).toBe("native");
  });

  it("lets a stored marker name it where the agent does not", () => {
    const storage = fakeStorage([[desktopStorageKey, "omarchy"]]);

    expect(namesOmarchy(readDesktopMarker(storage))).toBe(true);
    expect(namesOmarchy(readDesktopMarker(fakeStorage([])))).toBe(false);
  });
});

const detected: PreviewChoice = {
  platform: "linux",
  look: "native",
  mode: previewMode,
};

describe("the choice a visit opens with", () => {
  it("fills an empty store from detection", () => {
    expect(readRememberedChoice(fakeStorage([]), detected)).toEqual(detected);
  });

  it("keeps a stored choice over the browser's report", () => {
    const storage = fakeStorage([
      [platformStorageKey, "win32"],
      [lookStorageKey, "aero"],
    ]);

    expect(readRememberedChoice(storage, detected)).toEqual({
      platform: "win32",
      look: "aero",
      mode: previewMode,
    });
    expect(openingChoice("", readRememberedChoice(storage, detected))).toEqual({
      platform: "win32",
      look: "aero",
      mode: previewMode,
    });
  });

  it("lets the URL win over the store and detection", () => {
    const remembered = readRememberedChoice(fakeStorage([]), detected);

    expect(
      openingChoice("?platform=win32&look=luna&mode=light", remembered),
    ).toEqual({ platform: "win32", look: "luna", mode: "light" });
  });

  it("ignores a URL value the switch cannot show", () => {
    // A mistyped or stale link must fall back to the stored choice, not reset
    // it to the browser's report.
    const stored = readRememberedChoice(
      fakeStorage([[platformStorageKey, "win32"]]),
      detected,
    );

    expect(openingChoice("?platform=windows", stored).platform).toBe("win32");
    expect(
      readRememberedChoice(
        fakeStorage([[platformStorageKey, "windows"]]),
        detected,
      ),
    ).toEqual(detected);
  });
});
