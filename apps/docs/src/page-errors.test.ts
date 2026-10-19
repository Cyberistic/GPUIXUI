import { describe, expect, it } from "vitest";
import {
  errorLine,
  exitCode,
  pageErrorFromEvent,
  passLine,
  uniqueErrors,
} from "../scripts/page-errors.ts";

/**
 * The bug guarded: the site's gates read server HTML or a named piece of
 * hydrated state, so a page could 404 every client chunk after a redeploy or
 * throw in an effect and still pass every check. Plan 562's sweep is only as
 * honest as this normalisation, so each CDP event that means "the page failed"
 * is pinned here, together with the events that do not.
 */

const consoleError = {
  type: "error",
  args: [{ type: "string", value: "boom" }],
};

const exception = (description: string) => ({
  exceptionDetails: {
    text: "Uncaught",
    exception: { type: "object", description },
  },
});

const logEntry = (entry: Record<string, unknown>) => ({ entry });

describe("pageErrorFromEvent", () => {
  it("reports a console error with its message", () => {
    expect(
      pageErrorFromEvent("Runtime.consoleAPICalled", consoleError),
    ).toEqual({ origin: "console", message: "boom" });
  });

  it("does not report a console warning", () => {
    expect(
      pageErrorFromEvent("Runtime.consoleAPICalled", {
        ...consoleError,
        type: "warning",
      }),
    ).toBeNull();
  });

  it("keeps the description of an object argument", () => {
    expect(
      pageErrorFromEvent("Runtime.consoleAPICalled", {
        ...consoleError,
        args: [{ type: "object", description: "Error: bad" }],
      }),
    ).toEqual({ origin: "console", message: "Error: bad" });
  });

  it("keeps only the first line of a console error's stack", () => {
    expect(
      pageErrorFromEvent("Runtime.consoleAPICalled", {
        ...consoleError,
        args: [
          {
            type: "string",
            value: "Error: boom\n    at render (app.js:1:1)",
          },
        ],
      }),
    ).toEqual({ origin: "console", message: "Error: boom" });
  });

  it("reports an exception by its first line, not its stack", () => {
    expect(
      pageErrorFromEvent(
        "Runtime.exceptionThrown",
        exception("Error: boom\n    at render (app.js:1:1)"),
      ),
    ).toEqual({ origin: "exception", message: "Error: boom" });
  });

  it("still names an exception that carries no description", () => {
    expect(
      pageErrorFromEvent("Runtime.exceptionThrown", {
        exceptionDetails: { text: "Uncaught" },
      }),
    ).toEqual({ origin: "exception", message: "Uncaught" });
  });

  it("reports a failed resource with its URL", () => {
    expect(
      pageErrorFromEvent(
        "Log.entryAdded",
        logEntry({
          level: "error",
          source: "network",
          text: "Failed to load resource",
          url: "http://127.0.0.1:4173/assets/x.js",
        }),
      ),
    ).toEqual({
      origin: "network",
      message: "Failed to load resource (http://127.0.0.1:4173/assets/x.js)",
    });
  });

  it("reports a script error as a script failure", () => {
    expect(
      pageErrorFromEvent(
        "Log.entryAdded",
        logEntry({ level: "error", source: "javascript", text: "Bad" }),
      ),
    ).toEqual({ origin: "script", message: "Bad" });
  });

  it("ignores info, warnings and unknown events", () => {
    const entry = { level: "info", source: "javascript", text: "Hi" };
    expect(pageErrorFromEvent("Log.entryAdded", logEntry(entry))).toBeNull();
    expect(
      pageErrorFromEvent(
        "Log.entryAdded",
        logEntry({ ...entry, level: "warning" }),
      ),
    ).toBeNull();
    expect(pageErrorFromEvent("Runtime.consoleAPICalled", "nope")).toBeNull();
    expect(pageErrorFromEvent("Page.loadEventFired", {})).toBeNull();
  });
});

describe("uniqueErrors", () => {
  it("reports one failure once and keeps the first", () => {
    const first = { origin: "console" as const, message: "boom" };
    const second = { origin: "exception" as const, message: "bang" };
    expect(uniqueErrors([first, second, first])).toEqual([first, second]);
  });
});

describe("the gate's text", () => {
  it("names the page, the origin and the message on one line", () => {
    expect(
      errorLine("/docs/installation", {
        origin: "exception",
        message: "Error: boom",
      }),
    ).toBe("/docs/installation exception: Error: boom");
  });

  it("passes only when no page failed", () => {
    expect(exitCode(0)).toBe(0);
    expect(exitCode(2)).toBe(1);
    expect(passLine(95)).toBe("console: 95 pages, 0 errors");
  });
});
