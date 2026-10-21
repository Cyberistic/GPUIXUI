/**
 * State-aware `style`, in the real GPUix renderer.
 *
 * The bug these guard: a consumer could only pass a fixed `StyleDesc`, so a
 * selected / checked / open / highlighted / invalid look meant forking the part.
 * Each case records the state the part hands to the callback and asserts the
 * callback's style reaches the rendered node — the callback must win over the
 * part's own base, exactly like an object style.
 */

import { describe, expect, it } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxItemState,
} from "../combobox.js";
import { Collapsible, CollapsibleTrigger } from "../collapsible.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import { Field, FieldInput } from "../field.js";
import { clickCentreOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { List, ListItem, ListItemTitle } from "../list.js";
import { Pagination, PaginationItem } from "../pagination.js";
import { SearchInput } from "../search-input.js";
import { Tabs, TabsList, TabsTrigger } from "../tabs.js";
import {
  TimePicker,
  TimePickerSeparator,
  TimePickerSegment,
} from "../time-picker.js";

const applied = "#123456";

describe("state-aware style", () => {
  it("hands a tab trigger its selection, highlight and axis", () => {
    const selected: Array<unknown> = [];
    const disabled: Array<unknown> = [];
    const root = renderComponent(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger
            value="a"
            testId="tab-a"
            style={(state) => {
              selected.push(state);
              return { backgroundColor: applied };
            }}
          >
            A
          </TabsTrigger>
          <TabsTrigger
            value="b"
            testId="tab-b"
            disabled
            style={(state) => {
              disabled.push(state);
              return {};
            }}
          >
            B
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(selected.at(-1)).toEqual({
      active: true,
      disabled: false,
      focused: false,
      highlighted: false,
      orientation: "horizontal",
    });
    expect(disabled.at(-1)).toMatchObject({ active: false, disabled: true });
    expect(root.renderer.findByTestId("tab-a")?.style.backgroundColor).toBe(
      applied,
    );
    root.unmount();
  });

  it("hands an accordion header its open state", () => {
    const states: Array<unknown> = [];
    const root = renderComponent(
      <Accordion type="single" defaultValue="one">
        <AccordionItem value="one">
          <AccordionTrigger
            testId="trigger"
            style={(state) => {
              states.push(state);
              return { backgroundColor: applied };
            }}
          >
            Section
          </AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(states.at(-1)).toEqual({
      open: true,
      disabled: false,
      focused: false,
    });
    expect(root.renderer.findByTestId("trigger")?.style.backgroundColor).toBe(
      applied,
    );
    root.unmount();
  });

  it("hands a collapsible trigger its open state", () => {
    const states: Array<unknown> = [];
    const root = renderComponent(
      <Collapsible defaultOpen>
        <CollapsibleTrigger
          testId="trigger"
          style={(state) => {
            states.push(state);
            return {};
          }}
        >
          Details
        </CollapsibleTrigger>
      </Collapsible>,
    );

    expect(states.at(-1)).toEqual({
      open: true,
      closed: false,
      focused: false,
      disabled: false,
    });
    root.unmount();
  });

  it("hands a list row its selection and roving focus", () => {
    const states: Array<unknown> = [];
    const root = renderComponent(
      <List selectionMode="single" defaultValue="a">
        <ListItem
          value="a"
          testId="row"
          style={(state) => {
            states.push(state);
            return { backgroundColor: applied };
          }}
        >
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
      </List>,
    );

    expect(states.at(-1)).toEqual({
      active: false,
      disabled: false,
      selected: true,
    });
    expect(root.renderer.findByTestId("row")?.style.backgroundColor).toBe(
      applied,
    );
    root.unmount();
  });

  it("hands menu rows their highlight and a checkbox row its checked state", () => {
    const itemStates: Array<unknown> = [];
    const checkboxStates: Array<unknown> = [];
    const root = renderComponent(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent label="Actions">
          <DropdownMenuItem
            testId="item"
            style={(state) => {
              itemStates.push(state);
              return { backgroundColor: applied };
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked
            disabled
            testId="checkbox"
            onCheckedChange={() => undefined}
            style={(state) => {
              checkboxStates.push(state);
              return {};
            }}
          >
            Show hidden
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(itemStates.at(-1)).toEqual({ disabled: false, highlighted: false });
    expect(checkboxStates.at(-1)).toEqual({
      checked: true,
      disabled: true,
      highlighted: false,
    });
    expect(root.renderer.findByTestId("item")?.style.backgroundColor).toBe(
      applied,
    );
    root.unmount();
  });

  it("hands a pagination control its current-page state", () => {
    const states: Array<unknown> = [];
    const root = renderComponent(
      <Pagination page={2} pageCount={5} onPageChange={() => undefined}>
        <PaginationItem
          page={2}
          testId="page"
          style={(state) => {
            states.push(state);
            return { backgroundColor: applied };
          }}
        />
      </Pagination>,
    );

    expect(states.at(-1)).toEqual({ active: true });
    expect(root.renderer.findByTestId("page")?.style.backgroundColor).toBe(
      applied,
    );
    root.unmount();
  });

  it("hands a search field its input state", () => {
    const states: Array<unknown> = [];
    const root = renderComponent(
      <SearchInput
        testId="search"
        disabled
        style={(state) => {
          states.push(state);
          return {};
        }}
      />,
    );

    expect(states.at(-1)).toEqual({ disabled: true, focused: false });
    root.unmount();
  });

  it("hands a field input its validity", () => {
    const states: Array<unknown> = [];
    const root = renderComponent(
      <Field label="Email" error="Enter an address">
        <FieldInput
          testId="input"
          style={(state) => {
            states.push(state);
            return { backgroundColor: applied };
          }}
        />
      </Field>,
    );

    expect(states.at(-1)).toEqual({
      disabled: false,
      focused: false,
      invalid: true,
    });
    expect(root.renderer.findByTestId("input")?.style.backgroundColor).toBe(
      applied,
    );
    root.unmount();
  });

  it("hands a time segment its input state", () => {
    const states: Array<unknown> = [];
    const root = renderComponent(
      <TimePicker disabled testId="time">
        <TimePickerSegment
          segment="hours"
          style={(state) => {
            states.push(state);
            return { backgroundColor: applied };
          }}
        />
        <TimePickerSeparator />
        <TimePickerSegment segment="minutes" />
      </TimePicker>,
    );

    expect(states.at(-1)).toEqual({ disabled: true, focused: false });
    expect(
      root.renderer.findByTestId("time-hours")?.style.backgroundColor,
    ).toBe(applied);
    root.unmount();
  });

  it("hands a combobox row the runtime's own state", () => {
    const states: Array<ComboboxItemState> = [];
    const root = renderComponent(
      <Combobox
        options={[
          { value: "ada", label: "Ada Lovelace" },
          { value: "grace", label: "Grace Hopper" },
        ]}
      >
        <ComboboxTrigger testId="trigger" />
        <ComboboxContent>
          <ComboboxInput />
          <ComboboxList
            itemStyle={(state) => {
              states.push(state);
              return { backgroundColor: applied };
            }}
          />
        </ComboboxContent>
      </Combobox>,
    );

    clickCentreOf(root, "trigger");
    expect(states).not.toHaveLength(0);
    expect(states[0]).toMatchObject({ selected: false, disabled: false });
    expect(
      root.renderer.findByTestId("combobox-option-ada")?.style.backgroundColor,
    ).toBe(applied);
    root.unmount();
  });

  it("still accepts an object style", () => {
    const root = renderComponent(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger
            value="a"
            testId="tab"
            style={{ backgroundColor: applied }}
          >
            A
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(root.renderer.findByTestId("tab")?.style.backgroundColor).toBe(
      applied,
    );
    root.unmount();
  });
});
