#!/usr/bin/env node
/**
 * Docs responsive smoke (plan 502).
 *
 * MISSION.md lists responsive layout as part of showcase quality, but every
 * other check reads the source tree or a ≥640 px viewport. This check gives the
 * site a phone: a 390×844 layout viewport, every sitemap page, and one real
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

/**
 * Every page, derived from the sitemap, so a new page joins the check by
 * existing rather than by a remembered list (the same rule as `smoke:browser`).
 */
const sitemapPaths = async (
  baseUrl: string,
): Promise<ReadonlyArray<string>> => {
  const response = await fetch(`${baseUrl}/sitemap.xml`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new SetupError(`/sitemap.xml answered ${response.status}`);
  }
  const body = await response.text();
  const paths = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((match) => {
    const loc = match[1];
    if (loc === undefined) return [];
    try {
      return [new URL(loc).pathname];
    } catch {
      return [];
    }
  });
  if (paths.length === 0) {
    throw new SetupError("/sitemap.xml has no <loc> entries");
  }
  return paths;
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

  const themeState = controlState("[data-theme-toggle]");
  const themeSettled = await session.waitFor(`(${themeState}) === "ok"`, 2_000);
  if (!themeSettled) {
    const state = await session.evaluate(themeState);
    return [`the docs theme switch is ${String(state)} in the mobile sidebar`];
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

/** How a control looks to a pointer: missing, hidden, zero-sized or outside. */
const controlState = (selector: string): string => `(() => {
  const node = document.querySelector(${JSON.stringify(selector)});
  if (node === null) return "missing";
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  if (style.visibility !== "visible" || style.display === "none") return "hidden";
  if (rect.width === 0 || rect.height === 0) return "zero";
  if (rect.left < 0 || rect.right > ${WIDTH} + 1) {
    return \`outside \${Math.round(rect.left)}..\${Math.round(rect.right)}\`;
  }
  return "ok";
})()`;

/**
 * The controls MISSION names must be reachable on a phone, not only wired.
 * The landing page's Fumadocs switch lives in a `max-lg:hidden` container, so
 * the site ships a compact one; the platform radio group becomes a select. A
 * hidden but clickable control would pass the theme and platform gates, so the
 * phone's own header is measured here (plan 519).
 */
const checkControls = async (
  session: Session,
  baseUrl: string,
): Promise<ReadonlyArray<string>> => {
  await session.navigate(`${baseUrl}/`);
  const arrived = await session.waitFor(
    `document.documentElement?.dataset.platform !== undefined && location.pathname === "/"`,
  );
  if (!arrived) throw new SetupError("/ did not hydrate");

  const measured = JSON.parse(
    String(
      await session.evaluate(`JSON.stringify({
        theme: ${controlState("[data-compact-theme-toggle]")},
        platform: ${controlState("[data-platform-select]")},
        desktopTheme: ${controlState("[data-theme-toggle]")},
      })`),
    ),
  ) as {
    readonly theme: string;
    readonly platform: string;
    readonly desktopTheme: string;
  };

  return [
    ...(measured.theme === "ok"
      ? []
      : [`the compact theme switch is ${measured.theme} at ${WIDTH}px`]),
    ...(measured.platform === "ok"
      ? []
      : [`the platform select is ${measured.platform} at ${WIDTH}px`]),
    ...(measured.desktopTheme === "ok"
      ? [`both theme switches are displayed at ${WIDTH}px`]
      : []),
  ];
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

    const paths = await sitemapPaths(baseUrl);
    const problems: Array<{ where: string; what: string }> = [];
    for (const path of paths) {
      const failures = await checkWidth(session, baseUrl, path);
      problems.push(...failures.map((what) => ({ where: path, what })));
    }
    console.log(`smoke: ${paths.length} pages responsive checked`);

    const controlFailures = await checkControls(session, baseUrl);
    if (controlFailures.length === 0) {
      console.log("smoke: phone controls checked");
    }

    const navFailures = await checkNavigation(session, baseUrl);
    problems.push(...navFailures.map((what) => ({ where: navPath, what })));
    if (navFailures.length === 0) {
      console.log("smoke: mobile navigation checked");
    }

    problems.push(...controlFailures.map((what) => ({ where: "/", what })));

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
