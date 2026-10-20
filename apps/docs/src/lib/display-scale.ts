/**
 * Display scale and pixel density (plan 631).
 *
 * Every size the runtime takes is a logical pixel, and the pinned declarations
 * expose no way to read the display's backing scale. The Window page states
 * that absence; this module owns the symbols that would make it false, so a
 * dependency upgrade fails the guard by name instead of leaving the page
 * claiming a missing API.
 *
 * Pure and browser-safe: `window-surface.ts` imports `scaleQuerySymbol` and that
 * module reaches the client bundle.
 */

/** A query that would let an application choose an asset by display density. */
export const scaleQuerySymbol =
  /scaleFactor|devicePixelRatio|pixelRatio|backingScaleFactor|getScaleFactor/u;

/** An image prop that would let one element select a file by density. */
export const imageDensitySymbol = /srcSet|srcset|imageSet|highDpi/u;

/**
 * Every way the page's claims can disagree with the installed runtime, in both
 * directions: a symbol the page denies has appeared, or a surface the page
 * relies on has gone. `native` is `@gpuix/native`'s entry declarations, `host`
 * is its host-element declarations, and `iconSource` is
 * `packages/icons/src/Icon.tsx` — the vector path the page describes.
 */
export const displayScaleViolations = (input: {
  readonly native: string;
  readonly host: string;
  readonly iconSource: string;
}): ReadonlyArray<string> => {
  const scale = input.native.match(scaleQuerySymbol);
  const density = input.host.match(imageDensitySymbol);

  return [
    ...(scale === null
      ? []
      : [
          `display scale: the page says no scale query exists, but the declarations contain ${scale[0]}`,
        ]),
    ...(density === null
      ? []
      : [
          `image density: the page says images have no density descriptor, but the declarations contain ${density[0]}`,
        ]),
    ...(input.host.includes("interface ImgProps")
      ? []
      : ["image density: ImgProps is not declared"]),
    ...(input.host.includes("interface SvgProps")
      ? []
      : ["vector icons: SvgProps is not declared"]),
    ...(input.iconSource.includes("source={icons[name]}")
      ? []
      : ["vector icons: Icon no longer paints SvgProps.source"]),
    ...(input.iconSource.includes("width: pixels")
      ? []
      : ["vector icons: Icon no longer sizes its markup from iconPixels"]),
  ];
};
