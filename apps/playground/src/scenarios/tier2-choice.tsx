/**
 * `tier2-choice` — the shipped Tier 2 choice controls from `@gpuixui/components`,
 * mounted by a consumer and driven natively.
 *
 * The package's own suites prove each part; this scenario proves the consumer
 * path the playground exists for: the published root import through
 * `tsconfig.vendor.json` (plan `330` §3), the shipped token theme, and the
 * gestures a user makes. Mechanisms measured elsewhere are not re-probed:
 * floating placement and snapping (`floating-placement`, plan `156`), the
 * published popup contracts (`select-choose`/`combobox-filter`, plan `159`),
 * the native editor (`text-entry`, plan `188`) and pointer entry
 * (`pointer-text-entry`, plan `343`).
 *
 * Every popup opens inside the 1280×800 offscreen frame and the 1100×720 live
 * window: the date picker sits at the top of its column so its six-row grid
 * fits, and each sequence closes one surface before opening the next.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchInput,
  TimePicker,
  TimePickerClear,
  TimePickerSegment,
  TimePickerSeparator,
  type ComboboxOption,
} from "../../vendor/packages/components/src/index.js";
import { Button } from "../../vendor/packages/components/src/internal/button.js";
import { useTheme } from "@gpuixui/tokens/react";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { ariaOf, focusedId, painted, read } from "./probes.js";

/** The columns the popover toggles, in declaration order. */
const columns = ["name", "status"] as const;

const reviewers: ReadonlyArray<ComboboxOption> = [
  { value: "ada", label: "Ada Lovelace", description: "Engineering" },
  { value: "grace", label: "Grace Hopper", description: "Compilers" },
  {
    value: "alan",
    label: "Alan Turing",
    description: "Research",
    disabled: true,
  },
];

const Probe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [visible, setVisible] = useState<ReadonlyArray<string>>([
    "name",
    "status",
  ]);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [cleared, setCleared] = useState(0);
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [due, setDue] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const toggle = (column: string): void =>
    setVisible((current) =>
      Arr.contains(current, column)
        ? Arr.filter(current, (candidate) => candidate !== column)
        : Arr.append(current, column),
    );

  const column = (value: string) =>
    `${value === "name" ? "Name" : "Status"} ${
      Arr.contains(visible, value) ? "on" : "off"
    }`;

  return (
    <div
      testId="tier2-choice-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Body>shipped Tier 2 choice controls</Body>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.xl,
          flexGrow: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xl,
            width: 420,
          }}
        >
          <Popover>
            <PopoverTrigger
              testId="popover-trigger"
              aria-id="popover-trigger"
              variant="secondary"
            >
              Columns
            </PopoverTrigger>
            <PopoverContent testId="popover-panel" side="bottom" align="start">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: theme.spacing.sm,
                }}
              >
                {Arr.map(columns, (value) => (
                  <Button
                    key={value}
                    testId={`popover-row-${value}`}
                    variant={Arr.contains(visible, value) ? "primary" : "ghost"}
                    aria-pressed={Arr.contains(visible, value)}
                    onClick={() => toggle(value)}
                  >
                    {column(value)}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <SearchInput
            testId="search-field"
            aria-id="search-field"
            placeholder="Filter files…"
            value={query}
            onValueChange={setQuery}
            onSubmit={setSubmitted}
            onClear={() => setCleared((count) => count + 1)}
          />
          <Combobox
            options={reviewers}
            value={reviewer ?? undefined}
            onValueChange={(next) =>
              setReviewer(
                typeof next === "string"
                  ? next
                  : Array.isArray(next)
                    ? (next[0] ?? null)
                    : null,
              )
            }
          >
            <ComboboxTrigger
              testId="assign-trigger"
              aria-id="assign-trigger"
              label="Assign reviewer"
              placeholder="No reviewer"
            />
            <ComboboxContent>
              <ComboboxInput label="Search reviewers" />
              <ComboboxList label="Reviewers" />
              <ComboboxEmpty />
            </ComboboxContent>
          </Combobox>
          <div
            testId="choice-outside"
            style={{
              display: "flex",
              alignItems: "center",
              height: 40,
              paddingLeft: theme.spacing.md,
              backgroundColor: theme.colors.muted,
              borderRadius: theme.radius.sm,
            }}
          >
            <text style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
              outside press target
            </text>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xl,
            width: 420,
          }}
        >
          <DatePicker
            value={due}
            onValueChange={setDue}
            today="2026-10-17"
            min="2026-10-17"
            max="2026-12-31"
            clearable
          >
            <DatePickerTrigger label="Due date" aria-id="date-picker-trigger" />
            <DatePickerContent>
              <DatePickerCalendar />
            </DatePickerContent>
          </DatePicker>
          <TimePicker
            testId="standup"
            label="Standup"
            value={time}
            onValueChange={setTime}
            minuteStep={15}
            clearable
          >
            <TimePickerSegment segment="hours" />
            <TimePickerSeparator />
            <TimePickerSegment segment="minutes" />
            <TimePickerClear />
          </TimePicker>
        </div>
      </div>
      <Readout testId="tier2-choice-readout">
        {`visible=${Arr.match(visible, {
          onEmpty: () => "none",
          onNonEmpty: (values) => Arr.join(values, ","),
        })} query=${query === "" ? "none" : query} submitted=${
          submitted ?? "none"
        } cleared=${cleared} reviewer=${reviewer ?? "none"} due=${
          due ?? "none"
        } time=${time ?? "none"}`}
      </Readout>
    </div>
  );
};

export const tier2ChoiceScenario: PlaygroundScenario = {
  id: "tier2-choice",
  title:
    "Tier 2 choice: Popover, SearchInput, Combobox, DatePicker and TimePicker",
  capability: "tier2",
  view: () => <Probe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "the choice frame is painted",
        painted(ctx, "tier2-choice-frame"),
      );

      // 1. Popover: closed at rest, opens below, toggles, dismisses.
      yield* ctx.expectEqual(
        "the popover starts closed",
        Option.isNone(painted(ctx, "popover-panel")),
        true,
      );
      ctx.host.click("popover-trigger");
      const panel = yield* ctx.expectSome(
        "the popover opens on its trigger",
        painted(ctx, "popover-panel"),
      );
      const trigger = yield* ctx.expectSome(
        "the popover trigger is painted",
        painted(ctx, "popover-trigger"),
      );
      yield* ctx.expectEqual(
        "the panel opens below its trigger",
        panel.y >= trigger.y + trigger.height,
        true,
      );
      const expanded = yield* ctx.expectSome(
        "the trigger is exposed",
        ariaOf(ctx, "popover-trigger"),
      );
      yield* ctx.expectEqual(
        "the open trigger reports expanded",
        Option.getOrElse(expanded.expanded, () => false),
        true,
      );
      ctx.host.click("popover-row-name");
      yield* ctx.expectContains(
        "a row click reaches the consumer",
        read(ctx, "tier2-choice-readout"),
        "visible=status",
      );
      yield* ctx.expectSome(
        "the popover stays open after a row click",
        painted(ctx, "popover-panel"),
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the popover",
        Option.isNone(painted(ctx, "popover-panel")),
        true,
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the trigger",
        focusedId(ctx),
        "popover-trigger",
      );
      ctx.host.click("popover-trigger");
      yield* ctx.expectSome(
        "the popover reopens",
        painted(ctx, "popover-panel"),
      );
      ctx.host.click("choice-outside");
      yield* ctx.expectEqual(
        "an outside press closes the popover",
        Option.isNone(painted(ctx, "popover-panel")),
        true,
      );
      yield* ctx.expectEqual(
        "the outside press closed it once",
        Option.isNone(painted(ctx, "popover-panel")),
        true,
      );

      // 2. SearchInput: the clear affix, typing, submit and Escape.
      yield* ctx.expectEqual(
        "no clear control at rest",
        Option.isNone(painted(ctx, "search-clear")),
        true,
      );
      ctx.host.click("search-field");
      ctx.host.key("c a r d");
      yield* ctx.expectContains(
        "typing reaches the consumer",
        read(ctx, "tier2-choice-readout"),
        "query=card",
      );
      yield* ctx.expectSome(
        "the clear control appears with text",
        painted(ctx, "search-clear"),
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter submits the current text",
        read(ctx, "tier2-choice-readout"),
        "submitted=card",
      );
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape clears the field",
        read(ctx, "tier2-choice-readout"),
        "query=none",
      );
      yield* ctx.expectContains(
        "Escape reports one clear",
        read(ctx, "tier2-choice-readout"),
        "cleared=1",
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the field",
        focusedId(ctx),
        "search-field",
      );
      yield* ctx.expectEqual(
        "the clear control leaves with the text",
        Option.isNone(painted(ctx, "search-clear")),
        true,
      );
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape on an empty field does not clear again",
        read(ctx, "tier2-choice-readout"),
        "cleared=1",
      );
      ctx.host.key("g p u i");
      ctx.host.click("search-clear");
      yield* ctx.expectContains(
        "the clear control clears",
        read(ctx, "tier2-choice-readout"),
        "cleared=2",
      );
      yield* ctx.expectEqual(
        "the clear control returns focus to the field",
        focusedId(ctx),
        "search-field",
      );

      // 3. Combobox: open, rank, select by value, empty state, Escape.
      ctx.host.click("assign-trigger");
      const content = yield* ctx.expectSome(
        "the combobox opens on its trigger",
        painted(ctx, "combobox-content"),
      );
      const assign = yield* ctx.expectSome(
        "the combobox trigger is painted",
        painted(ctx, "assign-trigger"),
      );
      yield* ctx.expectEqual(
        "the popup opens below its trigger",
        content.y >= assign.y + assign.height,
        true,
      );
      ctx.host.click("combobox-input");
      ctx.host.key("g r a");
      yield* ctx.expectSome(
        "the ranked match paints",
        painted(ctx, "combobox-option-grace"),
      );
      yield* ctx.expectEqual(
        "a non-match is filtered out",
        Option.isNone(painted(ctx, "combobox-option-ada")),
        true,
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter selects the option value",
        read(ctx, "tier2-choice-readout"),
        "reviewer=grace",
      );
      yield* ctx.expectEqual(
        "a single selection closes the popup",
        Option.isNone(painted(ctx, "combobox-content")),
        true,
      );
      yield* ctx.expectContains(
        "the trigger paints the selected label",
        read(ctx, "assign-trigger"),
        "Grace Hopper",
      );
      ctx.host.click("assign-trigger");
      ctx.host.click("combobox-input");
      ctx.host.key("a l a n");
      yield* ctx.expectSome(
        "a disabled option stays visible",
        painted(ctx, "combobox-option-alan"),
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "a disabled option cannot be selected",
        read(ctx, "tier2-choice-readout"),
        "reviewer=grace",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the combobox",
        Option.isNone(painted(ctx, "combobox-content")),
        true,
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the combobox trigger",
        focusedId(ctx),
        "assign-trigger",
      );
      ctx.host.click("assign-trigger");
      ctx.host.click("combobox-input");
      ctx.host.key("z z z");
      yield* ctx.expectSome(
        "a no-match query paints the empty state",
        painted(ctx, "combobox-empty"),
      );
      ctx.host.key("escape");

      // 4. DatePicker: anchor on today, clamp at min, select, clear.
      ctx.host.click("date-picker-trigger");
      yield* ctx.expectSome(
        "the calendar opens on its trigger",
        painted(ctx, "date-picker-content"),
      );
      yield* ctx.expectContains(
        "the month is anchored on today",
        read(ctx, "date-month"),
        "October 2026",
      );
      yield* ctx.expectEqual(
        "the calendar focuses the month head when nothing is selected (measured; components task)",
        focusedId(ctx),
        "date-day-2026-10-01",
      );
      ctx.host.key("left");
      yield* ctx.expectEqual(
        "Left clamps at the minimum bound",
        focusedId(ctx),
        "date-day-2026-10-17",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter selects the focused day",
        read(ctx, "tier2-choice-readout"),
        "due=2026-10-17",
      );
      yield* ctx.expectEqual(
        "choosing closes the calendar",
        Option.isNone(painted(ctx, "date-picker-content")),
        true,
      );
      yield* ctx.expectEqual(
        "choosing returns focus to the trigger",
        focusedId(ctx),
        "date-picker-trigger",
      );
      ctx.host.click("date-picker-trigger");
      ctx.host.key("right");
      ctx.host.key("right");
      yield* ctx.expectEqual(
        "Right moves real focus by day",
        focusedId(ctx),
        "date-day-2026-10-19",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "a second selection adopts the new day",
        read(ctx, "tier2-choice-readout"),
        "due=2026-10-19",
      );
      ctx.host.click("date-picker-trigger");
      yield* ctx.expectSome(
        "the clearable calendar reopens",
        painted(ctx, "date-clear"),
      );
      ctx.host.click("date-clear");
      yield* ctx.expectContains(
        "Clear resets the value",
        read(ctx, "tier2-choice-readout"),
        "due=none",
      );
      yield* ctx.expectEqual(
        "Clear closes the calendar",
        Option.isNone(painted(ctx, "date-picker-content")),
        true,
      );

      // 5. TimePicker: composing, stepping and clearing.
      ctx.host.click("standup-hours");
      ctx.host.key("0 9");
      yield* ctx.expectContains(
        "typing hours composes a value",
        read(ctx, "tier2-choice-readout"),
        "time=09:00",
      );
      ctx.host.click("standup-minutes");
      ctx.host.key("3 0");
      yield* ctx.expectContains(
        "typing minutes composes the pair",
        read(ctx, "tier2-choice-readout"),
        "time=09:30",
      );
      ctx.host.key("up");
      yield* ctx.expectContains(
        "Up steps the minutes by the step",
        read(ctx, "tier2-choice-readout"),
        "time=09:45",
      );
      ctx.host.key("down");
      yield* ctx.expectContains(
        "Down reverses the step",
        read(ctx, "tier2-choice-readout"),
        "time=09:30",
      );
      ctx.host.click("standup-hours");
      ctx.host.key("up");
      yield* ctx.expectContains(
        "Up on hours steps one hour",
        read(ctx, "tier2-choice-readout"),
        "time=10:30",
      );
      ctx.host.click("standup-clear");
      yield* ctx.expectContains(
        "Clear empties the time",
        read(ctx, "tier2-choice-readout"),
        "time=none",
      );
      yield* ctx.expectEqual(
        "Clear returns focus to the hours segment",
        focusedId(ctx),
        "standup-hours",
      );
      ctx.host.key("9 9");
      yield* ctx.expectContains(
        "an out-of-range segment clamps",
        read(ctx, "tier2-choice-readout"),
        "time=23:00",
      );

      // 6. The accessibility surface the shipped search field authors.
      const searchNode = yield* ctx.expectSome(
        "the search field is exposed",
        ariaOf(ctx, "search-field"),
      );
      yield* ctx.expectEqual(
        "the search field is a text field",
        Option.getOrElse(searchNode.role, () => "none"),
        "TextInput",
      );
    }),
};
