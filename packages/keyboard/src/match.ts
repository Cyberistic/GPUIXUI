import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import {
  fromEvent,
  sameAccelerator,
  type Accelerator,
  type Platform,
} from "./accelerator.js";

/**
 * Whether `accelerator` matches this key event exactly.
 *
 * Modifiers are exact: `Mod+K` does not match `Mod+Shift+K` unless Shift is
 * listed, and a modifier never leaks into a chord that did not name it. `mod`
 * resolves against `platform`; `cmd` and `ctrl` stay distinct. The real
 * `KeyEvent` carries `keystrokeId`, the authoritative identity of one physical
 * keystroke shared by its element handler and the window handler — the registry
 * uses that id to avoid resolving twice — while this predicate itself reads the
 * event's `key` and `modifiers`.
 */
export const match = (
  accelerator: Accelerator,
  event: EventPayload,
  platform: Platform,
): boolean =>
  Option.match(fromEvent(event, platform), {
    onNone: () => false,
    onSome: (captured) => sameAccelerator(accelerator, captured, platform),
  });
