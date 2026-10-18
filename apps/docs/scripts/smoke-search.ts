#!/usr/bin/env node
/**
 * Docs search smoke (plan 506).
 *
 * `smoke:build` proves the index answers; no check drove the palette itself.
 * This one opens it with the real shortcut in a real browser and proves the
 * reader's path: the dialog focuses its input, typing lists a real page, Enter
 * navigates to it, an unknown query says so, and Escape closes with focus back
 * on the control that opened it instead of on `<body>`.
 *
 *   nub scripts/smoke-search.ts [--base-url <url>] [--chrome <path>] [--no-build]
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

const usage =
  "usage: nub scripts/smoke-search.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const PAGE = "/docs/components/button";
const RESULT = "/docs/installation";
const QUERY = "installation";
const UNKNOWN_QUERY = "zzzzzz";

const PALETTE = '[role="dialog"] input[role="combobox"]';

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
      if (value === undefined) {
        throw new SetupError(`${argument} needs a value`);
      }
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

/** The palette's presence, its focused control and its option texts. */
interface PaletteState {
  readonly open: boolean;
  readonly focused: boolean;
  readonly options: ReadonlyArray<string>;
  readonly text: string;
  readonly active: string;
}

const paletteState = async (session: Session): Promise<PaletteState> => {
  const value = await session.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(PALETTE)});
    const dialog = input?.closest('[role="dialog"]') ?? null;
    return JSON.stringify({
      open: input !== null,
      focused: input !== null && document.activeElement === input,
      options: [...(dialog?.querySelectorAll('[role="option"]') ?? [])]
        .map((option) => (option.textContent ?? "").trim()),
      text: dialog?.innerText ?? "",
      active: document.activeElement === null
        ? "none"
        : document.activeElement.tagName.toLowerCase() +
          (document.activeElement.getAttribute("aria-label") === null
            ? ""
            : "[" + document.activeElement.getAttribute("aria-label") + "]"),
    });
  })()`);
  return JSON.parse(String(value)) as PaletteState;
};

const openPalette = async (
  session: Session,
  problems: string[],
): Promise<PaletteState> => {
  await session.pressShortcut("k");
  const opened = await session.waitFor(
    `document.querySelector(${JSON.stringify(PALETTE)}) !== null`,
  );
  const state = await paletteState(session);
  if (!opened) {
    problems.push("the ⌘K shortcut did not open the search palette");
    return state;
  }
  if (!state.focused) {
    problems.push(
      `the palette opened without focusing its input (active: ${state.active})`,
    );
  }
  return state;
};

/** The visible search trigger the reader's focus belongs on after Escape. */
const focusedTrigger = (session: Session): Promise<unknown> =>
  session.evaluate(`(() => {
    const triggers = [...document.querySelectorAll(
      "button[data-search-full], button[data-search]",
    )].filter((trigger) => trigger.getClientRects().length > 0);
    const active = document.activeElement;
    return JSON.stringify({
      triggers: triggers.length,
      restored: active !== null && triggers.includes(active),
      active: active === null
        ? "none"
        : active.tagName.toLowerCase() +
          (active.getAttribute("aria-label") === null
            ? ""
            : "[" + active.getAttribute("aria-label") + "]"),
    });
  })()`);

const checkSearch = async (
  session: Session,
  baseUrl: string,
): Promise<ReadonlyArray<string>> => {
  const url = new URL(PAGE, baseUrl);
  await session.navigate(url.href);

  const arrived = await session.waitFor(
    `location.pathname === ${JSON.stringify(PAGE)}`,
  );
  const hydrated = await session.waitFor(
    "document.documentElement !== null && document.documentElement.dataset.platform !== undefined",
  );
  if (!arrived || !hydrated) {
    throw new SetupError(`${PAGE} did not hydrate`);
  }

  const problems: string[] = [];

  // 1. The shortcut opens the palette and puts the cursor in its field.
  const opened = await openPalette(session, problems);
  if (!opened.open) return problems;

  // 2. A query lists a real page, by name.
  await session.type(QUERY);
  const listed = await session.waitFor(
    ` [...document.querySelectorAll('[role="option"]')].some(
        (option) => (option.textContent ?? "").includes("Installation"),
      )`,
    5_000,
  );
  const found = await paletteState(session);
  if (!listed) {
    problems.push(
      `typing "${QUERY}" did not list the Installation page (${found.options.length} option(s): ${found.options.slice(0, 3).join(" | ")})`,
    );
  }

  // 3. Enter follows the selected result and closes the palette.
  await session.press("Enter");
  const navigated = await session.waitFor(
    `location.pathname === ${JSON.stringify(RESULT)}`,
  );
  if (!navigated) {
    const path = String(await session.evaluate("location.pathname"));
    problems.push(`Enter opened "${path}", expected "${RESULT}"`);
  }
  const closed = await session.waitFor(
    `document.querySelector(${JSON.stringify(PALETTE)}) === null`,
    5_000,
  );
  if (!closed) {
    problems.push("choosing a result left the palette open");
  }

  // 4. An unknown query has a real empty state, not an empty list.
  const hydratedAgain = await session.waitFor(
    "document.documentElement !== null && document.documentElement.dataset.platform !== undefined",
  );
  if (!hydratedAgain) {
    throw new SetupError(`${RESULT} did not hydrate`);
  }
  const reopened = await openPalette(session, problems);
  if (!reopened.open) return problems;
  await session.type(UNKNOWN_QUERY);
  const empty = await session.waitFor(
    `(() => {
      const input = document.querySelector(${JSON.stringify(PALETTE)});
      const dialog = input?.closest('[role="dialog"]');
      return dialog !== undefined &&
        dialog !== null &&
        dialog.querySelectorAll('[role="option"]').length === 0 &&
        (dialog.innerText ?? "").includes("No results found");
    })()`,
    5_000,
  );
  if (!empty) {
    const state = await paletteState(session);
    problems.push(
      `"${UNKNOWN_QUERY}" did not render the empty state (${state.options.length} option(s)): ${state.text.slice(0, 80)}`,
    );
  }

  // 5. Escape dismisses it and focus returns to the trigger, not the body.
  await session.press("Escape");
  const dismissed = await session.waitFor(
    `document.querySelector(${JSON.stringify(PALETTE)}) === null`,
    5_000,
  );
  if (!dismissed) {
    problems.push("Escape did not close the palette");
    return problems;
  }
  const focus = JSON.parse(String(await focusedTrigger(session))) as {
    readonly triggers: number;
    readonly restored: boolean;
    readonly active: string;
  };
  if (focus.triggers === 0) {
    problems.push("no visible search trigger to return focus to");
  } else if (!focus.restored) {
    problems.push(
      `Escape left focus on ${focus.active}, expected the search trigger`,
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
    const problems = await checkSearch(session, baseUrl);

    if (problems.length === 0) {
      console.log("smoke: search palette checked");
      return 0;
    }
    for (const problem of problems) {
      console.error(`FAIL ${PAGE}: ${problem}`);
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
