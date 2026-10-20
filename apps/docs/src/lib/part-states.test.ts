import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import { allStateFields, fieldFrequency, partStates } from "./part-states";

/**
 * The parser behind plan 622. The Component API page states the part-state
 * contract, so the names it lists must come from real interfaces. These fixtures
 * pin the narrow shape the parser relies on: top-level exported interfaces with
 * flat fields. A nested object field stops the body at its brace, which is
 * asserted rather than hidden, so a future nested state fails visibly instead of
 * dropping fields silently.
 */

const source = (text: string) => [{ path: "fixture.tsx", text }];

describe("partStates", () => {
  it("extracts exported interfaces in declaration order", () => {
    const states = partStates(
      source(`
        export interface TabsTriggerState {
          readonly active: boolean;
          readonly disabled: boolean;
        }

        export interface InlineEditState {
          readonly editing?: boolean;
        }
      `),
    );

    expect(states.map((state) => state.name)).toEqual([
      "TabsTriggerState",
      "InlineEditState",
    ]);
    expect(states[0]?.fields).toEqual(["active", "disabled"]);
    expect(states[1]?.fields).toEqual(["editing"]);
  });

  it("ignores a non-exported interface and a type alias", () => {
    const states = partStates(
      source(`
        interface InternalState {
          readonly hidden: boolean;
        }

        type AliasedState = { readonly open: boolean };
      `),
    );

    expect(states).toEqual([]);
  });

  it("stops a nested object field at its brace, as documented", () => {
    const [state] = partStates(
      source(`
        export interface CarouselSlideState {
          readonly disabled: boolean;
          readonly size: { width: number };
          readonly after: boolean;
        }
      `),
    );

    expect(state?.fields).toEqual(["disabled", "size"]);
  });

  it("counts a field's frequency across types", () => {
    const states = partStates(
      source(`
        export interface OneState { readonly active: boolean; }
        export interface TwoState { readonly active: boolean; readonly open: boolean; }
      `),
    );

    expect(Arr.sort([...allStateFields(states)], Order.String)).toEqual([
      "active",
      "open",
    ]);
    expect(fieldFrequency(states, "active")).toBe(2);
    expect(fieldFrequency(states, "open")).toBe(1);
  });
});
