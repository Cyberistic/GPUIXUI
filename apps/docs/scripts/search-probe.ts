/**
 * Prove the search dialog finds a page when a reader types, and Enter opens it.
 *
 * Search is the one interaction on the site that had no browser measurement:
 * the index, the shadowing rule and the response shape all have unit guards,
 * but nothing pressed the dialog. Two things only a browser confirms: that a
 * synthesised query reaches the controlled input (rather than leaving the
 * opening suggestions), and that the highlighted result is a navigation path
 * rather than a picture of one.
 *
 * The queries are not chosen for the words: each one asserts a different part
 * of the index. `slider` is a page only the package writes, `architecture` is a
 * page only the site writes, and `button` is a component with two addresses —
 * the curated page must answer and the retired package twin must not.
 *
 * Run (a dev or preview server is already up):
 * `nub apps/docs/scripts/search-probe.ts`
 * `--url <url>`, `--timeout <ms>` (hydration budget), `--chrome <path>`.
 */

import { findChrome, openChrome } from "./chrome-session.ts";
import { firstReady } from "./react-ready.ts";

/** The page a preview server serves; the dialog is mounted by the root layout. */
export const defaultUrl = "http://localhost:4175/docs/components/button";

/** The trigger every docs page carries. */
export const searchTrigger = "button[data-search]";

/** The input the dialog focuses once it is open. */
export const searchInput = "input[role=combobox]";

/** One query and the page it must find. */
export interface SearchCase {
  /** What the reader types. */
  readonly query: string;
  /** The page the index must return for it. */
  readonly expected: string;
  /** Addresses the index must not return, because the site does not serve them. */
  readonly absent: ReadonlyArray<string>;
}

/**
 * The three queries, one per part of the index.
 *
 * A new case needs a page the current index already serves; the guard
 * (`src/lib/search-probe.test.ts`) resolves each `expected` address to the file
 * that writes it and requires the query to appear there, so a renamed page or a
 * reworded section fails the suite before the probe runs.
 */
export const searchCases: ReadonlyArray<SearchCase> = [
  {
    query: "slider",
    expected: "/docs/primitives/slider",
    absent: [],
  },
  {
    query: "button",
    expected: "/docs/components/button",
    absent: ["/docs/primitives/button"],
  },
  {
    query: "architecture",
    expected: "/docs/architecture",
    absent: [],
  },
];

/** What the dialog shows at one instant, as the probe reads it. */
export interface SearchReadout {
  /** Every option's index id, which is `fd-search-option-<url>` for a page row. */
  readonly options: ReadonlyArray<string>;
  /** The option a stray Enter would open. */
  readonly active: string;
  /** Where the document is, path and hash. */
  readonly path: string;
}

/** The readout the page writes, `options|active|path`. */
export const readoutFields = 3;

/**
 * Read the probe's one-line readout; `undefined` when it is not one.
 *
 * A truncated line is refused rather than padded: an empty `active` would read
 * as "nothing is selected" and the Enter assertion would compare two blanks.
 */
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

/** Whether one option's id names this page rather than one of its sections. */
export const isPageRow = (option: string, url: string): boolean =>
  option === url;

/** The option ids, the active one and the address, as one line. */
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

/** Whether the dialog's trigger carries React's own handler. */
export const triggerReady = `(() => {
  const trigger = ${firstReady(`button[data-search]`)};
  if (trigger !== undefined) return "ready";
  return document.querySelector('${searchTrigger}') === null ? "missing" : "cold";
})()`;

/** Whether the dialog is on screen: Radix keeps a closed one mounted for its exit. */
const dialogState = `(() => {
  const dialog = document.querySelector('[role=dialog]');
  if (dialog === null) return "closed";
  return dialog.getAttribute("data-state") === "open" ? "open" : "closed";
})()`;

/**
 * Type into the dialog's controlled input.
 *
 * React keeps its own value tracker: assigning `input.value` directly leaves it
 * believing nothing changed, so its change handler never runs and the options
 * stay on the opening suggestions. Writing through the prototype's setter is
 * what makes the `input` event carry a value React reads.
 */
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

/** Press the key a reader presses on the highlighted result. */
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

/** Poll `read` until `accept` holds, or the budget runs out. */
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

/** Run the project. Returns the process exit code. */
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
      // The dialog opens with the site's own links, so a reader has something to
      // press before typing (the `links` the root provider passes).
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

    // The last word proves the list is a navigation path, not a picture of one:
    // Enter opens the highlighted result and the dialog leaves the screen.
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
