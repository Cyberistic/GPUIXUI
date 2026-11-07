//   node record.mjs <scene> <frames> <outDir>   (with the stage server on :5198)
import { mkdirSync } from "node:fs";
import { chromium } from "../.media/stageshow/node_modules/playwright-core/index.mjs";

const [, , scene = "bento", count = "120", out = "frames"] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
await page.goto(`http://localhost:5198/?scene=${scene}&record`);
await page.waitForFunction(() => window.__stageshow?.clock);
// stage exists, then count frames from there.
await page.evaluate(async () => {
  const clock = window.__stageshow.clock;
  for (let i = 0; i < 120 && !document.querySelector(".ss-stage"); i += 1) {
    await clock.step(1);
    await clock.flushLayout();
  }
});
// Every frame of every take is decoded before the first shot.
await page.evaluate(() =>
  Promise.all(
    [...document.images].map((image) => image.decode().catch(() => {})),
  ),
);
for (let frame = 0; frame < Number(count); frame += 1) {
  await page.evaluate(async () => {
    await window.__stageshow.clock.step(1);
    await window.__stageshow.clock.flushLayout();
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    );
  });
  await page.screenshot({
    path: `${out}/${String(frame).padStart(4, "0")}.png`,
  });
}
await browser.close();
