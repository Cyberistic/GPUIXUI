/** @jsxImportSource @gpuix/react */
/**
 * The inspector: the place a calculator's menus become a workspace.
 *
 * History is always here; under it, the mode's own editor appears — the STAT
 * data grid, the EQN coefficients, the matrix/vector cells, the TABLE fields or
 * the BASE-N switch. Everything is driven by the engine's actions, so a click
 * and a key enter through the same door.
 */

import {
  coefficientLabels,
  columnsOf,
  equationLabel,
  formatValue,
  inputText,
  metricConversions,
  MODES,
  namedConstant,
  scientificConstants,
  conversion,
  type CalculatorState,
  type CommandAction,
} from "@gpuixui/calc";
import { Icon } from "@gpuixui/icons";
import {
  Button,
  Input,
  ScrollArea,
  Separator,
  Text,
} from "@gpuixui/primitives";
import type { Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";

export interface InspectorProps {
  readonly state: CalculatorState;
  readonly theme: Theme;
  readonly dark: boolean;
  readonly run: (action: CommandAction) => void;
  readonly press: (key: string) => void;
  readonly tab: "history" | "mode" | "catalog";
  readonly onTab: (tab: "history" | "mode" | "catalog") => void;
}

const SectionLabel = ({ children }: { readonly children: string }) => (
  <Text role="caption" tone="muted">
    {children}
  </Text>
);

const Chip = ({
  label,
  onActivate,
}: {
  readonly label: string;
  readonly onActivate: () => void;
}) => (
  <Button variant="outline" size="sm" tabIndex={-1} onActivate={onActivate}>
    {label}
  </Button>
);

const Cell = ({
  value,
  label,
  active,
  onActivate,
}: {
  readonly value: string;
  readonly label: string;
  readonly active: boolean;
  readonly onActivate: () => void;
}) => (
  <Button
    variant={active ? "primary" : "secondary"}
    size="sm"
    tabIndex={-1}
    onActivate={onActivate}
  >
    {`${label} ${value === "" ? "—" : value}`}
  </Button>
);

const History = ({
  state,
  theme,
  run,
}: Pick<InspectorProps, "state" | "theme" | "run">) => {
  const entries = Arr.takeRight(state.history, 14).reverse();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <SectionLabel>History</SectionLabel>
      {Arr.isReadonlyArrayEmpty(entries) ? (
        <Text role="caption" tone="muted">
          Calculations you finish appear here.{" "}
          {state.mode === "COMP" ? "Press = to evaluate." : ""}
        </Text>
      ) : (
        Arr.map(entries, (entry, index) => {
          const formatted = formatValue(entry.result, state.setup);
          return (
            <Button
              key={`${index}-${inputText(entry.tokens)}`}
              variant="ghost"
              size="sm"
              tabIndex={-1}
              onActivate={() =>
                run({
                  _tag: "replay",
                  tokens: entry.tokens,
                  result: entry.result,
                })
              }
              style={{ justifyContent: "flex-start", height: 30 }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: "100%",
                  justifyContent: "space-between",
                  gap: theme.spacing.sm,
                }}
              >
                <text
                  style={{
                    fontFamily: theme.typography.mono,
                    fontSize: 12,
                    color: theme.colors.foreground,
                  }}
                >
                  {inputText(entry.tokens)}
                </text>
                <text
                  style={{
                    fontFamily: theme.typography.mono,
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.mutedForeground,
                  }}
                >
                  {formatted.text}
                </text>
              </div>
            </Button>
          );
        })
      )}
    </div>
  );
};

const StatEditor = ({
  state,
  theme,
  run,
}: Pick<InspectorProps, "state" | "theme" | "run">) => {
  const columns = columnsOf(state.stat.kind, state.stat.frequency);
  const start = Math.max(
    0,
    Math.min(state.stat.row - 3, state.stat.rows.length - 8),
  );
  const rows = Arr.range(start, start + 7);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <SectionLabel>{`STAT data · ${state.stat.kind}`}</SectionLabel>
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.xs }}
      >
        {Arr.map(columns, (column, index) => (
          <div key={column} style={{ flexBasis: 0, flexGrow: 1 }}>
            <Text
              role="caption"
              tone={state.stat.column === index ? "primary" : "muted"}
            >
              {column.toUpperCase()}
            </Text>
          </div>
        ))}
      </div>
      {Arr.map(rows, (row) => (
        <div
          key={row}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.xs,
          }}
        >
          {Arr.map(columns, (column, col) => {
            const value = state.stat.rows[row]?.[column] ?? "";
            return (
              <div key={column} style={{ flexBasis: 0, flexGrow: 1 }}>
                <Cell
                  value={value}
                  label={String(row + 1)}
                  active={state.stat.row === row && state.stat.column === col}
                  onActivate={() =>
                    run({ _tag: "stat-cell", row, column: col })
                  }
                />
              </div>
            );
          })}
        </div>
      ))}
      <Input
        label="Argument for x̂, ŷ, P(), Q(), R()"
        size="sm"
        value={state.stat.argument}
        onValueChange={(value) => {
          const number = Number(value);
          if (Number.isFinite(number)) {
            run({ _tag: "stat-argument", value: number });
          }
        }}
      />
      <Text role="caption" tone="muted">
        Up to 80 rows (1-VAR), 40 (two columns), 26 (three) · Enter moves down.
      </Text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
          flexWrap: "wrap",
        }}
      >
        <Chip
          label="Sum"
          onActivate={() => run({ _tag: "stat-menu", command: "sum" })}
        />
        <Chip
          label="Var"
          onActivate={() => run({ _tag: "stat-menu", command: "var" })}
        />
        <Chip
          label="Reg"
          onActivate={() => run({ _tag: "stat-menu", command: "reg" })}
        />
        <Chip
          label="MinMax"
          onActivate={() => run({ _tag: "stat-menu", command: "minmax" })}
        />
        <Chip
          label="Distr"
          onActivate={() => run({ _tag: "stat-menu", command: "distr" })}
        />
      </div>
    </div>
  );
};

const EquationEditor = ({
  state,
  theme,
  run,
}: Pick<InspectorProps, "state" | "theme" | "run">) => {
  const labels = coefficientLabels(state.equation.kind);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <SectionLabel>{equationLabel(state.equation.kind)}</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
          flexWrap: "wrap",
        }}
      >
        {Arr.map(labels, (label, index) => (
          <Cell
            key={label}
            value={state.equation.cells[index] ?? ""}
            label={label}
            active={state.equation.cursor === index}
            onActivate={() => run({ _tag: "equation-cell", index })}
          />
        ))}
      </div>
      <Button
        variant="primary"
        size="sm"
        onActivate={() => run({ _tag: "equation-solve" })}
      >
        Solve
      </Button>
      {state.equation.screen === "solution" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {Arr.map(
            Arr.map(
              state.equation.solutions._tag === "Some"
                ? state.equation.solutions.value
                : [],
              (solution) => {
                const formatted = formatValue(solution.value, state.setup);
                return `${solution.label} = ${formatted.text}`;
              },
            ),
            (line) => (
              <Text key={line} role="code">
                {line}
              </Text>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
};

const MatrixEditor = ({
  state,
  theme,
  run,
}: Pick<InspectorProps, "state" | "theme" | "run">) => {
  const variable = state.matrix.variables[state.matrix.editing];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <SectionLabel>{`Mat${state.matrix.editing} · ${variable.rows}×${variable.columns}`}</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
          flexWrap: "wrap",
        }}
      >
        <Chip
          label="A"
          onActivate={() => run({ _tag: "matrix-edit", matrix: "A" })}
        />
        <Chip
          label="B"
          onActivate={() => run({ _tag: "matrix-edit", matrix: "B" })}
        />
        <Chip
          label="C"
          onActivate={() => run({ _tag: "matrix-edit", matrix: "C" })}
        />
        <Chip
          label="2×2"
          onActivate={() =>
            run({
              _tag: "matrix-dim",
              matrix: state.matrix.editing,
              rows: 2,
              columns: 2,
            })
          }
        />
        <Chip
          label="3×3"
          onActivate={() =>
            run({
              _tag: "matrix-dim",
              matrix: state.matrix.editing,
              rows: 3,
              columns: 3,
            })
          }
        />
      </div>
      {Arr.map(Arr.range(0, variable.rows - 1), (row) => (
        <div
          key={row}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.xs,
          }}
        >
          {Arr.map(Arr.range(0, variable.columns - 1), (column) => {
            const index = row * variable.columns + column;
            return (
              <div key={column} style={{ flexBasis: 0, flexGrow: 1 }}>
                <Cell
                  value={variable.cells[index] ?? ""}
                  label={`${row + 1},${column + 1}`}
                  active={state.matrix.cursor === index}
                  onActivate={() => run({ _tag: "matrix-cell", index })}
                />
              </div>
            );
          })}
        </div>
      ))}
      <Button
        variant="primary"
        size="sm"
        onActivate={() => run({ _tag: "matrix-calc", screen: "calc" })}
      >
        Store matrix
      </Button>
    </div>
  );
};

const VectorEditor = ({
  state,
  theme,
  run,
}: Pick<InspectorProps, "state" | "theme" | "run">) => {
  const cells = state.vector.variables[state.vector.editing];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <SectionLabel>{`Vct${state.vector.editing} · ${cells.length}D`}</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
          flexWrap: "wrap",
        }}
      >
        <Chip
          label="A"
          onActivate={() => run({ _tag: "vector-edit", vector: "A" })}
        />
        <Chip
          label="B"
          onActivate={() => run({ _tag: "vector-edit", vector: "B" })}
        />
        <Chip
          label="C"
          onActivate={() => run({ _tag: "vector-edit", vector: "C" })}
        />
        <Chip
          label="2D"
          onActivate={() =>
            run({ _tag: "vector-dim", vector: state.vector.editing, size: 2 })
          }
        />
        <Chip
          label="3D"
          onActivate={() =>
            run({ _tag: "vector-dim", vector: state.vector.editing, size: 3 })
          }
        />
      </div>
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.xs }}
      >
        {Arr.map(cells, (cell, index) => (
          <div key={index} style={{ flexBasis: 0, flexGrow: 1 }}>
            <Cell
              value={cell}
              label={String(index + 1)}
              active={state.vector.cursor === index}
              onActivate={() => run({ _tag: "vector-cell", index })}
            />
          </div>
        ))}
      </div>
      <Button
        variant="primary"
        size="sm"
        onActivate={() => run({ _tag: "vector-calc", screen: "calc" })}
      >
        Store vector
      </Button>
    </div>
  );
};

const ModeTools = ({
  state,
  theme,
  run,
  press,
}: Pick<InspectorProps, "state" | "theme" | "run" | "press">) => {
  if (state.mode === "STAT")
    return <StatEditor state={state} theme={theme} run={run} />;
  if (state.mode === "EQN")
    return <EquationEditor state={state} theme={theme} run={run} />;
  if (state.mode === "MATRIX")
    return <MatrixEditor state={state} theme={theme} run={run} />;
  if (state.mode === "VECTOR")
    return <VectorEditor state={state} theme={theme} run={run} />;
  if (state.mode === "TABLE") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <SectionLabel>TABLE range</SectionLabel>
        <Text role="code">
          {`f(x) = ${inputText(state.table.tokens) || "—"}`}
        </Text>
        <Text role="caption" tone="muted">
          {`Start ${state.table.start} · End ${state.table.end} · Step ${state.table.step}`}
        </Text>
        <Button
          variant="primary"
          size="sm"
          onActivate={() => run({ _tag: "table-run" })}
        >
          Generate table
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onActivate={() => run({ _tag: "table-reset" })}
        >
          Reset function
        </Button>
      </div>
    );
  }
  if (state.mode === "BASE-N") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <SectionLabel>Number base</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.xs,
          }}
        >
          {(["DEC", "HEX", "BIN", "OCT"] as const).map((base) => (
            <Chip
              key={base}
              label={base}
              onActivate={() => run({ _tag: "base", base })}
            />
          ))}
        </div>
        <Text role="caption" tone="muted">
          Binary is 16-bit; hexadecimal, octal and decimal are 32-bit two's
          complement.
        </Text>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.xs,
            flexWrap: "wrap",
          }}
        >
          <Chip label="and" onActivate={() => press("and")} />
          <Chip label="or" onActivate={() => press("or")} />
          <Chip label="xor" onActivate={() => press("xor")} />
          <Chip label="xnor" onActivate={() => press("xnor")} />
          <Chip label="Not" onActivate={() => press("Not")} />
          <Chip label="Neg" onActivate={() => press("Neg")} />
        </div>
        <SectionLabel>Hex digits</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.xs,
          }}
        >
          {["A", "B", "C", "D", "E", "F"].map((digit) => (
            <Chip key={digit} label={digit} onActivate={() => press(digit)} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <SectionLabel>Quick functions</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
          flexWrap: "wrap",
        }}
      >
        {[
          ["sin", "sin"],
          ["cos", "cos"],
          ["tan", "tan"],
          ["log", "log"],
          ["ln", "ln"],
          ["√", "√"],
          ["Abs", "Abs"],
          ["∫", "∫"],
          ["d/dx", "d/dx"],
          ["Σ", "Σ"],
          ["i", "i"],
          ["π", "π"],
        ].map(([label, keyId]) => (
          <Chip
            key={label}
            label={label ?? ""}
            onActivate={() => press(keyId ?? "")}
          />
        ))}
      </div>
      <Separator orientation="horizontal" />
      <SectionLabel>Setup</SectionLabel>
      <Text role="caption" tone="muted">
        {`${state.setup.display} · ${state.setup.angle} · ${state.setup.number.kind} · ${
          state.setup.fraction === "mixed"
            ? "mixed fractions"
            : "improper fractions"
        }`}
      </Text>
      <Separator orientation="horizontal" />
      <SectionLabel>Mode</SectionLabel>
      <Text role="caption" tone="muted">
        {MODES.find((mode) => mode.mode === state.mode)?.summary ?? ""}
      </Text>
      <SectionLabel>Keyboard</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {[
          "1 2 3 + − × ÷ · Enter evaluates",
          "s c t · sin cos tan · Shift for inverse",
          "a–f x y m · variables · i π e · constants",
          "⌘K all commands · ⌘1–⌘8 modes · ⌘⇧L appearance",
        ].map((line) => (
          <Text key={line} role="code">
            {line}
          </Text>
        ))}
      </div>
    </div>
  );
};

export const Inspector = ({
  state,
  theme,
  run,
  press,
  tab,
  onTab,
}: InspectorProps) => (
  <div
    testId="calc-inspector"
    style={{
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.sm,
      flexGrow: 1,
      minHeight: 0,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
    }}
  >
    <div
      style={{ display: "flex", flexDirection: "row", gap: theme.spacing.xs }}
    >
      {(
        [
          ["history", "History"],
          ["mode", "Mode"],
          ["catalog", "Catalog"],
        ] as const
      ).map(([id, label]) => (
        <Button
          key={id}
          variant={tab === id ? "primary" : "ghost"}
          size="sm"
          testId={`calc-tab-${id}`}
          onActivate={() => onTab(id)}
        >
          {label}
        </Button>
      ))}
    </div>
    <ScrollArea
      axis="vertical"
      label="Calculator inspector"
      style={{ flexGrow: 1, minHeight: 0 }}
      focusable={false}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          paddingRight: theme.spacing.sm,
        }}
      >
        {tab === "history" ? (
          <History state={state} theme={theme} run={run} />
        ) : tab === "mode" ? (
          <ModeTools state={state} theme={theme} run={run} press={press} />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.sm,
            }}
          >
            <SectionLabel>Catalogue</SectionLabel>
            <Text role="caption" tone="muted">
              Every function, setup command and mode is in ⌘K. The lists below
              are the manual's 40 constants and 40 conversions: press one to
              insert it.
            </Text>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: theme.spacing.xs,
                alignItems: "center",
              }}
            >
              <Icon
                name="search"
                color={theme.colors.mutedForeground}
                size="sm"
              />
              <Text role="caption" tone="muted">
                Try “determinant”, “hex”, “regression” or “speed of light”.
              </Text>
            </div>
            <SectionLabel>Scientific constants</SectionLabel>
            {Arr.map(scientificConstants, (held) => (
              <Button
                key={held.index}
                variant="ghost"
                size="sm"
                tabIndex={-1}
                onActivate={() =>
                  run({
                    _tag: "insert",
                    tokens: [namedConstant(held.index, held.symbol)],
                  })
                }
                style={{ justifyContent: "flex-start", height: 26 }}
              >
                {`${held.index}  ${held.symbol} — ${held.name}`}
              </Button>
            ))}
            <SectionLabel>Metric conversions</SectionLabel>
            {Arr.map(metricConversions, (held) => (
              <Button
                key={held.index}
                variant="ghost"
                size="sm"
                tabIndex={-1}
                onActivate={() =>
                  run({
                    _tag: "insert",
                    tokens: [conversion(held.index, `${held.from}→${held.to}`)],
                  })
                }
                style={{ justifyContent: "flex-start", height: 26 }}
              >
                {`${held.index}  ${held.from} → ${held.to}`}
              </Button>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  </div>
);
