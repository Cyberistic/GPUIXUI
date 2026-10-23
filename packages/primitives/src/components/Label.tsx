/**
 * `Label` — the visible name of a control.
 *
 * The runtime has **no `aria-labelledby`** (see `docs/gpuix-capabilities.md`), so a label cannot be
 * associated with a control by reference. The honest arrangement is that the
 * control carries its own `aria-label` and `Label` is the visible text beside
 * it; `labelledBy` builds the control's own `label` prop so a caller writes the
 * name once and spreads it into the control.
 *
 * A reference still buys the one interaction a label is expected to have:
 * pressing it moves native focus to the control (`target`), which is the
 * desktop behaviour a browser gets from `for`/`htmlFor`. The runtime exposes no
 * `for`, but it exposes `focusElement`, so the label owns that call. A press
 * aimed at the words reaches the frame that holds the handler (measured in
 * `runtime/fields.runtime.test.tsx`), so the text needs no inert guard.
 *
 * A label is a composition — a `Stack` of `Text` — so it has no resolver of its
 * own: its appearance is the already-migrated Stack and Text recipes. Its
 * `className`/`style` flow to the outer column.
 */

import type { ReactElement, ReactNode, RefObject } from "react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { Stack } from "./Stack.js";
import { Text } from "./Text.js";

export interface LabelProps {
  /**
   * The control this label names, as the ref that control takes.
   *
   * A press anywhere on the label moves native focus to it — the label is the
   * control's pointer target exactly as `htmlFor` makes it one. The name is
   * still not associated for assistive technology (the runtime has no
   * `aria-labelledby`), so keep passing `labelledBy(name)` to the control.
   */
  readonly target?: RefObject<PublicInstance | null>;
  /**
   * The control's own disabled state, so the words stay inert with it.
   *
   * A label holds the control's element, not its state, so it cannot see that
   * the control refuses input: without this a press would move focus to a
   * disabled field (measured in `runtime/fields.runtime.test.tsx`). Pass the
   * same boolean the control takes.
   */
  readonly disabled?: boolean;
  /** Marks the field required. Purely visual; validate with Schema. */
  readonly required?: boolean;
  /** Renders the label in the destructive role, for a field that failed. */
  readonly invalid?: boolean;
  /** A second line of help under the name. */
  readonly description?: string;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The props that name a control the way a visible `Label` does. */
export interface ControlName {
  readonly label: string;
  /** Present only when the caller passed help; a blank one is not published. */
  readonly description?: string;
}

/**
 * The props that give a control the name its visible `Label` shows.
 *
 * Returns the `label` prop every control reads, so the name is written once,
 * and the optional `description` the same `Label` paints, so the announced
 * help is the visible help:
 *
 * ```tsx
 * <Label target={ref} description={help}>{name}</Label>
 * <Input ref={ref} {...labelledBy(name, help)} />
 * ```
 */
export const labelledBy = (name: string, description?: string): ControlName =>
  description === undefined ? { label: name } : { label: name, description };

/** The frame a pressable label adds: the control's pointer target. */
const PRESS_FRAME: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  cursor: "pointer",
};

/** The label's tree; `onPress` is present only when the label has a target. */
export const renderLabel = (
  {
    required,
    invalid,
    disabled,
    description,
    style,
    className,
    children,
    testId,
  }: LabelProps,
  onPress?: () => void,
): ReactElement => {
  const pressable = onPress !== undefined && disabled !== true;
  const label = (
    <Stack
      direction="column"
      gap="2xs"
      fullWidth
      className={className}
      style={style}
      testId={testId}
    >
      <Stack direction="row" gap="2xs" align="baseline">
        <Text role="label" tone={invalid === true ? "destructive" : "default"}>
          {children}
        </Text>
        {required === true ? (
          <Text role="label" tone="destructive">
            *
          </Text>
        ) : null}
      </Stack>
      {description === undefined ? null : (
        <Text role="caption" tone="muted">
          {description}
        </Text>
      )}
    </Stack>
  );
  return pressable ? (
    <div style={PRESS_FRAME} onClick={onPress}>
      {label}
    </div>
  ) : (
    label
  );
};

/** A control's visible name, with an optional required marker and description. */
export const Label = (props: LabelProps): ReactElement => {
  const { renderer } = useGpuix();
  const { target } = props;
  return renderLabel(
    props,
    target === undefined
      ? undefined
      : () => {
          const instance = target.current;
          if (instance === null || renderer === null) return;
          // A control that is not mounted yet, or a host that runs the tree
          // without a renderer, is a no-op rather than a crash in a press.
          renderer.focusElement?.(instance.id);
        },
  );
};
