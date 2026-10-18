import { fontWeights, textRoles, typography } from "./index.js";

/**
 * The font manifest for the shipped type scale: the weights to load and the
 * role that selects each. A bundled font provides `weights`; a brand with its
 * own scale replaces the manifest, because `FontWeight` accepts any CSS weight.
 */
export const shippedTypeManifest = () => ({
  weights: fontWeights,
  roles: textRoles.map((role) => ({
    role,
    weight: typography[role].fontWeight,
  })),
});
