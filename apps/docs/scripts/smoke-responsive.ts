#!/usr/bin/env node
/**
 * Docs responsive smoke (plan 502).
 *
 * MISSION.md lists responsive layout as part of showcase quality, but every
 * other check reads the source tree or a ≥640 px viewport. This check gives the
 * site a phone: a 390×844 layout viewport, six page shapes, and one real
 * interaction.
 *
 * - No page scrolls sideways: `documentElement.scrollWidth` stays at the
 *   viewport (a 1 px rounding tolerance).
 * - No content is clipped: Fumadocs wraps the article in
 *   `#nd-docs-layout { overflow-x: clip }`, so a wide block does not grow the
 *   document — it silently disappears past the column. The check compares the
 *   article's `scrollWidth` with its `clientWidth` too. This is the assertion
 *   that found the tier-V suite path on the Buttons page (plan 502).
 * - The mobile sidebar works: Fumadocs' `Open Sidebar` button reveals the nav,
 *   and its `/docs/installation` link really navigates. Every docs page shares
 *   the shell, so this is checked once.
 *
 *   nub scripts/smoke-responsive.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the site is wrong, `2` the check could not run (build,
 * server or Chrome) — "unverified" is never a pass.
 */

import { findChrome, startSession, type Session } from "./chrome-session.ts";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

const WIDTH = 390;
const HEIGHT = 844;

interface Options {
  readonly baseUrl: string | null;
  readonly build: boolean;
  readonly chrome: string | null;
}

const usage =
  "usage: nub scripts/smoke-responsive.ts [--base-url <url>] [--chrome <path>] [--no-build]";

/** One page per layout shape: landing, prose, index, tables, sources, tokens. */
const targets: ReadonlyArray<string> = [
  "/",
  "/docs",
  "/docs/components",
  "/docs/components/button",
  "/docs/api-reference",
  "/docs/theming",
];

const navPath = "/docs/components/button";
const navTarget = "/docs/installation";

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

interface Geometry {
  readonly viewport: number;
  readonly document: number;
  readonly container: {
    readonly id: string;
    readonly client: number;
    readonly scroll: number;
  } | null;
}

const geometry = async (session: Session): Promise<Geometry> => {
  const value = await session.evaluate(`(() => {
    const container =
      document.querySelector("#nd-page") ??
      document.querySelector("#main-content");
    return JSON.stringify({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      container:
        container === null
          ? null
          : {
              id: container.id,
              client: container.clientWidth,
              scroll: container.scrollWidth,
            },
    });
  })()`);
  return JSON.parse(String(value)) as Geometry;
};

/**
 * One page's width contract. A failure names both numbers, so a regression
 * report says how far the page escaped rather than only that it did.
 */
const checkWidth = async (
  session: Session,
  baseUrl: string,
  path: string,
): Promise<ReadonlyArray<string>> => {
  const url = new URL(path, baseUrl);
  await session.navigate(url.href);

  const arrived = await session.waitFor(
    `document.documentElement?.dataset.platform !== undefined && location.pathname === ${JSON.stringify(url.pathname)}`,
  );
  if (!arrived) throw new SetupError(`${path} did not hydrate`);

  const measured = await geometry(session);
  if (measured.viewport !== WIDTH) {
    throw new SetupError(
      `${path} has a ${measured.viewport}px viewport, expected ${WIDTH} — the emulation did not apply`,
    );
  }
  if (measured.container === null) {
    throw new SetupError(`${path} has no #nd-page or #main-content container`);
  }

  return [
    ...(measured.document > WIDTH + 1
      ? [`scrolls horizontally (${measured.document} > ${WIDTH})`]
      : []),
    ...(measured.container.scroll > measured.container.client + 1
      ? [
          `clips content in #${measured.container.id} (${measured.container.scroll} > ${measured.container.client})`,
        ]
      : []),
  ];
};

/** The mobile sidebar must open and its link must navigate, not only exist. */
const checkNavigation = async (
  session: Session,
  baseUrl: string,
): Promise<ReadonlyArray<string>> => {
  await session.navigate(new URL(navPath, baseUrl).href);
  const arrived = await session.waitFor(
    `document.documentElement?.dataset.platform !== undefined && location.pathname === ${JSON.stringify(navPath)}`,
  );
  if (!arrived) throw new SetupError(`${navPath} did not hydrate`);

  const opened = await session.evaluate(`(() => {
    const button = document.querySelector("button[aria-label='Open Sidebar']");
    if (button === null || button.getBoundingClientRect().width === 0) {
      return "missing";
    }
    button.click();
    return "clicked";
  })()`);
  if (opened !== "clicked") {
    return ["no visible Open Sidebar button at a phone width"];
  }

  const selector = `a[href=${JSON.stringify(navTarget)}]`;
  const revealed = await session.waitFor(
    `[...document.querySelectorAll(${JSON.stringify(selector)})].some((link) => link.getBoundingClientRect().width > 0)`,
  );
  if (!revealed) {
    return [`the mobile sidebar did not reveal ${navTarget}`];
  }

  const clicked = await session.evaluate(`(() => {
    const link = [...document.querySelectorAll(${JSON.stringify(selector)})].find(
      (candidate) => candidate.getBoundingClientRect().width > 0,
    );
    if (link === undefined) return "missing";
    link.click();
    return "clicked";
  })()`);
  if (clicked !== "clicked") {
    return [`no visible ${navTarget} link in the mobile sidebar`];
  }

  const navigated = await session.waitFor(
    `location.pathname === ${JSON.stringify(navTarget)}`,
  );
  if (navigated) return [];
  const path = String(await session.evaluate("location.pathname"));
  return [`the mobile sidebar link did not navigate (path is "${path}")`];
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
    await session.setViewport(WIDTH, HEIGHT);
    console.log(`smoke: viewport ${WIDTH}x${HEIGHT}`);

    const problems: Array<{ where: string; what: string }> = [];
    for (const path of targets) {
      const failures = await checkWidth(session, baseUrl, path);
      problems.push(...failures.map((what) => ({ where: path, what })));
      if (failures.length === 0) {
        console.log(`smoke: ${path} responsive checked`);
      }
    }

    const navFailures = await checkNavigation(session, baseUrl);
    problems.push(...navFailures.map((what) => ({ where: navPath, what })));
    if (navFailures.length === 0) {
      console.log("smoke: mobile navigation checked");
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
