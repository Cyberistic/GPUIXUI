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
import { isValidElement } from "react";
import type { EventPayload } from "@gpuix/react";
import { expect } from "vitest";
import * as Arr from "effect/Array";
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

const propsOf = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Schema.decodeUnknownOption(HostProps)(element.props);

/** The host tag a host element renders — `div`, `input`, `text`. */
export const hostTag = (element: ReactElement): Option.Option<string> =>
  decodeString(element.type);

/** A host element's props; `none` when the element renders a component. */
export const hostProps = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Option.flatMap(hostTag(element), () => propsOf(element));

const propOf =
  (props: (element: ReactElement) => Option.Option<Record<string, unknown>>) =>
  (element: ReactElement, name: string): Option.Option<unknown> =>
    Option.flatMap(props(element), (record) =>
      Option.flatMap(R.get(record, name), (value) =>
        Option.fromNullishOr(value),
      ),
    );

/**
 * One named prop of any element, host or component — how a test asserts on the
 * props a wrapper passes *down* to the component it composes.
 */
export const elementProp = propOf(propsOf);

/**
 * One named prop of a host element, decoded.
 *
 * A prop the element carries but leaves `undefined` — React keeps the key — is
 * reported as absent, which is what a caller means by "the element does not
 * set this".
 */
export const hostProp = propOf(hostProps);

/** A named event handler, decoded. */
export const hostHandler = (
  element: ReactElement,
  name: string,
): Option.Option<(event: EventPayload) => void> =>
  Option.flatMap(hostProp(element, name), (value) =>
    Schema.decodeUnknownOption(HostHandler)(value),
  );

const StyleRecord = Schema.Record(Schema.String, Schema.Unknown);

/** One property of a host element's resolved `style` prop, still unknown. */
export const hostStyle = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Option.flatMap(Schema.decodeUnknownOption(StyleRecord)(style), (record) =>
      Option.fromNullishOr(record[name]),
    ),
  );

/** A `style` property decoded as a string — a width, a colour, a cursor. */
export const hostStyleString = (
  element: ReactElement,
  name: string,
): Option.Option<string> =>
  Option.flatMap(
    hostStyle(element, name),
    Schema.decodeUnknownOption(Schema.String),
  );

/** A host element's whole resolved `style` prop, as a record. */
export const hostStyleRecord = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Schema.decodeUnknownOption(StyleRecord)(style),
  );

/** The decoded value, failing the test when the tree did not carry it. */
export const expectSome = <A>(value: Option.Option<A>): A =>
  Option.getOrElse(value, () =>
    expect.fail("the element tree did not carry what this test asserts on"),
  );

/** React's own element guard, lifted to `unknown` so a tree can be decoded. */
const ReactElement = Schema.declare(
  (input: unknown): input is ReactElement =>
    typeof input === "object" && input !== null && isValidElement(input),
  { description: "A React element, before the runtime sees it." },
);

/**
 * An element's children, as elements.
 *
 * The tree is not rendered, so this is the only way to reach the parts a
 * component composes — a slider's thumb, a group's options. React keeps
 * `null`, `false` and plain strings in a children array, so anything that is
 * not an element is omitted rather than failing the whole array.
 */
export const elementChildren = (
  element: ReactElement,
): ReadonlyArray<ReactElement> => {
  const children = Option.getOrElse(
    elementProp(element, "children"),
    () => undefined,
  );
  return Option.match(
    Schema.decodeUnknownOption(Schema.Array(Schema.Unknown))(children),
    {
      onSome: (values) => Arr.filter(values, Schema.is(ReactElement)),
      onNone: () =>
        Option.match(Schema.decodeUnknownOption(ReactElement)(children), {
          onSome: (single) => [single],
          onNone: () => [],
        }),
    },
  );
};
