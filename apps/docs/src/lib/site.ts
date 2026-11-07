export const siteOrigin = "https://gpuixui.sudokw.com";

export const absoluteUrl = (path: string): string =>
  new URL(path.startsWith("/") ? path : `/${path}`, siteOrigin).href;
