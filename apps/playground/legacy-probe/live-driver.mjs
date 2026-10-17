/**
 * Drives live-app.mjs through the GPUix automation stdio protocol and reports
 * what works in a *live* window on darwin-x64 (0.5.1).
 */
import { mkdirSync } from "node:fs";
import { launch } from "@gpuix/react/automation";

const artifacts = `${
  process.env.LEGACY_PROBE_ARTIFACTS ??
  new URL("./.artifacts", import.meta.url).pathname
}/`;
mkdirSync(artifacts, { recursive: true });

const report = { steps: [], errors: [] };
const step = async (name, value) => {
  try {
    report.steps.push({
      name,
      value: typeof value === "function" ? await value() : value,
    });
  } catch (error) {
    report.steps.push({ name, value: `THREW: ${error}` });
  }
};
const attempt = async (name, fn) => {
  try {
    await fn();
  } catch (error) {
    report.errors.push({ name, error: String(error) });
  }
};

const app = await launch({
  command: process.execPath,
  args: ["live-app.mjs"],
});
step("launched", true);

await attempt("screenshot-open", async () => {
  await app.screenshot({ path: `${artifacts}/open.png` });
  return "ok";
});

await attempt("focusClick", async () => {
  await app.getByTestId("focus-a").click();
  await step("focusAfterClickA", () =>
    app.getByTestId("focus-readout").textContent(),
  );
  await app.getByTestId("focus-a").press("tab");
  await step("focusAfterTab", () =>
    app.getByTestId("focus-readout").textContent(),
  );
});

await attempt("fill", async () => {
  await app.getByTestId("field").fill("hello live");
  await step("valueAfterFill", () =>
    app.getByTestId("value-readout").textContent(),
  );
});

await attempt("dividerDrag", async () => {
  await app.getByTestId("divider").dragBy(60, 0);
  await step("splitAfterDrag", () =>
    app.getByTestId("split-readout").textContent(),
  );
  await step("paneABounds", () => app.getByTestId("pane-a").bounds());
});

await attempt("wheel", async () => {
  await step("srow0BeforeWheel", async () => {
    const b = await app.getByTestId("srow-0").bounds();
    return b ? b.y : null;
  });
  await app.getByTestId("scroller").wheel(0, 200);
  await step("scrollDelta", () =>
    app.getByTestId("scroll-readout").textContent(),
  );
  await step("srow0AfterWheel", async () => {
    const b = await app.getByTestId("srow-0").bounds();
    return b ? b.y : null;
  });
});

await attempt("screenshot-after", async () => {
  await app.screenshot({ path: `${artifacts}/after.png` });
  return "ok";
});

await attempt("close", () => app.close());
process.stdout.write(`LIVE_PROBE ${JSON.stringify(report, null, 2)}\n`);
process.exit(0);
