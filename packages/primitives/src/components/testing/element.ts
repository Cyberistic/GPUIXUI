import { Fragment, isValidElement, type ReactElement } from "react";
import type { EventPayload } from "@gpuix/react";
import { expect } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";

const HostProps = Schema.Record(Schema.String, Schema.Unknown);

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

export const hostTag = (element: ReactElement): Option.Option<string> =>
  decodeString(element.type);

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

export const elementProp = propOf(propsOf);

export const hostProp = propOf(hostProps);

export const elementKey = (element: ReactElement): Option.Option<string> =>
  Option.fromNullishOr(element.key);

export const hostPropString = (
  element: ReactElement,
  name: string,
): Option.Option<string> =>
  Option.flatMap(hostProp(element, name), (value) =>
    Schema.decodeUnknownOption(Schema.String)(value),
  );

export const hostHandler = (
  element: ReactElement,
  name: string,
): Option.Option<(event: EventPayload) => void> =>
  Option.flatMap(hostProp(element, name), (value) =>
    Schema.decodeUnknownOption(HostHandler)(value),
  );

const HostRef = Schema.declare(
  (input: unknown): input is (instance: unknown) => void =>
    typeof input === "function",
  { description: "A React ref callback handed to a host element." },
);

export const hostRef = (
  element: ReactElement,
  name = "ref",
): Option.Option<(instance: unknown) => void> =>
  Option.flatMap(hostProp(element, name), (value) =>
    Schema.decodeUnknownOption(HostRef)(value),
  );

const StyleRecord = Schema.Record(Schema.String, Schema.Unknown);

export const hostStyle = (
  element: ReactElement,
  name: string,
): Option.Option<unknown> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Option.flatMap(Schema.decodeUnknownOption(StyleRecord)(style), (record) =>
      Option.fromNullishOr(record[name]),
    ),
  );

export const hostStyleString = (
  element: ReactElement,
  name: string,
): Option.Option<string> =>
  Option.flatMap(
    hostStyle(element, name),
    Schema.decodeUnknownOption(Schema.String),
  );

export const hostStyleRecord = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Option.flatMap(hostProp(element, "style"), (style) =>
    Schema.decodeUnknownOption(StyleRecord)(style),
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
