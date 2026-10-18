#!/usr/bin/env node
/**
 * Hydrated-preview smoke check (plans 446, 495, 498).
 *
 * `smoke:build` reads the server HTML; this check lets a real browser hydrate
 * the production build and reads the **live** DOM. It is the guard for the bugs
 * plans 444/445 fixed: a dark page painting light previews and a shared
 * `?platform=` link keeping the default platform. Both are invisible to every
 * Node test because they depend on hydration order.
 *
 * Every component page that carries a labelled preview is read in **both**
 * schemes (plan 495): the surface reads the mode and platform the providers
 * publish, so one page outside the providers or one surface that ignores the
 * published state must fail here by name. The page list comes from the MDX
 * tree; `component-preview.test.tsx` keeps it equal to the preview registry.
 *
 * Every page also owes readable code: each distinct syntax colour is compared
 * to the 4.5:1 text floor on the surface it is painted on (plan 498), because
 * only the rendered document resolves Shiki's variables to pixels.
 *
 *   nub scripts/smoke-browser.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the site is wrong, `2` the check could not run (build,
 * server or Chrome) — "unverified" is never a pass.
 */

import { fileURLToPath } from "node:url";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  platformTypes,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import {
  contrastRatio,
  parseColour,
  TEXT_CONTRAST_FLOOR,
} from "../src/lib/code-palette.ts";
import { findChrome, startSession, type Session } from "./chrome-session.ts";
import { previewPageSlugs } from "./preview-pages.ts";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

interface Options {
  readonly baseUrl: string | null;
  readonly build: boolean;
  readonly chrome: string | null;
}

/** What the hydrated document says about itself and its preview surfaces. */
interface DomState {
  readonly className: string;
  readonly platform: string;
  readonly surfaces: readonly string[];
  readonly note: string;
  readonly codeText: readonly CodeText[];
}

/** One distinct syntax colour the page paints, with its first opaque background. */
interface CodeText {
  readonly colour: string;
  readonly background: string;
  readonly text: string;
}

interface Check {
  readonly path: string;
  readonly dark: boolean;
  readonly problems: (dom: DomState) => ReadonlyArray<string>;
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

/** Every value of a `--preview-*` variable in one surface's style attribute. */
const previewVars = (style: string, name: string): ReadonlyArray<string> =>
  [
    ...style.matchAll(new RegExp(`--preview-${name}\\s*:\\s*([^;"]+)`, "g")),
  ].flatMap((match) => {
    const value = match[1]?.trim();
    return value === undefined ? [] : [value];
  });

/** One problem string per surface that disagrees; empty means every surface agrees. */
const everySurface = (
  dom: DomState,
  name: string,
  expected: string,
): ReadonlyArray<string> => {
  if (dom.surfaces.length === 0)
    return [`no preview surface carries --preview-${name}`];
  return dom.surfaces.flatMap((style, index) => {
    const value = previewVars(style, name)[0];
    return value === expected
      ? []
      : [
          `--preview-${name} is ${value ?? "absent"}, expected ${expected} (surface ${index + 1} of ${dom.surfaces.length})`,
        ];
  });
};

const modeProblems = (dom: DomState, dark: boolean): ReadonlyArray<string> =>
  dom.className.split(/\s+/).includes(dark ? "dark" : "light")
    ? []
    : [`<html class="${dom.className}"> is not ${dark ? "dark" : "light"}`];

const platformProblems = (
  dom: DomState,
  platform: string,
): ReadonlyArray<string> =>
  dom.platform === platform
    ? []
    : [`data-platform is "${dom.platform}", expected ${platform}`];

/**
 * Every distinct syntax colour has to clear the 4.5:1 text floor on the surface
 * it is painted on (plan 498). The unit suite proves the configured palette; only
 * the painted document proves the palette reached the renderer.
 */
const codeContrastProblems = (dom: DomState): ReadonlyArray<string> =>
  dom.codeText.flatMap(({ colour, background, text }) => {
    const foreground = parseColour(colour);
    const behind = parseColour(background);
    if (foreground === null || behind === null) {
      return [`code colour ${colour} on ${background} could not be read`];
    }
    const ratio = contrastRatio(foreground, behind);
    return ratio + 0.005 >= TEXT_CONTRAST_FLOOR
      ? []
      : [
          `${colour} on ${background} is ${ratio.toFixed(2)}:1, below ${TEXT_CONTRAST_FLOOR}:1 (e.g. "${text}")`,
        ];
  });

/**
 * Every preview page owes both schemes: its surfaces read the mode the
 * providers publish, so a dark page must paint the dark palette on all of them.
 */
const previewChecks = (slugs: ReadonlyArray<string>): ReadonlyArray<Check> =>
  slugs.flatMap((slug) =>
    [true, false].map((dark): Check => {
      const theme: Theme = dark ? darkTheme : lightTheme;
      return {
        path: `/docs/components/${slug}`,
        dark,
        problems: (dom) => [
          ...modeProblems(dom, dark),
          ...everySurface(dom, "color-background", theme.colors.background),
        ],
      };
    }),
  );

const darkPalette = themes.dark;

/** The three pages that prove the platform override reaches every surface. */
const platformChecks: ReadonlyArray<Check> = [
  {
    path: "/docs/components/button?platform=win32",
    dark: true,
    problems: (dom) => [
      ...platformProblems(dom, "win32"),
      ...everySurface(
        dom,
        "font-mono",
        platformTheme(darkPalette, "win32").typography.mono,
      ),
    ],
  },
  {
    path: "/docs/components/badge?platform=win32",
    dark: true,
    problems: (dom) => [
      ...platformProblems(dom, "win32"),
      ...everySurface(
        dom,
        "font-mono",
        platformTheme(darkPalette, "win32").typography.mono,
      ),
    ],
  },
  {
    path: "/docs/theming?platform=linux",
    dark: true,
    problems: (dom) => [
      ...platformProblems(dom, "linux"),
      ...(dom.note.includes(platformTypes.linux.label)
        ? []
        : [`the platform note does not name ${platformTypes.linux.label}`]),
      ...everySurface(
        dom,
        "font-mono",
        platformTheme(darkPalette, "linux").typography.mono,
      ),
    ],
  },
];

const pageDirectory = fileURLToPath(
  new URL("../content/docs/components/", import.meta.url),
);

const checks: ReadonlyArray<Check> = [
  ...previewChecks(previewPageSlugs(pageDirectory)),
  ...platformChecks,
];

const readDom = async (session: Session): Promise<DomState> =>
  JSON.parse(
    String(
      await session.evaluate(`JSON.stringify({
        className: document.documentElement.className,
        platform: document.documentElement.dataset.platform ?? "",
        surfaces: [...document.querySelectorAll("[data-preview-surface]")].map((element) => element.getAttribute("style") ?? ""),
        note: document.querySelector("[data-platform-previews] p")?.textContent ?? "",
        codeText: (() => {
          const opaque = (element) => {
            let node = element;
            while (node !== null) {
              const value = getComputedStyle(node).backgroundColor;
              if (value.startsWith("rgb(")) return value;
              node = node.parentElement;
            }
            return null;
          };
          const seen = new Map();
          for (const span of document.querySelectorAll("pre span")) {
            if (span.children.length > 0) continue;
            const text = (span.textContent ?? "").trim();
            if (text === "") continue;
            const colour = getComputedStyle(span).color;
            const background = opaque(span);
            if (background === null) continue;
            const key = colour + "|" + background;
            if (!seen.has(key)) {
              seen.set(key, { colour, background, text: text.slice(0, 30) });
            }
          }
          return [...seen.values()];
        })(),
      })`),
    ),
  ) as DomState;

/**
 * Navigate, wait until the new document owns the address bar, has hydrated and
 * its preview surfaces have re-rendered into the emulated scheme, then read it.
 * Without the address check a check can pass on the **previous** page's
 * document; without the settled check the previews can still be the server's
 * light snapshot for a frame after the providers publish the mode.
 */
const openPage = async (
  session: Session,
  baseUrl: string,
  check: Check,
  label: string,
  theme: Theme,
): Promise<DomState> => {
  const url = new URL(check.path, baseUrl);
  await session.setColorScheme(check.dark ? "dark" : "light");
  await session.navigate(url.href);
  const arrived = await session.waitFor(
    `location.pathname + location.search === ${JSON.stringify(url.pathname + url.search)}`,
  );
  if (!arrived) throw new SetupError(`${label} did not load`);
  const expected = JSON.stringify(theme.colors.background);
  // A page that never settles is reported by the check below with the value it
  // actually painted, not by a timeout with no evidence. The attribute is
  // serialized with or without a space after the colon, so the test parses it.
  await session.waitFor(
    `document.documentElement.dataset.platform !== undefined && document.documentElement.classList.contains(${JSON.stringify(check.dark ? "dark" : "light")}) && [...document.querySelectorAll("[data-preview-surface]")].length > 0 && [...document.querySelectorAll("[data-preview-surface]")].every((element) => (element.getAttribute("style") ?? "").match(/--preview-color-background\\s*:\\s*([^;]+)/)?.[1]?.trim() === ${expected})`,
  );
  return readDom(session);
};

const main = async (): Promise<number> => {
  let preview: PreviewServer | null = null;
  let session: Session | null = null;
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

    session = await startSession(chrome);

    const problems: Array<{ where: string; what: string }> = [];
    for (const check of checks) {
      const label = `${check.path} (${check.dark ? "dark" : "light"})`;
      const dom = await openPage(
        session,
        baseUrl,
        check,
        label,
        check.dark ? darkTheme : lightTheme,
      );
      const failures = [...check.problems(dom), ...codeContrastProblems(dom)];
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
    if (session !== null) await session.stop();
    if (preview !== null) await preview.stop();
  }
};

const code = await main();
if (code === 0) console.log("smoke: ok");
process.exitCode = code;
