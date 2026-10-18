#!/usr/bin/env node
/**
 * Docs keyboard smoke (plan 496).
 *
 * The unit suite and the other smokes never press a key. This check drives the
 * real browser's focus traversal and proves the site's keyboard contract:
 *
 * - the skip link is the first tab stop and adds no chrome before focus;
 * - focused, it is visible and paints the library's `ring` token;
 * - Enter follows it, and focus moves to the page target (`tabIndex={-1}`),
 *   not only the address bar's hash.
 *
 * Two pages cover both layouts: a docs page (dark) targets `#nd-page`, the home
 * page (light) targets `#main-content`.
 *
 *   nub scripts/smoke-keyboard.ts [--base-url <url>] [--chrome <path>] [--no-build]
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

interface Options {
  readonly baseUrl: string | null;
  readonly build: boolean;
  readonly chrome: string | null;
}

interface KeyboardTarget {
  readonly path: string;
  /** The skip link's href and the id of its focusable target. */
  readonly id: string;
  readonly dark: boolean;
}

const usage =
  "usage: nub scripts/smoke-keyboard.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const targets: ReadonlyArray<KeyboardTarget> = [
  { path: "/docs/components/button", id: "nd-page", dark: true },
  { path: "/", id: "main-content", dark: false },
  { path: "/docs/does-not-exist", id: "main-content", dark: true },
];

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

/** The focused element's geometry and paint, plus the resolved ring colour. */
interface FocusState {
  readonly skipLink: boolean;
  readonly width: number;
  readonly height: number;
  readonly outlineWidth: number;
  readonly outlineColor: string;
  readonly ringColor: string;
  readonly active: string;
}

const focusState = async (session: Session): Promise<FocusState> => {
  const value = await session.evaluate(`(() => {
    const active = document.activeElement;
    const link = document.querySelector("a[data-skip-link]");
    const rect = active?.getBoundingClientRect();
    const probe = document.createElement("span");
    probe.style.color = "var(--color-fd-ring)";
    document.body.append(probe);
    const ringColor = getComputedStyle(probe).color;
    probe.remove();
    const style = active === null ? null : getComputedStyle(active);
    return JSON.stringify({
      skipLink: active !== null && active === link,
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
      outlineWidth: style === null ? 0 : Number.parseFloat(style.outlineWidth),
      outlineColor: style?.outlineColor ?? "",
      ringColor,
      active: active === null
        ? "none"
        : active.id === ""
          ? active.tagName.toLowerCase()
          : active.tagName.toLowerCase() + "#" + active.id,
    });
  })()`);
  return JSON.parse(String(value)) as FocusState;
};

/** The skip link's size before any key is pressed. */
const restingSize = async (
  session: Session,
): Promise<{ readonly width: number; readonly height: number } | null> => {
  const value = await session.evaluate(`(() => {
    const link = document.querySelector("a[data-skip-link]");
    if (link === null) return "null";
    const rect = link.getBoundingClientRect();
    return JSON.stringify({ width: rect.width, height: rect.height });
  })()`);
  const text = String(value);
  return text === "null"
    ? null
    : (JSON.parse(text) as { width: number; height: number });
};

/**
 * One page's keyboard contract. Every failure names the step, so a regression
 * report says which obligation broke rather than only that the page failed.
 */
const checkTarget = async (
  session: Session,
  baseUrl: string,
  target: KeyboardTarget,
): Promise<ReadonlyArray<string>> => {
  const url = new URL(target.path, baseUrl);
  await session.setColorScheme(target.dark ? "dark" : "light");
  await session.navigate(url.href);

  const arrived = await session.waitFor(
    `location.pathname + location.search === ${JSON.stringify(url.pathname + url.search)}`,
  );
  if (!arrived) throw new SetupError(`${target.path} did not load`);

  const ready = await session.waitFor(
    `document.documentElement.dataset.platform !== undefined && document.getElementById(${JSON.stringify(target.id)}) !== null`,
  );
  if (!ready) throw new SetupError(`${target.path} did not hydrate`);

  const problems: string[] = [];
  const resting = await restingSize(session);
  if (resting === null) {
    return ["no skip link in the document"];
  }
  if (resting.width > 1 || resting.height > 1) {
    problems.push(
      `the skip link is visible before focus (${resting.width}x${resting.height})`,
    );
  }

  await session.press("Tab");
  const focused = await focusState(session);
  if (!focused.skipLink) {
    problems.push(
      `Tab did not focus the skip link (activeElement: ${focused.active})`,
    );
    return problems;
  }
  if (focused.width <= 40 || focused.height < 16) {
    problems.push(
      `the skip link stayed hidden while focused (${focused.width}x${focused.height})`,
    );
  }
  if (focused.outlineWidth < 2) {
    problems.push(
      `the focused skip link paints a ${focused.outlineWidth}px outline, expected 2px`,
    );
  }
  if (focused.outlineColor !== focused.ringColor) {
    problems.push(
      `focus outline is ${focused.outlineColor}, expected the ring token ${focused.ringColor}`,
    );
  }

  await session.press("Enter");
  const followed = await session.waitFor(
    `location.hash === ${JSON.stringify(`#${target.id}`)}`,
  );
  if (!followed) {
    const hash = String(await session.evaluate("location.hash"));
    problems.push(
      `Enter did not follow the skip link (hash is "${hash}", expected "#${target.id}")`,
    );
    return problems;
  }
  const arrivedAt = String(
    await session.evaluate('document.activeElement?.id ?? ""'),
  );
  if (arrivedAt !== target.id) {
    problems.push(
      `focus stayed on "${arrivedAt || "body"}", expected the "${target.id}" target`,
    );
  }

  return problems;
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
    for (const target of targets) {
      const failures = await checkTarget(session, baseUrl, target);
      problems.push(...failures.map((what) => ({ where: target.path, what })));
      if (failures.length === 0) {
        console.log(`smoke: ${target.path} keyboard checked`);
      }
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
