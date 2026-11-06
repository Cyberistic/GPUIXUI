import { describe, expect, it } from "vitest";
import { typography } from "./typography.js";
import * as tokens from "./index.js";
import { missingTokens } from "./missing.js";
import { themeModeOf, themeModes } from "./mode.js";
import { themes } from "./theme.js";

describe("the module graph", () => {
  it("builds every shipped theme complete when the type scale is imported first", () => {
    expect(themes.light.typography).toBe(typography);
    expect(themes.light.typography.sans).toBe(typography.sans);
    expect(missingTokens(themes.light)).toEqual([]);
    expect(missingTokens(themes.dark)).toEqual([]);
    expect(themeModes.map((mode) => missingTokens(themes[mode]))).toEqual(
      themeModes.map(() => []),
    );
  });

  it("keeps the label readers on the public surface", () => {
    expect(tokens.themeModeOf).toBe(themeModeOf);
    expect(tokens.themeModes).toBe(themeModes);
  });
});
