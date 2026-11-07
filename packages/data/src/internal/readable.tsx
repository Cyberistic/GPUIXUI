/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import * as P from "effect/Predicate";
import type { ReactNode } from "react";

export interface ReadableProps {
  readonly testId?: string;
  readonly style?: StyleDesc;
}

export const readable = (
  value: ReactNode,
  { testId, style }: ReadableProps = {},
) =>
  P.isString(value) || P.isNumber(value) ? (
    <text testId={testId} style={style}>
      {value}
    </text>
  ) : (
    <div testId={testId} style={style}>
      {value}
    </div>
  );
