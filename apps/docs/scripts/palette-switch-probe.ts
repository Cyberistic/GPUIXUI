import {
  platformNames,
  platformTheme,
  themes,
  type PlatformName,
  type ThemeMode,
} from "@gpuixui/tokens";
import { findChrome, openChrome } from "./chrome-session.ts";
import { firstReady, propsOfScript } from "./react-ready.ts";
import { namesSwitchAxis } from "./platform-switch-probe.ts";

export const defaultUrl = "http://localhost:4175/components/button";

export const paletteGroup = "Preview palette";

export interface Surface {
  readonly mode: string;
  readonly platform: string;
  readonly background: string;
  readonly pressed: string;
}

export const parseSurface = (text: string): Surface | undefined => {
  const [mode, platform, background, pressed] = text.split("|");
  if (
    mode === undefined ||
    platform === undefined ||
    background === undefined ||
    pressed === undefined
  )
    return undefined;
  return { mode, platform, background, pressed };
};

export const platformOf = (value: string): PlatformName | undefined =>
  platformNames.find((name) => name === value);

export const expectedBackground = (
  mode: ThemeMode,
  platform: PlatformName,
): string => platformTheme(themes[mode], platform).colors.background;

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
  ].join("|");
})()`;

const countSurfaces = (mode: string): string => `(() => {
  const all = document.querySelectorAll(".gx-demo[data-mode]");
  const lit = document.querySelectorAll('.gx-demo[data-mode="${mode}"]');
  return all.length + ":" + lit.length;
})()`;

const readyButton = (label: string): string =>
  firstReady(
    `[aria-label="${paletteGroup}"] button`,
    "onClick",
    `node.textContent === ${JSON.stringify(label)} && !node.disabled`,
  );

const ready = (label: string): string => `(() => {
  const button = ${readyButton(label)};
  if (button !== undefined) {
    const surface = document.querySelector(".gx-demo[data-mode]");
    if (surface === null) return "no-surface";
    return ${propsOfScript}(surface) === undefined ? "cold" : "ready";
  }
  const matches = [...document.querySelectorAll('[aria-label="${paletteGroup}"] button')].filter(
    (node) => node.textContent === ${JSON.stringify(label)},
  );
  return matches.length === 0 ? "no-button" : "cold";
})()`;

const press = (label: string): string => `(() => {
  const button = ${readyButton(label)};
  if (button === undefined) return "no-button";
  button.click();
  return "pressed";
})()`;

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
        `FAIL the palette switch or its preview never hydrated within ${budget} ms (the Light button or the surface it measures carries no React props)`,
      );
      return 1;
    }

    const opening = parseSurface(
      (await until(
        () => session.page.text(readSurfaces),
        (text) => {
          const surface = parseSurface(text);

          return surface?.pressed === "Dark" && surface.mode === "dark";
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
        if (namesSwitchAxis(await session.page.text("location.search"))) {
          failures.push(
            `the address bar carries the switch's state (${await session.page.text("location.search")})`,
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
    } else if (dark.pressed !== "Dark") {
      failures.push(
        `the palette group reports ${JSON.stringify(dark.pressed)} pressed, not Dark`,
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
    "PASS the palette switch repaints every preview and leaves the URL clean",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
