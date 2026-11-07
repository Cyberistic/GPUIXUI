/** @jsxImportSource @gpuix/react */
import { Icon, iconPixels, type IconName, type IconSize } from "@gpuixui/icons";
import { useRef } from "react";
import { useSurfaceTiming } from "./presence.js";

const TRAVEL = 2;

const Mark = ({
  name,
  shown,
  travel,
  label,
  color,
  size,
  testId,
}: {
  readonly name: IconName;
  readonly shown: boolean;
  readonly travel: number;
  readonly label: string | undefined;
  readonly color: string;
  readonly size: IconSize | number;
  readonly testId?: string;
}) => {
  const timing = useSurfaceTiming("normal");
  const mountedShown = useRef(shown).current;
  const frame = (atRest: boolean) => ({
    opacity: atRest ? 1 : 0,
    top: atRest ? 0 : travel,
  });

  return (
    <div
      motion={{
        initial: frame(mountedShown),
        animate: frame(shown),
        transition: shown ? timing.enter : timing.exit,
      }}
      style={{ position: "absolute", left: 0, pointerEvents: "none" }}
      testId={testId}
    >
      <Icon
        name={name}
        size={size}
        color={color}
        label={shown ? label : undefined}
      />
    </div>
  );
};

export type FlipMarkName = "off" | "on";

export interface FlipMarkProps {
  readonly off: IconName;

  readonly on: IconName;
  readonly shown: boolean;
  readonly color: string;
  readonly size?: IconSize | number;

  readonly travel?: number;

  readonly offLabel?: string;

  readonly onLabel?: string;

  readonly testIdFor?: (mark: FlipMarkName) => string | undefined;
}

export const FlipMark = ({
  off: offName,
  on: onName,
  shown,
  color,
  size = "xs",
  travel = TRAVEL,
  offLabel,
  onLabel,
  testIdFor,
}: FlipMarkProps) => {
  const pixels = iconPixels(size);
  return (
    <div
      style={{
        position: "relative",
        width: pixels,
        height: pixels,
        flexShrink: 0,
      }}
    >
      <Mark
        name={offName}
        shown={!shown}
        travel={-travel}
        label={offLabel}
        color={color}
        size={size}
        {...(testIdFor === undefined ? {} : { testId: testIdFor("off") })}
      />
      <Mark
        name={onName}
        shown={shown}
        travel={travel}
        label={onLabel}
        color={color}
        size={size}
        {...(testIdFor === undefined ? {} : { testId: testIdFor("on") })}
      />
    </div>
  );
};
