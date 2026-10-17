/**
 * Guards the gap plan 052 leaves: `packages/tokens` names families in
 * `typography`, but nothing handed a font file to GPUix, so an application
 * could only ever use a face the operating system already installed. The
 * registry also guards the failure a render-time call invites — the runtime
 * accepts the same file twice, so without a per-renderer record every re-render
 * would push every file into the process again.
 */

import { describe, expect, it } from "vitest";
import { brandFontTheme } from "./fonts.example.js";
import { registerFonts, type FontRegistrar } from "./fonts.js";
import { systemMonoFamily } from "./platforms.js";
import { textStyle } from "./styles.js";
import { extendTheme, lightTheme } from "./theme.js";

interface Recorder extends FontRegistrar {
  readonly calls: ReadonlyArray<Uint8Array>;
  failNext(): void;
}

const recorder = (): Recorder => {
  let failing = false;
  const calls: Uint8Array[] = [];
  return {
    calls,
    failNext: () => {
      failing = true;
    },
    // The renderer throws on bytes it cannot use; the fake reproduces that
    // boundary so the registry can be tested without a native runtime.
    registerFont: (data) => {
      if (failing) {
        failing = false;
        throw new Error("not a TrueType font");
      }
      calls.push(data);
    },
  };
};

const bytes = (seed: number): Uint8Array => new Uint8Array([seed, 0, 1, 2]);

describe("registerFonts", () => {
  it("registers a file once per renderer", () => {
    const registrar = recorder();
    const inter = bytes(1);
    const typefaces = { sans: { family: "Inter", files: [inter] } };

    registerFonts(registrar, typefaces);
    registerFonts(registrar, typefaces);

    expect(registrar.calls).toHaveLength(1);
  });

  it("registers shared bytes once, whichever role names them", () => {
    const registrar = recorder();
    const shared = bytes(2);

    registerFonts(registrar, {
      sans: { family: "Inter", files: [shared] },
      mono: { family: "Mono", files: [shared] },
    });

    expect(registrar.calls).toHaveLength(1);
    expect(registrar.calls[0]).toBe(shared);
  });

  it("gives a second renderer the same file", () => {
    const first = recorder();
    const second = recorder();
    const inter = bytes(3);
    const typefaces = { sans: { family: "Inter", files: [inter] } };

    registerFonts(first, typefaces);
    registerFonts(second, typefaces);

    expect(first.calls).toHaveLength(1);
    expect(second.calls).toHaveLength(1);
  });

  it("does not record a file the runtime rejected, so a retry can register it", () => {
    const registrar = recorder();
    const inter = bytes(4);
    const typefaces = { sans: { family: "Inter", files: [inter] } };
    registrar.failNext();

    expect(() => registerFonts(registrar, typefaces)).toThrow(
      "not a TrueType font",
    );
    registerFonts(registrar, typefaces);

    expect(registrar.calls).toHaveLength(1);
    expect(registrar.calls[0]).toBe(inter);
  });

  it("returns the family names a theme should use", () => {
    const fonts = registerFonts(recorder(), {
      sans: { family: "Inter", files: [bytes(5)] },
      mono: { family: "JetBrains Mono", files: [bytes(6)] },
    });

    expect(fonts).toEqual({
      sans: "Inter",
      mono: "JetBrains Mono",
    });
  });

  it("leaves a role the application did not bring to the base theme", () => {
    const fonts = registerFonts(recorder(), {
      sans: { family: "Inter", files: [bytes(7)] },
    });
    const themed = extendTheme(lightTheme, { typography: fonts });

    expect(fonts.mono).toBeUndefined();
    expect(themed.typography.mono).toBe(systemMonoFamily);
    expect(themed.typography.sans).toBe("Inter");
  });

  it("lets a consumer's face win over the platform default, without touching the rest", () => {
    const registrar = recorder();
    const typefaces = {
      sans: { family: "Inter", files: [bytes(8), bytes(9)] },
    };

    const themed = brandFontTheme(registrar, typefaces, lightTheme);
    brandFontTheme(registrar, typefaces, lightTheme);

    expect(textStyle(themed, "body").fontFamily).toBe("Inter");
    expect(textStyle(themed, "code").fontFamily).toBe(systemMonoFamily);
    expect(themed.colors).toEqual(lightTheme.colors);
    expect(themed.typography.body).toEqual(lightTheme.typography.body);
    expect(registrar.calls).toHaveLength(2);
  });
});
