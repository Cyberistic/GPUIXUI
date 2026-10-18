#!/usr/bin/env node
/**
 * The live-surface smoke check (plan 455).
 *
 * Unlike `smoke:browser` this cannot use `--dump-dom` and virtual time: GPUI
 * presents its WebGPU canvas on a real frame, and a virtual-time screenshot is
 * black. It drives Chrome through CDP in real time and asserts what GPUI itself
 * reports:
 *
 * - `data-gpuix="ready"` on the document once the canvas exists;
 * - the scene's real text in `getAllText()` — the component reached the tree;
 * - an unknown scene reports `data-gpuix="failed"` with a reason.
 *
 * Every `LIVE_SCENES` key is driven, and its expected text comes from the same
 * JSX-free table the docs test guards (plan 456), so a scene cannot ship with no
 * composition behind it. A gesture scene (plan 486) must **not** paint its text
 * until the smoke has driven the real interaction through `globalThis.gpuix`,
 * the `App` the browser renderer installs: the before/after pair is the proof
 * that a prop did not quietly open the surface.
 *
 *   nub scripts/smoke-live-preview.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the surface is wrong, `2` the check could not run.
 */

import { setTimeout as sleep } from "node:timers/promises";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_TEXT,
  type SceneStep,
} from "../preview/scenes.ts";
import { findChrome, startSession, type Session } from "./chrome-session.ts";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

const READY_TIMEOUT_MS = 30_000;

interface Options {
  readonly baseUrl: string | null;
  readonly chrome: string | null;
  readonly build: boolean;
}

const usage =
  "usage: nub scripts/smoke-live-preview.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const parseOptions = (argv: ReadonlyArray<string>): Options => {
  let baseUrl: string | null = null;
  let chrome: string | null = null;
  let build = true;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--no-build") build = false;
    else if (argument === "--help" || argument === "-h") {
      console.log(usage);
      process.exit(0);
    } else if (argument === "--base-url" || argument === "--chrome") {
      const value = argv[index + 1];
      if (value === undefined)
        throw new SetupError(`${argument} needs a value`);
      if (argument === "--base-url") {
        try {
          new URL(value);
        } catch {
          throw new SetupError(`--base-url is not a URL: ${value}`);
        }
        baseUrl = value;
      } else chrome = value;
      index += 1;
    } else throw new SetupError(`unknown argument: ${argument}`);
  }
  return { baseUrl, chrome, build };
};

interface SurfaceState {
  readonly state: string;
  readonly reason?: string;
  readonly canvas: [number, number];
}

const readSurface = async (session: Session): Promise<SurfaceState> => {
  const raw = await session.evaluate(
    "JSON.stringify({ state: document.documentElement.dataset.gpuix, reason: document.documentElement.dataset.reason, canvas: [document.querySelector('canvas')?.width ?? 0, document.querySelector('canvas')?.height ?? 0] })",
  );
  return JSON.parse(String(raw)) as SurfaceState;
};

const waitForSurface = async (session: Session): Promise<SurfaceState> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    const surface = await readSurface(session);
    if (surface.state === "failed") return surface;
    // A ready flag lands before the frame is sized: the page iframe showed the
    // same race (plan 473), and a scene did too (plan 475). A 1×1 canvas is
    // blank, so it is not ready however the document reports itself.
    if (
      surface.state === "ready" &&
      surface.canvas[0] > 1 &&
      surface.canvas[1] > 1
    ) {
      return surface;
    }
    if (Date.now() > deadline) {
      return { state: "timeout", canvas: surface.canvas };
    }
    await sleep(250);
  }
};

/**
 * Navigate, wait until the new document owns the address bar, then read the
 * surface. Without the address check a scene can pass on the **previous**
 * document's `data-gpuix="ready"`, which is exactly the stale claim the check
 * exists to catch.
 */
const openScene = async (
  session: Session,
  url: string,
): Promise<SurfaceState> => {
  await session.navigate(url);
  const wanted = new URL(url).search;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (String(await session.evaluate("location.search")) === wanted) {
      return waitForSurface(session);
    }
    await sleep(100);
  }
  return { state: "timeout", canvas: [0, 0] };
};

const paintedText = async (
  session: Session,
): Promise<ReadonlyArray<string>> => {
  const raw = await session.evaluate(
    "(async () => globalThis.gpuix === undefined ? '[]' : JSON.stringify((await globalThis.gpuix.call('getAllText', {})).text))()",
  );
  return JSON.parse(String(raw)) as ReadonlyArray<string>;
};

/**
 * One gesture step, driven through the `App` the browser renderer installs on
 * the page (plan 486). The locator resolves the element's painted centre and the
 * input goes through GPUI's own hit testing, so this is the same path a reader's
 * pointer, keyboard or wheel takes.
 */
const runStep = async (session: Session, step: SceneStep): Promise<void> => {
  // An option that carries no test id is targeted by its label, scoped to the
  // control's own test id so the reader's instruction cannot match first.
  const target =
    step.kind === "click-text"
      ? `globalThis.gpuix.getByTestId(${JSON.stringify(step.within)}).getByText(${JSON.stringify(step.text)})`
      : `globalThis.gpuix.getByTestId(${JSON.stringify(step.testId)})`;
  const action =
    step.kind === "click-text"
      ? `await ${target}.click()`
      : step.kind === "hover"
        ? `await ${target}.hover()`
        : step.kind === "fill"
          ? `await ${target}.fill(${JSON.stringify(step.text)})`
          : step.kind === "press"
            ? `await ${target}.press(${JSON.stringify(step.keys)})`
            : step.kind === "wheel"
              ? `await ${target}.wheel(${step.deltaX ?? 0}, ${step.deltaY})`
              : `await ${target}.click(${step.button === undefined ? "" : `{ button: ${step.button} }`})`;
  try {
    await session.evaluate(`(async () => { ${action}; })()`);
  } catch (error) {
    throw new Error(
      `${step.kind} on "${step.kind === "click-text" ? step.text : step.testId}" failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

/**
 * Poll for the scene's text after a gesture. A component updates its tree on the
 * frame the input causes, but a tooltip's delay and a popover's placement run
 * over a few frames, so a fixed sleep would be both slow and flaky.
 */
const waitForPaintedText = async (
  session: Session,
  expected: string,
  timeoutMs = 5_000,
): Promise<ReadonlyArray<string> | null> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const text = await paintedText(session);
    if (text.includes(expected)) return text;
    if (Date.now() > deadline) return null;
    await sleep(100);
  }
};

/**
 * The Button scene in one mode, as a PNG. The screenshot is the only signal
 * that the mode reached the paint: `getAllText` is identical in both modes by
 * design, and the wasm renderer exposes no style query (plan 474).
 */
const captureScene = async (
  session: Session,
  baseUrl: string,
  mode: "light" | "dark",
): Promise<string> => {
  const surface = await openScene(
    session,
    `${baseUrl}/gpuix-preview/?scene=button&platform=win32&mode=${mode}`,
  );
  if (surface.state !== "ready") {
    throw new Error(
      `the button scene reported ${surface.state} in ${mode} mode`,
    );
  }
  const text = await paintedText(session);
  if (!text.includes(SCENE_TEXT.button)) {
    throw new Error(
      `the button scene painted no "${SCENE_TEXT.button}" in ${mode} mode`,
    );
  }
  return session.captureScreenshot();
};

interface PageSurface {
  readonly state: string;
  readonly reason?: string;
  readonly src?: string;
  readonly canvas?: [number, number];
}

/**
 * Open a docs page, click its live-preview control and read the iframe.
 * The SSR markup ships the control before React attaches its handler, so a
 * click can land before hydration and do nothing. The loop therefore keeps
 * offering the click until the iframe exists — a single click made the check
 * fail at random on the first page it reached (plan 457 §9).
 */
const openPageSurface = async (
  session: Session,
  page: string,
): Promise<PageSurface> => {
  await session.navigate(page);
  await sleep(2_500);
  const embedded = await session.evaluate(`(async () => {
    let sawControl = false;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const frame = document.querySelector('iframe[title^="Live GPUix surface"]');
      const state = frame?.contentDocument?.documentElement?.dataset.gpuix;
      if (state === "ready") {
        const canvas = frame?.contentDocument?.querySelector("canvas");
        const width = canvas?.width ?? 0;
        const height = canvas?.height ?? 0;
        // Measured 2026-10-18: the first page visited reported a 1×1 canvas and
        // passed, because a ready flag lands before the frame is sized. A blank
        // first frame is what this gate exists to catch, so wait for the size.
        if (width > 1 && height > 1) {
          return JSON.stringify({
            state,
            src: frame?.getAttribute("src") ?? "",
            canvas: [width, height],
          });
        }
      }
      if (state === "failed") {
        return JSON.stringify({
          state,
          reason: frame?.contentDocument?.documentElement?.dataset.reason,
        });
      }
      const button = [...document.querySelectorAll("button")].find(
        (candidate) => candidate.textContent === "Load live preview",
      );
      if (button !== undefined) {
        sawControl = true;
        button.click();
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return JSON.stringify({ state: sawControl ? "timeout" : "no-control" });
  })()`);
  return JSON.parse(String(embedded)) as PageSurface;
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

    session = await startSession(chrome, "gpuixui-live-");

    // Every scene runs standalone, in the dark Windows style, so the check
    // covers the composition itself before the page wiring below.
    for (const scene of LIVE_SCENES) {
      const url = `${baseUrl}/gpuix-preview/?scene=${scene}&platform=win32&mode=dark`;
      console.log(`smoke: loading ${scene}`);
      const surface = await openScene(session, url);

      if (surface.state !== "ready") {
        console.error(
          `FAIL live scene ${scene}: state=${surface.state}${surface.reason === undefined ? "" : ` reason=${surface.reason}`}`,
        );
        return 1;
      }
      const text = await paintedText(session);
      const steps = SCENE_GESTURE[scene];
      if (steps === undefined) {
        if (!text.includes(SCENE_TEXT[scene])) {
          console.error(
            `FAIL live scene ${scene}: expected "${SCENE_TEXT[scene]}" in the GPUI tree (${JSON.stringify(text)})`,
          );
          return 1;
        }
        console.log(
          `smoke: scene ${scene} ready — ${surface.canvas[0]}x${surface.canvas[1]} canvas, ${text.length} text nodes`,
        );
        continue;
      }
      // A gesture scene must not already be open: a prop that quietly opens the
      // surface would make the steps below prove nothing (plan 486).
      if (text.includes(SCENE_TEXT[scene])) {
        console.error(
          `FAIL live scene ${scene}: "${SCENE_TEXT[scene]}" was painted before the gesture; the scene opens itself`,
        );
        return 1;
      }
      try {
        for (const step of steps) {
          await runStep(session, step);
          // A popover measures and paints on the frame after the click that
          // opened it; the next step's locator needs those painted bounds.
          await sleep(250);
        }
      } catch (error) {
        console.error(
          `FAIL live scene ${scene}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return 1;
      }
      const opened = await waitForPaintedText(session, SCENE_TEXT[scene]);
      if (opened === null) {
        const after = await paintedText(session);
        console.error(
          `FAIL live scene ${scene}: expected "${SCENE_TEXT[scene]}" after ${steps.length} gesture step(s) (${JSON.stringify(after)})`,
        );
        return 1;
      }
      console.log(
        `smoke: scene ${scene} opened by ${steps.length} step(s) — ${surface.canvas[0]}x${surface.canvas[1]} canvas, ${opened.length} text nodes`,
      );
    }

    const failed = await openScene(
      session,
      `${baseUrl}/gpuix-preview/?scene=not-a-scene`,
    );
    if (failed.state !== "failed" || failed.reason === undefined) {
      console.error(
        `FAIL live surface: an unknown scene reported ${failed.state}, not a reason`,
      );
      return 1;
    }
    console.log(`smoke: unknown scene reported — ${failed.reason}`);

    // A scene can report ready and still ignore the mode it was given:
    // `getAllText` is the same in both modes, so only the painted frame can
    // prove it. Capture the same scene twice in dark to show the capture is
    // deterministic, then once in light (plan 474).
    const dark = await captureScene(session, baseUrl, "dark");
    const darkAgain = await captureScene(session, baseUrl, "dark");
    const light = await captureScene(session, baseUrl, "light");
    if (dark === "") {
      console.error("FAIL live surface: the dark scene captured no frame");
      return 1;
    }
    if (dark !== darkAgain) {
      console.error(
        "FAIL live surface: the same dark scene captured twice differs; the capture is not deterministic",
      );
      return 1;
    }
    if (light === dark) {
      console.error("FAIL live surface: mode=light painted the dark surface");
      return 1;
    }
    console.log(
      `smoke: the scene paints light and dark — dark ${dark.length} bytes, light ${light.length} bytes`,
    );

    // The surface working on its own is not the feature: the page must load it
    // on request, with the docs' platform and mode, and the iframe must reach
    // GPUI. Every scene's page is driven — the slug equals the scene key, which
    // `scene-contract.test.ts` pins — then the Theming page with the Windows
    // platform in the URL. The scheme is forced so the host cannot decide which
    // mode the gate checks.
    await session.setColorScheme("dark");
    for (const scene of LIVE_SCENES) {
      const slug = scene;
      const componentPage = await openPageSurface(
        session,
        `${baseUrl}/docs/components/${slug}`,
      );
      if (componentPage.state !== "ready") {
        console.error(
          `FAIL live surface: /docs/components/${slug} reported ${componentPage.state}${componentPage.reason === undefined ? "" : ` (${componentPage.reason})`}`,
        );
        return 1;
      }
      if (!(componentPage.src ?? "").includes(`scene=${scene}`)) {
        console.error(
          `FAIL live surface: /docs/components/${slug} lost its scene (${componentPage.src ?? ""})`,
        );
        return 1;
      }
      if (!(componentPage.src ?? "").includes("mode=dark")) {
        console.error(
          `FAIL live surface: /docs/components/${slug} reported ${componentPage.src ?? ""}, expected mode=dark`,
        );
        return 1;
      }
      console.log(
        `smoke: /docs/components/${slug} loaded the live iframe — ${componentPage.src} (${componentPage.canvas?.[0] ?? 0}x${componentPage.canvas?.[1] ?? 0})`,
      );
    }

    // The same page in the light scheme: the iframe must carry the mode the
    // chrome is painting, not the mode the previous check happened to see.
    await session.setColorScheme("light");
    const lightPage = await openPageSurface(
      session,
      `${baseUrl}/docs/components/button`,
    );
    if (lightPage.state !== "ready") {
      console.error(
        `FAIL live surface: /docs/components/button in light mode reported ${lightPage.state}${lightPage.reason === undefined ? "" : ` (${lightPage.reason})`}`,
      );
      return 1;
    }
    if (!(lightPage.src ?? "").includes("mode=light")) {
      console.error(
        `FAIL live surface: /docs/components/button in light mode reported ${lightPage.src ?? ""}`,
      );
      return 1;
    }
    console.log(
      `smoke: /docs/components/button follows light mode — ${lightPage.src}`,
    );
    await session.setColorScheme("dark");

    const themed = await openPageSurface(
      session,
      `${baseUrl}/docs/theming?platform=win32`,
    );
    if (themed.state !== "ready") {
      console.error(
        `FAIL live surface: the Theming page reported ${themed.state}${themed.reason === undefined ? "" : ` (${themed.reason})`}`,
      );
      return 1;
    }
    if (!(themed.src ?? "").includes("platform=win32")) {
      console.error(
        `FAIL live surface: the platform toggle did not reach the iframe (${themed.src ?? ""})`,
      );
      return 1;
    }
    console.log(
      `smoke: the platform toggle reached the live surface — ${themed.src}`,
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

// A hung CDP command must not keep the command alive forever; the gate reports
// "could not verify" rather than hanging a release check. Thirty scenes
// (fourteen of them gesture-driven) and thirty page loads fit in this budget;
// the per-iframe wait is up to 60s.
setTimeout(() => {
  console.error("smoke: not verified — the check did not finish in 600s");
  process.exit(2);
}, 600_000).unref();

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(
      `smoke: failed — ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 2;
  },
);
