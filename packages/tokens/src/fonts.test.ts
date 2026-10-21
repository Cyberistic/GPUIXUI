/**
 * Guards plan 052: the library had no way to install a typeface in the native
 * runtime, so a theme could only name a family the OS already had. The failure
 * this suite is written against is re-registration — an application mounts,
 * calls `registerFonts`, remounts and calls it again, and the runtime re-adds
 * the family (GPUix allows it, so nothing complains while the font list grows) —
 * and a rejected file being remembered as installed, which would make a fixed
 * file look broken for the rest of the session.
 */
import { describe, expect, it } from "vitest";
import { registerFonts, type FontRegistrar, type FontSource } from "./fonts.js";
import { textStyle } from "./styles.js";
import { extendTheme, lightTheme } from "./theme.js";

/** A renderer that records the bytes it was handed. */
const recordingRegistrar = () => {
  const calls: Uint8Array[] = [];
  const registrar: FontRegistrar = {
    registerFont: (data) => {
      calls.push(data);
    },
  };
  return { calls, registrar };
};

const inter: FontSource = {
  family: "Inter",
  data: new Uint8Array([0, 1, 2, 3]),
};

const jetBrainsMono: FontSource = {
  family: "JetBrains Mono",
  data: new Uint8Array([4, 5, 6, 7]),
};

describe("registerFonts", () => {
  it("installs every file and names the families a theme may use", () => {
    const { calls, registrar } = recordingRegistrar();
    const families = registerFonts(registrar, [inter, jetBrainsMono]);
    expect(calls).toHaveLength(2);
    expect(families).toEqual(["Inter", "JetBrains Mono"]);
  });

  it("installs a file once across calls, and still names it", () => {
    const { calls, registrar } = recordingRegistrar();
    registerFonts(registrar, [inter]);
    const families = registerFonts(registrar, [inter, jetBrainsMono]);
    expect(calls).toHaveLength(2);
    expect(families).toEqual(["Inter", "JetBrains Mono"]);
  });

  it("installs a file listed twice in one call once", () => {
    const { calls, registrar } = recordingRegistrar();
    const families = registerFonts(registrar, [inter, inter]);
    expect(calls).toHaveLength(1);
    expect(families).toEqual(["Inter"]);
  });

  it("keeps the registry per renderer", () => {
    const first = recordingRegistrar();
    const second = recordingRegistrar();
    registerFonts(first.registrar, [inter]);
    registerFonts(second.registrar, [inter]);
    expect(first.calls).toHaveLength(1);
    expect(second.calls).toHaveLength(1);
  });

  it("does not remember a file the runtime rejected", () => {
    let attempts = 0;
    const strict: FontRegistrar = {
      registerFont: () => {
        attempts += 1;
        if (attempts === 1) {
          // The runtime's own throw, not this package's: GPUix rejects a font
          // with no usable name table, and the boundary must not cache that.
          throw new Error("font has no name table");
        }
      },
    };
    expect(() => registerFonts(strict, [inter])).toThrow("no name table");
    expect(registerFonts(strict, [inter])).toEqual(["Inter"]);
    expect(attempts).toBe(2);
  });

  it("lets a registered face win over the platform default", () => {
    const theme = extendTheme(lightTheme, {
      typography: { sans: inter.family },
    });
    expect(textStyle(theme, "body").fontFamily).toBe("Inter");
    expect(textStyle(lightTheme, "body").fontFamily).not.toBe("Inter");
  });
});
