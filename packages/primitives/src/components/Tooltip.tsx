/** @jsxImportSource @gpuix/react */
import {
  Fragment,
  createContext,
  cloneElement,
  isValidElement,
  useEffect,
  useContext,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { MotionProps, StyleDesc } from "@gpuix/react";
import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
import { cn } from "@gpuixui/tw";
import {
  Tooltip as GpuixTooltip,
  TooltipContent,
  TooltipProvider as GpuixTooltipProvider,
  TooltipTrigger,
} from "@gpuix/react/tooltip";
import { accessibleName, visibleCopy } from "../core/a11y.js";
import { reducedMotionOf } from "../core/motion.js";
import {
  exitWindowMs,
  fadeFromAnchor,
  presenceStyle,
  surfaceMotion,
  surfaceTiming,
  type AnchorSide,
  type SurfaceTiming,
} from "../core/presence.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { tooltipClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface TooltipProviderProps {
  readonly delay?: number;

  readonly skipDelay?: number;

  readonly disableHoverableContent?: boolean;
  readonly children: ReactNode;
}

export const renderTooltipProvider = ({
  delay,
  skipDelay,
  disableHoverableContent,
  children,
}: TooltipProviderProps): ReactElement => (
  <GpuixTooltipProvider
    delayDuration={delay}
    skipDelayDuration={skipDelay}
    disableHoverableContent={disableHoverableContent}
  >
    {children}
  </GpuixTooltipProvider>
);

export const APPKIT_TOOLTIP_DELAY_MS = 1000;

export const tooltipDelayFor = (theme: PrimitiveTheme): number | undefined =>
  theme.interaction === "appkit" ? APPKIT_TOOLTIP_DELAY_MS : undefined;

const ProvidedTiming = createContext(false);

export const TooltipProvider = (props: TooltipProviderProps): ReactElement => {
  const theme = useTheme();
  return (
    <ProvidedTiming.Provider value>
      {renderTooltipProvider({
        ...props,
        delay: props.delay ?? tooltipDelayFor(theme),
      })}
    </ProvidedTiming.Provider>
  );
};

export interface TooltipProps {
  readonly content: ReactNode;

  readonly description?: string;

  readonly children: ReactNode;

  readonly side?: FloatingSide;

  readonly align?: FloatingAlign;

  readonly delay?: number;

  readonly open?: boolean;

  readonly defaultOpen?: boolean;

  readonly onOpenChange?: (open: boolean) => void;

  readonly disableHoverableContent?: boolean;

  readonly reducedMotion?: boolean;

  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

export const tooltipStyle = (
  theme: PrimitiveTheme,
  className?: string,
  caller?: StyleDesc,
): StyleDesc =>
  mergeStyle(
    recipeTw.classesToStyle(cn(tooltipClass, className), theme).style,
    caller,
  );

const describedTrigger = (
  children: ReactNode,
  text: string | undefined,
  explicit: boolean,
): ReactNode => {
  const name = accessibleName(text);
  if (
    name === undefined ||
    !isValidElement<Record<string, unknown>>(children) ||
    children.type === Fragment
  ) {
    return children;
  }
  const own = children.props["aria-description"];
  const ownName = typeof own === "string" ? accessibleName(own) : undefined;
  return explicit || ownName === undefined
    ? cloneElement(children, { "aria-description": name })
    : children;
};

export interface TooltipView {
  readonly mounted: boolean;

  readonly present: boolean;

  readonly side: AnchorSide;
  readonly motion: MotionProps;

  readonly onOpenChange: (open: boolean) => void;
}

const tipCopy = (content: ReactNode): ReactNode =>
  content === null || content === undefined
    ? null
    : typeof content === "string"
      ? (visibleCopy(content) ?? null)
      : content;

export const renderTooltip = (
  {
    content,
    description,
    children,
    side,
    align = "center",
    delay,
    open,
    defaultOpen,
    onOpenChange,
    disableHoverableContent,
    style,
    className,
    testId,
  }: TooltipProps,
  theme: PrimitiveTheme,
  view?: TooltipView,
): ReactElement => {
  const copy = tipCopy(content);
  return (
    <GpuixTooltip
      delayDuration={delay}
      open={view === undefined ? open : view.mounted}
      defaultOpen={defaultOpen}
      onOpenChange={view === undefined ? onOpenChange : view.onOpenChange}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipTrigger asChild>
        {describedTrigger(
          children,
          description ?? (typeof content === "string" ? content : undefined),
          description !== undefined,
        )}
      </TooltipTrigger>
      {copy === null ? null : (
        <TooltipContent
          side={view === undefined ? side : view.side}
          align={align}
          motion={view?.motion}
          style={mergeStyle(
            tooltipStyle(theme, className, style),
            view === undefined ? undefined : presenceStyle(view.present),
          )}
          testId={testId}
        >
          {copy}
        </TooltipContent>
      )}
    </GpuixTooltip>
  );
};

const TOOLTIP_OFFSET = 2;

const useHeldOpen = (wanted: boolean, timing: SurfaceTiming): boolean => {
  const [mounted, setMounted] = useState(wanted);
  const windowMs = exitWindowMs(timing);

  useLayoutEffect(() => {
    if (wanted) setMounted(true);
  }, [wanted]);

  useEffect(() => {
    if (wanted || !mounted) return;
    if (windowMs === 0) {
      setMounted(false);
      return;
    }
    const handle = setTimeout(() => setMounted(false), windowMs);
    return () => clearTimeout(handle);
  }, [mounted, wanted, windowMs]);

  return mounted;
};

export const Tooltip = (props: TooltipProps): ReactElement => {
  const theme = useTheme();

  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  const timing = surfaceTiming(reducedMotion);
  const [requested, setRequested] = useState(props.defaultOpen === true);
  const wanted = props.open ?? requested;
  const mounted = useHeldOpen(wanted, timing);
  const requestOpen = (next: boolean): void => {
    props.onOpenChange?.(next);
    if (props.open === undefined) setRequested(next);
  };
  const side = props.side ?? "top";

  const provided = useContext(ProvidedTiming);
  const delay = props.delay ?? (provided ? undefined : tooltipDelayFor(theme));
  return renderTooltip({ ...props, delay }, theme, {
    mounted,
    present: wanted,
    side,
    motion: surfaceMotion(fadeFromAnchor(side, TOOLTIP_OFFSET), wanted, timing),
    onOpenChange: requestOpen,
  });
};
