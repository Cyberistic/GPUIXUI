/**
 * `property-panel-lifecycle`: the shipped `@gpuixui/data` `PropertyPanel` in a
 * window.
 *
 * The panel's header says an edit is a callback and the panel owns no copy, and
 * its rows are data: an editable row carries the change it reports, a read-only
 * one carries none. A tree read can see the field is there; only a window can
 * answer whether a press lands in it, whether typing keeps the platform text
 * session and whether the caller's object repaints on the frame the edit lands.
 *
 * The label column is the other claim: every value starts at one `x`, and a
 * caller's `labelWidth` moves that column. Both panels paint the same component,
 * so the difference is the prop rather than a second layout.
 *
 * Every check is a `ctx.expect*` at the step that makes it — the helpers only
 * read — so the count the README prints is the number of assertion sites.
 *
 * Captures: `property-panel-edited`.
 */

import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  DEFAULT_LABEL_WIDTH,
  PropertyPanel,
  type PropertyRow,
} from "@gpuixui/data";
import type { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import {
  PROPERTY_IDS,
  PROPERTY_REST,
  PROPERTY_TYPED,
  PROPERTY_WIDE_LABEL,
  propertyField,
  propertyReadout,
  withTyped,
  type PropertyObject,
} from "./property-panel.js";
import { settleUntil } from "./settle.js";

/** The one capture: both panels after the two edits. */
const CAPTURE = "property-panel-edited";

const CAPTION =
  "The shipped PropertyPanel: an editable row's field takes a press and typing, every edit reports the whole object, a read-only row paints no field, and the label column follows the width it is given.";

/** The view: two shipped panels and the object they both describe. */
export const PropertyPanelProbe = (): ReactNode => {
  const theme = useTheme();
  const [object, setObject] = useState<PropertyObject>(PROPERTY_REST);
  const rows: ReadonlyArray<PropertyRow> = [
    { kind: "readonly", key: "tag", label: "Tag", value: object.tag },
    { kind: "readonly", key: "owner", label: "Owner", value: object.owner },
    {
      kind: "editable",
      key: "name",
      label: "Name",
      value: object.name,
      onChange: (next) => setObject((current) => ({ ...current, name: next })),
    },
    {
      kind: "editable",
      key: "note",
      label: "Note",
      value: object.note,
      onChange: (next) => setObject((current) => ({ ...current, note: next })),
    },
  ];
  return (
    <div
      style={{
        width: 760,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {CAPTION}
      </text>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 360 }}>
          <PropertyPanel
            testId={PROPERTY_IDS.panel}
            title="Properties"
            rows={rows}
          />
        </div>
        <div style={{ width: 360 }}>
          <PropertyPanel
            testId={PROPERTY_IDS.wide}
            title="Wide"
            labelWidth={PROPERTY_WIDE_LABEL}
            rows={[
              {
                kind: "editable",
                key: "narrow",
                label: "Narrow",
                value: "",
                onChange: () => {},
              },
            ]}
          />
        </div>
      </div>
      <Readout testId={PROPERTY_IDS.readout}>{propertyReadout(object)}</Readout>
    </div>
  );
};

/** The probe's steps: the two columns, then an edit in each field. */
export const propertyPanelSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(PROPERTY_IDS.panel);
    yield* Effect.sleep(Duration.millis(300));

    type Failure = Smoke.SmokeAssertionError | Smoke.SmokeHostError;

    /** A box the caller can read a column and a row from, or a named failure. */
    const box = (
      testId: string,
      label: string,
    ): Effect.Effect<Smoke.Bounds, Failure> =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          label,
          Option.fromNullishOr(yield* ctx.host.bounds(testId)),
        );
      });

    /** The readout once it names `expected`, which an edit reports a frame later. */
    const readout = (expected: string): Effect.Effect<string, Failure> =>
      settleUntil(ctx.host.text(PROPERTY_IDS.readout), (line) =>
        line.includes(expected),
      );

    /** Types `value` into the field `id`, the way a reader does. */
    const typeInto = (
      id: string,
      value: string,
    ): Effect.Effect<void, Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        yield* ctx.host.click(id);
        yield* Effect.forEach(
          Arr.fromIterable(Str.split("")(value)),
          (letter) => ctx.host.key(letter),
          { concurrency: 1 },
        );
        yield* Effect.sleep(Duration.millis(120));
      });

    /** The field that holds the platform text session, or `none`. */
    const focused = (): Effect.Effect<string, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.focused(), (id) =>
        Option.getOrElse(Option.fromNullishOr(id), () => "none"),
      );

    // ── At rest: the object, the two kinds of row and the label column ──────
    yield* ctx.expectEqual(
      "the panel paints the object it was handed",
      yield* readout(propertyReadout(PROPERTY_REST)),
      propertyReadout(PROPERTY_REST),
    );
    yield* ctx.expectContains(
      "the panel's title paints",
      yield* ctx.host.text(PROPERTY_IDS.panel),
      "Properties",
    );
    yield* ctx.expectContains(
      "a read-only row paints its value",
      yield* ctx.host.text(PROPERTY_IDS.panel),
      "internal",
    );
    const nameField = yield* box(
      propertyField("name"),
      "an editable row paints a field",
    );
    const noteField = yield* box(
      propertyField("note"),
      "the second editable row paints its field",
    );
    yield* ctx.expectNear(
      "every value starts at the label column's one x",
      noteField.x,
      nameField.x,
      1,
    );
    yield* ctx.expectEqual(
      "the rows paint one below the other",
      noteField.y > nameField.y,
      true,
    );
    yield* ctx.expectEqual(
      "a read-only row paints no field at all",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds(propertyField("tag"))),
      ),
      true,
    );
    const wideField = yield* box(
      propertyField("narrow"),
      "the wide panel paints its own field",
    );
    yield* ctx.expectNear(
      "a wider label column moves the value column by exactly the width it adds",
      wideField.x - nameField.x,
      PROPERTY_WIDE_LABEL - DEFAULT_LABEL_WIDTH,
      1,
    );
    yield* ctx.expectContains(
      "the wide panel paints its own title",
      yield* ctx.host.text(PROPERTY_IDS.wide),
      "Wide",
    );

    // ── Editing the first field: the object repaints, the other row holds ───
    yield* typeInto(propertyField("name"), PROPERTY_TYPED.name);
    yield* ctx.expectContains(
      "an edit reports the whole object",
      yield* readout(`name=${PROPERTY_TYPED.name}`),
      `name=${PROPERTY_TYPED.name}`,
    );
    yield* ctx.expectEqual(
      "the field a press landed in keeps the text session",
      yield* focused(),
      propertyField("name"),
    );
    yield* ctx.expectContains(
      "the row beside it keeps its own value",
      yield* ctx.host.text(PROPERTY_IDS.readout),
      "note= tag=internal",
    );

    // ── Editing the second field: both edits survive in the one object ──────
    yield* typeInto(propertyField("note"), PROPERTY_TYPED.note);
    yield* ctx.expectEqual(
      "the second edit reports the object with both values",
      yield* readout(
        propertyReadout(withTyped(withTyped(PROPERTY_REST, "name"), "note")),
      ),
      propertyReadout(withTyped(withTyped(PROPERTY_REST, "name"), "note")),
    );
    yield* ctx.expectEqual(
      "the text session moved to the field the press landed in",
      yield* focused(),
      propertyField("note"),
    );
    const typedName = yield* box(
      propertyField("name"),
      "the first field still paints after the second edit",
    );
    yield* ctx.expectNear(
      "a typed value does not move the label column",
      typedName.x,
      nameField.x,
      1,
    );

    // Captures come last: a screenshot stalls the animation clock.
    yield* ctx.host.capture(CAPTURE);
  });
