#!/usr/bin/env node
/**
 * Docs console smoke (plan 562).
 *
 * Every other production gate reads either the server HTML or a named piece of
 * hydrated state. A page can therefore load with a stale asset hash (every
 * chunk 404 while the document renders) or throw in a client effect and still
 * pass every check. This sweep loads **every sitemap page** in the production
 * build and fails on a console error, an uncaught exception or an error-level
 * log entry, naming the page and the error.
 *
 *   nub scripts/smoke-console.ts [--base-url <url>] [--chrome <path>]
 *                                [--no-build] [--only <path>]
 *
 * Exit `0` pass, `1` at least one page failed, `2` the check could not run
 * (build, server or Chrome) — "unverified" is never a pass.
 */

import { setTimeout as sleep } from "node:timers/promises";
import { findChrome, startSession, type Session } from "./chrome-session.ts";
import { errorLine, exitCode, passLine, uniqueErrors } from "./page-errors.ts";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

interface Options {
  readonly baseUrl: string | null;
  readonly build: boolean;
  readonly chrome: string | null;
  /** One page for a local loop; the committed gate sweeps the sitemap. */
  readonly only: string | null;
}

const usage =
  "usage: nub scripts/smoke-console.ts [--base-url <url>] [--chrome <path>] [--no-build] [--only <path>]";

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
    await session.setViewport(1280, 900);

    let failures = 0;
    for (const path of pages) {
      session.resetErrors();
      await session.navigate(new URL(path, baseUrl).href);
      const loaded = await session.waitFor(
        'document.readyState === "complete"',
      );
      if (!loaded) {
        throw new SetupError(
          `${path} never reached readyState "complete" within 15 s; nothing was verified`,
        );
      }
      // Hydration and late chunk loading are the window this gate exists for.
      await sleep(500);
      const errors = uniqueErrors(session.errors());
      for (const error of errors) {
        failures += 1;
        console.error(`FAIL ${errorLine(path, error)}`);
      }
      console.log(`smoke: ${path} checked`);
    }

    if (exitCode(failures) === 0) {
      console.log(passLine(pages.length));
      return 0;
    }
    console.error(`smoke: ${failures} error(s) on ${pages.length} pages`);
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
