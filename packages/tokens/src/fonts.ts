/**
 * Installing a typeface in the native runtime.
 *
 * A theme can only name a family the runtime knows. GPUix installs one from the
 * font file's own bytes and names it from the file's name table, so this module
 * takes bytes, not a path, and hands back the families a theme may now name.
 *
 * The runtime surface is declared structurally: `@gpuixui/tokens` keeps zero
 * dependencies, `@gpuix/react`'s renderer satisfies the interface, and a test
 * can pass a fake. It lives at the application boundary. GPUix lays text out
 * against the faces it already has, so a family that did not exist when the
 * text naming it was first laid out paints the fallback. The order is still
 * create the renderer, register, then render — it is what saves that frame. The
 * fallback is not permanent: the next layout picks the file up, measured by the
 * playground's `font-registration-late` probe at 44px → 81px on the repaint.
 */

/** The part of a renderer that installs a font file. */
export interface FontRegistrar {
  /**
   * Install a font file. The runtime derives the family name from the file's
   * own name table and throws when the file has no usable name.
   */
  registerFont(data: Uint8Array): void;
}

/** A font file with the family it declares. */
export interface FontSource {
  /**
   * The family the file declares in its name table. The runtime ignores this
   * value — a mismatch falls back silently — so it must be copied from the font,
   * not chosen.
   */
  readonly family: string;
  /** The font file's bytes. A TrueType or OpenType file; WOFF is unsupported. */
  readonly data: Uint8Array;
}

/**
 * The bytes already installed, per registrar. Weak on both sides so a renderer
 * that goes away, and the file data it held, are collectable.
 */
const installed = new WeakMap<FontRegistrar, WeakSet<Uint8Array>>();

/** The set of files `registrar` already has, created on first use. */
const installedWith = (registrar: FontRegistrar): WeakSet<Uint8Array> => {
  const seen = installed.get(registrar);
  if (seen !== undefined) {
    return seen;
  }
  const created = new WeakSet<Uint8Array>();
  installed.set(registrar, created);
  return created;
};

/**
 * Install `fonts` in `registrar`, once per file.
 *
 * Idempotent per renderer and per file: calling twice with the same bytes
 * installs them once, which matters because the runtime happily re-adds a
 * family while an application may run this on every mount. A file the runtime
 * rejects throws — the error is the runtime's, this function does not swallow
 * it — and is not remembered, so a corrected file can be retried.
 *
 * Call it after the renderer exists and before the first render that names a
 * family, so the first paint already has the face. Installing late is not
 * permanent harm — the next layout re-lays the text out against the family the
 * renderer now knows (measured at 44px → 81px by the `font-registration-late`
 * probe) — but it costs a frame painted in the fallback.
 *
 * @example
 * ```ts
 * const renderer = createRenderer();
 * const families = registerFonts(renderer, [{ family: "Inter", data }]);
 * const theme = extendTheme(lightTheme, { typography: { sans: "Inter" } });
 * render(<App theme={theme} />, { renderer }); // the first text to name Inter
 * ```
 */
export function registerFonts(
  registrar: FontRegistrar,
  fonts: ReadonlyArray<FontSource>,
): ReadonlyArray<string> {
  const seen = installedWith(registrar);
  const families: string[] = [];
  fonts.forEach((font) => {
    if (!seen.has(font.data)) {
      registrar.registerFont(font.data);
      seen.add(font.data);
    }
    if (!families.includes(font.family)) {
      families.push(font.family);
    }
  });
  return families;
}
