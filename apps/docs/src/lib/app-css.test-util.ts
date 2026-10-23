import { readFileSync } from "node:fs";

/**
 * The site's own style sheet, read once for the guards that measure it.
 *
 * The docs chrome's palette is the one thing on the site that is not the
 * library's tokens, so more than one suite checks a claim against it: the
 * palette's own contrast pairs and the syntax palette a code block paints in.
 */

export const appCss = readFileSync(
  new URL("../styles/app.css", import.meta.url),
  "utf8",
);

/** The custom properties of one selector's block. */
export const appCssVariables = (
  selector: string,
): Readonly<Record<string, string>> => {
  const start = appCss.indexOf(`${selector} {`);
  const end = appCss.indexOf("\n}", start);
  const block = start === -1 || end === -1 ? "" : appCss.slice(start, end);
  return Object.fromEntries(
    [...block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].flatMap((match) => {
      const [, name, value] = match;
      return name === undefined || value === undefined
        ? []
        : [[name, value.trim()]];
    }),
  );
};

/** The two schemes the site switches between. */
export const appCssSchemes = {
  light: appCssVariables(":root"),
  dark: appCssVariables(".dark"),
} as const;
