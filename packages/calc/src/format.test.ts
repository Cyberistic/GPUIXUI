import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { formatDecimal, formatValue } from "./format.js";
import { defaultSetup, type Setup } from "./setup.js";
import { complex, exact, real } from "./value.js";

const setup = (overrides: Partial<Setup> = {}): Setup => ({
  ...defaultSetup,
  ...overrides,
});

const text = (value: number, overrides: Partial<Setup> = {}): string =>
  formatValue(real(value), setup({ display: "LineIO", ...overrides })).text;

describe("display formatting", () => {
  it("follows Norm 1 and Norm 2 exponential thresholds", () => {
    expect(text(1 / 200, { number: { kind: "Norm1", digits: 0 } })).toBe(
      "5×10⁻³",
    );
    expect(text(1 / 200, { number: { kind: "Norm2", digits: 0 } })).toBe(
      "0.005",
    );
    expect(text(0.005, { number: { kind: "Norm1", digits: 0 } })).toBe(
      "5×10⁻³",
    );
  });

  it("rounds to the Fix digits", () => {
    expect(text(100 / 7, { number: { kind: "Fix", digits: 3 } })).toBe(
      "14.286",
    );
    expect(text(100 / 7, { number: { kind: "Fix", digits: 2 } })).toBe("14.29");
  });

  it("rounds to the Sci significant digits", () => {
    expect(text(1 / 7, { number: { kind: "Sci", digits: 5 } })).toBe(
      "1.4286×10⁻¹",
    );
    expect(text(1 / 7, { number: { kind: "Sci", digits: 4 } })).toBe(
      "1.429×10⁻¹",
    );
  });

  it("shows an exact fraction and offers the decimal alternate", () => {
    const formatted = formatValue(exact(1, 3), setup());
    expect(formatted.text).toBe("1/3");
    expect(Option.getOrElse(formatted.alternate, () => "")).toBe(
      "0.3333333333",
    );
  });

  it("shows a mixed fraction when the setup asks", () => {
    expect(formatValue(exact(7, 2), setup({ fraction: "mixed" })).text).toBe(
      "3⌐1/2",
    );
  });

  it("keeps a π form in Natural Display and the decimal in LineIO", () => {
    expect(text(Math.PI / 6, { display: "MthIO-MathO" })).toBe("π/6");
    expect(text(Math.PI / 6, { display: "LineIO" })).toBe("0.5235987756");
  });

  it("keeps a single radical form", () => {
    expect(text(Math.sqrt(2), { display: "MthIO-MathO" })).toBe("√2");
    expect(text(2 * Math.sqrt(3), { display: "MthIO-MathO" })).toBe("2√3");
  });

  it("paints sexagesimal results", () => {
    expect(
      formatValue(
        { _tag: "real", value: 2.255, exact: Option.none(), sexagesimal: true },
        setup(),
      ).text,
    ).toBe("2°15′18″");
  });

  it("paints complex numbers in both formats", () => {
    expect(formatValue(complex(3, -1), setup()).text).toBe("3-1i");
    expect(
      formatValue(complex(2, 2), setup({ complexFormat: "r∠θ", angle: "Deg" }))
        .text,
    ).toBe("2.828427125∠45");
  });

  it("pads BASE-N results as the manual does", () => {
    expect(
      formatValue({ _tag: "base", value: 555, base: 16 }, setup()).text,
    ).toBe("0000022B");
    expect(
      formatValue({ _tag: "base", value: 555, base: 2 }, setup()).text,
    ).toBe("0000001000101011");
  });

  it("uses a comma decimal point when configured", () => {
    expect(formatDecimal(1.5, setup({ decimalPoint: "," }))).toBe("1,5");
  });
});
