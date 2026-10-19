#!/usr/bin/env node
/**
 * Theme-editor smoke (plan 595).
 *
 * The editor's unit tests prove the merge and the copyable source; only a
 * browser can prove the page a reader uses. This drives the real controls:
 *
 *   1. a fresh page shows the light theme's primary and the default module;
 *   2. setting the `primary` colour input repaints the library's preview
 *      surface, writes the shareable `?theme=` value and updates the source;
 *   3. `compact` moves the preview's control height to the package's preset;
 *   4. reloading the shared URL restores the edit;
 *   5. Reset removes the parameter and returns the preview to the light theme.
 *
 *   nub scripts/smoke-theme-editor.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the site is wrong, `2` the check could not run (build,
 * server or Chrome) — "unverified" is never a pass.
 */

import { densityPresets, lightTheme } from "@gpuixui/tokens";
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
  "usage: nub scripts/smoke-theme-editor.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const PATH = "/docs/theme-editor";
const EDITOR = "[data-theme-editor]";
const PRIMARY = 'input[data-theme-color="primary"]';

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

interface EditorState {
  readonly primary: string;
  readonly controlHeight: string;
  readonly input: string;
  readonly source: string;
  readonly theme: string | null;
}

const readState = async (session: Session): Promise<EditorState> =>
  JSON.parse(
    String(
      await session.evaluate(`JSON.stringify((() => {
        const surface = document.querySelector("[data-theme-preview] [data-theme-editor-surface]");
        const input = document.querySelector(${JSON.stringify(PRIMARY)});
        const source = document.querySelector("[data-theme-source]");
        return {
          primary: surface === null ? "" : getComputedStyle(surface).getPropertyValue("--preview-color-primary").trim(),
          controlHeight: surface === null ? "" : getComputedStyle(surface).getPropertyValue("--preview-control-height-md").trim(),
          input: input instanceof HTMLInputElement ? input.value : "",
          source: source === null ? "" : (source.textContent ?? ""),
          theme: new URLSearchParams(location.search).get("theme"),
        };
      })())`),
    ),
  ) as EditorState;

const check = (
  problems: string[],
  condition: boolean,
  message: string,
): void => {
  if (!condition) problems.push(message);
};

const open = async (
  session: Session,
  href: string,
  problems: string[],
  where: string,
): Promise<EditorState> => {
  await session.navigate(href);
  const ready = await session.waitFor(
    `document.querySelector(${JSON.stringify(EDITOR)}) !== null &&
      document.querySelector("[data-theme-editor-ready]") !== null &&
      document.querySelector(${JSON.stringify(PRIMARY)}) !== null`,
  );
  if (!ready) problems.push(`${where}: the editor did not render`);
  return readState(session);
};

const setPrimary = async (session: Session, value: string): Promise<boolean> =>
  (await session.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(PRIMARY)});
    if (!(input instanceof HTMLInputElement)) return "missing";
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter === undefined) return "no-setter";
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return "set";
  })()`)) === "set";

const setCompact = async (session: Session): Promise<boolean> =>
  (await session.evaluate(`(() => {
    const input = document.querySelector('input[name="theme-density"][value="compact"]');
    if (!(input instanceof HTMLInputElement)) return "missing";
    input.click();
    return "clicked";
  })()`)) === "clicked";

const reset = async (session: Session): Promise<boolean> =>
  (await session.evaluate(`(() => {
    const button = document.querySelector("[data-theme-editor-reset]");
    if (!(button instanceof HTMLButtonElement)) return "missing";
    button.click();
    return "clicked";
  })()`)) === "clicked";

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
    await session.setViewport(1280, 900);
    const problems: string[] = [];
    const href = new URL(PATH, baseUrl).href;
    const lightPrimary = lightTheme.colors.primary.toLowerCase();

    const start = await open(session, href, problems, "step 1");
    check(
      problems,
      start.primary.toLowerCase() === lightPrimary,
      `step 1: the preview paints ${start.primary || "nothing"}, expected ${lightPrimary}`,
    );
    check(
      problems,
      start.theme === null,
      `step 1: a fresh page already carries ?theme=${start.theme ?? ""}`,
    );
    check(
      problems,
      start.source.includes("export const brandTheme = extendTheme(lightTheme"),
      "step 1: the source does not show a light-theme module",
    );

    if (!(await setPrimary(session, "#7c5cff"))) {
      problems.push("step 2: the primary colour input is missing");
    } else {
      const changed = await session.waitFor(
        `(() => {
          const surface = document.querySelector("[data-theme-preview] [data-theme-editor-surface]");
          const source = document.querySelector("[data-theme-source]");
          return surface !== null && source !== null &&
            getComputedStyle(surface).getPropertyValue("--preview-color-primary").trim().toLowerCase() === "#7c5cff" &&
            (source.textContent ?? "").includes('primary: "#7c5cff"') &&
            new URLSearchParams(location.search).get("theme")?.includes("primary:7c5cff") === true;
        })()`,
      );
      if (!changed) {
        const state = await readState(session);
        problems.push(
          `step 2: the edit did not reach the preview, source and URL (${state.primary}, ${state.theme ?? "no theme"})`,
        );
      }
    }

    if (!(await setCompact(session))) {
      problems.push("step 3: the compact density control is missing");
    } else {
      const compactHeight = `${densityPresets.compact.controlHeight.md}px`;
      const compact = await session.waitFor(
        `(() => {
          const surface = document.querySelector("[data-theme-preview] [data-theme-editor-surface]");
          return surface !== null &&
            getComputedStyle(surface).getPropertyValue("--preview-control-height-md").trim() === ${JSON.stringify(compactHeight)} &&
            new URLSearchParams(location.search).get("theme")?.includes("compact") === true;
        })()`,
      );
      if (!compact) {
        const state = await readState(session);
        problems.push(
          `step 3: density did not reach the surface and URL (${state.controlHeight}, ${state.theme ?? "no theme"})`,
        );
      }
    }

    const shared = new URL(href);
    const sharedValue = (await readState(session)).theme;
    if (sharedValue !== null) shared.searchParams.set("theme", sharedValue);
    const reloaded = await open(session, shared.href, problems, "step 4");
    check(
      problems,
      reloaded.input.toLowerCase() === "#7c5cff",
      `step 4: the reloaded input is ${reloaded.input || "missing"}, expected #7c5cff`,
    );
    check(
      problems,
      reloaded.primary.toLowerCase() === "#7c5cff",
      `step 4: the reloaded preview paints ${reloaded.primary || "nothing"}`,
    );
    check(
      problems,
      reloaded.source.includes('primary: "#7c5cff"'),
      "step 4: the reloaded source lost the edit",
    );

    if (!(await reset(session))) {
      problems.push("step 5: the reset control is missing");
    } else {
      const cleared = await session.waitFor(
        `(() => {
          const surface = document.querySelector("[data-theme-preview] [data-theme-editor-surface]");
          return surface !== null &&
            getComputedStyle(surface).getPropertyValue("--preview-color-primary").trim().toLowerCase() === ${JSON.stringify(lightPrimary)} &&
            new URLSearchParams(location.search).get("theme") === null;
        })()`,
      );
      if (!cleared) {
        const state = await readState(session);
        problems.push(
          `step 5: reset left ${state.primary} and ?theme=${state.theme ?? "removed"}`,
        );
      }
    }

    if (problems.length > 0) {
      for (const problem of problems) console.error(`FAIL ${problem}`);
      console.error(`smoke: ${problems.length} problem(s)`);
      return 1;
    }
    console.log(
      "smoke: the theme editor repaints, shares, restores and resets",
    );
    return 0;
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
