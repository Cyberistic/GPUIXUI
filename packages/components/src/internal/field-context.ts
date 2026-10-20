/**
 * The label, copy and state a {@link Field} hands to the control it wraps.
 *
 * `@gpuix/react@0.10.0` has no `aria-labelledby`, so a control cannot be named
 * from a `<text>` elsewhere in the tree. The field publishes its label through
 * this context and the control supplies it as `aria-label` (plans 391, 748).
 */

import { createContext, useContext } from "react";

/** What a control inherits from the field around it. */
export interface FieldContextValue {
  readonly label: string;
  readonly description: string | undefined;
  readonly error: string | undefined;
  readonly required: boolean;
}

/** The field around a control, absent outside one. */
export const FieldContext = createContext<FieldContextValue | undefined>(
  undefined,
);

/** The field around the calling control, if there is one. */
export const useField = (): FieldContextValue | undefined =>
  useContext(FieldContext);
