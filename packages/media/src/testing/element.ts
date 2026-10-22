/**
 * Read the element tree a render function returns.
 *
 * These suites inspect the element tree rather than a painted frame: the
 * strongest honest check a pure unit test can make is the props and handlers the
 * runtime would receive, while painted behaviour is measured in the window
 * suites elsewhere in the repo. React gives the tree no prop type
 * (`JSX.Element` is `ReactElement<any, any>`), so this module decodes at the
 * boundary instead of assuming — the same rule the library applies to every
 * other unknown input.
 */

import { Fragment, isValidElement, type ReactElement } from "react";
import { expect } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";

const HostProps = Schema.Record(Schema.String, Schema.Unknown);

const propsOf = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Schema.decodeUnknownOption(HostProps)(element.props);

/** The host tag a host element renders — `div`, `img`, `text`. */
export const hostTag = (element: ReactElement): Option.Option<string> =>
  Schema.decodeUnknownOption(Schema.String)(element.type);

/** One named prop of any element, host or component. */
export const elementProp = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(propsOf(element), (record) =>
    Option.flatMap(R.get(record, name), (value) => Option.fromNullishOr(value)),
  );

/** One named prop of a host element, decoded. */
export const hostProp = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(hostTag(element), () => elementProp(element, name));

const StyleRecord = Schema.Record(Schema.String, Schema.Unknown);

/** A `style` property decoded as a string — a width, a colour, a cursor. */
export const hostStyleString = (
  element: ReactElement,
  name: string,
): Option.Option<string> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Option.flatMap(Schema.decodeUnknownOption(StyleRecord)(style), (record) =>
      Option.fromNullishOr(record[name]),
    ),
  ).pipe(Option.flatMap(Schema.decodeUnknownOption(Schema.String)));

const Handler = Schema.declare(
  (input: unknown): input is (event: unknown) => void =>
    typeof input === "function",
  { description: "A function the runtime calls with an event." },
);

/** A named event handler on any element, decoded. */
export const elementHandler = (
  element: ReactElement,
  name: string,
): Option.Option<(event: unknown) => void> =>
  Option.flatMap(elementProp(element, name), (value) =>
    Schema.decodeUnknownOption(Handler)(value),
  );

/** A named event handler on a host element, decoded. */
export const hostHandler = (
  element: ReactElement,
  name: string,
): Option.Option<(event: unknown) => void> =>
  Option.flatMap(hostProp(element, name), (value) =>
    Schema.decodeUnknownOption(Handler)(value),
  );

/** The decoded value, failing the test when the tree did not carry it. */
export const expectSome = <A>(value: Option.Option<A>): A =>
  Option.getOrElse(value, () =>
    expect.fail("the element tree did not carry what this test asserts on"),
  );

const ReactElement = Schema.declare(
  (input: unknown): input is ReactElement =>
    typeof input === "object" && input !== null && isValidElement(input),
  { description: "A React element, before the runtime sees it." },
);

/** An element's children as elements; fragments are flattened. */
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
      onSome: (values) => Arr.flatMap(values, elementsOf),
      onNone: () =>
        Option.match(Schema.decodeUnknownOption(ReactElement)(children), {
          onSome: elementsOf,
          onNone: () => [],
        }),
    },
  );
};

const elementsOf = (child: unknown): ReadonlyArray<ReactElement> => {
  if (!isValidElement<{ readonly children?: unknown }>(child)) return [];
  if (child.type !== Fragment) return [child];
  const nested = Schema.decodeUnknownOption(Schema.Array(Schema.Unknown))(
    child.props.children,
  );
  return Option.match(nested, {
    onSome: (values) => Arr.flatMap(values, elementsOf),
    onNone: () => Arr.flatMap([child.props.children], elementsOf),
  });
};

/** The first descendant carrying the `testId`, searched depth-first. */
export const findByTestId = (
  element: ReactElement,
  testId: string,
): Option.Option<ReactElement> => {
  if (
    Option.getOrElse(elementProp(element, "testId"), () => undefined) === testId
  )
    return Option.some(element);
  return Arr.reduce(
    elementChildren(element),
    Option.none<ReactElement>(),
    (found, child) =>
      Option.match(found, {
        onSome: () => found,
        onNone: () => findByTestId(child, testId),
      }),
  );
};
