#!/usr/bin/env node
/**
 * Hydrated-preview smoke check (plan 446).
 *
 * `smoke:build` reads the server HTML; this check lets a real browser hydrate
 * the production build and reads the **live** DOM. It is the guard for the bugs
 * plans 444/445 fixed: a dark page painting light previews and a shared
 * `?platform=` link keeping the default platform. Both are invisible to every
 * Node test because they depend on hydration order.
 *
 *   nub scripts/smoke-browser.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the site is wrong, `2` the check could not run (build,
 * server or Chrome) — "unverified" is never a pass.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  platformTypes,
  themes,
} from "@gpuixui/tokens";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

const CHROME_TIMEOUT_MS = 60_000;
const VIRTUAL_TIME_MS = 10_000;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].flatMap((candidate) => (candidate === undefined ? [] : [candidate]));

interface Options {
  readonly baseUrl: string | null;
  readonly build: boolean;
  readonly chrome: string | null;
}

interface Check {
  readonly path: string;
  readonly dark: boolean;
  readonly problems: (dom: string) => ReadonlyArray<string>;
}

const usage =
  "usage: nub scripts/smoke-browser.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const parseOptions = (argv: ReadonlyArray<string>): Options => {
  let baseUrl: string | null = null;
  let build = true;
  let chrome: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (argument === "--no-build") {
      build = false;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (argument === "--base-url" || argument === "--chrome") {
      const value = argv[index + 1];
      if (value === undefined)
        throw new SetupError(`${argument} needs a value`);
      index += 1;
      if (argument === "--base-url") {
        try {
          baseUrl = new URL(value).origin;
        } catch {
          throw new SetupError(`--base-url is not a URL: ${value}`);
        }
      } else {
        chrome = value;
      }
      continue;
    }
    throw new SetupError(`unknown argument: ${argument}\n${usage}`);
  }

  return { baseUrl, build, chrome };
};

const findChrome = (requested: string | null): string => {
  const candidates = requested === null ? CHROME_CANDIDATES : [requested];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found !== undefined) return found;
  throw new SetupError(
    `no Chrome found (tried ${candidates.join(", ")}); set CHROME_PATH or pass --chrome`,
  );
};

/** Every capture of a `--preview-*` variable — a page may show several. */
const previewVars = (dom: string, name: string): ReadonlyArray<string> =>
  [...dom.matchAll(new RegExp(`--preview-${name}:\\s*([^;"]+)`, "g"))].flatMap(
    (match) => {
      const value = match[1]?.trim();
      return value === undefined ? [] : [value];
    },
  );

const htmlClass = (dom: string): string =>
  dom.match(/<html[^>]*\bclass="([^"]*)"/)?.[1] ?? "";

const documentPlatform = (dom: string): string =>
  dom.match(/<html[^>]*\bdata-platform="([^"]*)"/)?.[1] ?? "";

/** One problem string per surface that disagrees; empty means the page agrees. */
const everySurface = (
  dom: string,
  name: string,
  expected: string,
): ReadonlyArray<string> => {
  const values = previewVars(dom, name);
  if (values.length === 0)
    return [`no preview surface carries --preview-${name}`];
  return values
    .filter((value) => value !== expected)
    .map((value) => `--preview-${name} is ${value}, expected ${expected}`);
};

const checks: ReadonlyArray<Check> = [
  {
    path: "/docs/components/button",
    dark: true,
    problems: (dom) => [
      ...(htmlClass(dom).includes("dark")
        ? []
        : [`<html class="${htmlClass(dom)}"> is not dark`]),
      ...everySurface(dom, "color-background", darkTheme.colors.background),
    ],
  },
  {
    path: "/docs/components/button",
    dark: false,
    problems: (dom) => [
      ...(htmlClass(dom).includes("light")
        ? []
        : [`<html class="${htmlClass(dom)}"> is not light`]),
      ...everySurface(dom, "color-background", lightTheme.colors.background),
    ],
  },
  {
    path: "/docs/components/button?platform=win32",
    dark: true,
    problems: (dom) => [
      ...(documentPlatform(dom) === "win32"
        ? []
        : [`data-platform is "${documentPlatform(dom)}", expected win32`]),
      ...everySurface(
        dom,
        "font-mono",
        platformTheme(themes.dark, "win32").typography.mono,
      ),
    ],
  },
  {
    path: "/docs/components/badge?platform=win32",
    dark: true,
    problems: (dom) => [
      ...(documentPlatform(dom) === "win32"
        ? []
        : [`data-platform is "${documentPlatform(dom)}", expected win32`]),
      ...everySurface(
        dom,
        "font-mono",
        platformTheme(themes.dark, "win32").typography.mono,
      ),
    ],
  },
  {
    path: "/docs/theming?platform=linux",
    dark: true,
    problems: (dom) => [
      ...(dom.includes(platformTypes.linux.label)
        ? []
        : [`the platform note does not name ${platformTypes.linux.label}`]),
      ...everySurface(
        dom,
        "font-mono",
        platformTheme(themes.dark, "linux").typography.mono,
      ),
    ],
  },
];

const dumpDom = (chrome: string, url: string, dark: boolean): Promise<string> =>
  new Promise((resolve, reject) => {
    const profile = mkdtempSync(join(tmpdir(), "gpuixui-chrome-"));
    const child = spawn(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        `--virtual-time-budget=${VIRTUAL_TIME_MS}`,
        `--blink-settings=preferredColorScheme=${dark ? 0 : 1}`,
        `--user-data-dir=${profile}`,
        "--dump-dom",
        url,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let output = "";
    let errors = "";
    const clean = (): void => rmSync(profile, { recursive: true, force: true });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      clean();
      reject(
        new SetupError(
          `chrome did not finish ${url} in ${CHROME_TIMEOUT_MS}ms`,
        ),
      );
    }, CHROME_TIMEOUT_MS);

    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      errors += chunk.toString();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      clean();
      reject(new SetupError(`cannot run ${chrome}: ${error.message}`));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      clean();
      if (output.includes("<html")) resolve(output);
      else {
        reject(
          new SetupError(
            `chrome exited ${code} without a DOM for ${url}\n${errors}`,
          ),
        );
      }
    });
  });

const main = async (): Promise<number> => {
  let preview: PreviewServer | null = null;
  try {
    const options = parseOptions(process.argv.slice(2));
    const chrome = findChrome(options.chrome);
    let baseUrl = options.baseUrl;
    if (baseUrl === null) {
      const server = await startDocsPreview({ build: options.build });
      preview = server;
      baseUrl = server.baseUrl;
    }

    const reachable = await fetch(baseUrl, {
      signal: AbortSignal.timeout(5_000),
    }).then(
      (response) => response.ok,
      () => false,
    );
    if (!reachable) {
      throw new SetupError(`${baseUrl} did not answer; nothing was verified`);
    }

    const problems: Array<{ where: string; what: string }> = [];
    for (const check of checks) {
      const label = `${check.path} (${check.dark ? "dark" : "light"})`;
      const dom = await dumpDom(chrome, baseUrl + check.path, check.dark);
      const failures = check.problems(dom);
      problems.push(...failures.map((what) => ({ where: label, what })));
      if (failures.length === 0) console.log(`smoke: ${label} checked`);
    }

    if (problems.length === 0) return 0;
    for (const problem of problems) {
      console.error(`FAIL ${problem.where}: ${problem.what}`);
    }
    console.error(`smoke: ${problems.length} problem(s)`);
    return 1;
  } catch (error) {
    if (error instanceof SetupError) {
      console.error(`smoke: not verified — ${error.message}`);
      return 2;
    }
    throw error;
  } finally {
    if (preview !== null) await preview.stop();
  }
};

const code = await main();
if (code === 0) console.log("smoke: ok");
process.exitCode = code;
