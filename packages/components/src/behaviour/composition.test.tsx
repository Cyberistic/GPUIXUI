/**
 * The first Tier 2 **composite**: a settings workflow driven only through real
 * presses and keystrokes, in the real GPUix renderer.
 *
 * The bug these guard (plan 816): 0.10.0 reports `mouseDownOutside` by bounds,
 * so an enclosing overlay is told that a press on a nested surface is "outside"
 * it. Inside a dialog, a picker popup, menu panel or popover hanging below the
 * dialog's box was dismissed **on the press**, before the release that would have
 * run the row or control: the choice was lost, the action never ran, and focus
 * was left on nothing. Measured at `HEAD`:
 *
 *   dialog  { y: 366, height: 116 }   // ends at 482
 *   popup   { y: 443, height: 94 }    // ends at 537
 *   option  { y: 501, height: 28 }    // entirely below the dialog
 *   press   → onValueChange [], trigger "Select…", focus None
 *
 * Each dismiss layer now names its own surface, and a press inside it never
 * dismisses it. The last three cases below fail on that defect; the rest pin the
 * workflow and the one-layer-per-gesture rule it composes (plans 587, 669).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxOption,
} from "../combobox.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import { Field, FieldInput } from "../field.js";
import { Button } from "../internal/button.js";
import type { PartChildren } from "../internal/parts.js";
import { nodesNamed, nodesWithRole } from "../internal/a11y.js";
import {
  clickCentreOf,
  finishMotion,
  focusedTestId,
  isShown,
  nextTask,
  until,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";
import { ToastProvider, ToastViewport, useToast } from "../toast.js";

const roles: ReadonlyArray<ComboboxOption> = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

/** The workflow an app actually ships: sections, a name, a role, a save. */
const SettingsWorkflow = ({
  onSaved,
  onRole,
}: {
  readonly onSaved: () => void;
  readonly onRole: (value: string) => void;
}) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string | ReadonlyArray<string> | undefined>(
    undefined,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Button testId="open-settings" onClick={() => setOpen(true)}>
        Settings
      </Button>
      {/* Before the dialog on purpose: the stack is its own anchored layer, so
          paint order no longer follows tree order, and this binding can drop a
          viewport mounted after a dialog that closes with a picker inside
          (TODO.md "a toast mounted after a dialog can be dropped"). */}
      <ToastViewport />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent label="Settings" testId="settings">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList label="Settings sections">
              <TabsTrigger value="profile" testId="tab-profile">
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" testId="tab-notifications">
                Notifications
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile" testId="panel-profile">
              <Field label="Display name">
                <FieldInput
                  testId="name"
                  value={name}
                  onChange={(event) => setName(event.value ?? "")}
                />
              </Field>
              <Combobox
                options={roles}
                value={role}
                onValueChange={(next) => {
                  setRole(next ?? undefined);
                  if (typeof next === "string") onRole(next);
                }}
              >
                <ComboboxTrigger testId="role-trigger" label="Role" />
                <ComboboxContent>
                  <ComboboxInput label="Search roles" />
                  <ComboboxList label="Roles" />
                  <ComboboxEmpty />
                </ComboboxContent>
              </Combobox>
            </TabsContent>
            <TabsContent value="notifications" testId="panel-notifications">
              <text>Email me about changes</text>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <DialogClose testId="cancel">Cancel</DialogClose>
            <Button
              testId="save"
              disabled={role === undefined || name === ""}
              onClick={() => {
                setOpen(false);
                onSaved();
                toast.push({ title: "Settings saved", tone: "success" });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SettingsPage = ({
  onSaved,
  onRole,
}: {
  readonly onSaved: () => void;
  readonly onRole: (value: string) => void;
}) => (
  <ToastProvider>
    <SettingsWorkflow onSaved={onSaved} onRole={onRole} />
  </ToastProvider>
);

/** A short dialog: its content ends well above the surface a child opens. */
const ShortDialog = ({ children }: { readonly children: PartChildren }) => (
  <Dialog open onOpenChange={() => undefined}>
    <DialogContent label="Short" testId="short-dialog" size="sm">
      <DialogTitle>Short</DialogTitle>
      {children}
    </DialogContent>
  </Dialog>
);

const PopoverInShortDialog = ({ onRun }: { readonly onRun: () => void }) => (
  <ShortDialog>
    <Popover>
      <PopoverTrigger testId="filter-trigger">Filter</PopoverTrigger>
      <PopoverContent testId="filter-panel">
        <Button testId="filter-first">First</Button>
        <Button testId="filter-second">Second</Button>
        <Button testId="filter-third" onClick={onRun}>
          Third
        </Button>
      </PopoverContent>
    </Popover>
  </ShortDialog>
);

const MenuInShortDialog = ({
  onFirst,
  onSecond,
}: {
  readonly onFirst: () => void;
  readonly onSecond: () => void;
}) => (
  <ShortDialog>
    <DropdownMenu>
      <DropdownMenuTrigger testId="sort-trigger">Sort</DropdownMenuTrigger>
      <DropdownMenuContent testId="sort-panel">
        <DropdownMenuItem testId="sort-name" onSelect={onFirst}>
          Name
        </DropdownMenuItem>
        <DropdownMenuItem testId="sort-date" onSelect={onSecond}>
          Date
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </ShortDialog>
);

/** A dialog that raises an error toast: the shape plan 820 measured. */
const ToastOverDialog = ({ onAction }: { readonly onAction: () => void }) => {
  const toast = useToast();
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 1200,
        height: 760,
      }}
    >
      <Button testId="outside">Outside</Button>
      {/* Before the dialog on purpose: the stack is its own anchored layer, so
          paint order no longer follows tree order, and this binding can drop a
          viewport mounted after a dialog that closes with a picker inside
          (TODO.md "a toast mounted after a dialog can be dropped"). */}
      <ToastViewport />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent label="Editor" testId="editor" size="sm">
          <DialogTitle>Editor</DialogTitle>
          <Button
            testId="fail"
            onClick={() =>
              toast.push(
                {
                  title: "Could not save",
                  tone: "danger",
                  action: { label: "Retry" },
                },
                { onAction },
              )
            }
          >
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ToastOverDialogPage = ({
  onAction,
}: {
  readonly onAction: () => void;
}) => (
  <ToastProvider>
    <ToastOverDialog onAction={onAction} />
  </ToastProvider>
);

/** A dialog behind a stack that carries its own "dismiss all" control. */
const SlotOverDialog = ({
  onDismissAll,
}: {
  readonly onDismissAll: () => void;
}) => {
  const toast = useToast();
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 1200,
        height: 760,
      }}
    >
      <Button testId="outside">Outside</Button>
      <ToastViewport>
        <Button
          testId="dismiss-all"
          onClick={() => {
            onDismissAll();
            toast.dismissAll();
          }}
        >
          Dismiss all
        </Button>
      </ToastViewport>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent label="Editor" testId="slot-editor" size="sm">
          <DialogTitle>Editor</DialogTitle>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SlotOverDialogPage = ({
  onDismissAll,
}: {
  readonly onDismissAll: () => void;
}) => (
  <ToastProvider>
    <SlotOverDialog onDismissAll={onDismissAll} />
  </ToastProvider>
);

/** A menu open over a toast whose action the user presses. */
const ToastUnderMenu = ({ onAction }: { readonly onAction: () => void }) => {
  const toast = useToast();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 1200,
        height: 760,
      }}
    >
      <Button
        testId="raise"
        onClick={() =>
          toast.push(
            { title: "Saved", tone: "success", action: { label: "Undo" } },
            { onAction },
          )
        }
      >
        Raise
      </Button>
      <ToastViewport />
      <DropdownMenu>
        <DropdownMenuTrigger testId="sort-trigger">Sort</DropdownMenuTrigger>
        <DropdownMenuContent testId="sort-panel">
          <DropdownMenuItem testId="sort-name">Name</DropdownMenuItem>
          <DropdownMenuItem testId="sort-date">Date</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const ToastUnderMenuPage = ({
  onAction,
}: {
  readonly onAction: () => void;
}) => (
  <ToastProvider>
    <ToastUnderMenu onAction={onAction} />
  </ToastProvider>
);

/** The toast store updates through its runtime: let the microtasks drain. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** Type `text` into the focused field, one real keystroke each. */
const type = (
  root: ReturnType<typeof renderComponent>,
  element: string,
): void => {
  const field = root.renderer.findByTestId(element);
  if (field === undefined) throw new Error(`no field "${element}"`);
  root.renderer.focusElement(field.id);
  Arr.forEach(["A", "d", "a"], (character) =>
    root.renderer.simulateKeystrokes(character),
  );
};

describe("composition", () => {
  it("opens the settings dialog and switches sections", () => {
    const scene = renderComponent(
      <SettingsPage onSaved={() => undefined} onRole={() => undefined} />,
    );

    clickCentreOf(scene, "open-settings");
    finishMotion(scene);
    expect(isShown(scene, "settings")).toBe(true);
    expect(isShown(scene, "panel-profile")).toBe(true);
    expect(isShown(scene, "panel-notifications")).toBe(false);

    clickCentreOf(scene, "tab-notifications");
    finishMotion(scene);
    expect(isShown(scene, "panel-profile")).toBe(false);
    expect(isShown(scene, "panel-notifications")).toBe(true);

    scene.unmount();
  });

  it("picks a role inside the dialog and keeps the user's focus", () => {
    const onRole = vi.fn();
    const scene = renderComponent(
      <SettingsPage onSaved={() => undefined} onRole={onRole} />,
    );

    clickCentreOf(scene, "open-settings");
    finishMotion(scene);
    clickCentreOf(scene, "role-trigger");
    finishMotion(scene);
    expect(isShown(scene, "combobox-content")).toBe(true);

    clickCentreOf(scene, "combobox-option-viewer");
    finishMotion(scene);

    expect(onRole).toHaveBeenCalledTimes(1);
    expect(onRole).toHaveBeenCalledWith("viewer");
    expect(isShown(scene, "combobox-content")).toBe(false);
    expect(isShown(scene, "settings")).toBe(true);
    expect(Arr.join(scene.renderer.getAllText(), " ")).toContain("Viewer");
    expect(focusedTestId(scene)).toEqual(Option.some("role-trigger"));

    scene.unmount();
  });

  it("runs a popover control inside the dialog", () => {
    const onRun = vi.fn();
    const scene = renderComponent(<PopoverInShortDialog onRun={onRun} />);
    finishMotion(scene);

    clickCentreOf(scene, "filter-trigger");
    finishMotion(scene);
    expect(isShown(scene, "filter-panel")).toBe(true);

    clickCentreOf(scene, "filter-third");
    finishMotion(scene);

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(isShown(scene, "filter-panel")).toBe(true);
    expect(isShown(scene, "short-dialog")).toBe(true);

    scene.unmount();
  });

  it("runs a menu row inside the dialog", () => {
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    const scene = renderComponent(
      <MenuInShortDialog onFirst={onFirst} onSecond={onSecond} />,
    );
    finishMotion(scene);

    clickCentreOf(scene, "sort-trigger");
    finishMotion(scene);
    expect(isShown(scene, "sort-panel")).toBe(true);

    clickCentreOf(scene, "sort-date");
    finishMotion(scene);

    expect(onSecond).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    // A row is an action: it closes its own menu and leaves the dialog open.
    expect(isShown(scene, "sort-panel")).toBe(false);
    expect(isShown(scene, "short-dialog")).toBe(true);

    scene.unmount();
  });

  it("closes one layer per Escape inside the dialog", async () => {
    const scene = renderComponent(
      <SettingsPage onSaved={() => undefined} onRole={() => undefined} />,
    );

    clickCentreOf(scene, "open-settings");
    finishMotion(scene);
    clickCentreOf(scene, "role-trigger");
    finishMotion(scene);
    expect(isShown(scene, "combobox-content")).toBe(true);

    scene.renderer.simulateKeystrokes("escape");
    finishMotion(scene);
    expect(isShown(scene, "combobox-content")).toBe(false);
    expect(isShown(scene, "settings")).toBe(true);
    expect(focusedTestId(scene)).toEqual(Option.some("role-trigger"));

    // A real second Escape is a new task; the shared claim lives one task.
    await nextTask();
    scene.renderer.simulateKeystrokes("escape");
    finishMotion(scene);
    expect(isShown(scene, "settings")).toBe(false);
    expect(focusedTestId(scene)).toEqual(Option.some("open-settings"));

    scene.unmount();
  });

  it("saves the workflow and announces the result", async () => {
    const onSaved = vi.fn();
    const scene = renderComponent(
      <SettingsPage onSaved={onSaved} onRole={() => undefined} />,
    );

    clickCentreOf(scene, "open-settings");
    finishMotion(scene);
    type(scene, "name");
    clickCentreOf(scene, "role-trigger");
    finishMotion(scene);
    clickCentreOf(scene, "combobox-option-editor");
    finishMotion(scene);

    clickCentreOf(scene, "save");
    finishMotion(scene);
    await until(() => !isShown(scene, "settings"));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(isShown(scene, "settings")).toBe(false);
    expect(focusedTestId(scene)).toEqual(Option.some("open-settings"));
    // One status region, named by the message it carries (0.10.0 has no
    // live region, so a card names itself — plan 370).
    expect(
      Arr.map(nodesWithRole(scene.renderer, "status"), (node) => node.name),
    ).toEqual(["Settings saved"]);
    expect(
      Arr.length(nodesNamed(scene.renderer, "Settings saved")),
    ).toBeGreaterThanOrEqual(1);

    scene.unmount();
  });
  it("runs a toast action above an open dialog without dismissing it", async () => {
    const onAction = vi.fn();
    const scene = renderComponent(<ToastOverDialogPage onAction={onAction} />);
    finishMotion(scene);

    clickCentreOf(scene, "fail");
    await settle();
    finishMotion(scene, 500);
    expect(isShown(scene, "toast-1")).toBe(true);
    expect(isShown(scene, "editor")).toBe(true);

    clickCentreOf(scene, "toast-1-action");
    await settle();
    finishMotion(scene, 500);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(isShown(scene, "toast-1")).toBe(false);
    expect(isShown(scene, "editor")).toBe(true);

    scene.unmount();
  });

  it("still closes the dialog on a press outside with a toast up", async () => {
    const scene = renderComponent(
      <ToastOverDialogPage onAction={() => undefined} />,
    );
    finishMotion(scene);

    clickCentreOf(scene, "fail");
    await settle();
    expect(isShown(scene, "toast-1")).toBe(true);

    clickCentreOf(scene, "outside");
    finishMotion(scene, 500);

    expect(isShown(scene, "editor")).toBe(false);
    expect(isShown(scene, "toast-1")).toBe(true);

    scene.unmount();
  });

  it("runs the stack's own control without dismissing the dialog beneath", () => {
    const onDismissAll = vi.fn();
    const scene = renderComponent(
      <SlotOverDialogPage onDismissAll={onDismissAll} />,
    );
    finishMotion(scene);
    expect(isShown(scene, "slot-editor")).toBe(true);

    clickCentreOf(scene, "dismiss-all");
    finishMotion(scene, 500);

    expect(onDismissAll).toHaveBeenCalledTimes(1);
    expect(isShown(scene, "slot-editor")).toBe(true);

    scene.unmount();
  });

  it("closes a menu from a press on the toast stack, and still runs the toast's action", async () => {
    const onAction = vi.fn();
    const scene = renderComponent(<ToastUnderMenuPage onAction={onAction} />);
    clickCentreOf(scene, "raise");
    await settle();
    finishMotion(scene, 500);
    clickCentreOf(scene, "sort-trigger");
    finishMotion(scene);
    expect(isShown(scene, "sort-panel")).toBe(true);

    clickCentreOf(scene, "toast-1-action");
    await settle();
    finishMotion(scene, 500);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(isShown(scene, "sort-panel")).toBe(false);

    scene.unmount();
  });

  it("still closes the dialog on a press outside the stack with a slot control up", () => {
    const onDismissAll = vi.fn();
    const scene = renderComponent(
      <SlotOverDialogPage onDismissAll={onDismissAll} />,
    );
    finishMotion(scene);

    clickCentreOf(scene, "outside");
    finishMotion(scene, 500);

    expect(isShown(scene, "slot-editor")).toBe(false);
    expect(onDismissAll).not.toHaveBeenCalled();

    scene.unmount();
  });
});
