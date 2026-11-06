/**
 * Prove the platform switch changes what a hydrated preview paints.
 *
 * The choice is the app's: React holds it for the page and local storage keeps
 * it for the next visit, so the address bar names the page and nothing else.
 * `platform-switch.test.ts` holds the state rules. This probe presses
 * **Windows**, then **macOS**, on a curated component page and reads the
 * consequence off every preview surface — its `data-platform`, the
 * `--control-height-md` the bridge wrote and the platform button the group
 * reports pressed — then requires the URL to carry none of the switch's axes.
 *
 * It is the mission's acceptance ("a reader toggles macOS -> Windows and every
 * preview changes") measured on the press path.
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
import { firstReady } from "./react-ready.ts";

/** The page a preview server serves, and the switch every docs page carries. */
export const defaultUrl = "http://localhost:4175/components/button";

/** The platform group's accessible name. */
export const platformGroup = "Platform style";

/** What every preview surface reports at one instant. */
export interface Surface {
  readonly platform: string;
  readonly mode: string;
  readonly height: string;
  readonly pressed: string;
}

/** Read the probe's one-line readout; `undefined` when it is not one. */
export const parseSurface = (text: string): Surface | undefined => {
  const [platform, mode, height, pressed] = text.split("|");
  if (
    platform === undefined ||
    mode === undefined ||
    height === undefined ||
    pressed === undefined
  )
    return undefined;
  return { platform, mode, height, pressed };
};

/** The switch's three axes, none of which a docs URL may carry. */
export const queryAxes = ["platform", "mode", "look", "appearance"] as const;

/**
 * Whether a search string names any of the switch's axes.
 *
 * A clean URL names the page and the page's own parameters (`?q=`, `?scene=`);
 * a platform, palette or look in it would mean some path had written the
 * switch back into the address bar.
 */
export const namesSwitchAxis = (search: string): boolean =>
  queryAxes.some((axis) => new URLSearchParams(search).has(axis));

/** The control height a platform paints at `md`, as the bridge writes it. */
export const expectedHeight = (
  mode: ThemeMode,
  platform: PlatformName,
): string =>
  `${platformTheme(themes[mode], platform).density.controlHeight.md}px`;

/**
 * Every surface's state, as one line `parseSurface` reads.
 *
 * A just-hydrated dev page can hold the server's markup beside the tree React
 * committed for a moment, so a read of the first surface can name a platform
 * the rest of the page has left. The line says `mixed` until every surface
 * agrees, which is the contract the mission states ("every preview changes").
 */
const readSurfaces = `(() => {
  const surfaces = [...document.querySelectorAll(".gx-demo[data-platform]")];
  const platforms = new Set(
    surfaces.map((surface) => surface.getAttribute("data-platform") ?? "none"),
  );
  const first = surfaces[0];
  const pressed = [...document.querySelectorAll('[aria-label="${platformGroup}"] button')]
    .filter((node) => node.getAttribute("aria-pressed") === "true")
    .map((node) => node.textContent ?? "")
    .join(",");
  return [
    platforms.size === 1 ? (first?.getAttribute("data-platform") ?? "none") : "mixed",
    first?.getAttribute("data-mode") ?? "none",
    (first?.style.getPropertyValue("--control-height-md") ?? "").trim(),
    pressed,
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

/** The first copy of this label whose press answers, painted first. */
const readyButton = (group: string, label: string): string =>
  firstReady(
    `[aria-label="${group}"] button`,
    "onClick",
    `node.textContent === ${JSON.stringify(label)}`,
  );

/** Whether the button with this label in `group` carries React's own handler. */
const ready = (group: string, label: string): string => `(() => {
  const button = ${readyButton(group, label)};
  if (button !== undefined) return "ready";
  const matches = [...document.querySelectorAll('[aria-label="${group}"] button')].filter(
    (node) => node.textContent === ${JSON.stringify(label)},
  );
  return matches.length === 0 ? "no-button" : "cold";
})()`;

/** Press the button a reader would press in `group`. */
const press = (group: string, label: string): string => `(() => {
  const button = ${readyButton(group, label)};
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
}

/** The two presses the mission's acceptance names, in order. */
export const steps: ReadonlyArray<Step> = [
  { label: "Windows", platform: "win32" },
  { label: "macOS", platform: "darwin" },
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
      () => session.page.text(ready(platformGroup, "Windows")),
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
      const pressed = await session.page.text(press(platformGroup, step.label));
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
          15000,
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
      if (surface.pressed !== step.label) {
        failures.push(
          `the platform group reports ${JSON.stringify(surface.pressed)} pressed, not ${step.label}`,
        );
      }
      const search = await session.page.text("location.search");
      if (namesSwitchAxis(search)) {
        failures.push(`the address bar carries the switch's state (${search})`);
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
    "PASS the platform switch repaints every preview and leaves the URL clean",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
