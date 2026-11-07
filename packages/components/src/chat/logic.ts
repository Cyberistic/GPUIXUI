import { Match } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const ChatStatus = Schema.Literals([
  "idle",
  "submitting",
  "streaming",
  "error",
]);

export type ChatStatus = typeof ChatStatus.Type;

export const isChatStatus = Schema.is(ChatStatus);

export type ChatCommand =
  | "submit"
  | "retry"
  | "stop"
  | "begin"
  | "delta"
  | "complete"
  | "fail";

export type ChatEmit = "submit" | "stop" | "retry";

export interface ChatMove {
  readonly status: ChatStatus;

  readonly emit: Option.Option<ChatEmit>;
}

const noIntent = (status: ChatStatus): ChatMove => ({
  status,
  emit: Option.none(),
});

const calls = (status: ChatStatus, emit: ChatEmit): ChatMove => ({
  status,
  emit: Option.some(emit),
});

export const isChatBusy = (status: ChatStatus): boolean =>
  status === "submitting" || status === "streaming";

export const canChatSubmit = (status: ChatStatus): boolean =>
  !isChatBusy(status);

export const chatMove = (status: ChatStatus, command: ChatCommand): ChatMove =>
  Match.value(command).pipe(
    Match.when("submit", () =>
      canChatSubmit(status) ? calls("submitting", "submit") : noIntent(status),
    ),
    Match.when("retry", () =>
      status === "error" ? calls("submitting", "retry") : noIntent(status),
    ),
    Match.when("stop", () =>
      isChatBusy(status) ? calls("idle", "stop") : noIntent(status),
    ),
    Match.when("begin", () =>
      status === "submitting" ? noIntent("streaming") : noIntent(status),
    ),
    Match.when("delta", () =>
      isChatBusy(status) ? noIntent("streaming") : noIntent(status),
    ),
    Match.when("complete", () =>
      isChatBusy(status) ? noIntent("idle") : noIntent(status),
    ),
    Match.when("fail", () =>
      isChatBusy(status) ? noIntent("error") : noIntent(status),
    ),
    Match.exhaustive,
  );
