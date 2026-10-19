import { highContrastColors } from "@/lib/docs-theme";
import { TokenColorTable } from "./token-colors";

/**
 * The high-contrast palettes (plan 586). The library ships contrast as a second
 * axis, so the values are the same 47 roles with the AAA palette applied —
 * documented from the package, not retyped.
 */
export function ContrastColors() {
  return (
    <TokenColorTable
      palettes={[
        {
          key: "light",
          label: "High-contrast light",
          colors: highContrastColors.light,
        },
        {
          key: "dark",
          label: "High-contrast dark",
          colors: highContrastColors.dark,
        },
      ]}
    />
  );
}
