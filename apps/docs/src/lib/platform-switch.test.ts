import { readFileSync } from "node:fs";
import { platformNames, platformTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  expectedHeight,
  parseSurface,
  platformGroup,
  steps,
} from "../../scripts/platform-switch-probe";

/**
 * The platform switch is the mission's reading test — "a reader toggles macOS
 * -> Windows and every preview changes" — and both halves need holding. The
 * **state** half is `platform.test.ts` (the query parameter, the order, the
 * labels and the storage); the **press** half is React in a browser, which a
 * server-rendered `?platform=` capture does not prove.
 * `apps/docs/scripts/platform-switch-probe.ts` presses the group on a hydrated
 * page and reads each surface's platform, its control height and the URL; this
 * file holds the probe, the switch markup and the policy together.
 */

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const probe = read("apps/docs/scripts/platform-switch-probe.ts");
const toggle = read("apps/docs/src/components/docs/platform-toggle.tsx");
const policy = read("docs/preview-strategy.md");

describe("the platform switch's readout", () => {
  it("reads the four fields the probe asserts on", () => {
    expect(parseSurface("win32|dark|32px|?platform=win32")).toEqual({
      platform: "win32",
      mode: "dark",
      height: "32px",
      search: "?platform=win32",
    });
  });

  it("refuses a truncated readout instead of guessing a field", () => {
    expect(parseSurface("win32|dark|32px")).toBeUndefined();
    expect(parseSurface("")).toBeUndefined();
  });

  it("derives the height from the platform theme, not a literal", () => {
    // The mission names two steps a reader can compare; the library's density
    // is why they differ, and a geometry edit must move the probe with it.
    expect(expectedHeight("dark", "darwin")).toBe("28px");
    expect(expectedHeight("dark", "win32")).toBe("32px");
    expect(expectedHeight("dark", "linux")).toBe("36px");
    expect(expectedHeight("dark", "darwin")).toBe(
      `${platformTheme(themes.dark, "darwin").density.controlHeight.md}px`,
    );
    expect(probe.match(/#[0-9a-fA-F]{6}/g) ?? []).toEqual([]);
  });

  it("presses the two platforms the acceptance names, in order", () => {
    expect(steps.map((step) => step.label)).toEqual(["Windows", "macOS"]);
    expect(steps.map((step) => step.platform)).toEqual(["win32", "darwin"]);
    expect(steps.map((step) => step.query)).toEqual([
      "platform=win32",
      "platform=darwin",
    ]);
    expect(platformNames).toContain(steps[0]?.platform);
    expect(platformNames).toContain(steps[1]?.platform);
  });
});

describe("the switch's press path", () => {
  it("names the group the markup renders", () => {
    expect(platformGroup).toBe("Platform style");
    expect(toggle).toContain('label="Platform style"');
    expect(probe).toContain("__reactProps");
    expect(probe).toContain("typeof props.onClick");
  });

  it("reads the height the bridge publishes, and counts every surface", () => {
    expect(read("apps/docs/src/lib/theme-css.ts")).toContain(
      '"--control-height-md": `${theme.density.controlHeight.md}px`',
    );
    expect(probe).toContain("--control-height-md");
    expect(probe).toContain("data-platform");
    expect(probe).toContain("all.length");
    expect(probe).toContain("includes(step.query)");
  });
});

describe("the policy", () => {
  it("records the measured press, its command and its negative control", () => {
    expect(policy).toContain("### The platform switch is a measured click");
    expect(policy).toContain("nub apps/docs/scripts/platform-switch-probe.ts");
    expect(policy).toContain("Windows: 3 of 3 surfaces at 32px");
    expect(policy).toContain("macOS: 3 of 3 surfaces at 28px");
    expect(policy).toContain("followed the platform switch");
  });

  it("names the probe in the site's ledger", () => {
    expect(read("apps/docs/README.md")).toContain(
      "scripts/platform-switch-probe.ts",
    );
  });
});
