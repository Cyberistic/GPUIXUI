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

export const hostTag = (element: ReactElement): Option.Option<string> =>
  Schema.decodeUnknownOption(Schema.String)(element.type);

export const elementProp = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(propsOf(element), (record) =>
    Option.flatMap(R.get(record, name), (value) => Option.fromNullishOr(value)),
  );

export const hostProp = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(hostTag(element), () => elementProp(element, name));

const StyleRecord = Schema.Record(Schema.String, Schema.Unknown);

export const hostStyleString = (
  element: ReactElement,
  name: string,
): Option.Option<string> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Option.flatMap(Schema.decodeUnknownOption(StyleRecord)(style), (record) =>
      Option.fromNullishOr(record[name]),
    ),
  ).pipe(Option.flatMap(Schema.decodeUnknownOption(Schema.String)));

export const hostStyleNumber = (
  element: ReactElement,
  name: string,
): Option.Option<number> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Option.flatMap(Schema.decodeUnknownOption(StyleRecord)(style), (record) =>
      Option.fromNullishOr(record[name]),
    ),
  ).pipe(Option.flatMap(Schema.decodeUnknownOption(Schema.Number)));

const Handler = Schema.declare(
  (input: unknown): input is (event: unknown) => void =>
    typeof input === "function",
  { description: "A function the runtime calls with an event." },
);

export const elementHandler = (
  element: ReactElement,
  name: string,
): Option.Option<(event: unknown) => void> =>
  Option.flatMap(elementProp(element, name), (value) =>
    Schema.decodeUnknownOption(Handler)(value),
  );

export const hostHandler = (
  element: ReactElement,
  name: string,
): Option.Option<(event: unknown) => void> =>
  Option.flatMap(hostProp(element, name), (value) =>
    Schema.decodeUnknownOption(Handler)(value),
  );

export const expectSome = <A>(value: Option.Option<A>): A =>
  Option.getOrElse(value, () =>
    expect.fail("the element tree did not carry what this test asserts on"),
  );

const ReactElement = Schema.declare(
  (input: unknown): input is ReactElement =>
    typeof input === "object" && input !== null && isValidElement(input),
  { description: "A React element, before the runtime sees it." },
);

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

export const textElements = (
  element: ReactElement,
): ReadonlyArray<ReactElement> => {
  const nested = Arr.flatMap(elementChildren(element), textElements);
  return Option.match(hostTag(element), {
    onSome: (tag) => (tag === "text" ? Arr.prepend(nested, element) : nested),
    onNone: () => nested,
  });
};
