/**
 * Registering typefaces with the native runtime.
 *
 * GPUix's `registerFont` takes the **bytes** of a `.ttf`/`.otf` file and makes
 * the family in the file's own name table available to `fontFamily`. It accepts
 * the same file twice, and the browser renderer has no such method at all, so
 * this module adds the two things a component should not have to: idempotence,
 * and a return value a theme can name without retyping a family.
 */

/**
 * The part of the GPUix renderer this module uses. `@gpuix/react`'s renderer
 * satisfies it; a test can pass a fake. Declared structurally so the package
 * keeps zero dependencies.
 */
export interface FontRegistrar {
  /**
   * Make the families in a TrueType or OpenType file available. The runtime
   * throws on bytes it cannot use, and the throw is left to the caller.
   */
  registerFont(data: Uint8Array): void;
}

/** One typeface: the family its files declare, and one file per weight/style. */
export interface Typeface {
  /**
   * The family name in the font's own name table. The runtime cannot rename a
   * face, so a different name here falls back silently at render time.
   */
  readonly family: string;
  /** `.ttf` or `.otf` bytes. WOFF and WOFF2 are not supported. */
  readonly files: ReadonlyArray<Uint8Array>;
}

/** The typefaces an application brings. Either role may be left to the theme. */
export interface Typefaces {
  /** UI face, named by `typography.sans`. */
  readonly sans?: Typeface;
  /** Code face, named by `typography.mono`. */
  readonly mono?: Typeface;
}

/**
 * Registered families, shaped to spread into `extendTheme`'s `typography`.
 * A role with no typeface is absent, so the base theme keeps its family.
 */
export interface RegisteredFonts {
  readonly sans?: string;
  readonly mono?: string;
}

const registered = new WeakMap<FontRegistrar, WeakSet<Uint8Array>>();

const register = (registrar: FontRegistrar, typeface: Typeface): void => {
  const seen = registered.get(registrar) ?? new WeakSet<Uint8Array>();
  registered.set(registrar, seen);
  typeface.files.forEach((file) => {
    if (seen.has(file)) {
      return;
    }
    registrar.registerFont(file);
    seen.add(file);
  });
};

/**
 * Register an application's typefaces once per renderer and per file. Repeated
 * calls with the same byte arrays are free, which matters because the caller is
 * usually an effect that re-runs on every render. A file the runtime rejects is
 * not recorded, so a later call retries it.
 *
 * The runtime derives the family from the file, so the `family` given here is a
 * declaration: if it differs from the name table the text falls back silently.
 * The only way to check that is the native runtime.
 *
 * @example
 * ```ts
 * const fonts = registerFonts(renderer, {
 *   sans: { family: "Inter", files: [interRegular, interBold] },
 * });
 * const theme = extendTheme(themes.dark, { typography: fonts });
 * ```
 */
export function registerFonts(
  registrar: FontRegistrar,
  typefaces: Typefaces,
): RegisteredFonts {
  if (typefaces.sans !== undefined) {
    register(registrar, typefaces.sans);
  }
  if (typefaces.mono !== undefined) {
    register(registrar, typefaces.mono);
  }
  return {
    sans: typefaces.sans?.family,
    mono: typefaces.mono?.family,
  };
}
