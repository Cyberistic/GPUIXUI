/**
 * The playground shell.
 *
 * The sidebar **is** the scenario registry, so a scenario can never exist in
 * the smoke suite but not in the UI (or the reverse). Selecting one renders its
 * real GPUix tree in the stage.
 *
 * The shell renders and navigates without the native host: the smoke host's
 * checks need a `TestRenderer`, so the footer says how to run them instead of
 * offering a button that cannot work. `main.tsx` refuses to start at all on a
 * host with no binding.
 */
import { useState } from "react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { theme } from "./theme.js";
import { Body, Readout } from "./ui.js";
import { scenarios } from "./scenarios/index.js";

export const App = () => {
  const first = Arr.head(scenarios);
  const [selected, setSelected] = useState(
    Option.match(first, { onNone: () => "", onSome: (s) => s.id }),
  );
  const current = pipe(
    Arr.findFirst(scenarios, (scenario) => scenario.id === selected),
    Option.orElse(() => first),
  );

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: theme.surface,
      }}
    >
      <div
        style={{
          width: 260,
          flexShrink: 0,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          borderRightWidth: 1,
          borderColor: theme.border,
        }}
      >
        <text style={{ color: theme.text, fontSize: 13, fontWeight: "bold" }}>
          Scenarios
        </text>
        {Arr.map(scenarios, (scenario) => (
          <div
            key={scenario.id}
            testId={`nav-${scenario.id}`}
            tabIndex={0}
            role="button"
            onClick={() => setSelected(scenario.id)}
            style={{
              padding: 8,
              borderRadius: 6,
              cursor: "pointer",
              backgroundColor:
                selected === scenario.id ? theme.panelAlt : theme.surface,
              hover: { backgroundColor: theme.panelAlt },
            }}
          >
            <text style={{ color: theme.text, fontSize: 13 }}>
              {scenario.title}
            </text>
            <text style={{ color: theme.faint, fontSize: 11 }}>
              {scenario.capability}
            </text>
          </div>
        ))}
      </div>

      <div
        style={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Body>
            {Option.match(current, {
              onNone: () => "no scenarios",
              onSome: (s) => s.title,
            })}
          </Body>
        </div>
        <div
          style={{ flexGrow: 1, minHeight: 0, padding: 16, overflow: "scroll" }}
        >
          {Option.match(current, {
            onNone: () => null,
            onSome: (scenario) => scenario.view(),
          })}
        </div>
        <div
          style={{ padding: 12, borderTopWidth: 1, borderColor: theme.border }}
        >
          <Readout testId="app-note">
            checks run in the native test host: nub run --filter playground
            smoke
          </Readout>
        </div>
      </div>
    </div>
  );
};
