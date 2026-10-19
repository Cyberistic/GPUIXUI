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

import { components } from "../src/component-meta/registry.ts";
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

const COMPONENTS_PAGE = "/docs/components";
const PHONE_VIEWPORT = { width: 390, height: 844 } as const;

interface FilterState {
  readonly count: string;
  readonly links: ReadonlyArray<string>;
  readonly empty: boolean;
  readonly search: string;
}

/** What the component index shows and what its filter recorded in the URL. */
const filterState = async (session: Session): Promise<FilterState> => {
  const value = await session.evaluate(`(() => {
    const article = document.querySelector("#nd-page");
    return JSON.stringify({
      count: (document.querySelector("#component-filter-count")?.textContent ?? "").trim(),
      links: [...(article?.querySelectorAll('ul > li > a[href^="/docs/components/"]') ?? [])]
        .map((link) => link.getAttribute("href") ?? "")
        .filter((href) => href !== ${JSON.stringify(COMPONENTS_PAGE)}),
      empty: (article?.innerText ?? "").includes("No component matches"),
      search: location.search,
    });
  })()`);
  return JSON.parse(String(value)) as FilterState;
};

/**
 * The Components page has its own search field, separate from the palette and
 * `/api/search`. Its rules are unit-tested; this proves the hydrated wiring:
 * input → visible cards → the live count → the empty state's clear control.
 */
const checkIndexFilter = async (
  session: Session,
  baseUrl: string,
): Promise<ReadonlyArray<string>> => {
  const total = components.length;
  const problems: string[] = [];
  const count = `document.querySelector("#component-filter-count")?.textContent?.trim()`;
  const value = `document.querySelector("#component-filter")?.value`;

  // A `?q=` link is applied by the index's mount effect, so waiting for it is
  // also the hydration signal — `data-platform` lands before the article's
  // handlers are attached (measured: typing straight after it left the value
  // in the DOM and React state empty).
  await session.navigate(`${new URL(COMPONENTS_PAGE, baseUrl).href}?q=zzzzzz`);
  const empty = await session.waitFor(
    `${value} === "zzzzzz" &&
      ${count} === "0 of ${total} components" &&
      (document.querySelector("#nd-page")?.innerText ?? "").includes("No component matches")`,
  );
  const emptyState = await filterState(session);
  if (!empty || !emptyState.empty || emptyState.links.length !== 0) {
    problems.push(
      `component filter: "?q=zzzzzz" left "${emptyState.count}" and ${emptyState.links.length} card link(s)`,
    );
  }

  const cleared = await session.evaluate(`(() => {
    const button = [...document.querySelectorAll("#nd-page button")].find(
      (candidate) => (candidate.textContent ?? "").trim() === "Clear filter",
    );
    if (button === undefined) return false;
    button.click();
    return true;
  })()`);
  const restored = await session.waitFor(
    `${value} === "" && ${count} === "${total} of ${total} components"`,
  );
  const after = await filterState(session);
  if (cleared !== true || !restored || after.search.includes("q=")) {
    problems.push(
      `component filter: clear left "${after.count}" and ${after.search || "no query"}`,
    );
  }

  await session.evaluate('document.querySelector("#component-filter").focus()');
  await session.type("combobox");
  const one = await session.waitFor(
    `${value} === "combobox" && ${count} === "1 of ${total} components"`,
  );
  const filtered = await filterState(session);
  if (!one || filtered.count !== `1 of ${total} components`) {
    problems.push(
      `component filter: "combobox" left "${filtered.count}" with ${filtered.links.length} card link(s)`,
    );
  } else if (
    filtered.links.length !== 1 ||
    filtered.links[0] !== "/docs/components/combobox"
  ) {
    problems.push(
      `component filter: "combobox" rendered [${filtered.links.join(", ")}]`,
    );
  } else if (!filtered.search.includes("q=combobox")) {
    problems.push(
      `component filter: typed query did not reach the URL (${filtered.search || "no query"})`,
    );
  }

  return problems;
};

/**
 * At 390 px the header has no full search field, so a phone reader has one
 * control: the 34 px icon button. This proves that path opens the palette,
 * finds a page, lands focus on it and does not scroll sideways.
 */
const checkPhonePalette = async (
  session: Session,
  baseUrl: string,
): Promise<ReadonlyArray<string>> => {
  const problems: string[] = [];
  await session.setViewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
  await session.navigate(new URL(PAGE, baseUrl).href);
  const ready = await session.waitFor(
    `document.querySelector('button[aria-label="Open Search"]') !== null &&
      document.documentElement.dataset.platform !== undefined`,
  );
  if (!ready) throw new SetupError(`${PAGE} did not hydrate at 390 px`);

  const trigger = JSON.parse(
    String(
      await session.evaluate(`(() => {
        const visible = [...document.querySelectorAll('button[aria-label="Open Search"]')]
          .filter((button) => {
            const box = button.getBoundingClientRect();
            const style = getComputedStyle(button);
            return box.width > 0 && box.height > 0 &&
              style.display !== "none" && style.visibility !== "hidden" &&
              box.left >= 0 && box.right <= innerWidth;
          });
        return JSON.stringify({
          visible: visible.length,
          full: [...document.querySelectorAll("button[data-search-full]")]
            .filter((button) => button.getClientRects().length > 0).length,
        });
      })()`),
    ),
  ) as { readonly visible: number; readonly full: number };
  if (trigger.visible < 1 || trigger.full !== 0) {
    return [
      `phone palette: expected a visible Open Search button and no full field, found ${trigger.visible} and ${trigger.full}`,
    ];
  }

  const clicked = await session.evaluate(`(() => {
    const button = [...document.querySelectorAll('button[aria-label="Open Search"]')]
      .find((candidate) => {
        const box = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return box.width > 0 && box.height > 0 &&
          style.display !== "none" && style.visibility !== "hidden" &&
          box.left >= 0 && box.right <= innerWidth;
      });
    if (button === undefined) return false;
    button.click();
    return true;
  })()`);
  const opened = await session.waitFor(
    `document.querySelector(${JSON.stringify(PALETTE)}) !== null`,
  );
  const state = await paletteState(session);
  if (clicked !== true || !opened || !state.focused) {
    problems.push(
      `phone palette: the click ${clicked === true ? "opened" : "found no"} palette${state.focused ? "" : " with the input unfocused"}`,
    );
    return problems;
  }

  await session.type(QUERY);
  const listed = await session.waitFor(
    `[...document.querySelectorAll('[role="option"]')].some(
      (option) => (option.textContent ?? "").includes("Installation"),
    )`,
    5_000,
  );
  if (!listed)
    problems.push(`phone palette: "${QUERY}" listed no Installation`);
  await session.press("Enter");
  const navigated = await session.waitFor(
    `location.pathname === ${JSON.stringify(RESULT)}`,
    5_000,
  );
  const landed = await session.waitFor(
    `document.activeElement !== null && document.activeElement.id === "nd-page"`,
    5_000,
  );
  const overflow = await session.evaluate(
    "document.documentElement.scrollWidth > innerWidth",
  );
  if (!navigated) problems.push(`phone palette: Enter did not open ${RESULT}`);
  if (!landed) problems.push("phone palette: focus did not land on the page");
  if (overflow === true) {
    problems.push("phone palette: the page scrolled sideways at 390 px");
  }
  return problems;
};

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
  const landed = await session.waitFor(
    `document.activeElement !== null && document.activeElement.id === "nd-page"`,
    5_000,
  );
  if (!landed) {
    const active = String(
      await session.evaluate(
        `document.activeElement === null
          ? "none"
          : document.activeElement.tagName.toLowerCase() +
            (document.activeElement.id === "" ? "" : "#" + document.activeElement.id)`,
      ),
    );
    problems.push(
      `choosing a result left focus on ${active}, expected the destination page`,
    );
  }

  // 4. An unknown query has a real empty state, not an empty list. Reload the
  //    page first so the opener is the body, which is the case the fallback
  //    below must cover.
  await session.navigate(new URL(PAGE, baseUrl).href);
  const hydratedAgain = await session.waitFor(
    `location.pathname === ${JSON.stringify(PAGE)} &&
      document.documentElement !== null &&
      document.documentElement.dataset.platform !== undefined`,
  );
  if (!hydratedAgain) {
    throw new SetupError(`${PAGE} did not hydrate again`);
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

  // 6. The component index's own filter, with its live count and clear state.
  problems.push(...(await checkIndexFilter(session, baseUrl)));

  // 7. The only search control a phone reader has.
  problems.push(...(await checkPhonePalette(session, baseUrl)));

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
      console.log("smoke: search palette, index filter and phone path checked");
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
