/**
 * The bug these guard: a composer that offers Send while the assistant is still
 * streaming, and a late completion that silently reopens a stream the reader
 * stopped. The transition table must be total and identity-preserving for every
 * intent that does not apply.
 */

import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import {
  beginStream,
  beginSubmit,
  canStop,
  canSubmit,
  ChatStatus,
  endStream,
  failStream,
  stopStream,
  type ChatStatus as Status,
} from "./logic.js";

const idle: Status = { _tag: "idle" };
const submitting: Status = { _tag: "submitting" };
const streaming: Status = { _tag: "streaming" };
const failed: Status = { _tag: "error", message: "network down" };

describe("canSubmit / canStop", () => {
  it("allows a first submit and a retry, and nothing else", () => {
    expect(canSubmit(idle)).toBe(true);
    expect(canSubmit(failed)).toBe(true);
    expect(canSubmit(submitting)).toBe(false);
    expect(canSubmit(streaming)).toBe(false);
  });

  it("allows a stop only while work is in flight", () => {
    expect(canStop(submitting)).toBe(true);
    expect(canStop(streaming)).toBe(true);
    expect(canStop(idle)).toBe(false);
    expect(canStop(failed)).toBe(false);
  });
});

describe("transitions", () => {
  it("starts a submit from idle and from an error", () => {
    expect(beginSubmit(idle)).toEqual({ _tag: "submitting" });
    expect(beginSubmit(failed)).toEqual({ _tag: "submitting" });
  });

  it("leaves a running stream alone when submit is asked again", () => {
    expect(beginSubmit(streaming)).toBe(streaming);
    expect(beginSubmit(submitting)).toBe(submitting);
  });

  it("moves submitting to streaming and back to idle", () => {
    expect(beginStream(submitting)).toEqual({ _tag: "streaming" });
    expect(endStream(streaming)).toEqual({ _tag: "idle" });
  });

  it("never starts a stream from idle or error", () => {
    expect(beginStream(idle)).toBe(idle);
    expect(beginStream(failed)).toBe(failed);
  });

  it("a late end cannot reopen a stopped stream", () => {
    const stopped = stopStream(streaming);

    expect(stopped).toEqual({ _tag: "idle" });
    expect(endStream(stopped)).toBe(stopped);
  });

  it("stops submitting or streaming, and nothing else", () => {
    expect(stopStream(submitting)).toEqual({ _tag: "idle" });
    expect(stopStream(streaming)).toEqual({ _tag: "idle" });
    expect(stopStream(idle)).toBe(idle);
    expect(stopStream(failed)).toBe(failed);
  });

  it("fails with the message only while work is in flight", () => {
    expect(failStream(streaming, "timeout")).toEqual({
      _tag: "error",
      message: "timeout",
    });
    expect(failStream(submitting, "refused")).toEqual({
      _tag: "error",
      message: "refused",
    });
    expect(failStream(idle, "ignored")).toBe(idle);
  });

  it("decodes the status union at a boundary", () => {
    const decode = Schema.decodeUnknownSync(ChatStatus);

    expect(decode({ _tag: "streaming" })).toEqual({ _tag: "streaming" });
  });
});
