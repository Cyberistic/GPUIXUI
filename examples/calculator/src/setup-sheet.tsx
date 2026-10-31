/** @jsxImportSource @gpuix/react */
/**
 * SETUP — the menu SHIFT + MODE opens on the device.
 *
 * The same `Setup` object the engine stores, presented in the manual's groups:
 * display, angle, number format, fraction, complex format, STAT frequency,
 * decimal point and contrast. Contrast is the app's one device-only setting:
 * it fades the LCD content rather than pretending to be a calculation.
 */

import type { CalculatorState, CommandAction } from "@gpuixui/calc";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gpuixui/components/dialog";
import { Button, Text } from "@gpuixui/primitives";
import type { Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";

export interface SetupSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly state: CalculatorState;
  readonly theme: Theme;
  readonly contrast: number;
  readonly onContrast: (value: number) => void;
  readonly run: (action: CommandAction) => void;
}

const Row = ({
  label,
  children,
  theme,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly theme: Theme;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 4,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
    }}
  >
    <Text role="caption" tone="muted">
      {label}
    </Text>
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 4,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  </div>
);

const Choice = ({
  active,
  label,
  testId,
  onActivate,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly testId: string;
  readonly onActivate: () => void;
}) => (
  <Button
    testId={testId}
    variant={active ? "primary" : "outline"}
    size="sm"
    tabIndex={-1}
    onActivate={onActivate}
  >
    {label}
  </Button>
);

export const SetupSheet = ({
  open,
  onOpenChange,
  state,
  theme,
  contrast,
  onContrast,
  run,
}: SetupSheetProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      testId="calc-setup"
      size="md"
      label="Calculator setup"
      showClose
    >
      <DialogHeader>
        <DialogTitle>Setup</DialogTitle>
        <DialogDescription>
          SHIFT + MODE · the manual's configuration screen
        </DialogDescription>
      </DialogHeader>

      <Row label="Display" theme={theme}>
        {(
          [
            ["MthIO-MathO", "Natural · MathO"],
            ["MthIO-LineO", "Natural · LineO"],
            ["LineIO", "Linear"],
          ] as const
        ).map(([value, label]) => (
          <Choice
            key={value}
            testId={`setup-display-${value}`}
            label={label}
            active={state.setup.display === value}
            onActivate={() => run({ _tag: "setup", setup: { display: value } })}
          />
        ))}
      </Row>

      <Row label="Contrast" theme={theme}>
        <Button
          testId="setup-contrast-down"
          variant="outline"
          size="sm"
          tabIndex={-1}
          onActivate={() => onContrast(Math.max(0, contrast - 1))}
        >
          −
        </Button>
        <Text role="code">{`${contrast} / 10`}</Text>
        <Button
          testId="setup-contrast-up"
          variant="outline"
          size="sm"
          tabIndex={-1}
          onActivate={() => onContrast(Math.min(10, contrast + 1))}
        >
          +
        </Button>
        <Text role="caption" tone="muted">
          The LCD ink; a device control, not a calculation.
        </Text>
      </Row>

      <Row label="Angle unit" theme={theme}>
        {(["Deg", "Rad", "Gra"] as const).map((angle) => (
          <Choice
            key={angle}
            testId={`setup-angle-${angle}`}
            label={angle}
            active={state.setup.angle === angle}
            onActivate={() => run({ _tag: "setup", setup: { angle } })}
          />
        ))}
      </Row>

      <Row label="Number format" theme={theme}>
        <Choice
          testId="setup-norm-1"
          label="Norm 1"
          active={state.setup.number.kind === "Norm1"}
          onActivate={() =>
            run({
              _tag: "setup",
              setup: { number: { kind: "Norm1", digits: 0 } },
            })
          }
        />
        <Choice
          testId="setup-norm-2"
          label="Norm 2"
          active={state.setup.number.kind === "Norm2"}
          onActivate={() =>
            run({
              _tag: "setup",
              setup: { number: { kind: "Norm2", digits: 0 } },
            })
          }
        />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {Arr.map(Arr.range(0, 9), (digits) => (
            <Button
              key={`fix-${digits}`}
              testId={`setup-fix-${digits}`}
              variant={
                state.setup.number.kind === "Fix" &&
                state.setup.number.digits === digits
                  ? "primary"
                  : "outline"
              }
              size="sm"
              tabIndex={-1}
              onActivate={() =>
                run({
                  _tag: "setup",
                  setup: { number: { kind: "Fix", digits } },
                })
              }
            >
              {`Fix ${digits}`}
            </Button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {Arr.map(Arr.range(0, 9), (digits) => (
            <Button
              key={`sci-${digits}`}
              testId={`setup-sci-${digits}`}
              variant={
                state.setup.number.kind === "Sci" &&
                state.setup.number.digits === digits
                  ? "primary"
                  : "outline"
              }
              size="sm"
              tabIndex={-1}
              onActivate={() =>
                run({
                  _tag: "setup",
                  setup: { number: { kind: "Sci", digits } },
                })
              }
            >
              {`Sci ${digits}`}
            </Button>
          ))}
        </div>
      </Row>

      <Row label="Fraction result" theme={theme}>
        <Choice
          testId="setup-fraction-dc"
          label="d/c"
          active={state.setup.fraction === "d/c"}
          onActivate={() => run({ _tag: "setup", setup: { fraction: "d/c" } })}
        />
        <Choice
          testId="setup-fraction-mixed"
          label="ab/c"
          active={state.setup.fraction === "mixed"}
          onActivate={() =>
            run({ _tag: "setup", setup: { fraction: "mixed" } })
          }
        />
      </Row>

      <Row label="Complex result" theme={theme}>
        <Choice
          testId="setup-complex-rect"
          label="a+bi"
          active={state.setup.complexFormat === "a+bi"}
          onActivate={() =>
            run({ _tag: "setup", setup: { complexFormat: "a+bi" } })
          }
        />
        <Choice
          testId="setup-complex-polar"
          label="r∠θ"
          active={state.setup.complexFormat === "r∠θ"}
          onActivate={() =>
            run({ _tag: "setup", setup: { complexFormat: "r∠θ" } })
          }
        />
      </Row>

      <Row label="STAT frequency" theme={theme}>
        <Choice
          testId="setup-stat-on"
          label="On"
          active={state.setup.statFrequency}
          onActivate={() =>
            run({ _tag: "setup", setup: { statFrequency: true } })
          }
        />
        <Choice
          testId="setup-stat-off"
          label="Off"
          active={!state.setup.statFrequency}
          onActivate={() =>
            run({ _tag: "setup", setup: { statFrequency: false } })
          }
        />
      </Row>

      <Row label="Decimal point" theme={theme}>
        <Choice
          testId="setup-decimal-dot"
          label="Dot"
          active={state.setup.decimalPoint === "."}
          onActivate={() =>
            run({ _tag: "setup", setup: { decimalPoint: "." } })
          }
        />
        <Choice
          testId="setup-decimal-comma"
          label="Comma"
          active={state.setup.decimalPoint === ","}
          onActivate={() =>
            run({ _tag: "setup", setup: { decimalPoint: "," } })
          }
        />
      </Row>

      <DialogFooter>
        <DialogClose variant="primary" size="sm" testId="setup-close">
          Done
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
