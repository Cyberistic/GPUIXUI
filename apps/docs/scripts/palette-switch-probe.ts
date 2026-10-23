/**
 * Prove the palette switch changes what a hydrated preview paints.
 *
 * The platform switch is measured in the server-rendered HTML (`?mode=light`
 * reaches the surface), but a reader changes it by pressing a button: the press
 * path is React state, and a capture of the markup proves nothing about it. This
 * probe presses the sidebar's **Palette** group on a curated component page and
 * reads the consequence off every preview surface — its `data-mode`, the
 * `--background` variable the bridge wrote, the group's pressed position and the
 * address bar a link would carry.
 *
 * Run (a dev or preview server is already up):
 * `nub apps/docs/scripts/palette-switch-probe.ts`
 * `--url <url>`, `--timeout <ms>` (hydration budget), `--chrome <path>`.
 */

import {
  platformNames,
  platformTheme,
  themes,
  type PlatformName,
  type ThemeMode,
} from "@gpuixui/tokens";
import { findChrome, openChrome } from "./chrome-session.ts";

/** The page a preview server serves, and the switch every docs page carries. */
export const defaultUrl = "http://localhost:4175/docs/components/button";

/** The palette group's accessible name, and the two buttons it offers. */
export const paletteGroup = "Preview palette";

/**
 * What every preview surface reports at one instant: the palette and platform
 * it resolved, the page fill the bridge wrote, the pressed button and the
 * address bar.
 *
 * The platform is read from the surface rather than from the URL, because the
 * provider writes the address bar in the same commit that sets the state: a
 * read between the two would pair one platform with another's paint.
 */
export interface Surface {
  readonly mode: string;
  readonly platform: string;
  readonly background: string;
  readonly pressed: string;
  readonly search: string;
}

/** Read the probe's one-line readout; `undefined` when it is not one. */
export const parseSurface = (text: string): Surface | undefined => {
  const [mode, platform, background, pressed, search] = text.split("|");
  if (
    mode === undefined ||
    platform === undefined ||
    background === undefined ||
    pressed === undefined ||
    search === undefined
  )
    return undefined;
  return { mode, platform, background, pressed, search };
};

/** A platform the library names, or `undefined` for a value it does not. */
export const platformOf = (value: string): PlatformName | undefined =>
  platformNames.find((name) => name === value);

/** The page fill a mode paints on a platform, from the library's own tables. */
export const expectedBackground = (
  mode: ThemeMode,
  platform: PlatformName,
): string => platformTheme(themes[mode], platform).colors.background;

/** Every surface's state, as one line `parseSurface` reads. */
const readSurfaces = `(() => {
  const surfaces = [...document.querySelectorAll(".gx-demo[data-mode]")];
  const first = surfaces[0];
  const pressed = [...document.querySelectorAll('[aria-label="${paletteGroup}"] button')]
    .filter((node) => node.getAttribute("aria-pressed") === "true")
    .map((node) => node.textContent ?? "")
    .join(",");
  return [
    first?.getAttribute("data-mode") ?? "none",
    first?.getAttribute("data-platform") ?? "none",
    (first?.style.getPropertyValue("--background") ?? "").trim(),
    pressed,
    location.search,
  ].join("|");
})()`;

/** How many surfaces carry a palette, and how many carry `mode`. */
const countSurfaces = (mode: string): string => `(() => {
  const all = document.querySelectorAll(".gx-demo[data-mode]");
  const lit = document.querySelectorAll('.gx-demo[data-mode="${mode}"]');
  return all.length + ":" + lit.length;
})()`;

/** Whether the palette button with this label carries React's own handler. */
const ready = (label: string): string => `(() => {
  const button = [...document.querySelectorAll('[aria-label="${paletteGroup}"] button')].find(
    (node) => node.textContent === ${JSON.stringify(label)},
  );
  if (button === undefined) return "no-button";
  const props = Object.entries(button).find(([key]) =>
    key.startsWith("__reactProps"),
  )?.[1];
  return props !== undefined && typeof props.onClick === "function"
    ? "ready"
    : "cold";
})()`;

/** Press the palette button a reader would press. */
const press = (label: string): string => `(() => {
  const button = [...document.querySelectorAll('[aria-label="${paletteGroup}"] button')].find(
    (node) => node.textContent === ${JSON.stringify(label)},
  );
  if (button === undefined) return "no-button";
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

  try {
    const hydrated = await until(
      () => session.page.text(ready("Light")),
      (state) => state === "ready",
      budget,
    );
    if (hydrated === undefined) {
      console.error(
        `FAIL the palette switch never hydrated within ${budget} ms (its Light button carries no React onClick)`,
      );
      return 1;
    }

    const opening = parseSurface(
      (await until(
        () => session.page.text(readSurfaces),
        (text) => {
          const search = parseSurface(text)?.search ?? "";
          // The provider writes both axes in the commit that sets its state;
          // waiting for them is what keeps the read from pairing one platform
          // with another's paint.
          return search.includes("mode=") && search.includes("platform=");
        },
        budget,
      )) ?? "",
    );
    if (opening === undefined) {
      failures.push("a surface reported nothing the probe could read");
    } else {
      const platform = platformOf(opening.platform);
      if (platform === undefined) {
        failures.push(
          `a surface names the platform ${opening.platform}, which the library does not`,
        );
      } else {
        const dark = expectedBackground("dark", platform);
        if (opening.mode !== "dark") {
          failures.push(`a preview opened in ${opening.mode}, not dark`);
        }
        if (opening.background !== dark) {
          failures.push(
            `a preview opened on ${opening.background}, not the dark theme's ${dark} on ${platform}`,
          );
        }
        if (opening.pressed !== "Dark") {
          failures.push(
            `the palette group reports ${JSON.stringify(opening.pressed)} pressed, not Dark`,
          );
        }
      }
    }

    const toLight = await session.page.text(press("Light"));
    if (toLight !== "pressed") {
      failures.push(`the Light button could not be pressed (${toLight})`);
    }
    const light = parseSurface(
      (await until(
        () => session.page.text(readSurfaces),
        (text) => parseSurface(text)?.mode === "light",
        5000,
      )) ?? "",
    );
    if (light === undefined) {
      failures.push("pressing Light left no surface in light mode");
    } else {
      const platform = platformOf(light.platform);
      if (platform === undefined) {
        failures.push(`a lit surface names the platform ${light.platform}`);
      } else {
        const fill = expectedBackground("light", platform);
        if (light.background !== fill) {
          failures.push(
            `the light preview painted ${light.background}, not the light theme's ${fill} on ${platform}`,
          );
        }
        if (light.pressed !== "Light") {
          failures.push(
            `the palette group reports ${JSON.stringify(light.pressed)} pressed, not Light`,
          );
        }
        if (!light.search.includes("mode=light")) {
          failures.push(
            `the address bar does not carry mode=light (${light.search})`,
          );
        }

        const [all = "0", lit = "0"] = (
          await session.page.text(countSurfaces("light"))
        ).split(":");
        if (all === "0") failures.push("the page carries no preview surface");
        else if (all !== lit) {
          failures.push(
            `only ${lit} of ${all} preview surfaces followed the switch`,
          );
        } else {
          console.log(`light: ${lit} of ${all} surfaces painted ${fill}`);
        }
      }
    }

    const toDark = await session.page.text(press("Dark"));
    if (toDark !== "pressed") {
      failures.push(`the Dark button could not be pressed (${toDark})`);
    }
    const dark = parseSurface(
      (await until(
        () => session.page.text(readSurfaces),
        (text) => parseSurface(text)?.mode === "dark",
        5000,
      )) ?? "",
    );
    if (dark === undefined) {
      failures.push("pressing Dark left no surface in dark mode");
    } else if (!dark.search.includes("mode=dark")) {
      failures.push(
        `the address bar does not carry mode=dark (${dark.search})`,
      );
    }
  } finally {
    await session.close();
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log(
    "PASS the palette switch repaints every preview and writes the URL",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
