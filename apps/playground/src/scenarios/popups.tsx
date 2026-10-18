/**
 * `select-choose`, `combobox-filter`, `tooltip-open` — the three published GPUix
 * popups our library composes, driven in the real runtime.
 *
 * `COMPONENTS.md` used to call these "verified" from their types. The types
 * describe the props, not the behaviour: whether a click mounts the content,
 * whether native keys reach it after `autoFocus`, whether a value commits and
 * focus returns, and whether a tooltip opens on a real mouse enter. Each
 * scenario owns one of those questions.
 *
 * The tooltip close is an 80 ms JS timer inside the component, which the GPUI
 * dispatcher clock does not move, so the leave step really waits.
 *
 * Measured facts: plan `159` §8.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { awaitReadout } from "./await-readout.js";

const ITEMS: ReadonlyArray<string> = ["Alpha", "Beta", "Gamma"];

const Section = ({
  children,
  testId,
}: {
  readonly children: ReactNode;
  readonly testId: string;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 8,
        width: 220,
        backgroundColor: theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
      }}
    >
      {children}
    </div>
  );
};

const SelectProbe = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Option.Option<string>>(Option.none());

  return (
    <Section testId="select-section">
      <Select
        open={open}
        onOpenChange={setOpen}
        value={Option.getOrUndefined(value)}
        onValueChange={(next) => setValue(Option.some(next))}
      >
        <SelectTrigger testId="select-trigger">
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent testId="select-content" side="bottom" align="start">
          {Arr.map(ITEMS, (item) => (
            <SelectItem key={item} value={item} testId={`select-item-${item}`}>
              <text style={{ color: theme.colors.popoverForeground }}>
                {item}
              </text>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Readout testId="select-readout">
        {`open=${open} value=${Option.getOrElse(value, () => "none")}`}
      </Readout>
    </Section>
  );
};

const ComboboxProbe = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Option.Option<string>>(Option.none());
  const [query, setQuery] = useState("");

  return (
    <Section testId="combo-section">
      <Combobox
        items={[...ITEMS]}
        open={open}
        onOpenChange={setOpen}
        value={Option.getOrNull(value)}
        onValueChange={(next) =>
          setValue(
            Option.filter(
              Option.filter(Option.fromNullishOr(next), P.isString),
              (item) => Arr.contains(ITEMS, item),
            ),
          )
        }
        inputValue={query}
        onInputValueChange={setQuery}
        autoHighlight="always"
      >
        <ComboboxInput testId="combo-input" placeholder="search" />
        <ComboboxContent testId="combo-content" side="bottom" align="start">
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem
                key={item}
                value={item}
                testId={`combo-item-${item}`}
              >
                <text style={{ color: theme.colors.popoverForeground }}>
                  {item}
                </text>
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty testId="combo-empty">
            <text style={{ color: theme.colors.mutedForeground }}>
              no matches
            </text>
          </ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      <Readout testId="combo-readout">
        {`open=${open} value=${Option.getOrElse(value, () => "none")} query=${query}`}
      </Readout>
    </Section>
  );
};

const TooltipProbe = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Section testId="tooltip-section">
      <TooltipProvider delayDuration={0}>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger testId="tooltip-trigger">
            <text style={{ color: theme.colors.foreground }}>hover me</text>
          </TooltipTrigger>
          <TooltipContent
            testId="tooltip-content"
            side="top"
            align="start"
            style={{ backgroundColor: theme.colors.popover }}
          >
            <text style={{ color: theme.colors.popoverForeground }}>
              tip text
            </text>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div
        testId="tooltip-elsewhere"
        style={{
          height: 24,
          backgroundColor: theme.colors.muted,
        }}
      />
      <Readout testId="tooltip-readout">{`open=${open}`}</Readout>
    </Section>
  );
};

const PopupsProbe = () => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 520,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <SelectProbe />
      <ComboboxProbe />
      <TooltipProbe />
    </div>
  );
};

/** The text a `testId` paints, or `""` when it is not mounted. */
const read = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

export const selectScenario: PlaygroundScenario = {
  id: "select-choose",
  title: "Select: open, choose, keyboard and outside dismissal",
  capability: "select",
  view: () => <PopupsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("select-trigger");
      yield* ctx.expectContains(
        "click opens the list",
        read(ctx, "select-readout"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the list paints its items",
        read(ctx, "select-content"),
        "Beta",
      );

      ctx.host.click("select-item-Beta");
      yield* ctx.expectContains(
        "choosing an item commits and closes",
        read(ctx, "select-readout"),
        "open=false value=Beta",
      );
      yield* ctx.expectEqual(
        "the list unmounted",
        ctx.host.text("select-content") === null,
        true,
      );
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "select-trigger",
      );

      ctx.host.key("down");
      yield* ctx.expectContains(
        "the focused trigger opens on down",
        read(ctx, "select-readout"),
        "open=true",
      );
      ctx.host.key("down");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "arrow then enter commits the next item",
        read(ctx, "select-readout"),
        "value=Gamma",
      );

      ctx.host.key("down");
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "escape closes",
        read(ctx, "select-readout"),
        "open=false",
      );

      ctx.host.key("down");
      ctx.host.clickWindow(1200, 700);
      yield* ctx.expectContains(
        "an outside press dismisses",
        read(ctx, "select-readout"),
        "open=false",
      );
      yield* ctx.expectEqual(
        "outside dismissal returns focus to the trigger",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "select-trigger",
      );
    }),
};

export const comboboxScenario: PlaygroundScenario = {
  id: "combobox-filter",
  title: "Combobox: type to filter, Enter to choose, empty state",
  capability: "combobox",
  view: () => <PopupsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("combo-input");
      yield* ctx.expectContains(
        "focusing the input opens the list",
        read(ctx, "combo-readout"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the unfiltered list paints every item",
        read(ctx, "combo-content"),
        "Alpha",
      );

      ctx.host.key("b");
      ctx.host.key("e");
      yield* ctx.expectContains(
        "typing reaches the query",
        read(ctx, "combo-readout"),
        "query=be",
      );
      yield* ctx.expectEqual(
        "the non-matching item unmounted",
        ctx.host.text("combo-item-Alpha") === null,
        true,
      );
      yield* ctx.expectContains(
        "the matching item is painted",
        read(ctx, "combo-item-Beta"),
        "Beta",
      );

      ctx.host.key("enter");
      yield* ctx.expectContains(
        "enter commits the highlighted item and closes",
        read(ctx, "combo-readout"),
        "open=false value=Beta",
      );

      ctx.host.click("combo-input");
      ctx.host.key("z");
      ctx.host.key("z");
      yield* ctx.expectContains(
        "the empty state mounts",
        read(ctx, "combo-empty"),
        "no matches",
      );
      yield* ctx.expectEqual(
        "no item matches",
        ctx.host.text("combo-item-Beta") === null,
        true,
      );

      ctx.host.key("escape");
      yield* ctx.expectContains(
        "escape closes",
        read(ctx, "combo-readout"),
        "open=false",
      );
    }),
};

export const tooltipScenario: PlaygroundScenario = {
  id: "tooltip-open",
  title: "Tooltip: open on native mouse enter, close on leave",
  capability: "tooltip",
  view: () => <PopupsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.hover("tooltip-elsewhere");
      yield* ctx.expectContains(
        "no tooltip before the pointer reaches it",
        read(ctx, "tooltip-readout"),
        "open=false",
      );

      ctx.host.hover("tooltip-trigger");
      yield* ctx.expectContains(
        "native enter opens the tooltip",
        read(ctx, "tooltip-readout"),
        "open=true",
      );
      yield* ctx.expectContains(
        "the content paints",
        read(ctx, "tooltip-content"),
        "tip text",
      );

      ctx.host.hover("tooltip-elsewhere");
      yield* awaitReadout(ctx, "tooltip-readout", "open=false");
      yield* ctx.expectContains(
        "the delayed close fires after leaving",
        read(ctx, "tooltip-readout"),
        "open=false",
      );
    }),
};
