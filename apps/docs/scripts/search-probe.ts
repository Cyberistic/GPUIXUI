import { findChrome, openChrome } from "./chrome-session.ts";
import { firstReady } from "./react-ready.ts";

export const defaultUrl = "http://localhost:4175/components/button";

export const searchTrigger = "button[data-search]";

export const searchInput = "input[role=combobox]";

export interface SearchCase {
  readonly query: string;

  readonly expected: string;

  readonly absent: ReadonlyArray<string>;
}

export const searchCases: ReadonlyArray<SearchCase> = [
  {
    query: "slider",
    expected: "/primitives/slider",
    absent: [],
  },
  {
    query: "button",
    expected: "/components/button",
    absent: ["/primitives/button"],
  },
  {
    query: "two minutes",
    expected: "/getting-started",
    absent: [],
  },
];

export interface SearchReadout {
  readonly options: ReadonlyArray<string>;

  readonly active: string;

  readonly path: string;
}

export const readoutFields = 3;

export const parseSearchReadout = (text: string): SearchReadout | undefined => {
  const fields = text.split("|");
  if (fields.length !== readoutFields) return undefined;
  const [options = "", active = "", path = ""] = fields;
  if (path === "") return undefined;
  return {
    options: options === "" ? [] : options.split(" "),
    active,
    path,
  };
};

export const isPageRow = (option: string, url: string): boolean =>
  option === url;

const readResults = `(() => {
  const input = document.querySelector('${searchInput}');
  const options = [...document.querySelectorAll('[role=option]')]
    .map((node) => node.id.replace("fd-search-option-", ""));
  const active = input?.getAttribute("aria-activedescendant") ?? "";
  return [
    options.join(" "),
    active.replace("fd-search-option-", ""),
    location.pathname + location.hash,
  ].join("|");
})()`;

export const triggerReady = `(() => {
  const trigger = ${firstReady(`button[data-search]`)};
  if (trigger !== undefined) return "ready";
  return document.querySelector('${searchTrigger}') === null ? "missing" : "cold";
})()`;

const dialogState = `(() => {
  const dialog = document.querySelector('[role=dialog]');
  if (dialog === null) return "closed";
  return dialog.getAttribute("data-state") === "open" ? "open" : "closed";
})()`;

const type = (query: string): string => `(() => {
  const input = document.querySelector('${searchInput}');
  if (input === null) return "no-input";
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (setter === undefined) return "no-setter";
  setter.call(input, ${JSON.stringify(query)});
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  return "typed";
})()`;

const submit = `(() => {
  const input = document.querySelector('${searchInput}');
  if (input === null) return "no-input";
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
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

  const session = await openChrome(chrome, url, 1280, 900);
  const failures: Array<string> = [];

  try {
    const hydrated = await until(
      () => session.page.text(triggerReady),
      (state) => state === "ready",
      budget,
    );
    if (hydrated === undefined) {
      console.error(
        `FAIL the search trigger never hydrated within ${budget} ms (it carries no React onClick)`,
      );
      return 1;
    }

    await session.page.run(`${firstReady(searchTrigger)}.click()`);
    const opened = await until(
      () => session.page.text(dialogState),
      (state) => state === "open",
      10000,
    );
    if (opened === undefined) {
      console.error("FAIL pressing the trigger opened no search dialog");
      return 1;
    }

    const opening = parseSearchReadout(await session.page.text(readResults));
    if (opening === undefined) {
      failures.push("an open dialog reported nothing the probe could read");
    } else if (opening.options.length === 0) {
      failures.push("the dialog opened with no option to press");
    } else {
      console.log(`opening: ${opening.options.length} suggestions`);
    }

    for (const searchCase of searchCases) {
      const typed = await session.page.text(type(searchCase.query));
      if (typed !== "typed") {
        failures.push(
          `the dialog could not be typed into for ${searchCase.query} (${typed})`,
        );
        continue;
      }

      const found = await until(
        async () => {
          const text = await session.page.text(readResults);
          return parseSearchReadout(text)?.options.includes(
            searchCase.expected,
          ) === true
            ? text
            : "";
        },
        (value) => value !== "",
        15000,
      );
      const readout = parseSearchReadout(found ?? "");
      if (readout === undefined) {
        failures.push(
          `${searchCase.query} never returned ${searchCase.expected}`,
        );
        continue;
      }

      const retired = searchCase.absent.filter((address) =>
        readout.options.includes(address),
      );
      if (retired.length > 0) {
        failures.push(
          `${searchCase.query} returned the retired page ${retired.join(", ")}`,
        );
      }
      console.log(`${searchCase.query} → ${searchCase.expected}`);
    }

    const target = searchCases[searchCases.length - 1];
    const highlighted = await until(
      async () => {
        const text = await session.page.text(readResults);
        const readout = parseSearchReadout(text);
        return readout !== undefined &&
          isPageRow(readout.active, target?.expected ?? "")
          ? text
          : "";
      },
      (value) => value !== "",
      10000,
    );
    if (highlighted === undefined) {
      failures.push(
        `the highlighted result is not the page row for ${target?.query} (${await session.page.text(readResults)})`,
      );
    } else {
      await session.page.text(submit);
      const arrived = await until(
        () => session.page.text(`location.pathname`),
        (path) => path === target?.expected,
        10000,
      );
      if (arrived === undefined) {
        failures.push(
          `Enter on ${target?.query} left the page at ${await session.page.text(`location.pathname`)}`,
        );
      } else if ((await session.page.text(dialogState)) !== "closed") {
        failures.push("the dialog stayed open after Enter opened a result");
      } else {
        console.log(`enter → ${arrived}`);
      }
    }
  } finally {
    await session.close();
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log(
    "PASS the search dialog finds a curated page, a package page and a site page, and Enter opens the result",
  );
  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
