import { readFileSync } from "node:fs";

export const appCss = readFileSync(
  new URL("../styles/app.css", import.meta.url),
  "utf8",
);

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

export const appCssSchemes = {
  light: appCssVariables(":root"),
  dark: appCssVariables(".dark"),
} as const;
