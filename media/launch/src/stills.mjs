import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const base = "http://localhost:4520";
const shot = async (name, path, selector, prepare) => {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  if (prepare) await prepare();
  await page.waitForTimeout(500);
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const box = await el.boundingBox();
  if (!box) throw new Error(`no box for ${name}`);
  await page.screenshot({ path: `/tmp/film/stills/${name}.png`, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  console.log(name, Math.round(box.width), "x", Math.round(box.height));
};

await shot("hunter", "/blocks/hunter-pipeline?platform=darwin&mode=dark", ".gx-hunt");
await shot("aero", "/themes?platform=darwin&mode=dark", ".gx-pz");
await shot("editor", "/themes?platform=darwin&mode=dark", ".gx-theme-editor", async () => {
  await page.locator('.gx-te-mode:has-text("Dark")').click();
});
await shot("icons", "/icons/icon?platform=darwin&mode=dark", ".gx-icon-gallery");
await shot("dashboard", "/blocks/dashboard?platform=darwin&mode=dark", ".gx-dash, .gx-hunt, .block-stage, .gx-block");
await shot("spinner", "/components/spinner?platform=darwin&mode=dark", ".gx-component");
await shot("shimmer", "/components/shimmer?platform=darwin&mode=dark", ".gx-component");
await shot("blocks", "/blocks?platform=darwin&mode=dark", "main");
await browser.close();
