/**
 * The conversation state machine, with no renderer.
 *
 * The bugs these guard: a second Enter during a reply sending a second message;
 * a Stop that arrives as a submit; a Stop on an idle conversation doing
 * anything; a token starting a conversation nobody asked for; and a failed
 * reply that cannot be retried. Every command is checked from every state, so a
 * permissive branch cannot pass by accident.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  canChatSubmit,
  chatMove,
  isChatBusy,
  isChatStatus,
  type ChatCommand,
  type ChatStatus,
} from "./logic.js";

const statuses: ReadonlyArray<ChatStatus> = [
  "idle",
  "submitting",
  "streaming",
  "error",
];

/** The status a command reaches, and the intent it emits (or none). */
const move = (
  status: ChatStatus,
  command: ChatCommand,
): readonly [ChatStatus, string] => {
  const result = chatMove(status, command);
  return [result.status, Option.getOrElse(result.emit, () => "none")];
};

describe("chat status", () => {
  it("accepts the four statuses and rejects anything else", () => {
    expect(statuses.every(isChatStatus)).toBe(true);
    expect(isChatStatus("pending")).toBe(false);
    expect(isChatStatus(1)).toBe(false);
  });

  it("calls submitting and streaming busy, and the others not", () => {
    expect(statuses.map(isChatBusy)).toEqual([false, true, true, false]);
    expect(statuses.map(canChatSubmit)).toEqual([true, false, false, true]);
  });
});

describe("submit", () => {
  it("starts a message from idle and emits the submit intent", () => {
    expect(move("idle", "submit")).toEqual(["submitting", "submit"]);
  });

  it("retries a failed message through the same path", () => {
    expect(move("error", "submit")).toEqual(["submitting", "submit"]);
  });

  it("refuses a second submit while a reply is open", () => {
    // The guard: a held or repeated Enter must not queue two sends.
    expect(move("submitting", "submit")).toEqual(["submitting", "none"]);
    expect(move("streaming", "submit")).toEqual(["streaming", "none"]);
  });
});

describe("stop", () => {
  it("ends a reply and emits stop, never submit", () => {
    expect(move("submitting", "stop")).toEqual(["idle", "stop"]);
    expect(move("streaming", "stop")).toEqual(["idle", "stop"]);
  });

  it("does nothing when there is no reply to stop", () => {
    expect(move("idle", "stop")).toEqual(["idle", "none"]);
    expect(move("error", "stop")).toEqual(["error", "none"]);
  });
});

describe("retry", () => {
  it("only accepts a failed conversation", () => {
    expect(move("error", "retry")).toEqual(["submitting", "retry"]);
    expect(move("idle", "retry")).toEqual(["idle", "none"]);
    expect(move("streaming", "retry")).toEqual(["streaming", "none"]);
  });
});

describe("stream events", () => {
  it("walks submitting to streaming to idle", () => {
    const first = chatMove("submitting", "begin");
    expect([first.status, Option.isNone(first.emit)]).toEqual([
      "streaming",
      true,
    ]);
    expect(move("streaming", "complete")).toEqual(["idle", "none"]);
  });

  it("opens a reply on a delta from either waiting state", () => {
    expect(move("submitting", "delta")).toEqual(["streaming", "none"]);
    expect(move("streaming", "delta")).toEqual(["streaming", "none"]);
  });

  it("fails a reply and leaves an idle chat alone", () => {
    expect(move("submitting", "fail")).toEqual(["error", "none"]);
    expect(move("streaming", "fail")).toEqual(["error", "none"]);
    expect(move("idle", "fail")).toEqual(["idle", "none"]);
  });

  it("refuses a token that would start a conversation", () => {
    expect(move("idle", "begin")).toEqual(["idle", "none"]);
    expect(move("idle", "delta")).toEqual(["idle", "none"]);
    expect(move("idle", "complete")).toEqual(["idle", "none"]);
  });
});
