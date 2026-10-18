#!/usr/bin/env node
/**
 * Theme-toggle smoke (plan 511).
 *
 * `MISSION.md` asks for light/dark docs themes. The other browser smokes force
 * the colour scheme through CDP, so they prove the site *renders* both modes;
 * none of them presses the control a reader presses. A provider that ignores
 * the toggle, a `forcedTheme` left in the tree or a preview surface that stops
 * reading the published mode would pass every check.
 *
 * This script operates the real switch (`[data-theme-toggle]`) and proves the
 * whole path: a press turns the document, the page background and every preview
 * surface dark and stores the choice; a client navigation and a parameter-free
 * reload keep it; a second press returns to light. The scheme stays forced to
 * **light** for the whole run, so a dark page after navigation can only come
 * from the stored choice, never from the host's preference.
 *
 *   nub scripts/smoke-theme.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the site is wrong, `2` the check could not run (build,
 * server or Chrome) — "unverified" is never a pass.
 */

import { darkTheme, lightTheme } from "@gpuixui/tokens";
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
  "usage: nub scripts/smoke-theme.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const BUTTON = "/docs/components/button";
const BADGE = "/docs/components/badge";

/** The control Fumadocs renders, and the surface every preview paints on. */
const TOGGLE = "[data-theme-toggle]";
const SURFACE = "[data-preview-surface]";

/** A `#RRGGBB` token value as the browser reports it. */
const rgb = (hex: string): string => {
  const value = hex.replace("#", "").slice(0, 6);
  const channel = (offset: number): number =>
    Number.parseInt(value.slice(offset, offset + 2), 16);
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
};

const light = rgb(lightTheme.colors.background);
const dark = rgb(darkTheme.colors.background);

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

/** What the document and the surfaces it paints currently say. */
interface ThemeState {
  readonly dark: boolean;
  readonly scheme: string;
  readonly stored: string | null;
  readonly body: string;
  readonly surfaces: ReadonlyArray<string>;
  readonly toggles: number;
}

const readTheme = async (session: Session): Promise<ThemeState> =>
  JSON.parse(
    String(
      await session.evaluate(`JSON.stringify({
        dark: document.documentElement.classList.contains("dark"),
        scheme: getComputedStyle(document.documentElement).colorScheme,
        stored: localStorage.getItem("theme"),
        body: getComputedStyle(document.body).backgroundColor,
        surfaces: [...document.querySelectorAll(${JSON.stringify(SURFACE)})]
          .map((element) => getComputedStyle(element).backgroundColor),
        toggles: document.querySelectorAll(${JSON.stringify(TOGGLE)}).length,
      })`),
    ),
  ) as ThemeState;

const check = (
  problems: string[],
  condition: boolean,
  message: string,
): void => {
  if (!condition) problems.push(message);
};

/**
 * The class and a repainted preview land in the frames after the press, and a
 * client route change briefly renders the server snapshot. Wait for both the
 * document and every surface, so a check reads a settled page.
 */
const settle = (
  session: Session,
  mode: "light" | "dark",
  timeoutMs = 15_000,
): Promise<boolean> => {
  const expected = JSON.stringify(mode === "dark" ? dark : light);
  const isDark = mode === "dark";
  return session.waitFor(
    `document.querySelectorAll(${JSON.stringify(TOGGLE)}).length === 1 &&
      document.documentElement.dataset.platform !== undefined &&
      document.documentElement.classList.contains("dark") === ${isDark} &&
      (() => {
        const surfaces = [...document.querySelectorAll(${JSON.stringify(SURFACE)})];
        return surfaces.length > 0 && surfaces.every((element) =>
          getComputedStyle(element).backgroundColor === ${expected});
      })()`,
    timeoutMs,
  );
};

const settleProblems = async (
  session: Session,
  mode: "light" | "dark",
  where: string,
  problems: string[],
): Promise<void> => {
  if (await settle(session, mode, 5_000)) return;
  const state = await readTheme(session);
  problems.push(
    `${where}: the page did not turn ${mode} (dark ${state.dark}, stored ${state.stored ?? "nothing"}, body ${state.body}, previews ${state.surfaces.join(", ") || "none"})`,
  );
};

/** Assert the document, its background and every preview surface agree. */
const shows = (
  problems: string[],
  state: ThemeState,
  mode: "light" | "dark",
  where: string,
): void => {
  const expected = mode === "dark" ? dark : light;
  check(
    problems,
    state.dark === (mode === "dark"),
    `${where}: the document is ${state.dark ? "dark" : "light"}, expected ${mode}`,
  );
  check(
    problems,
    state.scheme === mode,
    `${where}: color-scheme is "${state.scheme}", expected "${mode}"`,
  );
  check(
    problems,
    state.body === expected,
    `${where}: the page background is ${state.body}, expected ${expected}`,
  );
  check(
    problems,
    state.surfaces.length > 0,
    `${where}: the page paints no preview surface to check`,
  );
  for (const surface of state.surfaces) {
    check(
      problems,
      surface === expected,
      `${where}: a preview surface paints ${surface}, expected ${expected}`,
    );
  }
};

/** Press the switch; a missing control is one named problem. */
const clickToggle = async (session: Session): Promise<boolean> =>
  (await session.evaluate(`(() => {
    const toggle = document.querySelector(${JSON.stringify(TOGGLE)});
    if (toggle === null) return "missing";
    toggle.click();
    return "clicked";
  })()`)) === "clicked";

/** Press the home layout's compact switch; a missing control is one problem. */
const pressCompact = async (session: Session): Promise<boolean> =>
  (await session.evaluate(`(() => {
    const toggle = document.querySelector("[data-compact-theme-toggle]");
    if (toggle === null) return "missing";
    toggle.click();
    return "clicked";
  })()`)) === "clicked";

/**
 * Press until the page reaches `mode`.
 *
 * next-themes resolves its stored/system choice in a mount effect, and a press
 * that lands before that effect is written over (measured: a click at the first
 * painted frame leaves the document light, while the same click one second
 * later toggles). One retry absorbs that window; a control that is actually
 * dead fails both presses and is reported with the state it read.
 */
const press = async (
  session: Session,
  mode: "light" | "dark",
  where: string,
  problems: string[],
): Promise<void> => {
  if (!(await clickToggle(session))) {
    problems.push(`${where}: the theme toggle is not in the page`);
    return;
  }
  if (await settle(session, mode, 1_500)) return;

  if (!(await clickToggle(session))) {
    problems.push(`${where}: the theme toggle disappeared after the press`);
    return;
  }
  await settleProblems(session, mode, where, problems);
};

/** Open a page and wait for it to settle in the mode the reader left behind. */
const open = async (
  session: Session,
  baseUrl: string,
  path: string,
  mode: "light" | "dark",
  where: string,
  problems: string[],
): Promise<ThemeState> => {
  const url = new URL(path, baseUrl);
  await session.setColorScheme("light");
  await session.navigate(url.href);
  const arrived = await session.waitFor(
    `location.pathname === ${JSON.stringify(url.pathname)}`,
  );
  if (!arrived) problems.push(`${where}: ${url.pathname} did not load`);
  await settleProblems(session, mode, where, problems);
  return readTheme(session);
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
    // The docs switch lives in the desktop header; at Chrome's default 640 px
    // window Fumadocs hides it behind the mobile sidebar, and a click on a
    // hidden node would prove the wiring without proving it is reachable.
    await session.setViewport(1280, 800);
    const problems: string[] = [];

    // 1. A fresh profile starts light: no class, no stored choice, light paint.
    const start = await open(
      session,
      baseUrl,
      BUTTON,
      "light",
      "step 1",
      problems,
    );
    shows(problems, start, "light", "step 1");
    check(
      problems,
      start.stored === null,
      `step 1: a fresh profile already stores "${start.stored}"`,
    );

    // 2. The press turns the document, its background and every preview dark,
    //    and writes the choice.
    await press(session, "dark", "step 2", problems);
    const pressed = await readTheme(session);
    shows(problems, pressed, "dark", "step 2");
    check(
      problems,
      pressed.stored === "dark",
      `step 2: the press stored "${pressed.stored ?? "nothing"}", expected "dark"`,
    );

    // 3. A client navigation keeps the mode and its previews.
    const navigated = await session.evaluate(`(() => {
      const link = document.querySelector('a[href="${BADGE}"]');
      if (link === null) return "missing";
      link.click();
      return "clicked";
    })()`);
    if (navigated !== "clicked") {
      problems.push(`step 3: no sidebar link to ${BADGE}`);
    } else {
      const arrived = await session.waitFor(
        `location.pathname === ${JSON.stringify(BADGE)}`,
      );
      if (!arrived)
        problems.push(`step 3: ${BADGE} did not load after the click`);
      await settleProblems(session, "dark", "step 3", problems);
      const page = await readTheme(session);
      shows(problems, page, "dark", "step 3");
      check(
        problems,
        page.stored === "dark",
        `step 3: navigation stored "${page.stored ?? "nothing"}"`,
      );
    }

    // 4. A parameter-free document remembers the choice; the scheme is still
    //    forced light, so storage is the only explanation for dark.
    const reloaded = await open(
      session,
      baseUrl,
      BUTTON,
      "dark",
      "step 4",
      problems,
    );
    shows(problems, reloaded, "dark", "step 4");
    check(
      problems,
      reloaded.stored === "dark",
      `step 4: the reload stored "${reloaded.stored ?? "nothing"}"`,
    );

    // 5. A second press returns to light and writes that choice.
    await press(session, "light", "step 5", problems);
    const reset = await readTheme(session);
    shows(problems, reset, "light", "step 5");
    check(
      problems,
      reset.stored === "light",
      `step 5: the press stored "${reset.stored ?? "nothing"}", expected "light"`,
    );

    // 6. At a phone width the home layout's compact switch is the visible
    //    control, and it drives the same next-themes store.
    await session.setViewport(390, 844);
    await session.setColorScheme("light");
    await session.navigate(`${baseUrl}/`);
    const atHome = await session.waitFor(`location.pathname === "/"`);
    if (!atHome) problems.push("step 6: the landing page did not load");

    interface Box {
      readonly width: number;
      readonly height: number;
      readonly visible: boolean;
    }
    const boxes = JSON.parse(
      String(
        await session.evaluate(`JSON.stringify({
          compact: (() => {
            const node = document.querySelector("[data-compact-theme-toggle]");
            if (node === null) return null;
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return { width: Math.round(rect.width), height: Math.round(rect.height), visible: style.visibility === "visible" && style.display !== "none" };
          })(),
          desktop: (() => {
            const node = document.querySelector("[data-theme-toggle]");
            if (node === null) return null;
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return { width: Math.round(rect.width), height: Math.round(rect.height), visible: style.visibility === "visible" && style.display !== "none" };
          })(),
        })`),
      ),
    ) as { readonly compact: Box | null; readonly desktop: Box | null };

    check(
      problems,
      boxes.compact !== null &&
        boxes.compact.visible &&
        boxes.compact.width > 0 &&
        boxes.compact.height > 0,
      `step 6: the compact switch is not visible at 390 px (${JSON.stringify(boxes.compact)})`,
    );
    check(
      problems,
      boxes.desktop === null ||
        !boxes.desktop.visible ||
        boxes.desktop.width === 0 ||
        boxes.desktop.height === 0,
      "step 6: both theme switches are displayed at 390 px",
    );

    const compactDark = await pressCompact(session);
    if (!compactDark) {
      problems.push("step 6: the compact theme switch is not in the page");
    } else {
      const darkened = await session.waitFor(
        `document.documentElement.classList.contains("dark") &&
          getComputedStyle(document.body).backgroundColor === ${JSON.stringify(dark)} &&
          localStorage.getItem("theme") === "dark"`,
        1_500,
      );
      if (!darkened) await pressCompact(session);
      const turned = await session.waitFor(
        `document.documentElement.classList.contains("dark") &&
          getComputedStyle(document.body).backgroundColor === ${JSON.stringify(dark)} &&
          localStorage.getItem("theme") === "dark"`,
      );
      check(
        problems,
        turned,
        `step 6: the compact press did not turn the page dark (${JSON.stringify(await readTheme(session))})`,
      );
      await pressCompact(session);
      const restored = await session.waitFor(
        `!document.documentElement.classList.contains("dark") &&
          getComputedStyle(document.body).backgroundColor === ${JSON.stringify(light)} &&
          localStorage.getItem("theme") === "light"`,
      );
      check(
        problems,
        restored,
        `step 6: the second compact press did not return to light (${JSON.stringify(await readTheme(session))})`,
      );
    }

    if (problems.length === 0) {
      for (let step = 1; step <= 6; step += 1) {
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
