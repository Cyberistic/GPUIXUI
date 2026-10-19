/**
 * Platform styles.
 *
 * GPUix takes one `fontFamily` string per element, and GPUI resolves the
 * `.SystemUIFont` sentinel to the operating system's own UI font, so the UI face
 * follows the platform at runtime. What a component cannot know is the platform's
 * monospace family, or which platform a preview is showing. Both come from here.
 *
 * A platform style is more than its type: {@link platformStyles} carries the
 * radii, density, motion, surfaces, accent and shadows that make a preview read
 * as macOS, Windows or GNOME. The values live in one editable file per platform
 * under `platform-styles/`; this module indexes them and derives the family
 * table, so a style file is the only place a platform is described.
 */

import { defaultPlatformStyle } from "./platform-styles/default.js";
import { linuxPlatformStyle } from "./platform-styles/linux.js";
import { macosPlatformStyle } from "./platform-styles/macos.js";
import { windowsPlatformStyle } from "./platform-styles/windows.js";
import type {
  PlatformName,
  PlatformStyle,
  PlatformType,
} from "./platform-types.js";

export {
  currentPlatform,
  isPlatformName,
  platformNames,
  systemMonoFamily,
  systemUiFont,
} from "./platform-types.js";
export type {
  PlatformName,
  PlatformStyle,
  PlatformStyleStructure,
  PlatformType,
  PlatformVariant,
} from "./platform-types.js";

/**
 * The shipped platform variants. `default` carries no overrides: it is the
 * identity, not a fourth look. Consumers edit a platform by copying its file in
 * `platform-styles/` and applying it with `applyPlatformStyle`.
 */
export const platformStyles: Readonly<Record<PlatformName, PlatformStyle>> = {
  darwin: macosPlatformStyle,
  linux: linuxPlatformStyle,
  win32: windowsPlatformStyle,
  default: defaultPlatformStyle,
};

/**
 * The families per platform, derived from {@link platformStyles}. `sans` is
 * GPUI's sentinel everywhere — GPUI maps it to the platform's own UI font, so a
 * theme never names a face the operating system may not have. `mono` names the
 * family each platform installs; `default` is the identity, so it carries
 * {@link systemMonoFamily}, the running platform's family, rather than one
 * platform's face.
 */
export const platformTypes: Readonly<Record<PlatformName, PlatformType>> = {
  darwin: macosPlatformStyle.types,
  linux: linuxPlatformStyle.types,
  win32: windowsPlatformStyle.types,
  default: defaultPlatformStyle.types,
};
