/**
 * Read the element tree a render function returns.
 *
 * Rendering is impossible on this machine (plan 020 §3: no `darwin-x64` native
 * binding), so the strongest honest check of a component is its **element
 * tree** — the props and handlers the runtime would receive. React gives that
 * tree no prop type (`JSX.Element` is `ReactElement<any, any>`), so this module
 * decodes at the boundary instead of assuming: the same rule the library
 * applies to every other unknown input. A test asserts on parsed props, never
 * on `any`.
 */

import type { ReactElement } from "react";
import type { EventPayload } from "@gpuix/react";
import { expect } from "vitest";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";

/** A host element's props are an open record of unknown values. */
const HostProps = Schema.Record(Schema.String, Schema.Unknown);

/** A GPUix host event handler. */
const HostHandler = Schema.declare(
  (input: unknown): input is (event: EventPayload) => void =>
    typeof input === "function",
  { description: "A function the runtime calls with an EventPayload." },
);

const decodeString = Schema.decodeUnknownOption(Schema.String);

/** The host tag a host element renders — `div`, `input`, `text`. */
export const hostTag = (element: ReactElement): Option.Option<string> =>
  decodeString(element.type);

/** A host element's props; `none` when the element renders a component. */
export const hostProps = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Option.flatMap(hostTag(element), () =>
    Schema.decodeUnknownOption(HostProps)(element.props),
  );

/**
 * One named prop, decoded.
 *
 * A prop the element carries but leaves `undefined` — React keeps the key — is
 * reported as absent, which is what a caller means by "the element does not
 * set this".
 */
export const hostProp = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(hostProps(element), (props) =>
    Option.flatMap(R.get(props, name), (value) => Option.fromNullishOr(value)),
  );

/** A named event handler, decoded. */
export const hostHandler = (
  element: ReactElement,
  name: string,
): Option.Option<(event: EventPayload) => void> =>
  Option.flatMap(hostProp(element, name), (value) =>
    Schema.decodeUnknownOption(HostHandler)(value),
  );

/** The decoded value, failing the test when the tree did not carry it. */
export const expectSome = <A>(value: Option.Option<A>): A =>
  Option.getOrElse(value, () =>
    expect.fail("the element tree did not carry what this test asserts on"),
  );
