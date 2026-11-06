import {
  platformTheme,
  themes,
  type PlatformName,
  type ThemeMode,
} from "@gpuixui/tokens";
import { findChrome, openChrome } from "./chrome-session.ts";
import { firstReady } from "./react-ready.ts";

export const defaultUrl = "http://localhost:4175/components/button";

export const platformGroup = "Platform style";

export interface Surface {
  readonly platform: string;
  readonly mode: string;
  readonly height: string;
  readonly pressed: string;
}

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

export const queryAxes = ["platform", "mode", "look", "appearance"] as const;

export const namesSwitchAxis = (search: string): boolean =>
  queryAxes.some((axis) => new URLSearchParams(search).has(axis));

export const expectedHeight = (
  mode: ThemeMode,
  platform: PlatformName,
): string =>
  `${platformTheme(themes[mode], platform).density.controlHeight.md}px`;

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

const countSurfaces = (platform: string): string => `(() => {
  const all = document.querySelectorAll(".gx-demo[data-platform]");
  const lit = document.querySelectorAll(
    '.gx-demo[data-platform="${platform}"]',
  );
  return all.length + ":" + lit.length;
})()`;

const readyButton = (group: string, label: string): string =>
  firstReady(
    `[aria-label="${group}"] button`,
    "onClick",
    `node.textContent === ${JSON.stringify(label)}`,
  );

const ready = (group: string, label: string): string => `(() => {
  const button = ${readyButton(group, label)};
  if (button !== undefined) return "ready";
  const matches = [...document.querySelectorAll('[aria-label="${group}"] button')].filter(
    (node) => node.textContent === ${JSON.stringify(label)},
  );
  return matches.length === 0 ? "no-button" : "cold";
})()`;

const press = (group: string, label: string): string => `(() => {
  const button = ${readyButton(group, label)};
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

export interface Step {
  readonly label: string;
  readonly platform: PlatformName;
}

export const steps: ReadonlyArray<Step> = [
  { label: "Windows", platform: "win32" },
  { label: "macOS", platform: "darwin" },
];

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
