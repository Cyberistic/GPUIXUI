/**
 * The console gate's report model (plan 562).
 *
 * The site can load without errors and still be broken: a stale asset hash
 * after a redeploy makes every client chunk 404 while the server HTML renders,
 * and a thrown client effect fails silently because no gate reads the browser
 * console. This module turns the three CDP events that mean "this page failed"
 * into one line each, so the text a failing gate prints is pure and tested and
 * `chrome-session` only records it.
 */

export type PageErrorOrigin = "console" | "exception" | "network" | "script";

/** One failure the page produced; `message` is already reader-facing. */
export interface PageError {
  readonly origin: PageErrorOrigin;
  readonly message: string;
}

const NO_MESSAGE = "(no message)";
const NO_DETAIL = "(no detail)";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const nonEmpty = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

/** The actionable first line; a stack follows it on later lines. */
const firstLine = (value: string): string => value.split("\n")[0]?.trim() ?? "";

/** A CDP remote object's printable value: a string, or a scalar rendered. */
const argumentText = (argument: unknown): string | null => {
  if (typeof argument === "string") return nonEmpty(argument);
  if (!isRecord(argument)) return null;
  if (typeof argument["value"] === "string") return nonEmpty(argument["value"]);
  if (
    typeof argument["value"] === "number" ||
    typeof argument["value"] === "boolean"
  ) {
    return `${argument["value"]}`;
  }
  return nonEmpty(argument["description"]);
};

const consoleError = (params: unknown): PageError | null => {
  if (!isRecord(params) || params["type"] !== "error") return null;
  const args = params["args"];
  const parts = Array.isArray(args)
    ? args.flatMap((argument) => {
        const text = argumentText(argument);
        return text === null ? [] : [text];
      })
    : [];
  const message = parts.length === 0 ? NO_MESSAGE : parts.join(" ");
  // React logs a thrown effect with its stack as one argument; the gate's
  // contract is one actionable line, so the stack stays out of the report.
  return { origin: "console", message: firstLine(message) || NO_MESSAGE };
};

const exceptionError = (params: unknown): PageError | null => {
  if (!isRecord(params)) return null;
  const details = params["exceptionDetails"];
  if (!isRecord(details)) return null;
  const exception = details["exception"];
  const description = isRecord(exception)
    ? nonEmpty(exception["description"])
    : null;
  const line = firstLine(description ?? nonEmpty(details["text"]) ?? "");
  return { origin: "exception", message: line.length === 0 ? NO_DETAIL : line };
};

/**
 * A failed resource and a script error are both `Log` entries; the source is
 * the only difference. Warnings and info are not failures, so a gate on them
 * would become an allowlist.
 */
const logError = (params: unknown): PageError | null => {
  if (!isRecord(params)) return null;
  const entry = params["entry"];
  if (!isRecord(entry) || entry["level"] !== "error") return null;
  const message = nonEmpty(entry["text"]) ?? NO_MESSAGE;
  const url = nonEmpty(entry["url"]);
  return {
    origin: entry["source"] === "javascript" ? "script" : "network",
    message: url === null ? message : `${message} (${url})`,
  };
};

const HANDLERS: Readonly<
  Record<string, (params: unknown) => PageError | null>
> = {
  "Runtime.consoleAPICalled": consoleError,
  "Runtime.exceptionThrown": exceptionError,
  "Log.entryAdded": logError,
};

/** `null` when the event is not a failure (a warning, an info log, …). */
export const pageErrorFromEvent = (
  method: string,
  params: unknown,
): PageError | null => HANDLERS[method]?.(params) ?? null;

/** Same origin and message collapse; the first occurrence and order win. */
export const uniqueErrors = (
  errors: ReadonlyArray<PageError>,
): ReadonlyArray<PageError> =>
  errors.reduce<ReadonlyArray<PageError>>((unique, error) => {
    const duplicate = unique.some(
      (seen) => seen.origin === error.origin && seen.message === error.message,
    );
    return duplicate ? unique : [...unique, error];
  }, []);

export const errorLine = (path: string, error: PageError): string =>
  `${path} ${error.origin}: ${error.message}`;

/** Any failure is a failing site; no failure is a pass. */
export const exitCode = (failures: number): 0 | 1 => (failures > 0 ? 1 : 0);

export const passLine = (pages: number): string =>
  `console: ${pages} pages, 0 errors`;
