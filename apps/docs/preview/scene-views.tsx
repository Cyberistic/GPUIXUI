/** @jsxImportSource @gpuix/react */
/**
 * The live scenes, as real library components on the GPUix renderer.
 *
 * A scene is a full surface: it owns the theme it was given, names no colour
 * literal, and never reaches for a browser global. `main.tsx` supplies the
 * theme and the window size; the scene supplies the composition.
 *
 * Tier 2 components are imported by subpath on purpose: the package root also
 * re-exports Toast, whose provider builds an Effect runtime that a 20 MB browser
 * bundle has no use for (plan 456 §2). Toast itself has its own subpath and one
 * scene (plan 484); its infinite-duration push never races a dismissal.
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gpuixui/components/accordion";
import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gpuixui/components/dialog";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  type CommandAction,
} from "@gpuixui/components/command-menu";
import { ConfirmDialog } from "@gpuixui/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@gpuixui/components/drawer";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@gpuixui/components/navigation-menu";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "@gpuixui/components/mention-input";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "@gpuixui/components/preview-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gpuixui/components/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gpuixui/components/tabs";
import {
  TagInput,
  TagInputChip,
  TagInputField,
} from "@gpuixui/components/tag-input";
import {
  ToastProvider,
  ToastViewport,
  useToast,
} from "@gpuixui/components/toast";
import { Icon } from "@gpuixui/icons";
import {
  Box,
  Button,
  Checkbox,
  Input,
  labelledBy,
  NumberField,
  OTPField,
  Progress,
  RadioGroup,
  RangeSlider,
  Rating,
  ScrollArea,
  Select,
  Skeleton,
  Slider,
  Spinner,
  Stack,
  Switch,
  Text,
  TextArea,
  Toggle,
  Tooltip,
  useTheme,
} from "@gpuixui/primitives";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
} from "@gpuixui/components/combobox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@gpuixui/components/context-menu";
import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
} from "@gpuixui/components/date-picker";
import { HotkeyRecorder } from "@gpuixui/components/hotkey-recorder";
import { ColorPicker } from "@gpuixui/components/color-picker";
import { InlineEdit } from "@gpuixui/components/inline-edit";
import { SearchInput } from "@gpuixui/components/search-input";
import {
  Carousel,
  CarouselControl,
  CarouselSlide,
  CarouselTrack,
} from "@gpuixui/components/carousel";
import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "@gpuixui/components/message-scroller";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gpuixui/components/collapsible";
import { List, ListItem, ListItemTitle } from "@gpuixui/components/list";
import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@gpuixui/components/pagination";
import {
  TimePicker,
  TimePickerSegment,
  TimePickerSeparator,
} from "@gpuixui/components/time-picker";
import { Duration } from "effect";
import { useEffect, useState, type ReactElement } from "react";
import { CommandPalette } from "./patterns/command-palette";
import { ConfirmationFlow } from "./patterns/confirmation-flow";
import type { LiveScene } from "./scenes";

const ButtonScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Stack direction="column" gap="2xs">
      <Text role="h3">Buttons</Text>
      <Text role="caption" tone="muted">
        The real `@gpuixui/primitives` component on the GPUix renderer.
      </Text>
    </Stack>
    <Stack direction="row" gap="sm" wrap>
      <Button variant="primary">Save changes</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="outline">Duplicate</Button>
      <Button variant="ghost">Skip</Button>
      <Button variant="destructive">Delete</Button>
    </Stack>
    <Stack direction="row" gap="sm" wrap>
      <Button variant="primary" size="sm">
        Small
      </Button>
      <Button variant="primary" size="md">
        Medium
      </Button>
      <Button variant="primary" size="lg">
        Large
      </Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </Stack>
  </Stack>
);

const TabsScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Account settings</Text>
    <Tabs defaultValue="profile">
      <TabsList label="Account">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Text role="label">Profile</Text>
        <Text role="body" tone="muted">
          Your name and avatar appear beside every comment you write.
        </Text>
      </TabsContent>
      <TabsContent value="notifications">
        <Text role="label">Notifications</Text>
        <Text role="body" tone="muted">
          A weekly digest is sent every Monday at 08:00.
        </Text>
      </TabsContent>
      <TabsContent value="billing">
        <Text role="label">Billing</Text>
        <Text role="body" tone="muted">
          The next invoice is issued on the first of the month.
        </Text>
      </TabsContent>
    </Tabs>
  </Stack>
);

const DropdownMenuScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">File actions</Text>
    <Text role="caption" tone="muted">
      The menu opens with the scene, so the real surface is visible without a
      pointer.
    </Text>
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent label="File actions">
        <DropdownMenuLabel>This file</DropdownMenuLabel>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </Stack>
);

const DialogScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Workspace settings</Text>
    <Text role="caption" tone="muted">
      The dialog opens with the scene, so focus entry and the blocking veil are
      visible without a pointer.
    </Text>
    <Dialog defaultOpen>
      <DialogTrigger>Delete workspace</DialogTrigger>
      <DialogContent label="Delete workspace">
        <DialogHeader>
          <DialogTitle>Delete this workspace?</DialogTitle>
          <DialogDescription>
            The workspace and its 42 files are removed for everyone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button variant="destructive">Delete workspace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Stack>
);

const PopoverScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Projects</Text>
    <Text role="caption" tone="muted">
      The column chooser opens with the scene, so the real anchored surface is
      visible without a pointer.
    </Text>
    <Popover defaultOpen>
      <PopoverTrigger variant="secondary">Columns</PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Stack direction="column" gap="2xs">
          <Text role="label">Show columns</Text>
          <Button variant="primary" size="sm" aria-pressed>
            Name ✓
          </Button>
          <Button variant="primary" size="sm" aria-pressed>
            Owner ✓
          </Button>
          <Button variant="ghost" size="sm" aria-pressed={false}>
            Status ·
          </Button>
          <Button variant="ghost" size="sm" aria-pressed={false}>
            Updated ·
          </Button>
        </Stack>
      </PopoverContent>
    </Popover>
  </Stack>
);

const noop = (): void => undefined;

const commandActions: ReadonlyArray<CommandAction> = [
  {
    id: "go-components",
    label: "Go to Components",
    group: "Navigation",
    shortcut: "⌘1",
    perform: noop,
  },
  {
    id: "go-tokens",
    label: "Go to Tokens",
    group: "Navigation",
    shortcut: "⌘2",
    perform: noop,
  },
  {
    id: "new-file",
    label: "New file",
    group: "File",
    shortcut: "⌘N",
    perform: noop,
  },
  {
    id: "save",
    label: "Save",
    group: "File",
    shortcut: "⌘S",
    perform: noop,
  },
  {
    id: "reset-zoom",
    label: "Reset zoom",
    group: "View",
    disabled: true,
    perform: noop,
  },
];

const CommandMenuScene = (): ReactElement => {
  const [open, setOpen] = useState(true);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Workspace</Text>
      <Text role="caption" tone="muted">
        The palette opens with the scene, so the grouped commands and their
        shortcuts are visible without a pointer.
      </Text>
      <CommandMenu open={open} onOpenChange={setOpen} actions={commandActions}>
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty />
      </CommandMenu>
    </Stack>
  );
};

const ConfirmDialogScene = (): ReactElement => {
  const [open, setOpen] = useState(true);
  const [notify, setNotify] = useState(true);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Projects</Text>
      <Text role="caption" tone="muted">
        The confirmation opens with the scene: Cancel holds focus, the danger
        tone paints, and the body control below is the caller's own.
      </Text>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive this project?"
        description="Website redesign disappears from everyone's sidebar. Its 18 open tasks stay attached, no files are deleted, and it can be restored for 30 days."
        confirmLabel="Archive project"
        tone="danger"
        onConfirm={noop}
      >
        <Checkbox
          checked={notify}
          onChange={setNotify}
          label="Notify 4 collaborators"
        />
      </ConfirmDialog>
    </Stack>
  );
};

const ICON_STEPS = ["xs", "sm", "md", "lg", "xl"] as const;

const ICON_GALLERY = [
  { name: "search", label: "Search" },
  { name: "settings", label: "Settings" },
  { name: "folder", label: "Folder" },
  { name: "check", label: "Done" },
  { name: "warning", label: "Warning" },
  { name: "trash", label: "Delete" },
] as const;

const IconScene = (): ReactElement => {
  const theme = useTheme();
  return (
    <Stack direction="column" gap="lg">
      <Stack direction="column" gap="2xs">
        <Text role="h3">Icon set</Text>
        <Text role="caption" tone="muted">
          The real `@gpuixui/icons` SVG markup, tinted by the theme.
        </Text>
      </Stack>
      <Stack direction="row" gap="lg" align="center">
        {ICON_STEPS.map((step) => (
          <Stack key={step} direction="column" gap="2xs" align="center">
            <Icon
              name="star-filled"
              size={step}
              color={theme.colors.mutedForeground}
            />
            <Text role="caption" tone="muted">
              {step}
            </Text>
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" gap="xl" wrap>
        {ICON_GALLERY.map((icon) => (
          <Stack key={icon.name} direction="row" gap="xs" align="center">
            <Icon name={icon.name} size="md" color={theme.colors.foreground} />
            <Text role="caption">{icon.label}</Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

const LOG_ROWS = [
  "09:41  Loaded workspace",
  "09:42  Restored 3 panels",
  "09:43  Indexed 1,204 files",
  "09:44  Theme changed to dark",
  "09:45  Saved layout",
  "09:46  Opened settings",
  "09:47  Checked for updates",
  "09:48  Uploaded screenshot",
  "09:49  Signed in as cyberistic",
  "09:50  Closed 2 tabs",
] as const;

const ScrollAreaScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Stack direction="column" gap="2xs">
      <Text role="h3">Activity log</Text>
      <Text role="caption" tone="muted">
        Ten rows in a bounded container: wheel or trackpad scrolls the real
        surface.
      </Text>
    </Stack>
    <ScrollArea axis="vertical" style={{ height: 120 }}>
      <Stack direction="column" gap="2xs">
        {LOG_ROWS.map((row) => (
          <Text key={row} role="caption">
            {row}
          </Text>
        ))}
      </Stack>
    </ScrollArea>
  </Stack>
);

const SkeletonScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Loading profile</Text>
    <Stack direction="row" gap="sm" align="center">
      <Skeleton circle width={40} height={40} />
      <Stack direction="column" gap="2xs" grow>
        <Skeleton width={180} />
        <Skeleton width={120} />
      </Stack>
    </Stack>
    <Stack direction="column" gap="2xs">
      <Skeleton />
      <Skeleton />
      <Skeleton width="60%" />
    </Stack>
  </Stack>
);

const SpinnerScene = (): ReactElement => {
  const theme = useTheme();
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Saving changes</Text>
      <Stack direction="row" gap="sm" align="center">
        <Spinner size={theme.iconSize.lg} label="Saving" />
        <Text role="body" tone="muted">
          Writing 3 files…
        </Text>
      </Stack>
      <Stack direction="row" gap="sm" align="center">
        <Spinner size={theme.iconSize.md} accent="muted" label="Uploading" />
        <Text role="body" tone="muted">
          Uploading screenshot…
        </Text>
      </Stack>
    </Stack>
  );
};

/**
 * The drawer's surface exists only while open, so the scene mounts it open with
 * the public `defaultOpen` (plan 476). The veil covers the scene, which is what
 * a real drawer does; the panel's own description is the assertion.
 */
const DrawerScene = (): ReactElement => (
  <Drawer defaultOpen>
    <DrawerTrigger>Filters</DrawerTrigger>
    <DrawerContent side="right" size="md" label="Filters">
      <DrawerHeader>
        <DrawerTitle>Filters</DrawerTitle>
        <DrawerDescription>
          Narrow the result set, then apply.
        </DrawerDescription>
      </DrawerHeader>
      <DrawerFooter>
        <DrawerClose>Cancel</DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);

/**
 * One panel open at mount through the controlled `value` (plan 476), so the
 * surface proves the real anchored panel and its links, not a trigger row.
 */
const NavigationMenuScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Product navigation</Text>
    <NavigationMenu label="Product" value="platform">
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink onSelect={() => undefined}>
              Overview
            </NavigationMenuLink>
            <NavigationMenuLink onSelect={() => undefined}>
              Runtime
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="pricing">
          <NavigationMenuTrigger>Pricing</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink onSelect={() => undefined}>
              Plans
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </Stack>
);

/**
 * The suggestion list is derived from the field's text, so an initial `@token`
 * opens the real ranked list (plan 477). No prop toggles it; the text does.
 */
const MentionInputScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Comment composer</Text>
    <MentionInput label="Comment" defaultValue="@ali">
      <MentionInputList>
        <MentionInputItem value="alice" label="@alice" />
        <MentionInputItem value="alicia" />
        <MentionInputItem value="bob" />
      </MentionInputList>
    </MentionInput>
  </Stack>
);

/**
 * The card exists only while open; `defaultOpen` mounts the real anchored card
 * and its content (plan 478). The hover policy cannot be proven without a
 * pointer, so the native suite remains the interaction evidence.
 */
const PreviewCardScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">File preview</Text>
    <PreviewCard defaultOpen>
      <PreviewCardTrigger>design-system.md</PreviewCardTrigger>
      <PreviewCardContent label="design-system.md">
        <Stack direction="column" gap="sm">
          <Text role="label">Design system</Text>
          <Text role="body" tone="muted">
            Tokens, semantic roles and the theme extension mechanism.
          </Text>
        </Stack>
      </PreviewCardContent>
    </PreviewCard>
  </Stack>
);

/**
 * A toast is transient, so the scene pushes one with an infinite duration: the
 * store only schedules a timer for a positive finite duration, which removes the
 * race a default 5-second toast would have with the smoke check (plan 484). The
 * provider and viewport are the shipping components; the interaction (pause,
 * dismiss, action) stays native evidence.
 */
const ToastSurface = (): ReactElement => {
  const toast = useToast();
  useEffect(() => {
    toast.push({
      title: "Changes published",
      description: "The site rebuilds in about a minute.",
      tone: "success",
      duration: Duration.infinity,
    });
  }, [toast.push]);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Notifications</Text>
      <Text role="body" tone="muted">
        A persistent toast, so the surface never races its own dismissal.
      </Text>
      <ToastViewport />
    </Stack>
  );
};

const ToastScene = (): ReactElement => (
  <ToastProvider>
    <ToastSurface />
  </ToastProvider>
);

/**
 * The gesture scenes are the ones `SCENE_GESTURE` lists. Each one paints its
 * documented state only after a real GPUI gesture; the smoke drives it and
 * asserts the text is absent first. The trigger that `Tooltip` wraps is a
 * host `div`, not this package's `Button`, because `ButtonProps` is closed and
 * does not forward the hover/focus handlers the tooltip clones in — the
 * documented contract on the Tooltip page.
 */
const TooltipScene = (): ReactElement => {
  const theme = useTheme();
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Revenue</Text>
      <Tooltip content="Revenue, net of refunds." side="bottom">
        <div
          tabIndex={0}
          testId="scene-tooltip-trigger"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            alignSelf: "flex-start",
            paddingLeft: theme.spacing.sm,
            paddingRight: theme.spacing.sm,
            paddingTop: theme.spacing.xs,
            paddingBottom: theme.spacing.xs,
            borderRadius: theme.radius.md,
          }}
        >
          <Icon name="info" size="sm" color={theme.colors.mutedForeground} />
          <Text role="label">Net revenue</Text>
        </div>
      </Tooltip>
    </Stack>
  );
};

const ContextMenuScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Projects</Text>
    <ContextMenu>
      <ContextMenuTrigger testId="scene-context-row">
        <Text role="label">GPUIXUI</Text>
        <Text role="caption" tone="muted">
          12 components · right-click for actions
        </Text>
      </ContextMenuTrigger>
      <ContextMenuContent label="Project actions">
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Copy path</ContextMenuItem>
        <ContextMenuItem tone="destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </Stack>
);

const DatePickerScene = (): ReactElement => {
  const [due, setDue] = useState<string | null>(null);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Project settings</Text>
      <DatePicker value={due} onValueChange={setDue} today="2026-10-17">
        <DatePickerTrigger label="Due date" testId="scene-date-trigger" />
        <DatePickerContent>
          <DatePickerCalendar />
        </DatePickerContent>
      </DatePicker>
      {due === "2026-10-21" ? <Text role="body">Booked 21 October</Text> : null}
    </Stack>
  );
};

const ComboboxScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Task details</Text>
    <Combobox
      options={[
        { value: "ada", label: "Ada Lovelace", description: "Engineering" },
      ]}
    >
      <ComboboxTrigger label="Reviewer" testId="scene-combobox-trigger" />
      <ComboboxContent>
        <ComboboxInput label="Search reviewers" />
        <ComboboxList label="Reviewers" />
        <ComboboxEmpty />
      </ComboboxContent>
    </Combobox>
  </Stack>
);

const HotkeyInputScene = (): ReactElement => {
  const [hotkey, setHotkey] = useState<string | null>(null);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Shortcuts</Text>
      <HotkeyRecorder
        label="Toggle the command palette"
        value={hotkey}
        onChange={setHotkey}
        testId="scene-hotkey"
      />
      {hotkey === "p" ? <Text role="body">Recorded p</Text> : null}
    </Stack>
  );
};

const SelectScene = (): ReactElement => {
  const [region, setRegion] = useState<string | undefined>(undefined);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Region</Text>
      <Text role="caption" tone="muted">
        The real Select, closed. Open it to see the list surface, the selected
        item states and a disabled option.
      </Text>
      <Select
        label="Region"
        placeholder="Choose a region"
        value={region}
        onChange={setRegion}
        testId="scene-select"
        fullWidth
        options={[
          { value: "eu-west", label: "Europe — West" },
          { value: "us-east", label: "United States — East" },
          { value: "legacy", label: "Legacy region", disabled: true },
        ]}
      />
    </Stack>
  );
};

const CheckboxScene = (): ReactElement => {
  const [subscribed, setSubscribed] = useState(false);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Notifications</Text>
      <Text role="caption" tone="muted">
        The real Checkbox, unchecked. Click it to see the checked paint.
      </Text>
      <Checkbox
        checked={subscribed}
        onChange={setSubscribed}
        label="Email me about releases"
        testId="scene-checkbox"
      />
      {subscribed ? <Text role="body">Release notes enabled</Text> : null}
    </Stack>
  );
};

const SwitchScene = (): ReactElement => {
  const [systemTheme, setSystemTheme] = useState(false);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Appearance</Text>
      <Text role="caption" tone="muted">
        The real Switch, off. Click it to see the thumb move.
      </Text>
      <Switch
        checked={systemTheme}
        onChange={setSystemTheme}
        label="Follow the system theme"
        testId="scene-switch"
      />
      {systemTheme ? <Text role="body">System theme applied</Text> : null}
    </Stack>
  );
};

const RadioGroupScene = (): ReactElement => {
  const [plan, setPlan] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Billing plan</Text>
      <Text role="caption" tone="muted">
        The real RadioGroup, nothing selected. Pick an option to see the check
        and the caller's line.
      </Text>
      <RadioGroup
        label="Plan"
        value={plan}
        onChange={setPlan}
        testId="scene-radio"
        options={[
          { value: "free", label: "Free" },
          { value: "team", label: "Team" },
          { value: "enterprise", label: "Enterprise" },
        ]}
      />
      {plan === "team" ? <Text role="body">Team plan selected</Text> : null}
    </Stack>
  );
};

const SliderScene = (): ReactElement => {
  const [volume, setVolume] = useState(40);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Playback</Text>
      <Text role="caption" tone="muted">
        The real Slider at 40. Press End on it to reach the maximum.
      </Text>
      <Slider
        label="Volume"
        value={volume}
        onChange={setVolume}
        testId="scene-slider"
        formatValue={(value) => `${value}%`}
      />
      {volume === 100 ? <Text role="body">Volume at maximum</Text> : null}
    </Stack>
  );
};

const RangeSliderScene = (): ReactElement => {
  const [band, setBand] = useState<readonly [number, number]>([0, 100]);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Price filter</Text>
      <Text role="caption" tone="muted">
        The real RangeSlider at its full span. Click the track to move the
        nearer thumb.
      </Text>
      <RangeSlider
        label="Price"
        value={band}
        onChange={setBand}
        testId="scene-range"
      />
      {band[0] > 0 ? <Text role="body">Range narrowed</Text> : null}
    </Stack>
  );
};

const SearchInputScene = (): ReactElement => {
  const [query, setQuery] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Component search</Text>
      <Text role="caption" tone="muted">
        The real SearchInput, empty. Type into it to see the clear control and
        the caller's line.
      </Text>
      <SearchInput
        testId="scene-search"
        placeholder="Search components"
        value={query}
        onValueChange={setQuery}
      />
      {query === "grid" ? <Text role="body">Searching for grid</Text> : null}
    </Stack>
  );
};

const TextInputScene = (): ReactElement => {
  const [name, setName] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Account</Text>
      <Text role="caption" tone="muted">
        The real Input, empty. Type a name into it.
      </Text>
      <Input label="Name" testId="scene-name" value={name} onChange={setName} />
      {name === "ada" ? <Text role="body">Typed ada</Text> : null}
    </Stack>
  );
};

const TextAreaScene = (): ReactElement => {
  const [note, setNote] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Release note</Text>
      <Text role="caption" tone="muted">
        The real TextArea, empty. Type a note into it.
      </Text>
      <TextArea
        label="Note"
        testId="scene-note"
        minRows={3}
        value={note}
        onChange={setNote}
      />
      {note === "ship it" ? <Text role="body">Draft saved</Text> : null}
    </Stack>
  );
};

const ColorPickerScene = (): ReactElement => {
  const [accent, setAccent] = useState("#3b82f6");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Accent colour</Text>
      <Text role="caption" tone="muted">
        The real ColorPicker. Press the red swatch to commit it.
      </Text>
      <ColorPicker
        label="Accent colour"
        testId="scene-color"
        value={accent}
        onValueChange={setAccent}
        swatches={["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"]}
      />
      {accent === "#ef4444" ? <Text role="body">Accent set to red</Text> : null}
    </Stack>
  );
};

const InlineEditScene = (): ReactElement => {
  const [name, setName] = useState("Atlas");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Project name</Text>
      <Text role="caption" tone="muted">
        The real InlineEdit. Click the name, type a new one and press Enter.
      </Text>
      <InlineEdit
        label="Project name"
        testId="scene-inline-edit"
        value={name}
        onCommit={setName}
      />
      {name === "Atlas Prime" ? (
        <Text role="body">Renamed Atlas Prime</Text>
      ) : null}
    </Stack>
  );
};

const AccordionScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Release settings</Text>
    <Text role="caption" tone="muted">
      The real Accordion, first section open, on the GPUix renderer.
    </Text>
    <Accordion type="single" collapsible={false} defaultValue="deployments">
      <AccordionItem value="deployments">
        <AccordionTrigger>Deployments</AccordionTrigger>
        <AccordionContent>
          <Text role="body">Email me when a deployment finishes.</Text>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="billing">
        <AccordionTrigger>Billing</AccordionTrigger>
        <AccordionContent>
          <Text role="body">Invoices are sent on the first of the month.</Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Stack>
);

const NumberFieldScene = (): ReactElement => {
  const [quantity, setQuantity] = useState(12);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Order</Text>
      <Text role="caption" tone="muted">
        The real NumberField at 12. Arrows step, PageUp pages.
      </Text>
      <NumberField
        label="Quantity"
        value={quantity}
        onChange={setQuantity}
        min={1}
        max={99}
        testId="scene-number"
      />
      {quantity === 12 ? <Text role="body">Quantity is 12</Text> : null}
    </Stack>
  );
};

const OTPFieldScene = (): ReactElement => {
  const [code, setCode] = useState("482913");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Verify your email</Text>
      <Text role="caption" tone="muted">
        The real OTPField with a complete code. Type to edit a cell.
      </Text>
      <OTPField label="Verification code" value={code} onChange={setCode} />
      {code.length === 6 ? <Text role="body">Six digits entered</Text> : null}
    </Stack>
  );
};

const RatingScene = (): ReactElement => {
  const [rating, setRating] = useState(4);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Rate this release</Text>
      <Text role="caption" tone="muted">
        The real Rating at four of five. Arrows move the filled star.
      </Text>
      <Rating label="Rating" value={rating} onChange={setRating} />
      {rating === 4 ? <Text role="body">Rated 4 of 5</Text> : null}
    </Stack>
  );
};

const TagInputScene = (): ReactElement => {
  const [tags, setTags] = useState<ReadonlyArray<string>>([
    "design",
    "runtime",
  ]);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Labels</Text>
      <Text role="caption" tone="muted">
        The real TagInput with two tokens. Type and press Enter to add one.
      </Text>
      <TagInput label="Labels" value={tags} onValueChange={setTags}>
        {tags.map((tag) => (
          <TagInputChip key={tag} value={tag} />
        ))}
        <TagInputField placeholder="Add a label" />
      </TagInput>
    </Stack>
  );
};

const ToggleScene = (): ReactElement => {
  const [bold, setBold] = useState(true);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Formatting</Text>
      <Text role="caption" tone="muted">
        The real Toggle, pressed. Activate it to turn bold off.
      </Text>
      <Toggle
        label="Bold"
        pressed={bold}
        onPressedChange={setBold}
        testId="scene-toggle"
      >
        Bold
      </Toggle>
      {bold ? <Text role="body">Bold is on</Text> : null}
    </Stack>
  );
};

const ListScene = (): ReactElement => {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Saved views</Text>
      <Text role="caption" tone="muted">
        The real List, with row selection. Click a view to open it.
      </Text>
      <List
        selectionMode="single"
        aria-label="Saved views"
        testId="scene-list"
        onValueChange={setOpened}
      >
        <ListItem value="weekly" textValue="Weekly report">
          <ListItemTitle>Weekly report</ListItemTitle>
        </ListItem>
        <ListItem value="blockers" textValue="Open blockers">
          <ListItemTitle>Open blockers</ListItemTitle>
        </ListItem>
        <ListItem value="releases" textValue="Release notes">
          <ListItemTitle>Release notes</ListItemTitle>
        </ListItem>
      </List>
      {opened === "weekly" ? (
        <Text role="body">Weekly report opened</Text>
      ) : null}
    </Stack>
  );
};

const CollapsibleScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Notification rules</Text>
    <Text role="caption" tone="muted">
      The real Collapsible. Its content does not exist while closed.
    </Text>
    <Collapsible>
      <CollapsibleTrigger testId="scene-collapsible-trigger">
        Advanced settings
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Text role="body">Only failed runs are reported.</Text>
      </CollapsibleContent>
    </Collapsible>
  </Stack>
);

const PaginationScene = (): ReactElement => {
  const [page, setPage] = useState(1);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Search results</Text>
      <Text role="caption" tone="muted">
        The real Pagination. Its window is derived from the page.
      </Text>
      <Pagination
        page={page}
        pageCount={5}
        onPageChange={setPage}
        testId="scene-pagination"
      >
        <PaginationPrevious testId="scene-pagination-previous" />
        <PaginationList />
        <PaginationNext testId="scene-pagination-next" />
      </Pagination>
      {page === 4 ? <Text role="body">Showing results 31–40</Text> : null}
    </Stack>
  );
};

const TimePickerScene = (): ReactElement => {
  const [time, setTime] = useState<string | null>("09:30");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Daily reminder</Text>
      <Text role="caption" tone="muted">
        The real TimePicker. Its arrows commit a new time.
      </Text>
      <TimePicker
        label="Reminder"
        value={time}
        onValueChange={setTime}
        testId="scene-time"
      >
        <TimePickerSegment segment="hours" />
        <TimePickerSeparator />
        <TimePickerSegment segment="minutes" />
      </TimePicker>
      {time === "10:30" ? <Text role="body">Reminder at 10:30</Text> : null}
    </Stack>
  );
};

/** A transcript longer than its viewport, so a wheel has somewhere to go. */
const MESSAGE_ROWS = [
  "09:41  Build started on main",
  "09:41  Installing 412 packages",
  "09:42  Type-check passed",
  "09:42  Docs suite passed",
  "09:43  Native smoke suite passed",
  "09:43  Bundle written: 812 kB",
  "09:44  Preview build started",
  "09:44  Wasm renderer copied",
  "09:45  Preview build finished",
  "09:45  Deploy started",
  "09:46  Worker uploaded",
  "09:46  Cache purged",
  "09:47  Smoke: build crawled 90 pages",
  "09:47  Deploy finished on production",
] as const;

const MessageScrollerScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Deploy log</Text>
    <Text role="caption" tone="muted">
      The real MessageScroller. It starts at the tail; wheel up to leave it.
    </Text>
    <MessageScroller label="Deploy log">
      <MessageScrollerViewport
        testId="scene-message-viewport"
        style={{ height: 180 }}
      >
        {MESSAGE_ROWS.map((row) => (
          <MessageScrollerItem key={row}>
            <Text role="body">{row}</Text>
          </MessageScrollerItem>
        ))}
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest label="Jump to latest" />
    </MessageScroller>
  </Stack>
);

const CarouselScene = (): ReactElement => {
  const [index, setIndex] = useState(0);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">What changed</Text>
      <Text role="caption" tone="muted">
        The real Carousel. Slides stay mounted; only the active one is
        displayed.
      </Text>
      <Carousel
        label="Release notes"
        value={index}
        onValueChange={setIndex}
        testId="scene-carousel"
      >
        <CarouselTrack>
          <CarouselSlide>
            <Text role="body">A new colour picker and a stepper.</Text>
          </CarouselSlide>
          <CarouselSlide>
            <Text role="body">Keyboard shortcuts in every menu.</Text>
          </CarouselSlide>
        </CarouselTrack>
        <CarouselControl
          direction="previous"
          testId="scene-carousel-previous"
        />
        <CarouselControl direction="next" testId="scene-carousel-next" />
      </Carousel>
      {index === 1 ? <Text role="body">Release notes slide 2 of 2</Text> : null}
    </Stack>
  );
};

const PROJECT_NAME = "Project name";
const REGION_LABEL = "Region";

const REGIONS = [
  { value: "eu-west", label: "Europe — West" },
  { value: "us-east", label: "United States — East" },
] as const;

const ShowcaseScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Stack direction="row" gap="sm" style={{ alignItems: "center" }}>
      <Avatar name="Ada Lovelace" status="online" size="sm" />
      <Stack direction="column" gap="2xs" style={{ flexGrow: 1 }}>
        <Text role="label">Atlas workspace</Text>
        <Text role="caption" tone="muted">
          Team plan · 12 seats
        </Text>
      </Stack>
      <Badge variant="success">Live on GPUix</Badge>
    </Stack>
    <Stack direction="row" gap="lg" style={{ alignItems: "flex-start" }}>
      <Card variant="outline" style={{ width: 300 }}>
        <CardHeader>
          <CardTitle>Project access</CardTitle>
          <CardDescription>
            Three people can edit this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="xs">
            <Text role="body">Ada Lovelace · Owner</Text>
            <Text role="body" tone="muted">
              Grace Hopper · Editor
            </Text>
          </Stack>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline">
            Manage
          </Button>
          <Button size="sm" variant="primary">
            Invite
          </Button>
        </CardFooter>
      </Card>
      <Card variant="outline" style={{ width: 280 }}>
        <CardHeader>
          <CardTitle>Project settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="sm">
            <Text role="label">{PROJECT_NAME}</Text>
            <Input
              {...labelledBy(PROJECT_NAME)}
              defaultValue="Atlas"
              fullWidth
            />
            <Text role="label">{REGION_LABEL}</Text>
            <Select
              {...labelledBy(REGION_LABEL)}
              defaultValue="eu-west"
              options={REGIONS}
              fullWidth
            />
            <Stack direction="row" gap="sm" style={{ alignItems: "center" }}>
              <Checkbox
                defaultChecked
                label="Email me when a deploy finishes"
              />
              <Text role="body">Email me when a deploy finishes</Text>
            </Stack>
            <Text role="caption" tone="muted">
              Migration · 64%
            </Text>
            <Progress value={64} label="Migration" />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  </Stack>
);

export const LIVE_SCENE_VIEWS: Readonly<Record<LiveScene, () => ReactElement>> =
  {
    button: ButtonScene,
    tabs: TabsScene,
    "dropdown-menu": DropdownMenuScene,
    dialog: DialogScene,
    popover: PopoverScene,
    "command-menu": CommandMenuScene,
    "confirm-dialog": ConfirmDialogScene,
    icon: IconScene,
    "scroll-area": ScrollAreaScene,
    skeleton: SkeletonScene,
    spinner: SpinnerScene,
    drawer: DrawerScene,
    "navigation-menu": NavigationMenuScene,
    "mention-input": MentionInputScene,
    "preview-card": PreviewCardScene,
    toast: ToastScene,
    tooltip: TooltipScene,
    "context-menu": ContextMenuScene,
    "date-picker": DatePickerScene,
    combobox: ComboboxScene,
    "hotkey-input": HotkeyInputScene,
    select: SelectScene,
    checkbox: CheckboxScene,
    switch: SwitchScene,
    "radio-group": RadioGroupScene,
    slider: SliderScene,
    "range-slider": RangeSliderScene,
    "search-input": SearchInputScene,
    "text-input": TextInputScene,
    "text-area": TextAreaScene,
    "color-picker": ColorPickerScene,
    "inline-edit": InlineEditScene,
    accordion: AccordionScene,
    "number-field": NumberFieldScene,
    "otp-field": OTPFieldScene,
    rating: RatingScene,
    "tag-input": TagInputScene,
    toggle: ToggleScene,
    list: ListScene,
    collapsible: CollapsibleScene,
    pagination: PaginationScene,
    "time-picker": TimePickerScene,
    carousel: CarouselScene,
    "message-scroller": MessageScrollerScene,
    showcase: ShowcaseScene,
    "confirmation-flow": ConfirmationFlow,
    "command-palette": CommandPalette,
  };

/** The surface chrome every scene sits in: the theme's own background. */
export const LiveSurface = ({
  size,
  children,
}: {
  readonly size: { readonly width: number; readonly height: number };
  readonly children: ReactElement;
}): ReactElement => (
  <Box
    tone="background"
    padding="lg"
    style={{ width: size.width, height: size.height }}
  >
    {children}
  </Box>
);
