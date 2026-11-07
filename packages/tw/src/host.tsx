import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import type { StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { classesToStyle, mergeTwStyle } from "./classes.js";
import { defaultRegistry, type TwRegistry } from "./registry.js";

const TwRegistryContext = createContext<TwRegistry>(defaultRegistry);

export interface TwHostProps {
  readonly as: string;
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly registry?: TwRegistry;
  readonly children?: ReactNode;
  readonly [key: string]: unknown;
}

export interface TwProviderProps {
  readonly registry?: TwRegistry;
  readonly children?: ReactNode;
}

export const TwProvider = ({
  registry = defaultRegistry,
  children,
}: TwProviderProps) =>
  createElement(TwRegistryContext.Provider, { value: registry }, children);

export const useTwRegistry = (): TwRegistry => useContext(TwRegistryContext);

export const TwHost = ({
  as,
  className,
  style,
  registry,
  children,
  ...rest
}: TwHostProps) => {
  const theme = useTheme();
  const inherited = useTwRegistry();
  const tw = classesToStyle(className, theme, registry ?? inherited);
  return createElement(
    as,
    { ...rest, style: mergeTwStyle(tw.style, style ?? {}) },
    children,
  );
};
