import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome, openChrome } from "./chrome-session.ts";
import { fillAt, parseReport } from "./live-frame.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const defaultUrl = "http://localhost:4175/live";

const point = (
  report: Readonly<Record<string, string>>,
  key: string,
): { readonly x: number; readonly y: number } | undefined => {
  const [x, y] = (report[key] ?? "").split(",").map(Number);
  return x === undefined ||
    y === undefined ||
    Number.isNaN(x) ||
    Number.isNaN(y)
    ? undefined
    : { x, y };
};

const same = (left: string | undefined, right: string | undefined): boolean =>
  left !== undefined && right !== undefined
    ? left.toLowerCase() === right.toLowerCase()
    : false;

export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const urlIndex = argv.indexOf("--url");
  const url = argv[urlIndex + 1] ?? defaultUrl;
  const outIndex = argv.indexOf("--out");
  const out = resolve(
    outIndex === -1
      ? join(repoRoot, ".artifacts/live")
      : (argv[outIndex + 1] ?? ""),
  );
  const chromeIndex = argv.indexOf("--chrome");
  const chrome = findChrome(
    chromeIndex === -1 ? undefined : argv[chromeIndex + 1],
    process.env,
  );
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 2;
  }

  await mkdir(out, { recursive: true });
  const session = await openChrome(chrome, url, 1_000, 700);
  const failures: Array<string> = [];

  try {
    let text = "";
    for (let attempt = 0; attempt < 200; attempt += 1) {
      text = await session.page.text(
        "document.getElementById('out')?.textContent ?? 'pending'",
      );
      if (text.includes("status=painting") || text.includes("status=failed"))
        break;
      await new Promise((wait) => setTimeout(wait, 100));
    }

    const report = parseReport(text);
    if (report.status !== "painting") {
      console.error(
        `FAIL the route did not paint (status=${report.status ?? "missing"})`,
      );
      return 1;
    }

    const button = point(report, "button");
    const banner = point(report, "banner");
    if (button === undefined || banner === undefined) {
      console.error(`FAIL the page reported no sample point (${text})`);
      return 1;
    }

    await new Promise((wait) => setTimeout(wait, 500));
    const first = await session.page.capture();
    await writeFile(join(out, "docs-live-route-before.png"), first);

    const buttonFill = fillAt(first, button.x, button.y);
    const restFill = fillAt(first, banner.x, banner.y);
    if (!same(buttonFill, report.fill)) {
      failures.push(
        `the button painted ${buttonFill ?? "nothing"} at ${button.x},${button.y}, not ${report.fill}`,
      );
    }
    if (!same(restFill, report.resting)) {
      failures.push(
        `the banner painted ${restFill ?? "nothing"} at ${banner.x},${banner.y}, not ${report.resting}`,
      );
    }
    if (!(report.text ?? "").includes("A real GPUix frame")) {
      failures.push(
        `the retained tree does not carry the heading (text=${report.text ?? "missing"})`,
      );
    }

    await session.page.run("window.__gpuixLive?.press()");
    let presses = "0";
    for (let attempt = 0; attempt < 50; attempt += 1) {
      presses = await session.page.text(
        "String(window.__gpuixLive?.presses?.() ?? 0)",
      );
      if (presses !== "0") break;
      await new Promise((wait) => setTimeout(wait, 100));
    }
    if (presses !== "1") {
      failures.push(
        `a press through the renderer reached the listener ${presses} times, not 1`,
      );
    }

    await new Promise((wait) => setTimeout(wait, 500));
    const second = await session.page.capture();
    await writeFile(join(out, "docs-live-route-after.png"), second);
    const pressedFill = fillAt(second, banner.x, banner.y);
    if (!same(pressedFill, report.pressed)) {
      failures.push(
        `the banner painted ${pressedFill ?? "nothing"} after a press, not ${report.pressed}`,
      );
    }
  } finally {
    await session.close();
  }

  for (const failure of failures) console.error(`FAIL ${failure}`);
  if (failures.length === 0) {
    console.log(
      `PASS /live painted a real GPUix frame and took a press (${out})`,
    );
  }
  return failures.length === 0 ? 0 : 1;
};

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url))
  process.exit(await main(process.argv.slice(2)));
