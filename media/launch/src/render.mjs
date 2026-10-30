import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const FPS = 60;
const SECONDS = 27.2;
const FRAMES = Math.round(FPS * SECONDS);
const out = "/tmp/film/frames";

await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("file:///tmp/film/film.html", { waitUntil: "networkidle" });
await page.evaluate(() => window.prepare());
await page.waitForTimeout(300);

const started = Date.now();
for (let i = 0; i < FRAMES; i += 1) {
  const t = i / FPS;
  await page.evaluate((time) => window.renderAt(time), t);
  const buffer = await page.screenshot({ type: "png" });
  await writeFile(`${out}/${String(i).padStart(5, "0")}.png`, buffer);
  if (i % 300 === 0) console.log(`frame ${i}/${FRAMES} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
}
console.log("frames:", FRAMES, "errors:", errors.length, "elapsed s:", ((Date.now() - started) / 1000).toFixed(0));
if (errors.length) console.log(errors.slice(0, 3));
await browser.close();
