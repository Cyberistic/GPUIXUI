#!/usr/bin/env node
/**
 * Docs accessibility smoke (plan 512).
 *
 * `MISSION.md` asks every component page to carry accessibility considerations
 * and the site to work in both themes. The other guards cover one rule each —
 * heading order, code contrast, the focus ring, the skip link, responsive
 * layout — but no conformance rule set ever runs over a whole page. A list with
 * the wrong children, a scroll region no keyboard can reach or a caption dimmed
 * to 2.86:1 passes all of them.
 *
 * This runs **axe-core 4.10.2** against every sitemap page in both schemes, so
 * the site is swept by existing rather than by a remembered list. The dev-only
 * dependency is injected from `axe.source`; the gate never fetches a CDN.
 *
 *   nub scripts/smoke-a11y.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *                              [--only <path>]
 *
 * Exit `0` pass, `1` the site has a violation, `2` the check could not run
 * (build, server, Chrome or axe) — "unverified" is never a pass.
 */

import axe from "axe-core";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import {
  exitCode,
  passLine,
  reportLines,
  type PageReport,
  type Scheme,
  type Violation,
} from "./accessibility-report.ts";
import { findChrome, startSession, type Session } from "./chrome-session.ts";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

const SCHEMES: ReadonlyArray<Scheme> = ["light", "dark"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;
const WIDTH = 1280;
const HEIGHT = 900;
const SURFACE = "[data-preview-surface]";

/** A `#RRGGBB` token value as `getComputedStyle` reports it. */
const rgb = (hex: string): string => {
  const value = hex.replace("#", "").slice(0, 6);
  const channel = (offset: number): number =>
    Number.parseInt(value.slice(offset, offset + 2), 16);
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
};

const EXPECTED = {
  light: rgb(lightTheme.colors.background),
  dark: rgb(darkTheme.colors.background),
};

interface Options {
  readonly baseUrl: string | null;
  readonly build: boolean;
  readonly chrome: string | null;
  /** One page for a local loop; the committed gate sweeps the sitemap. */
  readonly only: string | null;
}

const usage =
  "usage: nub scripts/smoke-a11y.ts [--base-url <url>] [--chrome <path>] [--no-build] [--only <path>]";

const parseOptions = (argv: ReadonlyArray<string>): Options => {
  let baseUrl: string | null = null;
  let build = true;
  let chrome: string | null = null;
  let only: string | null = null;

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
    if (
      argument === "--base-url" ||
      argument === "--chrome" ||
      argument === "--only"
    ) {
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
      } else if (argument === "--only") {
        only = value.startsWith("/") ? value : `/${value}`;
      } else {
        chrome = value;
      }
      continue;
    }
    throw new SetupError(`unknown argument: ${argument}\n${usage}`);
  }

  return { baseUrl, build, chrome, only };
};

/** Every page, derived from the sitemap, so a new page joins by existing. */
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

/**
 * Load the page in the scheme under test and wait for the document and every
 * preview surface to agree with it.
 *
 * The theme class lands before the previews repaint (measured: a fixed 250 ms
 * after `dark` was applied, the Checkbox page's surface was still the light
 * background). Auditing then would report light-mode colours under the dark
 * heading — a false pass for anything the light palette happens to satisfy.
 */
const open = async (
  session: Session,
  baseUrl: string,
  path: string,
  scheme: Scheme,
): Promise<void> => {
  const url = new URL(path, baseUrl);
  await session.setColorScheme(scheme);
  await session.navigate(url.href);
  const dark = scheme === "dark";
  const settled = await session.waitFor(
    `document.readyState === "complete" &&
      document.documentElement.classList.contains("dark") === ${dark} &&
      [...document.querySelectorAll(${JSON.stringify(SURFACE)})].every(
        (element) => getComputedStyle(element).backgroundColor === ${JSON.stringify(EXPECTED[scheme])}
      )`,
  );
  if (!settled) {
    throw new SetupError(
      `${path} did not settle in the ${scheme} scheme; nothing was verified`,
    );
  }
};

/** Run axe in the page; the result is one element per violation. */
const audit = async (session: Session): Promise<ReadonlyArray<Violation>> => {
  await session.evaluate(axe.source);
  const violations = (await session.evaluate(`axe.run(document, {
    resultTypes: ["violations"],
    runOnly: { type: "tag", values: ${JSON.stringify([...TAGS])} },
  }).then((result) => result.violations.flatMap((violation) =>
    violation.nodes.map((node) => ({
      rule: violation.id,
      impact: violation.impact ?? "unknown",
      target: node.target.join(" "),
      summary: node.failureSummary ?? "",
    }))
  ))`)) as ReadonlyArray<Violation>;
  return violations;
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

    const discovered = await sitemapPaths(baseUrl);
    const pages =
      options.only === null
        ? discovered
        : discovered.filter((path) => path === options.only);
    if (pages.length === 0) {
      throw new SetupError(`${options.only} is not a sitemap page`);
    }

    session = await startSession(chrome);
    await session.setViewport(WIDTH, HEIGHT);

    const reports: PageReport[] = [];
    for (const path of pages) {
      for (const scheme of SCHEMES) {
        await open(session, baseUrl, path, scheme);
        const violations = await audit(session);
        reports.push({ path, scheme, violations });
        if (violations.length > 0) {
          console.error(
            `FAIL ${path} [${scheme}] — ${violations.length} violation(s)`,
          );
          for (const line of reportLines({ path, scheme, violations })) {
            console.error(`  ${line}`);
          }
        }
      }
    }

    if (exitCode(reports) === 0) {
      console.log(passLine(pages.length, SCHEMES.length));
      return 0;
    }
    console.error(`smoke: ${pages.length} pages × ${SCHEMES.length} schemes`);
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
