import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

/**
 * Browser previews for the docs pages.
 *
 * GPUIxUI renders through GPUix, never the DOM. A docs page therefore cannot
 * mount the shipped component; each demo below reproduces the component's
 * measured geometry, states and keyboard rules with HTML, and every page says
 * so. The Code tab always shows the real native usage.
 */

export interface Demo {
  readonly render: () => ReactNode;
  readonly source: string;
}

const ButtonRow = () => (
  <>
    <button className="gx-btn gx-btn-primary" type="button">
      Save changes
    </button>
    <button className="gx-btn gx-btn-secondary" type="button">
      Duplicate
    </button>
    <button className="gx-btn gx-btn-outline" type="button">
      Share
    </button>
    <button className="gx-btn gx-btn-ghost" type="button">
      Cancel
    </button>
    <button className="gx-btn gx-btn-destructive" type="button">
      Delete
    </button>
    <button className="gx-btn gx-btn-link" type="button">
      View log
    </button>
  </>
);

const ButtonSizes = () => (
  <div className="gx-demo-column">
    <p className="gx-demo-label">Sizes</p>
    <div className="gx-demo-row">
      <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
        Small
      </button>
      <button className="gx-btn gx-btn-primary" type="button">
        Medium
      </button>
      <button className="gx-btn gx-btn-primary gx-btn-lg" type="button">
        Large
      </button>
    </div>
  </div>
);

const ButtonStates = () => (
  <div className="gx-demo-row">
    <button className="gx-btn gx-btn-primary" type="button">
      <span aria-hidden="true" className="gx-spinner" />
      Saving…
    </button>
    <button className="gx-btn gx-btn-secondary" disabled type="button">
      Disabled
    </button>
    <button
      aria-label="Add column"
      className="gx-btn gx-btn-outline gx-btn-square"
      type="button"
    >
      +
    </button>
    <button className="gx-btn gx-btn-outline" type="button">
      <span aria-hidden="true">⌘</span>K
    </button>
  </div>
);

const DialogDemo = () => {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="gx-demo-dialog">
      <button
        className="gx-btn gx-btn-primary"
        onClick={() => setOpen(true)}
        type="button"
      >
        Rename project
      </button>
      {open ? (
        <div
          className="gx-dialog-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby="gx-dialog-demo-title"
            aria-modal="true"
            className="gx-dialog"
            onClick={(event) => event.stopPropagation()}
            ref={panel}
            role="dialog"
            tabIndex={-1}
          >
            <button
              aria-label="Close"
              className="gx-dialog-close"
              onClick={() => setOpen(false)}
              type="button"
            >
              ✕
            </button>
            <h2 className="gx-dialog-title" id="gx-dialog-demo-title">
              Rename project
            </h2>
            <p className="gx-dialog-desc">
              Used in the window title and in every path that references the
              project.
            </p>
            <label className="gx-demo-label" htmlFor="gx-dialog-demo-name">
              Project name
            </label>
            <input
              className="gx-field"
              defaultValue="Hunter License"
              id="gx-dialog-demo-name"
            />
            <div className="gx-dialog-actions">
              <button
                className="gx-btn gx-btn-ghost"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="gx-btn gx-btn-primary"
                onClick={() => setOpen(false)}
                type="button"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const PopoverDemo = () => {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPress = (event: MouseEvent) => {
      if (!anchor.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPress);
    };
  }, [open]);

  return (
    <div className="gx-demo-popover">
      <div className="gx-popover-anchor" ref={anchor}>
        <button
          aria-expanded={open}
          className="gx-btn gx-btn-secondary"
          onClick={() => setOpen(!open)}
          type="button"
        >
          Columns
        </button>
        {open ? (
          <div className="gx-popover" role="dialog">
            <p className="gx-popover-title">Visible columns</p>
            <p className="gx-popover-body">
              Choose which fields a run summary shows. The setting is per
              project.
            </p>
            <div className="gx-popover-meta">
              <span>3 of 7 shown</span>
              <b>Saved</b>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const tabRows = [
  {
    value: "profile",
    label: "Profile",
    body: (
      <>
        <b>Profile</b> — the name, avatar and timezone of the current account.
        Changes apply to every project.
      </>
    ),
  },
  {
    value: "notifications",
    label: "Notifications",
    body: (
      <>
        <b>Notifications</b> — desktop alerts for runs that finish, fail or need
        attention. Keep them short.
      </>
    ),
  },
  {
    value: "billing",
    label: "Billing",
    body: (
      <>
        <b>Billing</b> — the plan, seats and invoices for the workspace. Billing
        is per workspace, not per member.
      </>
    ),
  },
] as const;

const TabsDemo = () => {
  const [selected, setSelected] = useState("profile");
  const id = useId();
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const index = tabRows.findIndex((tab) => tab.value === selected);
    const element = triggers.current[index];
    if (element === null || element === undefined) return;
    const update = () =>
      setIndicator({ x: element.offsetLeft, w: element.offsetWidth });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selected]);

  const move = (event: ReactKeyboardEvent, index: number) => {
    const last = tabRows.length - 1;
    let target: number | undefined;
    if (event.key === "ArrowRight") target = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") target = index === 0 ? last : index - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target === undefined) return;
    const next = tabRows[target];
    if (next === undefined) return;
    event.preventDefault();
    setSelected(next.value);
    triggers.current[target]?.focus();
  };

  return (
    <div className="gx-demo-tabs">
      <div
        aria-label="Account settings"
        className="gx-tabs-list"
        role="tablist"
      >
        {indicator === null ? null : (
          <span
            aria-hidden="true"
            className="gx-tabs-indicator"
            style={{
              transform: `translateX(${indicator.x}px)`,
              width: indicator.w,
            }}
          />
        )}
        {tabRows.map((tab, index) => (
          <button
            aria-controls={`${id}-${tab.value}-panel`}
            aria-selected={selected === tab.value}
            className="gx-tab"
            id={`${id}-${tab.value}-tab`}
            key={tab.value}
            onClick={() => setSelected(tab.value)}
            onKeyDown={(event) => move(event, index)}
            ref={(element) => {
              triggers.current[index] = element;
            }}
            role="tab"
            tabIndex={selected === tab.value ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabRows.map((tab) =>
        selected === tab.value ? (
          <div
            aria-labelledby={`${id}-${tab.value}-tab`}
            className="gx-tab-panel"
            id={`${id}-${tab.value}-panel`}
            key={tab.value}
            role="tabpanel"
          >
            {tab.body}
          </div>
        ) : null,
      )}
    </div>
  );
};

const buttonSource = `import { Button } from "@gpuixui/primitives";

export function ProjectActions() {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
      <Button variant="primary" onActivate={save}>
        Save changes
      </Button>
      <Button variant="secondary">Duplicate</Button>
      <Button variant="outline">Share</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="link">View log</Button>
    </div>
  );
}`;

const sizeSource = `import { Button, Stack } from "@gpuixui/primitives";

<Stack direction="row" gap="sm">
  <Button size="sm">Small</Button>
  <Button size="md">Medium</Button>
  <Button size="lg">Large</Button>
</Stack>;`;

const stateSource = `import { Button } from "@gpuixui/primitives";

<Button variant="primary" loading={saving}>
  Saving…
</Button>

<Button variant="secondary" disabled>
  Disabled
</Button>

<Button square label="Add column">
  +
</Button>;`;

const dialogSource = `import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gpuixui/components/dialog";

export function RenameProject() {
  return (
    <Dialog>
      <DialogTrigger variant="primary">Rename project</DialogTrigger>
      <DialogContent label="Rename project">
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            Used in the window title and in every path that references the
            project.
          </DialogDescription>
        </DialogHeader>
        <input aria-label="Project name" defaultValue="Hunter License" />
        <DialogFooter>
          <DialogClose variant="ghost">Cancel</DialogClose>
          <DialogClose variant="primary">Save changes</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}`;

const popoverSource = `import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gpuixui/components/popover";

<Popover>
  <PopoverTrigger variant="secondary">Columns</PopoverTrigger>
  <PopoverContent side="bottom" align="start" sideOffset={6}>
    <text role="heading" aria-level={3}>
      Visible columns
    </text>
    <text>Choose which fields a run summary shows.</text>
  </PopoverContent>
</Popover>;`;

const tabsSource = `import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gpuixui/components/tabs";

<Tabs defaultValue="profile">
  <TabsList label="Account settings">
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
    <TabsTrigger value="billing">Billing</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">
    <text>The name, avatar and timezone of the current account.</text>
  </TabsContent>
  <TabsContent value="notifications">
    <text>Desktop alerts for runs that finish, fail or need attention.</text>
  </TabsContent>
  <TabsContent value="billing">
    <text>The plan, seats and invoices for the workspace.</text>
  </TabsContent>
</Tabs>;`;

export const demos: Readonly<Record<string, Demo>> = {
  "button-variants": { render: ButtonRow, source: buttonSource },
  "button-sizes": { render: ButtonSizes, source: sizeSource },
  "button-states": { render: ButtonStates, source: stateSource },
  "dialog-demo": { render: DialogDemo, source: dialogSource },
  "popover-demo": { render: PopoverDemo, source: popoverSource },
  "tabs-demo": { render: TabsDemo, source: tabsSource },
};
