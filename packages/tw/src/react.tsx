import { forwardRef, type ReactElement } from "react";
import type {
  InputProps,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { classesToStyle, mergeTwStyle } from "./classes.js";
import { useTwRegistry } from "./host.js";
import type { TwState } from "./registry.js";

export interface TwStateProps extends TwState {
  readonly focused?: boolean;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}

interface TwResolution {
  readonly style: StyleDesc;
}

const resolve = (
  className: string | undefined,
  state: TwStateProps,
): TwResolution => {
  const theme = useTheme();
  const registry = useTwRegistry();
  const tw = classesToStyle(className, theme, registry, state);
  const interaction = mergeTwStyle(
    mergeTwStyle(
      state.disabled === true ? tw.disabled : {},
      state.invalid === true ? tw.invalid : {},
    ),
    state.focused === true ? tw.focus : {},
  );
  return { style: mergeTwStyle(tw.style, interaction) };
};

export interface TwDivProps extends Props, TwStateProps {
  readonly className?: string;
}

export const TwDiv = forwardRef<PublicInstance, TwDivProps>(
  (
    {
      className,
      focused,
      invalid,
      disabled,
      hasIcon,
      iconSide,
      expanded,
      behind,
      limited,
      style,
      ...rest
    },
    ref,
  ) => {
    const tw = resolve(className, {
      focused,
      invalid,
      disabled,
      hasIcon,
      iconSide,
      expanded,
      behind,
      limited,
    });
    return (
      <div {...rest} ref={ref} style={mergeTwStyle(tw.style, style ?? {})} />
    );
  },
);
TwDiv.displayName = "TwDiv";

export interface TwTextProps extends Props, TwStateProps {
  readonly className?: string;
}

export const TwText = forwardRef<PublicInstance, TwTextProps>(
  (
    {
      className,
      focused,
      invalid,
      disabled,
      hasIcon,
      iconSide,
      expanded,
      behind,
      limited,
      style,
      ...rest
    },
    ref,
  ) => {
    const tw = resolve(className, {
      focused,
      invalid,
      disabled,
      hasIcon,
      iconSide,
      expanded,
      behind,
      limited,
    });
    return (
      <text {...rest} ref={ref} style={mergeTwStyle(tw.style, style ?? {})} />
    );
  },
);
TwText.displayName = "TwText";

export interface TwInputProps extends InputProps, TwStateProps {
  readonly className?: string;
}

export const TwInput = forwardRef<PublicInstance, TwInputProps>(
  (
    {
      className,
      focused,
      invalid,
      disabled,
      hasIcon,
      iconSide,
      expanded,
      behind,
      limited,
      style,
      ...rest
    },
    ref,
  ) => {
    const tw = resolve(className, {
      focused,
      invalid,
      disabled,
      hasIcon,
      iconSide,
      expanded,
      behind,
      limited,
    });
    return (
      <input {...rest} ref={ref} style={mergeTwStyle(tw.style, style ?? {})} />
    );
  },
);
TwInput.displayName = "TwInput";

export const Tw = {
  div: TwDiv,
  text: TwText,
  input: TwInput,
} as const;

export { TwProvider, useTwRegistry } from "./host.js";

export type TwElement = ReactElement;
