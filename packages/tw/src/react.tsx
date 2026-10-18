/**
 * React wrappers that accept shadcn class strings.
 *
 * `Tw.div` / `Tw.text` / `Tw.input` resolve the classes against the nearest
 * `@gpuixui/tokens` theme and merge the caller's `style` last. They are the
 * bridge for the first slice; a JSX runtime can make this automatic later.
 */

import { forwardRef, type ReactElement } from "react";
import type {
  InputProps,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { classesToStyle, mergeTwStyle } from "./classes.js";

/** State a class string can target that the native element cannot infer. */
export interface TwStateProps {
  readonly focused?: boolean;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}

/** The classes plus the component's own interaction state. */
interface TwResolution {
  readonly style: StyleDesc;
}

const resolve = (
  className: string | undefined,
  state: TwStateProps,
): TwResolution => {
  const theme = useTheme();
  const tw = classesToStyle(className, theme);
  const interaction = mergeTwStyle(
    mergeTwStyle(
      state.disabled === true ? tw.disabled : {},
      state.invalid === true ? tw.invalid : {},
    ),
    state.focused === true ? tw.focus : {},
  );
  return { style: mergeTwStyle(tw.style, interaction) };
};

/** {@link TwDiv} props: a native div with shadcn classes. */
export interface TwDivProps extends Props, TwStateProps {
  readonly className?: string;
}

/** A GPUix `div` that accepts a shadcn class string. */
export const TwDiv = forwardRef<PublicInstance, TwDivProps>(
  ({ className, focused, invalid, disabled, style, ...rest }, ref) => {
    const tw = resolve(className, { focused, invalid, disabled });
    return (
      <div {...rest} ref={ref} style={mergeTwStyle(tw.style, style ?? {})} />
    );
  },
);
TwDiv.displayName = "TwDiv";

/** {@link TwText} props: native text with shadcn classes. */
export interface TwTextProps extends Props, TwStateProps {
  readonly className?: string;
}

/** A GPUix `text` that accepts a shadcn class string. */
export const TwText = forwardRef<PublicInstance, TwTextProps>(
  ({ className, focused, invalid, disabled, style, ...rest }, ref) => {
    const tw = resolve(className, { focused, invalid, disabled });
    return (
      <text {...rest} ref={ref} style={mergeTwStyle(tw.style, style ?? {})} />
    );
  },
);
TwText.displayName = "TwText";

/** {@link TwInput} props: native input with shadcn classes. */
export interface TwInputProps extends InputProps, TwStateProps {
  readonly className?: string;
}

/** A GPUix `input` that accepts a shadcn class string. */
export const TwInput = forwardRef<PublicInstance, TwInputProps>(
  ({ className, focused, invalid, disabled, style, ...rest }, ref) => {
    const tw = resolve(className, { focused, invalid, disabled });
    return (
      <input {...rest} ref={ref} style={mergeTwStyle(tw.style, style ?? {})} />
    );
  },
);
TwInput.displayName = "TwInput";

/** The class-aware host components. */
export const Tw = {
  div: TwDiv,
  text: TwText,
  input: TwInput,
} as const;

/** Kept for callers that want the element type without the wrapper. */
export type TwElement = ReactElement;
