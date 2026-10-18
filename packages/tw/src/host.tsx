/**
 * The one host wrapper the JSX runtime inserts when an element carries
 * `className`. It reads the nearest theme and registry, resolves the class
 * string, and renders the original GPUix host element with the merged `style`.
 */

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

/** Props for the inserted wrapper. */
export interface TwHostProps {
  readonly as: string;
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly registry?: TwRegistry;
  readonly children?: ReactNode;
  readonly [key: string]: unknown;
}

/** Supplies a registry to every `TwHost` and `Tw` wrapper below it. */
export interface TwProviderProps {
  readonly registry?: TwRegistry;
  readonly children?: ReactNode;
}

/** The registry context provider. */
export const TwProvider = ({
  registry = defaultRegistry,
  children,
}: TwProviderProps) =>
  createElement(TwRegistryContext.Provider, { value: registry }, children);

/** The registry the surrounding `TwProvider` supplies. */
export const useTwRegistry = (): TwRegistry => useContext(TwRegistryContext);

/** The wrapper the runtime returns for a classed host element. */
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
