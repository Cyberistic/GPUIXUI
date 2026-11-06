import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface TabOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
}

export const nextTabIndex = (
  key: string,
  current: number,
  count: number,
): number | undefined => {
  if (count === 0) return undefined;
  if (key === "ArrowRight") return current === count - 1 ? 0 : current + 1;
  if (key === "ArrowLeft") return current === 0 ? count - 1 : current - 1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
};

export interface TabStripProps<T extends string> {
  readonly label: string;
  readonly options: ReadonlyArray<TabOption<T>>;
  readonly value: T;
  readonly onChange: (value: T) => void;

  readonly className?: string;

  readonly tabClassName?: string;

  readonly panelId?: (value: T) => string;

  readonly idBase?: string;
}

export function TabStrip<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  tabClassName,
  panelId,
  idBase,
}: TabStripProps<T>) {
  const generatedId = useId();
  const id = idBase ?? generatedId;
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const index = options.findIndex((option) => option.value === value);
    const element = triggers.current[index];
    if (element === null || element === undefined) return;
    const update = () =>
      setIndicator({ x: element.offsetLeft, w: element.offsetWidth });
    update();

    const observer = new ResizeObserver(update);
    for (const trigger of triggers.current) {
      if (trigger !== null) observer.observe(trigger);
    }
    return () => observer.disconnect();
  }, [options.length, value]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = nextTabIndex(event.key, index, options.length);
    if (target === undefined) return;
    const next = options[target];
    if (next === undefined) return;
    event.preventDefault();
    onChange(next.value);
    triggers.current[target]?.focus();
  };

  return (
    <div
      aria-label={label}
      className={
        className === undefined ? "gx-tabs-list" : `gx-tabs-list ${className}`
      }
      role="tablist"
    >
      {indicator === null ? null : (
        <span
          aria-hidden="true"
          className="gx-tabs-indicator"
          style={{
            transform: `translateX(${indicator.x}px)`,
            width: indicator.w,
          }}
        />
      )}
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            aria-controls={panelId?.(option.value)}
            aria-selected={selected}
            className={
              tabClassName === undefined ? "gx-tab" : `gx-tab ${tabClassName}`
            }
            id={`${id}-${option.value}-tab`}
            key={option.value}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            ref={(element) => {
              triggers.current[index] = element;
            }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
