#!/usr/bin/env node
/**
 * Platform-toggle smoke (plan 509).
 *
 * `MISSION.md` accepts the platform styles on one sentence: a reader toggles
 * macOS -> Windows and every preview changes, the choice lives in the URL so a
 * link carries it, and it is remembered across navigation. `smoke:browser`
 * only ever *loaded* `?platform=win32`, so the control itself had no gate: a
 * `setPlatform` that stopped rewriting the URL, a provider that stopped storing
 * the choice, or a preview that stopped reading the published attribute would
 * pass every check.
 *
 * This script operates the radio group in a real browser and proves the whole
 * path: a click changes `<html data-platform>`, the URL, the checked option and
 * every preview surface; a client navigation keeps it; a fresh document with no
 * parameter remembers it; Default removes the parameter; and the arrow keys
 * move the choice, apply it and keep focus. Every expected label and mono
 * family is derived from `@gpuixui/tokens`, never typed.
 *
 *   nub scripts/smoke-platform.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the site is wrong, `2` the check could not run (build,
 * server or Chrome) — "unverified" is never a pass.
 */

import {
  platformTheme,
  platformTypes,
  themes,
  type PlatformName,
} from "@gpuixui/tokens";
import { movePlatform } from "../src/platform/platform-toggle-logic.ts";
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

const usage =
  "usage: nub scripts/smoke-platform.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const BUTTON = "/docs/components/button";
const NEXT_PAGE = "/docs/components/badge";
const THEMING = "/docs/theming";

const TOGGLE = "[data-platform-toggle]";
const OPTION = `${TOGGLE} [role="radio"]`;
const CHECKED = `${TOGGLE} [aria-checked="true"]`;

const darkPalette = themes.dark;

const monoFor = (platform: PlatformName): string =>
  platformTheme(darkPalette, platform).typography.mono;

const labelFor = (platform: PlatformName): string =>
  platformTypes[platform].label;

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

/** What the control and the page around it currently say. */
interface ToggleState {
  readonly platform: string;
  readonly search: string;
  readonly path: string;
  readonly mono: ReadonlyArray<string>;
  readonly checked: string;
  readonly tabStops: number;
  readonly note: string;
}

const readToggle = async (session: Session): Promise<ToggleState> =>
  JSON.parse(
    String(
      await session.evaluate(`JSON.stringify({
        platform: document.documentElement.dataset.platform ?? "",
        search: location.search,
        path: location.pathname,
        mono: [...document.querySelectorAll("[data-preview-surface]")]
          .flatMap((element) => [...(element.getAttribute("style") ?? "").matchAll(/--preview-font-mono\\s*:\\s*([^;"]+)/g)].map((match) => (match[1] ?? "").trim()))
          .filter((value) => value !== ""),
        checked: (document.querySelector(${JSON.stringify(CHECKED)})?.textContent ?? "").trim(),
        tabStops: document.querySelectorAll(${JSON.stringify(`${OPTION}[tabindex="0"]`)}).length,
        note: (document.querySelector("[data-platform-previews] p")?.textContent ?? "").trim(),
      })`),
    ),
  ) as ToggleState;

const check = (
  problems: string[],
  condition: boolean,
  message: string,
): void => {
  if (!condition) problems.push(message);
};

/**
 * The providers publish the resolved platform on `<html>` after hydration and a
 * preview repaints in the frame that follows. Wait for both, so a check reads a
 * settled document instead of the server's default snapshot.
 */
const settle = (
  session: Session,
  platform: PlatformName,
  timeoutMs = 15_000,
): Promise<boolean> => {
  const expected = JSON.stringify(monoFor(platform));
  return session.waitFor(
    `document.querySelectorAll("[data-platform-toggle]").length === 1 && document.documentElement.dataset.platform === ${JSON.stringify(platform)} && (() => {
      const surfaces = [...document.querySelectorAll("[data-preview-surface]")];
      return surfaces.length > 0 && surfaces.every((element) =>
        ((element.getAttribute("style") ?? "").match(/--preview-font-mono\\s*:\\s*([^;"]+)/)?.[1] ?? "").trim() === ${expected});
    })()`,
    timeoutMs,
  );
};

/** Report a page that did not reach the platform it was asked for. */
const settleProblems = async (
  session: Session,
  platform: PlatformName,
  where: string,
  problems: string[],
  timeoutMs = 5_000,
): Promise<void> => {
  if (await settle(session, platform, timeoutMs)) return;
  const state = await readToggle(session);
  problems.push(
    `${where}: the page did not settle on ${labelFor(platform)} (data-platform "${state.platform}", previews ${state.mono.join(", ") || "none"})`,
  );
};

/** Assert every preview surface painted the platform's mono family. */
const surfacesShow = (
  problems: string[],
  state: ToggleState,
  platform: PlatformName,
  where: string,
): void => {
  const expected = monoFor(platform);
  if (state.mono.length === 0) {
    problems.push(`${where}: no preview surface renders a mono family`);
    return;
  }
  for (const [index, value] of state.mono.entries()) {
    if (value !== expected) {
      problems.push(
        `${where}: preview surface ${index + 1} paints ${value}, expected ${expected}`,
      );
    }
  }
};

/** The URL carries the choice, and only a non-default platform carries it. */
const urlProblems = (
  problems: string[],
  state: ToggleState,
  platform: PlatformName,
  where: string,
): void => {
  const carried = new URLSearchParams(state.search).get("platform");
  if (platform === "default") {
    check(
      problems,
      carried === null,
      `${where}: the URL still carries platform=${String(carried)} after Default`,
    );
  } else {
    check(
      problems,
      carried === platform,
      `${where}: the URL carries platform=${String(carried)}, expected ${platform}`,
    );
  }
};

const checkedProblems = (
  problems: string[],
  state: ToggleState,
  platform: PlatformName,
  where: string,
): void => {
  const expected = labelFor(platform);
  check(
    problems,
    state.checked === expected,
    `${where}: the checked option is "${state.checked}", expected "${expected}"`,
  );
  check(
    problems,
    state.tabStops === 1,
    `${where}: the radio group has ${state.tabStops} tab stops, expected 1`,
  );
};

const open = async (
  session: Session,
  baseUrl: string,
  path: string,
  platform: PlatformName,
  where: string,
  problems: string[],
): Promise<ToggleState> => {
  const url = new URL(path, baseUrl);
  await session.setColorScheme("dark");
  await session.navigate(url.href);
  const arrived = await session.waitFor(
    `location.pathname === ${JSON.stringify(url.pathname)}`,
  );
  if (!arrived) problems.push(`${where}: ${url.pathname} did not load`);
  const settled = await settle(session, platform);
  const state = await readToggle(session);
  if (!settled) {
    problems.push(
      `${where}: the page did not settle on ${labelFor(platform)} (data-platform "${state.platform}", ${state.mono.length} surface(s))`,
    );
  }
  return state;
};

/** Click an option by its visible label; a missing option is a named problem. */
const clickPlatform = async (
  session: Session,
  platform: PlatformName,
  where: string,
  problems: string[],
): Promise<void> => {
  const label = labelFor(platform);
  const result = await session.evaluate(`(() => {
    const option = [...document.querySelectorAll(${JSON.stringify(OPTION)})]
      .find((button) => (button.textContent ?? "").trim() === ${JSON.stringify(label)});
    if (option === undefined) return "missing";
    option.click();
    return "clicked";
  })()`);
  if (result !== "clicked") {
    problems.push(`${where}: the ${label} option is not in the toggle`);
    return;
  }
  const changed = await session.waitFor(
    `document.documentElement.dataset.platform === ${JSON.stringify(platform)}`,
  );
  if (!changed) {
    const state = await readToggle(session);
    problems.push(
      `${where}: clicking ${label} left data-platform "${state.platform}"`,
    );
  }
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
    const problems: string[] = [];

    // 1. The control starts on the default platform, and its previews say so.
    const start = await open(
      session,
      baseUrl,
      BUTTON,
      "default",
      "step 1",
      problems,
    );
    check(
      problems,
      start.platform === "default",
      `step 1: data-platform is "${start.platform}", expected "default"`,
    );
    urlProblems(problems, start, "default", "step 1");
    checkedProblems(problems, start, "default", "step 1");
    surfacesShow(problems, start, "default", "step 1");

    // 2. A click changes the platform, the URL, the checked option and the paint.
    await clickPlatform(session, "win32", "step 2", problems);
    await settleProblems(session, "win32", "step 2", problems);
    const clicked = await readToggle(session);
    urlProblems(problems, clicked, "win32", "step 2");
    checkedProblems(problems, clicked, "win32", "step 2");
    surfacesShow(problems, clicked, "win32", "step 2");

    // 3. A client-side navigation keeps the choice the reader just made.
    const navigated = await session.evaluate(`(() => {
      const link = document.querySelector('a[href="${NEXT_PAGE}"]');
      if (link === null) return "missing";
      link.click();
      return "clicked";
    })()`);
    if (navigated !== "clicked") {
      problems.push(`step 3: no sidebar link to ${NEXT_PAGE}`);
    } else {
      const arrived = await session.waitFor(
        `location.pathname === ${JSON.stringify(NEXT_PAGE)}`,
      );
      if (!arrived)
        problems.push(`step 3: ${NEXT_PAGE} did not load after the click`);
      await settleProblems(session, "win32", "step 3", problems);
      const page = await readToggle(session);
      check(
        problems,
        page.platform === "win32",
        `step 3: navigation kept "${page.platform}", expected "win32"`,
      );
      urlProblems(problems, page, "win32", "step 3");
      surfacesShow(problems, page, "win32", "step 3");
    }

    // 4. A fresh document with no parameter remembers the stored choice.
    const stored = await open(
      session,
      baseUrl,
      THEMING,
      "win32",
      "step 4",
      problems,
    );
    check(
      problems,
      stored.platform === "win32",
      `step 4: a parameter-free load reports "${stored.platform}", expected the stored "win32"`,
    );
    urlProblems(problems, stored, "win32", "step 4");
    surfacesShow(problems, stored, "win32", "step 4");
    check(
      problems,
      stored.note.includes(labelFor("win32")),
      `step 4: the platform note does not name "${labelFor("win32")}": ${stored.note}`,
    );

    // 5. Default removes the parameter and restores the base theme.
    await clickPlatform(session, "default", "step 5", problems);
    await settleProblems(session, "default", "step 5", problems);
    const reset = await readToggle(session);
    urlProblems(problems, reset, "default", "step 5");
    checkedProblems(problems, reset, "default", "step 5");
    surfacesShow(problems, reset, "default", "step 5");
    check(
      problems,
      reset.note.includes(labelFor("default")),
      `step 5: the platform note does not name "${labelFor("default")}": ${reset.note}`,
    );

    // 6. The arrow keys move, apply and keep focus on the choice.
    const next = movePlatform("default", "ArrowRight");
    if (next === undefined) {
      throw new SetupError(
        "movePlatform has no neighbour for the default platform; the table is broken",
      );
    }
    const focused = await session.evaluate(`(() => {
      const option = document.querySelector(${JSON.stringify(CHECKED)});
      if (option === null) return "missing";
      option.focus();
      return document.activeElement === option ? "focused" : "unfocused";
    })()`);
    if (focused !== "focused") {
      problems.push(
        `step 6: the checked option could not take focus (${String(focused)})`,
      );
    } else {
      await session.press("ArrowRight");
      await settleProblems(session, next, "step 6", problems);
      const arrowed = await readToggle(session);
      urlProblems(problems, arrowed, next, "step 6");
      checkedProblems(problems, arrowed, next, "step 6");
      surfacesShow(problems, arrowed, next, "step 6");
      const holdsFocus = await session.waitFor(
        `document.activeElement === document.querySelector(${JSON.stringify(CHECKED)})`,
        2_000,
      );
      check(
        problems,
        holdsFocus,
        `step 6: focus did not follow the arrow to ${labelFor(next)}`,
      );

      await session.press("ArrowLeft");
      await settleProblems(session, "default", "step 6", problems);
      urlProblems(problems, await readToggle(session), "default", "step 6");
    }

    // 7. The run leaves the profile as it found it: Default is what is stored.
    const reloaded = await open(
      session,
      baseUrl,
      THEMING,
      "default",
      "step 7",
      problems,
    );
    check(
      problems,
      reloaded.platform === "default",
      `step 7: a reload reports "${reloaded.platform}" after Default`,
    );

    if (problems.length === 0) {
      for (let step = 1; step <= 7; step += 1) {
        console.log(`smoke: step ${step} checked`);
      }
      return 0;
    }
    for (const problem of problems) console.error(`FAIL ${problem}`);
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
