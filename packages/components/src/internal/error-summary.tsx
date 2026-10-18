/**
 * The one `role="alert"` block a validated surface paints.
 *
 * `Form` and `MultiStepForm` share it so a failed submit is announced once and
 * looks the same wherever the schema reports a failure. Messages arrive already
 * deduplicated by the caller: this module only decides the node shape.
 */

import * as Arr from "effect/Array";
import { textStyle, useTheme } from "./theme.js";

/** {@link ErrorSummary} props: the messages from one validation pass. */
export interface ErrorSummaryProps {
  /** Distinct messages, in schema order. An empty list renders nothing. */
  readonly messages: ReadonlyArray<string>;
}

/** A destructive alert with one text node per message. */
export const ErrorSummary = ({ messages }: ErrorSummaryProps) => {
  const theme = useTheme();

  return Arr.match(messages, {
    onEmpty: () => null,
    onNonEmpty: (values) => (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
        }}
      >
        {Arr.map(values, (message) => (
          <text
            key={message}
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.destructive,
            }}
          >
            {message}
          </text>
        ))}
      </div>
    ),
  });
};
