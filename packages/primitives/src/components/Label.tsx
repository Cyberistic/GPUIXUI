/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode, RefObject } from "react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { visibleCopy } from "../core/a11y.js";
import { Stack } from "./Stack.js";
import { Text } from "./Text.js";

export interface LabelProps {
  readonly target?: RefObject<PublicInstance | null>;

  readonly disabled?: boolean;

  readonly required?: boolean;

  readonly invalid?: boolean;

  readonly description?: string;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export interface ControlName {
  readonly label: string;

  readonly description?: string;
}

export const labelledBy = (name: string, description?: string): ControlName =>
  description === undefined ? { label: name } : { label: name, description };

const PRESS_FRAME: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  cursor: "pointer",
};

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

  const help = visibleCopy(description);
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
      {help === undefined ? null : (
        <Text role="caption" tone="muted">
          {help}
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

          renderer.focusElement?.(instance.id);
        },
  );
};
