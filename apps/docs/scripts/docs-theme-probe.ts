/**
 * Prove the docs chrome's own theme switch repaints the site and nothing else.
 *
 * The site has two palettes that must never be confused: the docs chrome reads
 * its own `:root`/`.dark` values from `app.css`, while a component preview
 * paints the library's theme and follows only the `?mode=`/`?platform=` axes.
 * `docs-theme.test.ts` measures the chrome's pairs and `palette-switch-probe.ts`
 * the preview axes, but the **press** is React state in next-themes: no static
 * read proves that pressing the toggle moves `<html>` from one scheme to the
 * other, nor that every preview stays exactly where the reader put it.
 *
 * This probe presses `[data-theme-toggle]` on a curated component page, reads the
 * scheme, the chrome's `--background` (held to the sheet that declares it), the
 * remembered choice and every `.gx-demo` surface's palette, platform and fill
 * (each fill held to the library's own value for the palette it reports). It then
 * presses again and requires the way back.
 *
 * Run (a dev or preview server is already up):
 * `nub apps/docs/scripts/docs-theme-probe.ts`
 * `--url <url>`, `--timeout <ms>` (hydration budget), `--chrome <path>`.
 */

import {
  platformNames,
  platformTheme,
  themes,
  type PlatformName,
  type ThemeMode,
} from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { findChrome, openChrome } from "./chrome-session.ts";

/** The page a preview server serves, and the toggle every docs page carries. */
export const defaultUrl = "http://localhost:4175/docs/components/button";

/** The accessible name Fumadocs gives the docs theme toggle. */
export const toggleLabel = "Toggle Theme";

/** The docs stylesheet, read once at module load. */
const stylesheet = readFileSync(
  new URL("../src/styles/app.css", import.meta.url),
  "utf8",
);

/** A scheme the docs chrome declares. */
export type Scheme = "light" | "dark";

/**
 * The `--background` the docs palette declares for `scheme`, read from the
 * sheet itself so a palette edit reaches the probe instead of a stale hex.
 * `undefined` when the sheet declares none, which the probe reports.
 */
export const chromeBackground = (scheme: Scheme): string | undefined => {
  const start = stylesheet.indexOf(scheme === "dark" ? ".dark {" : ":root {");
  if (start === -1) return undefined;
  const block = stylesheet.slice(start, stylesheet.indexOf("}", start));
  const value = /--background:\s*([^;]+);/.exec(block)?.[1];
  return value?.trim();
};

/** What one preview surface reports: the palette and platform it shows. */
export interface Preview {
  /** The library's palette: `light` or `dark`. */
  readonly mode: string;
  /** The platform style the preview resolves. */
  readonly platform: string;
  /** The page fill the preview painted. */
  readonly background: string;
}

/** What the chrome and every preview report at one instant. */
export interface Readout {
  readonly scheme: Scheme;
  readonly chrome: string;
  readonly stored: string;
  readonly previews: ReadonlyArray<Preview>;
}

/** Read one surface's `mode:platform:fill`; `undefined` when it is not one. */
export const parsePreview = (text: string): Preview | undefined => {
  const [mode, platform, background] = text.split(":");
  if (mode === undefined || platform === undefined || background === undefined)
    return undefined;
  return { mode, platform, background };
};

/** Read the probe's one-line readout; `undefined` when it is not one. */
export const parseReadout = (text: string): Readout | undefined => {
  const [scheme, chrome, stored, previews] = text.split("|");
  if (scheme !== "light" && scheme !== "dark") return undefined;
  if (chrome === undefined || stored === undefined || previews === undefined)
    return undefined;
  const entries = previews === "" ? [] : previews.split(",");
  const parsed = entries.flatMap((entry) => {
    const preview = parsePreview(entry);
    return preview === undefined ? [] : [preview];
  });
  if (parsed.length !== entries.length) return undefined;
  return { scheme, chrome, stored, previews: parsed };
};

/** A platform the library names, or `undefined` for a value it does not. */
export const platformOf = (value: string): PlatformName | undefined =>
  platformNames.find((name) => name === value);

/** The page fill the library's own palette paints on a platform. */
export const expectedBackground = (
  mode: ThemeMode,
  platform: PlatformName,
): string => platformTheme(themes[mode], platform).colors.background;

/** How a set of previews reads, for a failure message. */
export const describePreviews = (previews: ReadonlyArray<Preview>): string =>
  previews
    .map(
      (preview) => `${preview.mode}:${preview.platform}:${preview.background}`,
    )
    .join(",");

/**
 * Whether two reads describe the same previews.
 *
 * The previews are objects, so `join(",")` on them reads `[object Object]` for
 * every entry — two different sets compare equal that way, and the check that
 * a preview stayed put would pass on any page.
 */
export const samePreviews = (
  left: ReadonlyArray<Preview>,
  right: ReadonlyArray<Preview>,
): boolean =>
  left.length === right.length &&
  left.every(
    (preview, index) =>
      preview.mode === right[index]?.mode &&
      preview.platform === right[index]?.platform &&
      preview.background === right[index]?.background,
  );

/** The chrome and every surface's state, as one line `parseReadout` reads. */
const readPage = `(() => {
  const root = document.documentElement;
  const surfaces = [...document.querySelectorAll(".gx-demo[data-mode]")];
  return [
    root.classList.contains("dark") ? "dark" : "light",
    getComputedStyle(root).getPropertyValue("--background").trim(),
    localStorage.getItem("theme") ?? "none",
    surfaces
      .map((surface) =>
        [
          surface.getAttribute("data-mode") ?? "none",
          surface.getAttribute("data-platform") ?? "none",
          (surface.style.getPropertyValue("--background") ?? "").trim(),
        ].join(":"),
      )
      .join(","),
  ].join("|");
})()`;

/** Whether the toggle carries React's own handler, so a press does something. */
const ready = `(() => {
  const button = document.querySelector('[data-theme-toggle]');
  if (button === null) return "no-toggle";
  const props = Object.entries(button).find(([key]) =>
    key.startsWith("__reactProps"),
  )?.[1];
  return props !== undefined && typeof props.onClick === "function"
    ? "ready"
    : "cold";
})()`;

/** Press the toggle the way a reader does. */
const press = `(() => {
  const button = document.querySelector('[data-theme-toggle]');
  if (button === null) return "no-toggle";
  button.click();
  return "pressed";
})()`;

/** Poll `read` until `accept` holds, or the budget runs out. */
const until = async (
  read: () => Promise<string>,
  accept: (value: string) => boolean,
  timeout: number,
): Promise<string | undefined> => {
  const started = Date.now();
  let value = await read();
  while (!accept(value) && Date.now() - started < timeout) {
    await new Promise((wait) => setTimeout(wait, 250));
    value = await read();
  }
  return accept(value) ? value : undefined;
};

/**
 * Poll `read` until two consecutive reads agree.
 *
 * The chrome's scheme flips in next-themes' own effect, while a preview that
 * followed it would re-render a frame later, so a read taken the instant the
 * scheme changed would compare the previews against a page that has not
 * finished moving. A stable pair of reads is what makes "every preview stayed
 * put" a statement about the settled page.
 */
const settled = async (
  read: () => Promise<string>,
  timeout: number,
): Promise<string | undefined> => {
  const started = Date.now();
  let previous = await read();
  while (Date.now() - started < timeout) {
    await new Promise((wait) => setTimeout(wait, 250));
    const current = await read();
    if (current === previous) return current;
    previous = current;
  }
  return undefined;
};

/** Run the project. Returns the process exit code. */
export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const argument = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const url = argument("--url") ?? defaultUrl;
  const budget = Number(argument("--timeout") ?? "90000");
  if (!Number.isFinite(budget) || budget <= 0) {
    console.error("FAIL --timeout must be a positive number of milliseconds");
    return 2;
  }
  const chrome = findChrome(argument("--chrome"), process.env);
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 2;
  }

  const session = await openChrome(chrome, url, 1280, 900);
  const failures: Array<string> = [];

  /** The fill the library paints for a preview, and the reason it is wrong. */
  const fillFailure = async (preview: Preview): Promise<string | undefined> => {
    const platform = platformOf(preview.platform);
    if (platform === undefined) {
      return `a preview names the platform ${preview.platform}, which the library does not`;
    }
    if (preview.mode !== "light" && preview.mode !== "dark") {
      return `a preview names the palette ${preview.mode}, which the library does not`;
    }
    const expected = expectedBackground(preview.mode, platform);
    if (preview.background !== expected) {
      return `a preview painted ${preview.background}, not the library's ${expected} for ${preview.mode} on ${platform}`;
    }
    return undefined;
  };

  try {
    const hydrated = await until(
      () => session.page.text(ready),
      (state) => state === "ready",
      budget,
    );
    if (hydrated === undefined) {
      console.error(
        `FAIL the docs theme toggle never hydrated within ${budget} ms (it carries no React onClick)`,
      );
      return 1;
    }

    const opening = parseReadout(
      (await settled(() => session.page.text(readPage), budget)) ?? "",
    );
    if (opening === undefined) {
      failures.push("the page reported nothing the probe could read");
    } else {
      const expected = chromeBackground(opening.scheme);
      if (opening.chrome !== expected) {
        failures.push(
          `the ${opening.scheme} chrome painted ${opening.chrome}, not the sheet's ${expected ?? "missing"} value`,
        );
      }
      if (opening.previews.length === 0) {
        failures.push("the page carries no preview surface to hold still");
      }
      for (const preview of opening.previews) {
        const failure = await fillFailure(preview);
        if (failure !== undefined) failures.push(failure);
      }
    }

    const pressed = await session.page.text(press);
    if (pressed !== "pressed") {
      failures.push(`the toggle could not be pressed (${pressed})`);
    }
    const next = parseReadout(
      (await until(
        () => session.page.text(readPage),
        (text) => {
          const read = parseReadout(text);
          return read !== undefined && read.scheme !== opening?.scheme;
        },
        5000,
      )) ?? "",
    );
    if (next === undefined) {
      failures.push(
        `the docs chrome stayed ${opening?.scheme ?? "where it was"} after the press`,
      );
    } else {
      const expected = chromeBackground(next.scheme);
      if (next.chrome !== expected) {
        failures.push(
          `the ${next.scheme} chrome painted ${next.chrome}, not the sheet's ${expected ?? "missing"} value`,
        );
      }
      if (next.stored !== next.scheme) {
        failures.push(
          `the chrome paints ${next.scheme} but remembered ${next.stored}`,
        );
      }
      if (opening === undefined) {
        failures.push("no opening read to compare the previews against");
      } else if (!samePreviews(next.previews, opening.previews)) {
        failures.push(
          `a preview followed the docs theme (${describePreviews(opening.previews)} became ${describePreviews(next.previews)})`,
        );
      } else {
        for (const preview of next.previews) {
          const failure = await fillFailure(preview);
          if (failure !== undefined) failures.push(failure);
        }
        const first = opening.previews[0];
        console.log(
          `${next.scheme}: chrome ${next.chrome}, ${next.previews.length} previews stayed on ${first?.mode ?? "none"} ${first?.platform ?? "none"} at ${first?.background ?? "none"}`,
        );
      }
    }

    const back = await session.page.text(press);
    if (back !== "pressed") {
      failures.push(`the toggle could not be pressed back (${back})`);
    }
    const returned = parseReadout(
      (await until(
        () => session.page.text(readPage),
        (text) => parseReadout(text)?.scheme === opening?.scheme,
        5000,
      )) ?? "",
    );
    if (returned === undefined && opening !== undefined) {
      failures.push(`the chrome did not return to ${opening.scheme}`);
    }
  } finally {
    await session.close();
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log(
    "PASS the docs theme switch repaints its own chrome and leaves every preview on the library's palette",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
