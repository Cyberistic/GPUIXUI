/**
 * Prove the platform switch changes what a hydrated preview paints.
 *
 * The site is server-rendered with `?platform=darwin|linux|win32|default`, and
 * `platform-switch.test.ts` holds that markup path. A reader changes it by
 * pressing a button, though: the press is React state, writes the address bar
 * and re-resolves `platformTheme` for every `PreviewSurface`, and nothing
 * pressed that group before. This probe presses **Windows**, then **macOS**, on
 * a curated component page and reads the consequence off every preview surface —
 * its `data-platform`, the `--control-height-md` the bridge wrote and the
 * address bar a copied link would carry.
 *
 * It is the mission's acceptance ("a reader toggles macOS -> Windows and every
 * preview changes") measured on the press path, not on a URL.
 *
 * Run (a dev or preview server is already up):
 * `nub apps/docs/scripts/platform-switch-probe.ts`
 * `--url <url>`, `--timeout <ms>` (hydration budget), `--chrome <path>`.
 */

import {
  platformTheme,
  themes,
  type PlatformName,
  type ThemeMode,
} from "@gpuixui/tokens";
import { findChrome, openChrome } from "./chrome-session.ts";

/** The page a preview server serves, and the switch every docs page carries. */
export const defaultUrl = "http://localhost:4175/docs/components/button";

/** The platform group's accessible name. */
export const platformGroup = "Platform style";

/** What every preview surface reports at one instant. */
export interface Surface {
  readonly platform: string;
  readonly mode: string;
  readonly height: string;
  readonly search: string;
}

/** Read the probe's one-line readout; `undefined` when it is not one. */
export const parseSurface = (text: string): Surface | undefined => {
  const [platform, mode, height, search] = text.split("|");
  if (
    platform === undefined ||
    mode === undefined ||
    height === undefined ||
    search === undefined
  )
    return undefined;
  return { platform, mode, height, search };
};

/** The control height a platform paints at `md`, as the bridge writes it. */
export const expectedHeight = (
  mode: ThemeMode,
  platform: PlatformName,
): string =>
  `${platformTheme(themes[mode], platform).density.controlHeight.md}px`;

/** Every surface's state, as one line `parseSurface` reads. */
const readSurfaces = `(() => {
  const surfaces = [...document.querySelectorAll(".gx-demo[data-platform]")];
  const first = surfaces[0];
  return [
    first?.getAttribute("data-platform") ?? "none",
    first?.getAttribute("data-mode") ?? "none",
    (first?.style.getPropertyValue("--control-height-md") ?? "").trim(),
    location.search,
  ].join("|");
})()`;

/** How many surfaces carry a platform, and how many carry `platform`. */
const countSurfaces = (platform: string): string => `(() => {
  const all = document.querySelectorAll(".gx-demo[data-platform]");
  const lit = document.querySelectorAll(
    '.gx-demo[data-platform="${platform}"]',
  );
  return all.length + ":" + lit.length;
})()`;

/** Whether the platform button with this label carries React's own handler. */
const ready = (label: string): string => `(() => {
  const button = [...document.querySelectorAll('[aria-label="${platformGroup}"] button')].find(
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

/** Press the platform button a reader would press. */
const press = (label: string): string => `(() => {
  const button = [...document.querySelectorAll('[aria-label="${platformGroup}"] button')].find(
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

/** One pressed platform, checked against every surface that paints it. */
export interface Step {
  readonly label: string;
  readonly platform: PlatformName;
  readonly query: string;
}

/** The two presses the mission's acceptance names, in order. */
export const steps: ReadonlyArray<Step> = [
  { label: "Windows", platform: "win32", query: "platform=win32" },
  { label: "macOS", platform: "darwin", query: "platform=darwin" },
];

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
      () => session.page.text(ready("Windows")),
      (state) => state === "ready",
      budget,
    );
    if (hydrated === undefined) {
      console.error(
        `FAIL the platform switch never hydrated within ${budget} ms (its Windows button carries no React onClick)`,
      );
      return 1;
    }

    for (const step of steps) {
      const pressed = await session.page.text(press(step.label));
      if (pressed !== "pressed") {
        failures.push(
          `the ${step.label} button could not be pressed (${pressed})`,
        );
        continue;
      }
      const surface = parseSurface(
        (await until(
          () => session.page.text(readSurfaces),
          (text) => parseSurface(text)?.platform === step.platform,
          5000,
        )) ?? "",
      );
      if (surface === undefined) {
        failures.push(
          `pressing ${step.label} left no surface on ${step.platform}`,
        );
        continue;
      }
      const mode = surface.mode === "light" ? "light" : "dark";
      const height = expectedHeight(mode, step.platform);
      if (surface.height !== height) {
        failures.push(
          `the ${step.label} preview paints --control-height-md ${surface.height || "nothing"}, not ${height}`,
        );
      }
      if (!surface.search.includes(step.query)) {
        failures.push(
          `the address bar does not carry ${step.query} (${surface.search})`,
        );
      }

      const [all = "0", lit = "0"] = (
        await session.page.text(countSurfaces(step.platform))
      ).split(":");
      if (all === "0") failures.push("the page carries no preview surface");
      else if (all !== lit) {
        failures.push(
          `only ${lit} of ${all} preview surfaces followed the platform switch to ${step.label}`,
        );
      } else {
        console.log(`${step.label}: ${lit} of ${all} surfaces at ${height}`);
      }
    }
  } finally {
    await session.close();
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log(
    "PASS the platform switch repaints every preview and writes the URL",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
