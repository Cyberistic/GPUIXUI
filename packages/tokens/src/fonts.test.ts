/**
 * Guards plan 052: the library had no way to install a typeface in the native
 * runtime, so a theme could only name a family the OS already had. The failure
 * this suite is written against is re-registration — an application mounts,
 * calls `registerFonts`, remounts and calls it again, and the runtime re-adds
 * the family (GPUix allows it, so nothing complains while the font list grows) —
 * and a rejected file being remembered as installed, which would make a fixed
 * file look broken for the rest of the session.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { registerFonts, type FontRegistrar, type FontSource } from "./fonts.js";
import { textStyle } from "./styles.js";
import { extendTheme, lightTheme } from "./theme.js";

/**
 * The places a consumer learns how to install a face. `node:fs` is deliberate,
 * as in `docs.test.ts`: this checks the repository's own prose, and the package
 * keeps zero runtime dependencies.
 */
const sourceFiles = {
  "src/fonts.ts": readFileSync(new URL("./fonts.ts", import.meta.url), "utf8"),
  "docs/tokens.md": readFileSync(
    new URL("../../../docs/tokens.md", import.meta.url),
    "utf8",
  ),
  "README.md": readFileSync(new URL("../README.md", import.meta.url), "utf8"),
} as const;

/**
 * The design-system inventory states the same capability in one table row. It
 * is read on its own so a deleted row fails the presence check below rather
 * than quietly shrinking the prose sweep.
 */
const inventorySurface = (): Record<string, string> => {
  const file = readFileSync(
    new URL("../../../COMPONENTS.md", import.meta.url),
    "utf8",
  );
  const row = file
    .split("\n")
    .find((line) => line.startsWith("| Custom fonts |"));
  return row === undefined ? {} : { "COMPONENTS.md": row };
};

const surfaces = (): Record<string, string> => ({
  ...sourceFiles,
  ...inventorySurface(),
});

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

  it("names one family once when a family ships several files", () => {
    const { calls, registrar } = recordingRegistrar();
    const bold: FontSource = {
      family: "Inter",
      data: new Uint8Array([8, 9]),
    };
    expect(registerFonts(registrar, [inter, bold])).toEqual(["Inter"]);
    expect(calls).toHaveLength(2);
  });
});

/**
 * Guards the registration-order contract and its measured second half.
 *
 * The bug this holds: `fonts.ts` and both docs told consumers that "rendering
 * before registration is fine — GPUix re-shapes text that already named the
 * family", so the library was teaching the one order that paints a fallback
 * frame. The first correction then over-corrected the other way: all four
 * surfaces said a late install "does not re-shape that text" / "leaves the
 * fallback on screen", and the playground's `font-registration-late` probe
 * measured the opposite (44px → 81px on the next layout). Both absolutes are
 * wrong, so a surface fails here for the original advice or for claiming the
 * fallback is permanent.
 */
describe("registration order", () => {
  /** The retracted advice, in the words each surface used. */
  const retracted = [
    "re-shapes text",
    "does not re-shape",
    "Rendering before registration is fine",
    "before or after the first render",
    "leaves the fallback on screen",
    "stay the fallback",
  ];

  it("records the capability in the inventory", () => {
    expect(Object.keys(inventorySurface())).toEqual(["COMPONENTS.md"]);
  });

  it("no longer promises that text is re-shaped after registration", () => {
    const offenders = Object.entries(surfaces()).flatMap(([name, text]) =>
      retracted
        .filter((claim) => text.includes(claim))
        .map((claim) => `${name}: "${claim}"`),
    );

    expect(offenders).toEqual([]);
  });

  it("states the order in every place a consumer reads it", () => {
    const silent = Object.entries(surfaces())
      .filter(([, text]) => !text.includes("first laid out"))
      .map(([name]) => name);

    expect(silent).toEqual([]);
  });

  it("names the repaint, so a late install is not described as permanent loss", () => {
    const silent = Object.entries(surfaces())
      .filter(([, text]) => !text.includes("next layout"))
      .map(([name]) => name);

    expect(silent).toEqual([]);
  });

  it("cites the measured widths rather than asserting the repaint", () => {
    const silent = Object.entries(surfaces())
      .filter(([, text]) => !(text.includes("44px") && text.includes("81px")))
      .map(([name]) => name);

    expect(silent).toEqual([]);
  });

  it("keeps the recommended order, because the first frame is the fallback", () => {
    const unclear = Object.entries(surfaces())
      .filter(
        ([, text]) => !text.toLowerCase().includes("register, then render"),
      )
      .map(([name]) => name);

    expect(unclear).toEqual([]);
  });

  it("shows registration before the first render in the README", () => {
    const fonts = surfaces()["README.md"] ?? "";
    const section = fonts.slice(
      fonts.indexOf("## Fonts"),
      fonts.indexOf("\n## ", fonts.indexOf("## Fonts") + 1),
    );
    // The snippet, not the prose: the intro names `registerFonts(` too.
    const opening = section.indexOf("```tsx");
    const snippet = section.slice(opening, section.indexOf("```", opening + 6));

    expect(section).not.toContain("useEffect");
    expect(snippet.indexOf("registerFonts(")).toBeLessThan(
      snippet.indexOf("render(<App"),
    );
  });
});
