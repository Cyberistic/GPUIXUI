/**
 * Render every registered native example through the wasm renderer, once, and
 * write the frame the docs serve as a server-rendered still.
 *
 * This is the "SSR" half of plan 756: no native binding, no macOS window — a
 * headless Chrome boots `@gpuix/native`'s wasm build, `/live?scene=example`
 * mounts the library's own example registry through `@gpuix/react`, and the
 * frame is captured after the page reports that it painted. A capture that is
 * flat (one colour on a 5×5 sample grid) is rejected by id: a blank canvas
 * writes a perfectly valid image.
 *
 * Run: `nub run --filter @gpuixui/docs native:previews`
 * Pass `--url http://localhost:4175` to reuse a running docs server.
 * Pass `--only accordion,dialog` to redo a few while iterating.
 * Writes: `apps/docs/src/assets/native/<id>.webp` (checked in).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { findChrome, openChrome, type ChromePage } from "./chrome-session.ts";
import { docsServer } from "./docs-server.ts";
import { distinctFillCount, parseReport } from "./live-frame.ts";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(appRoot, "src/assets/native");

/** The index tile's aspect (`4 / 3`), so a capture needs no crop. */
const viewport = { width: 960, height: 720 } as const;
const paintTimeoutMs = 30_000;
const settleMs = 600;
/** A slow example gets this many frames before its capture is called flat. */
const paintAttempts = 4;
/** One colour across the grid is a flat frame, not a rendered component. */
const minimumFills = 2;
/** A whole-registry run stays small enough to check in. */
const sizeBudget = 6 * 1024 * 1024;

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

/** Every example the library registers, by the id the docs use. */
const registeredExamples = async (): Promise<ReadonlyArray<string>> => {
  const [components, data] = await Promise.all([
    import("@gpuixui/components/examples"),
    import("@gpuixui/data/examples"),
  ]);
  return Arr.sort(
    Array.from(
      new Set([
        ...Object.keys(components.examples),
        ...Object.keys(data.examples),
      ]),
    ),
    Order.String,
  );
};

/** The run's arguments: the ids to render, the server and the browser. */
interface Flags {
  readonly only: ReadonlyArray<string>;
  readonly url: string | undefined;
  readonly chrome: string | undefined;
}

const parseFlags = (argv: ReadonlyArray<string>): Flags => {
  const valueOf = (name: string): string | undefined => {
    const at = argv.indexOf(name);
    return at === -1 ? undefined : argv[at + 1];
  };
  const only = valueOf("--only");
  return {
    only:
      only === undefined
        ? []
        : only
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id.length > 0),
    url: valueOf("--url"),
    chrome: valueOf("--chrome"),
  };
};

/** The page's report once the batch surface is ready, failed, or timed out. */
const ready = async (
  page: ChromePage,
): Promise<Readonly<Record<string, string>> | undefined> => {
  const deadline = Date.now() + paintTimeoutMs;
  while (Date.now() < deadline) {
    const text = await page
      .text("document.getElementById('out')?.textContent ?? ''")
      .catch(() => "");
    const report = parseReport(text);
    if (report.status === "ready") return report;
    if (report.status?.startsWith("failed")) return report;
    await sleep(150);
  }
  return undefined;
};

/** Hide the route's own bar so the frame is the library, not the docs chrome. */
const hideDocumentChrome = (page: ChromePage): Promise<void> =>
  page.run(`document.querySelector(".live-surface-bar")?.remove()`);

interface Capture {
  readonly id: string;
  readonly bytes: number;
  readonly fills: number;
}

/** Render one example into the live surface and write its frame. */
const render = async (page: ChromePage, id: string): Promise<Capture> => {
  // Clear first: a capture that measured the previous example would still pass
  // the flat-frame check while naming the wrong component.
  await page.run("window.__gpuixCapture?.clear()");
  await page.run(
    "new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))",
  );

  const accepted = await page.text(
    `String(window.__gpuixCapture?.render(${JSON.stringify(id)}) ?? false)`,
  );
  if (accepted !== "true") {
    throw new Error("the page has no example by that id");
  }

  // Some examples paint after their first frame (syntax highlight, measurement).
  // The PNG is the measurement; retry until the frame is not the empty stage.
  let png: Uint8Array | undefined;
  let colours: number | undefined;
  for (let attempt = 0; attempt < paintAttempts; attempt += 1) {
    await page.run(
      "new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))",
    );
    await sleep(settleMs);
    png = await page.capture({ format: "png" });
    colours = distinctFillCount(png);
    if (colours !== undefined && colours >= minimumFills) break;
  }
  if (png === undefined || colours === undefined) {
    throw new Error("the frame's pixels could not be read");
  }
  if (colours < minimumFills) {
    const text = await page.text(
      "JSON.stringify(window.__gpuixCapture?.text() ?? [])",
    );
    throw new Error(
      `the frame is flat (${colours} colours); text=${text.slice(0, 200)}`,
    );
  }

  const webp = await page.capture({ format: "webp", quality: 82 });
  await writeFile(join(outDir, `${id}.webp`), webp);
  return { id, bytes: webp.length, fills: colours };
};

/** The generated metadata module the docs import to caption a still honestly. */
const metadataFile = join(appRoot, "src/lib/native-captures.generated.ts");

const writeFrame = async (
  report: Readonly<Record<string, string>>,
): Promise<void> => {
  const platform = report.platform;
  const mode = report.mode;
  if (platform === undefined || mode === undefined) {
    throw new Error("the batch surface reported no frame metadata");
  }
  await writeFile(
    metadataFile,
    [
      "/**",
      " * Generated by `scripts/native-previews.ts` — do not edit.",
      " *",
      " * The platform and palette every checked-in frame was rendered on. The capture",
      " * run writes this on a full run, so a Native caption names the frame it shows",
      " * rather than the reader's current switch.",
      " */",
      "export const nativeCaptureFrame = {",
      `  platform: ${JSON.stringify(platform)},`,
      `  mode: ${JSON.stringify(mode)},`,
      "} as const;",
      "",
    ].join("\n"),
  );
};
export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const flags = parseFlags(argv);
  const chrome = findChrome(flags.chrome, process.env);
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 2;
  }

  const registered = await registeredExamples();
  const ids =
    flags.only.length === 0
      ? registered
      : flags.only.filter((id) => registered.includes(id));
  const unknown = flags.only.filter((id) => !registered.includes(id));
  if (unknown.length > 0) {
    console.error(`unknown example: ${unknown.join(", ")}`);
    return 2;
  }
  if (ids.length === 0) {
    console.error("no examples to render");
    return 2;
  }

  await mkdir(outDir, { recursive: true });
  const server = await docsServer(flags.url);
  const session = await openChrome(
    chrome,
    `${server.url}/live?scene=examples&platform=darwin&mode=dark`,
    viewport.width,
    viewport.height,
  );
  const captures: Array<Capture> = [];
  const failures: Array<string> = [];

  try {
    const report = await ready(session.page);
    if (report === undefined) {
      throw new Error("the batch surface never reported ready");
    }
    if (report.status !== "ready") {
      throw new Error(report.status ?? "the batch surface reported no status");
    }
    await hideDocumentChrome(session.page);

    for (const id of ids) {
      try {
        const capture = await render(session.page, id);
        captures.push(capture);
        console.log(
          `ok ${id} ${Math.round(capture.bytes / 1024)} KiB ${capture.fills} colours`,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        failures.push(`${id}: ${reason}`);
        console.error(`FAIL ${id}: ${reason}`);
      }
    }

    // A partial run must not relabel every checked-in frame with the host it
    // happened to run on.
    if (failures.length === 0 && flags.only.length === 0) {
      await writeFrame(report);
    }
  } finally {
    await session.close();
    await server.close();
  }

  const total = captures.reduce((bytes, capture) => bytes + capture.bytes, 0);
  console.log(
    `${captures.length}/${ids.length} captured, ${Math.round(total / 1024)} KiB`,
  );
  if (total > sizeBudget) {
    console.error(
      `FAIL the captures exceed the ${Math.round(sizeBudget / 1024 / 1024)} MiB budget`,
    );
    return 1;
  }
  return failures.length === 0 ? 0 : 1;
};

process.exitCode = await main(process.argv.slice(2));
