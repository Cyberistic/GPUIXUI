import { findChrome, openChrome } from "./chrome-session.ts";
import { hasHandler } from "./react-ready.ts";

export const defaultUrl = "http://localhost:4175/components/carousel";

export const slideOf = (text: string): number | undefined => {
  const match = /Slide (\d+) of (\d+)/.exec(text);
  const slide = match?.[1];
  return slide === undefined ? undefined : Number(slide);
};

const fiberCount = `String(
  [...document.querySelectorAll("*")].filter((node) =>
    Object.getOwnPropertyNames(node).some((key) => key.startsWith("__react")),
  ).length,
)`;

const controlReady = `(() => {
  const frame = [...document.querySelectorAll(".gx-carousel-frame")].find((node) =>
    /Slide \\d+ of \\d+/.test(node.textContent ?? ""),
  );
  const button = [...(frame?.querySelectorAll("button") ?? [])].find(
    (node) => node.getAttribute("aria-label") === "Next slide",
  );
  if (button === undefined) return "no-control";
  return ${hasHandler("button")} ? "ready" : "cold";
})()`;

const demoText = `(() => {
  const frame = [...document.querySelectorAll(".gx-carousel-frame")].find((node) =>
    /Slide \\d+ of \\d+/.test(node.textContent ?? ""),
  );
  return frame?.textContent ?? "";
})()`;

const press = (label: string): string => `(() => {
  const frame = [...document.querySelectorAll(".gx-carousel-frame")].find((node) =>
    /Slide \\d+ of \\d+/.test(node.textContent ?? ""),
  );
  const button = [...(frame?.querySelectorAll("button") ?? [])].find(
    (node) => node.getAttribute("aria-label") === ${JSON.stringify(label)},
  );
  if (button === undefined) return "no-button";
  button.click();
  return "pressed";
})()`;

const until = async (
  read: () => Promise<string>,
  accept: (value: string) => boolean,
  timeout: number,
): Promise<string | undefined> => {
  const started = Date.now();
  let value = await read();
  while (!accept(value) && Date.now() - started < timeout) {
    await new Promise((wait) => setTimeout(wait, 250));
    value = await read();
  }
  return accept(value) ? value : undefined;
};

export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const argument = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const url = argument("--url") ?? defaultUrl;
  const budget = Number(argument("--timeout") ?? "90000");
  if (!Number.isFinite(budget) || budget <= 0) {
    console.error("FAIL --timeout must be a positive number of milliseconds");
    return 2;
  }
  const chrome = findChrome(argument("--chrome"), process.env);
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 2;
  }

  const started = Date.now();
  const session = await openChrome(chrome, url, 1280, 900);
  const failures: Array<string> = [];

  try {
    const hydrated = await until(
      () => session.page.text(controlReady),
      (state) => state === "ready",
      budget,
    );
    if (hydrated === undefined) {
      console.error(
        `FAIL the demo never hydrated within ${budget} ms (its next control carries no React onClick)`,
      );
      return 1;
    }
    const fibers = await session.page.text(fiberCount);
    console.log(
      `hydrated after ${((Date.now() - started) / 1000).toFixed(1)}s (${fibers} nodes carry a fiber)`,
    );

    const first = await session.page.text(demoText);
    if (slideOf(first) !== 1) {
      failures.push(
        `the workflow demo opened on slide ${slideOf(first) ?? "none"}, not 1`,
      );
    }

    const forward = await session.page.text(press("Next slide"));
    if (forward !== "pressed") {
      failures.push(`the next control could not be pressed (${forward})`);
    }
    const second = await until(
      () => session.page.text(demoText),
      (text) => slideOf(text) === 2,
      5000,
    );
    if (second === undefined) {
      failures.push(
        `pressing next left the readout at ${JSON.stringify((await session.page.text(demoText)).trim())}`,
      );
    } else {
      console.log("next: Slide 1 of 4 → Slide 2 of 4");
    }

    const back = await session.page.text(press("Previous slide"));
    if (back !== "pressed") {
      failures.push(`the previous control could not be pressed (${back})`);
    }
    const firstAgain = await until(
      () => session.page.text(demoText),
      (text) => slideOf(text) === 1,
      5000,
    );
    if (firstAgain === undefined) {
      failures.push("pressing previous did not return the readout to slide 1");
    } else {
      console.log("previous: Slide 2 of 4 → Slide 1 of 4");
    }
  } finally {
    await session.close();
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log(
    "PASS the preview hydrates and its press path moves the carousel",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
