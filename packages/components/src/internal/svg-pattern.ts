export interface PatternBox {
  readonly width: number;
  readonly height: number;
}

export const svgPatternMarkup = (
  box: PatternBox,
  path: string,
  stroke: number,
): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}"><path d="${path}" fill="none" stroke="#000000" stroke-width="${stroke}"/></svg>`;

export const paintableBox = (box: PatternBox): boolean =>
  Number.isFinite(box.width) &&
  Number.isFinite(box.height) &&
  box.width > 0 &&
  box.height > 0;
