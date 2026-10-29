/**
 * Capture the Blocks index thumbnails from the blocks' own pages.
 *
 * The index used to mount a live scene per tile: twelve compositions with their
 * own state and window listeners, all repainted by one platform switch. It now
 * paints a checked-in image per block, and the images are captures of the real
 * renderings — `<BlockPreview>` on `/blocks/<slug>` — never a drawing made
 * for the index.
 *
 * The list of files is the index's own: the run opens `/blocks`, reads the
 * `src` of every tile image, and captures the page each one names. A block
 * added to the registry with a page is therefore captured with no edit here,
 * and an index that names no image fails instead of writing nothing.
 *
 * Run: `nub run --filter @gpuixui/docs blocks:thumbnails`
 * Pass `--url http://localhost:4175` to reuse a running docs server.
 * Writes: `apps/docs/public/blocks/<slug>.webp` (checked in).
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome, openChrome, type ChromePage } from "./chrome-session.ts";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(appRoot, "public");

/** The desktop frame the block pages lay their column out in. */
const viewport = { width: 1440, height: 1000 } as const;
/** The tile's own aspect (`16 / 10` in `blocks.css`). */
const tileAspect = 16 / 10;
/** How long a page gets to paint its scene, and to settle after it. */
const paintTimeoutMs = 30_000;
const settleMs = 800;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

const reachable = (url: string): Promise<boolean> =>
  fetch(url).then(
    (response) => response.ok,
    () => false,
  );

/** The scene's box, from the page's own report (`x,y,width,height`). */
const boxOf = (text: string): Box | undefined => {
  const [x, y, width, height] = text.split(",").map(Number);
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }
  return { x, y, width, height };
};

/** The block page's scene box once its fonts are in, or a timeout. */
const sceneBox = async (page: ChromePage): Promise<Box> => {
  const deadline = Date.now() + paintTimeoutMs;
  while (Date.now() < deadline) {
    const text = await page
      .text(`(() => {
        const scene = document.querySelector(".gx-block-stage");
        if (scene === null || document.fonts.status !== "loaded") return "";
        const box = scene.getBoundingClientRect();
        return [box.x, box.y, box.width, box.height].join(",");
      })()`)
      .catch(() => "");
    const box = boxOf(text);
    if (box !== undefined) return box;
    await sleep(200);
  }
  throw new Error("the block page painted no scene");
};

/** The tile images the index asks for, in its own order. */
const tileSources = async (
  page: ChromePage,
): Promise<ReadonlyArray<string>> => {
  const deadline = Date.now() + paintTimeoutMs;
  while (Date.now() < deadline) {
    const text = await page
      .text(
        `[...document.querySelectorAll("img.gx-block-card-thumb")]
          .map((image) => image.getAttribute("src") ?? "")
          .join(",")`,
      )
      .catch(() => "");
    if (text !== "") return text.split(",");
    await sleep(200);
  }
  return [];
};

/**
 * The docs server to capture from: the one `--url` names, else the one already
 * answering on this app's own port, else one this run starts and stops.
 */
const docsServer = async (
  url: string | undefined,
): Promise<{ readonly url: string; readonly close: () => Promise<void> }> => {
  const base = url ?? "http://localhost:4175";
  if (await reachable(`${base}/blocks`)) {
    return { url: base, close: () => Promise.resolve() };
  }
  if (url !== undefined) {
    throw new Error(`no docs server answers at ${url}`);
  }

  const server = spawn("nub", ["run", "dev"], {
    cwd: appRoot,
    detached: true,
    stdio: "ignore",
  });
  let spawnError: Error | undefined;
  server.once("error", (error) => {
    spawnError = error;
  });
  const stop = async (): Promise<void> => {
    if (server.pid !== undefined) process.kill(-server.pid, "SIGTERM");
  };

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (spawnError !== undefined) {
      await stop();
      throw new Error(`\`nub run dev\` did not start: ${spawnError.message}`);
    }
    if (await reachable(`${base}/blocks`)) {
      return { url: base, close: stop };
    }
    await sleep(500);
  }
  await stop();
  throw new Error(
    `the docs server never answered at ${base}; run \`nub run dev:docs\` and pass --url`,
  );
};

/** Capture every tile the index names, and return the files it wrote. */
const capture = async (
  base: string,
  chrome: string,
): Promise<ReadonlyArray<string>> => {
  const session = await openChrome(
    chrome,
    `${base}/blocks`,
    viewport.width,
    viewport.height,
  );
  try {
    const sources = await tileSources(session.page);
    if (sources.length === 0) {
      throw new Error(
        "the index named no tile image; does BlockIndex paint `img.gx-block-card-thumb`?",
      );
    }

    const written: string[] = [];
    for (const source of sources) {
      const slug =
        source
          .split("/")
          .at(-1)
          ?.replace(/\.webp$/, "") ?? "";
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new Error(
          `the index named a tile that is not a block: ${source}`,
        );
      }

      await session.page.goto(`${base}/blocks/${slug}`);
      const box = await sceneBox(session.page);
      await sleep(settleMs);

      const image = await session.page.capture({
        clip: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: Math.min(box.height, box.width / tileAspect),
        },
        format: "webp",
        quality: 82,
      });

      const path = join(publicDir, source);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, image);
      written.push(`${source} (${Math.round(image.byteLength / 1024)} KiB)`);
    }
    return written;
  } finally {
    await session.close();
  }
};

/** Run the capture. Returns the process exit code. */
export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const urlIndex = argv.indexOf("--url");
  const url = urlIndex === -1 ? undefined : argv[urlIndex + 1];
  const chromeIndex = argv.indexOf("--chrome");
  const chrome = findChrome(
    chromeIndex === -1 ? undefined : argv[chromeIndex + 1],
    process.env,
  );
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 1;
  }

  let server: Awaited<ReturnType<typeof docsServer>> | undefined;
  try {
    server = await docsServer(url);
    const written = await capture(server.url, chrome);
    for (const file of written) console.log(file);
    console.log(`wrote ${written.length} tile(s) to ${publicDir}/blocks`);
    return 0;
  } catch (error) {
    console.error(
      `FAIL ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  } finally {
    await server?.close();
  }
};

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url))
  process.exit(await main(process.argv.slice(2)));
