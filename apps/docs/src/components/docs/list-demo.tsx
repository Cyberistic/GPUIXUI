import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  firstRow,
  IDLE,
  lastRow,
  nextRow,
  press,
  range,
  selectAll,
  toggle,
  typeaheadMatch,
  type PreviewListRow,
} from "./list-preview";

/**
 * Browser previews for the List page.
 *
 * The shipped `List` is a collection with a roving tab stop, so the previews
 * below focus a real row and move the focus with the keys — the parts a screenshot
 * cannot show. The rules are held to the component by `list-preview.ts` and its
 * suite: disabled rows are skipped, the ends wrap, a typed prefix searches after
 * the current row, and a range never includes a disabled row.
 */

const files: ReadonlyArray<PreviewListRow> = [
  {
    value: "readme",
    title: "README.md",
    description: "The project's front door",
    trailing: "2.1 kB",
    searchText: "README.md",
  },
  {
    value: "design",
    title: "Design notes",
    description: "docs/design-notes.md",
    trailing: "18 kB",
    searchText: "Design notes",
  },
  {
    value: "secrets",
    title: "secrets.env",
    description: "No access in this workspace",
    trailing: "locked",
    disabled: true,
    searchText: "secrets.env",
  },
  {
    value: "diagram",
    title: "diagram.svg",
    description: "assets/diagram.svg",
    trailing: "46 kB",
    searchText: "diagram.svg",
  },
  {
    value: "changelog",
    title: "CHANGELOG.md",
    description: "Everything that shipped",
    trailing: "9.4 kB",
    searchText: "CHANGELOG.md",
  },
];

interface PreviewRowProps {
  readonly row: PreviewListRow;
  readonly active: boolean;
  readonly selected: boolean;
  readonly onFocus: () => void;
  readonly onPress: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly register: (element: HTMLButtonElement | null) => void;
}

/** One row: the shared paint, the two lines and the trailing metadata. */
const PreviewRow = ({
  row,
  active,
  selected,
  onFocus,
  onPress,
  register,
}: PreviewRowProps) => (
  <button
    aria-selected={selected}
    className="gx-list-row"
    data-active={active}
    data-selected={selected}
    disabled={row.disabled}
    onClick={onPress}
    onFocus={onFocus}
    ref={register}
    role="option"
    tabIndex={active ? 0 : -1}
    type="button"
  >
    <span className="gx-list-text">
      <span className="gx-list-title">{row.title}</span>
      {row.description === undefined ? null : (
        <span className="gx-list-description">{row.description}</span>
      )}
    </span>
    {row.trailing === undefined ? null : (
      <span className="gx-list-trailing">{row.trailing}</span>
    )}
  </button>
);

/** A realistic composition: the file list a reader picks a document from. */
export const ListDemo = () => {
  const [selected, setSelected] = useState<string | null>("readme");
  const [active, setActive] = useState<string | null>("readme");
  const [opened, setOpened] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const buffer = useRef(IDLE);

  const focus = (value: string | null) => {
    if (value === null) return;
    setActive(value);
    rows.current.get(value)?.focus();
  };

  const open = (value: string) => {
    setSelected(value);
    setOpened(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;

    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      focus(nextRow(files, active, key === "ArrowDown" ? 1 : -1));
      return;
    }

    if (key === "Home" || key === "End") {
      event.preventDefault();
      focus(key === "Home" ? firstRow(files) : lastRow(files));
      return;
    }

    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (active === null) return;
      // Enter activates; Space only selects.
      if (key === "Enter") open(active);
      else setSelected(active);
      return;
    }

    if (key.length === 1 && !event.metaKey && !event.ctrlKey) {
      // Type-ahead: the prefix lives 500ms, and a repeated letter cycles. The
      // shipped `List` reads Effect's monotonic clock; a browser preview has no
      // runtime to ask, so it reads the browser's monotonic clock instead.
      const typed = press(buffer.current, key, performance.now());
      buffer.current = typed;
      focus(typeaheadMatch(files, active, typed.text));
    }
  };

  return (
    <div className="gx-demo-list">
      <div className="gx-list-card">
        <div>
          <p className="gx-list-heading">Workspace files</p>
          <p className="gx-list-meta">
            Arrows move one tab stop; Enter opens; a typed prefix jumps.
          </p>
        </div>
        <div
          aria-label="Workspace files"
          className="gx-list"
          onKeyDown={onKeyDown}
          role="listbox"
        >
          {files.map((row) => (
            <PreviewRow
              active={active === row.value}
              key={row.value}
              onFocus={() => setActive(row.value)}
              onPress={() => open(row.value)}
              register={(element) => {
                if (element === null) rows.current.delete(row.value);
                else rows.current.set(row.value, element);
              }}
              row={row}
              selected={selected === row.value}
            />
          ))}
        </div>
        <p className="gx-list-readout">
          selected: <b>{selected ?? "none"}</b> · opened:{" "}
          <b>{opened ?? "none"}</b>
        </p>
      </div>
    </div>
  );
};

const reviewers: ReadonlyArray<PreviewListRow> = [
  {
    value: "ada",
    title: "Ada Lovelace",
    description: "Engineering · compilers",
    trailing: "engine",
    searchText: "Ada Lovelace",
  },
  {
    value: "grace",
    title: "Grace Hopper",
    description: "Platform · releases",
    trailing: "platform",
    searchText: "Grace Hopper",
  },
  {
    value: "contractor",
    title: "External reviewers",
    description: "Invite-only",
    trailing: "locked",
    disabled: true,
    searchText: "External reviewers",
  },
  {
    value: "katherine",
    title: "Katherine Johnson",
    description: "Data · trajectories",
    trailing: "data",
    searchText: "Katherine Johnson",
  },
];

/** Multiple mode: plain, Cmd and Shift clicks, plus the range that skips a row. */
export const ListMultiple = () => {
  const [selected, setSelected] = useState<ReadonlyArray<string>>(["grace"]);
  const [anchor, setAnchor] = useState("grace");
  const [active, setActive] = useState<string | null>("grace");
  const rows = useRef(new Map<string, HTMLButtonElement>());

  const focus = (value: string | null) => {
    if (value === null) return;
    setActive(value);
    rows.current.get(value)?.focus();
  };

  const onPress = (
    row: PreviewListRow,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (row.disabled === true) return;

    if (event.shiftKey) {
      setSelected(range(reviewers, anchor, row.value));
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      setSelected(toggle(selected, row.value));
      setAnchor(row.value);
      return;
    }

    setSelected([row.value]);
    setAnchor(row.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;

    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      const next = nextRow(reviewers, active, key === "ArrowDown" ? 1 : -1);
      // A plain move re-anchors; a Shift move extends from the anchor.
      if (event.shiftKey && next !== null) {
        setSelected(range(reviewers, anchor, next));
      } else if (next !== null) {
        setAnchor(next);
      }
      focus(next);
      return;
    }

    if (key === " " || key === "Enter") {
      event.preventDefault();
      if (active !== null) setSelected(toggle(selected, active));
      return;
    }

    if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "a") {
      event.preventDefault();
      setSelected(selectAll(reviewers));
      setAnchor(firstRow(reviewers) ?? "");
    }
  };

  return (
    <div className="gx-demo-list gx-list-multiple">
      <div className="gx-list-card">
        <div>
          <p className="gx-list-heading">Assign reviewers</p>
          <p className="gx-list-meta">
            A click selects one; Cmd-click toggles; Shift-click takes the range.
          </p>
        </div>
        <div
          aria-label="Reviewers"
          className="gx-list"
          onKeyDown={onKeyDown}
          role="listbox"
        >
          {reviewers.map((row) => (
            <PreviewRow
              active={active === row.value}
              key={row.value}
              onFocus={() => setActive(row.value)}
              onPress={(event) => onPress(row, event)}
              register={(element) => {
                if (element === null) rows.current.delete(row.value);
                else rows.current.set(row.value, element);
              }}
              row={row}
              selected={selected.includes(row.value)}
            />
          ))}
        </div>
        <p className="gx-list-readout">
          values: <b>{selected.length === 0 ? "[]" : selected.join(", ")}</b>
        </p>
      </div>
    </div>
  );
};

export const listDemoSource = `import {
  List,
  ListItem,
  ListItemDescription,
  ListItemTitle,
} from "@gpuixui/components/list";

const files = [
  { value: "readme", title: "README.md", description: "The project's front door" },
  { value: "design", title: "Design notes", description: "docs/design-notes.md" },
  {
    value: "secrets",
    title: "secrets.env",
    description: "No access in this workspace",
    disabled: true,
  },
];

export const FileList = ({ open }: { open: (value: string) => void }) => (
  // Enter or a click selects and then activates; Space only selects.
  <List defaultValue="readme" onActivate={open} selectionMode="single">
    {files.map((file) => (
      <ListItem
        disabled={file.disabled}
        key={file.value}
        textValue={file.title}
        value={file.value}
      >
        <ListItemTitle>{file.title}</ListItemTitle>
        <ListItemDescription>{file.description}</ListItemDescription>
      </ListItem>
    ))}
  </List>
);`;

export const listMultipleSource = `import { useState } from "react";
import {
  List,
  ListItem,
  ListItemDescription,
  ListItemTitle,
} from "@gpuixui/components/list";

const reviewers = [
  { value: "ada", title: "Ada Lovelace", description: "Engineering" },
  { value: "grace", title: "Grace Hopper", description: "Platform" },
  { value: "katherine", title: "Katherine Johnson", description: "Data" },
];

export const ReviewerList = () => {
  const [assigned, setAssigned] = useState<ReadonlyArray<string>>(["grace"]);

  return (
    // The value is a list in the mode the list was given: the props are a
    // discriminated union, so a string is a type error here.
    <List onValueChange={setAssigned} selectionMode="multiple" value={assigned}>
      {reviewers.map((person) => (
        <ListItem
          key={person.value}
          textValue={person.title}
          value={person.value}
        >
          <ListItemTitle>{person.title}</ListItemTitle>
          <ListItemDescription>{person.description}</ListItemDescription>
        </ListItem>
      ))}
    </List>
  );
};`;
