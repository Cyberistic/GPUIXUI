import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  AvatarStates,
  AvatarWorkflow,
  avatarStatesSource,
  avatarWorkflowSource,
} from "./avatar-demo";
import {
  BadgeStates,
  BadgeWorkflow,
  badgeStatesSource,
  badgeWorkflowSource,
} from "./badge-demo";
import {
  CarouselStates,
  CarouselWorkflow,
  carouselStatesSource,
  carouselWorkflowSource,
} from "./carousel-demo";
import {
  BreadcrumbStates,
  BreadcrumbWorkflow,
  breadcrumbStatesSource,
  breadcrumbWorkflowSource,
} from "./breadcrumb-demo";
import {
  CheckboxStates,
  CheckboxWorkflow,
  checkboxStatesSource,
  checkboxWorkflowSource,
} from "./checkbox-demo";
import {
  CollapsibleStates,
  CollapsibleWorkflow,
  collapsibleStatesSource,
  collapsibleWorkflowSource,
} from "./collapsible-demo";
import { DockPreview, dockPreviewSource } from "./dock-demo";
import {
  ColorPickerStates,
  ColorPickerWorkflow,
  colorPickerStatesSource,
  colorPickerWorkflowSource,
} from "./color-picker-demo";
import {
  ComboboxDemo,
  ComboboxMultiple,
  comboboxDemoSource,
  comboboxMultipleSource,
} from "./combobox-demo";
import {
  ContextMenuStates,
  ContextMenuWorkflow,
  contextMenuStatesSource,
  contextMenuWorkflowSource,
} from "./context-menu-demo";
import {
  commandMatches,
  firstEnabled,
  nextEnabled,
  type CommandAction,
} from "./command-preview";
import {
  ListDemo,
  ListMultiple,
  listDemoSource,
  listMultipleSource,
} from "./list-demo";
import {
  DatePickerStates,
  DatePickerWorkflow,
  datePickerStatesSource,
  datePickerWorkflowSource,
} from "./date-picker-demo";
import {
  DrawerSides,
  DrawerWorkflow,
  drawerSidesSource,
  drawerWorkflowSource,
} from "./drawer-demo";
import {
  FormStates,
  FormWorkflow,
  formStatesSource,
  formWorkflowSource,
} from "./form-demo";
import {
  InlineEditStates,
  InlineEditWorkflow,
  inlineEditStatesSource,
  inlineEditWorkflowSource,
} from "./inline-edit-demo";
import {
  enabledEntries,
  highlightAfter,
  menuEntries,
  type MenuEntry,
} from "./menu-preview";
import {
  SelectDemo,
  SelectStates,
  selectDemoSource,
  selectStatesSource,
} from "./select-demo";
import {
  PaginationStates,
  PaginationWorkflow,
  paginationStatesSource,
  paginationWorkflowSource,
} from "./pagination-demo";
import {
  SearchStates,
  SearchWorkflow,
  searchStatesSource,
  searchWorkflowSource,
} from "./search-input-demo";
import {
  StepperStates,
  StepperWorkflow,
  stepperStatesSource,
  stepperWorkflowSource,
} from "./stepper-demo";
import {
  SwitchStates,
  SwitchWorkflow,
  switchStatesSource,
  switchWorkflowSource,
} from "./switch-demo";
import {
  TimelineStates,
  TimelineWorkflow,
  timelineStatesSource,
  timelineWorkflowSource,
} from "./timeline-demo";
import {
  TagInputStates,
  TagInputWorkflow,
  tagInputStatesSource,
  tagInputWorkflowSource,
} from "./tag-input-demo";
import {
  TableStates,
  TableWorkflow,
  tableStatesSource,
  tableWorkflowSource,
} from "./table-demo";
import {
  TooltipDemo,
  TooltipStates,
  tipStatesSource,
  tooltipSource,
} from "./tooltip-demo";
import {
  TimePickerStates,
  TimePickerWorkflow,
  timePickerStatesSource,
  timePickerWorkflowSource,
} from "./time-picker-demo";
import { ChatDemo, chatDemoSource } from "./chat-demo";
import { EmptyStateDemo, emptyStateDemoSource } from "./empty-state-demo";
import { FieldsetDemo, fieldsetDemoSource } from "./fieldset-demo";
import {
  HotkeyRecorderDemo,
  hotkeyRecorderDemoSource,
} from "./hotkey-recorder-demo";
import {
  KeyboardShortcutsDemo,
  keyboardShortcutsDemoSource,
} from "./keyboard-shortcuts-demo";
import { MentionInputDemo, mentionInputDemoSource } from "./mention-input-demo";
import { MessageDemo, messageDemoSource } from "./message-demo";
import {
  MessageScrollerDemo,
  messageScrollerDemoSource,
} from "./message-scroller-demo";
import {
  NavigationMenuDemo,
  navigationMenuDemoSource,
} from "./navigation-menu-demo";
import { PreviewCardDemo, previewCardDemoSource } from "./preview-card-demo";
import { BoxDemo, boxDemoSource } from "./box-demo";
import { ButtonGroupDemo, buttonGroupDemoSource } from "./button-group-demo";
import {
  CheckboxGroupDemo,
  checkboxGroupDemoSource,
} from "./checkbox-group-demo";
import { GridDemo, gridDemoSource } from "./grid-demo";
import { IconButtonDemo, iconButtonDemoSource } from "./icon-button-demo";
import { InputDemo, inputDemoSource } from "./input-demo";
import { LabelDemo, labelDemoSource } from "./label-demo";
import { MeterDemo, meterDemoSource } from "./meter-demo";
import { NumberFieldDemo, numberFieldDemoSource } from "./number-field-demo";
import { OTPFieldDemo, otpFieldDemoSource } from "./otp-field-demo";
import { ProgressDemo, progressDemoSource } from "./progress-demo";
import { RadioGroupDemo, radioGroupDemoSource } from "./radio-group-demo";
import { RangeSliderDemo, rangeSliderDemoSource } from "./range-slider-demo";
import { RatingDemo, ratingDemoSource } from "./rating-demo";
import { ScrollAreaDemo, scrollAreaDemoSource } from "./scroll-area-demo";
import { SeparatorDemo, separatorDemoSource } from "./separator-demo";
import { SkeletonDemo, skeletonDemoSource } from "./skeleton-demo";
import { SliderDemo, sliderDemoSource } from "./slider-demo";
import { SpacerDemo, spacerDemoSource } from "./spacer-demo";
import { SpinnerDemo, spinnerDemoSource } from "./spinner-demo";
import { StackDemo, stackDemoSource } from "./stack-demo";
import { TextDemo, textDemoSource } from "./text-demo";
import { TextAreaDemo, textareaDemoSource } from "./textarea-demo";
import {
  ThemeProviderDemo,
  themeProviderDemoSource,
} from "./theme-provider-demo";
import { ToggleDemo, toggleDemoSource } from "./toggle-demo";
import { ToggleGroupDemo, toggleGroupDemoSource } from "./toggle-group-demo";
import { AutoHeightDemo, autoHeightDemoSource } from "./auto-height-demo";
import { AvatarGroupDemo, avatarGroupDemoSource } from "./avatar-group-demo";
import { BubblesDemo, bubblesDemoSource } from "./bubbles-demo";
import { CodeBlockDemo, codeBlockDemoSource } from "./code-block-demo";
import { CopyButtonDemo, copyButtonDemoSource } from "./copy-button-demo";
import { CountdownDemo, countdownDemoSource } from "./countdown-demo";
import { FireworksDemo, fireworksDemoSource } from "./fireworks-demo";
import { GlyphDemo, glyphDemoSource } from "./glyph-demo";
import { GradientDemo, gradientDemoSource } from "./gradient-demo";
import { GradientTextDemo, gradientTextDemoSource } from "./gradient-text-demo";
import { GravityStarsDemo, gravityStarsDemoSource } from "./gravity-stars-demo";
import { HexagonDemo, hexagonDemoSource } from "./hexagon-demo";
import {
  HighlightTextDemo,
  highlightTextDemoSource,
} from "./highlight-text-demo";
import { ImageZoomDemo, imageZoomDemoSource } from "./image-zoom-demo";
import { LiquidButtonDemo, liquidButtonDemoSource } from "./liquid-button-demo";
import { MagneticDemo, magneticDemoSource } from "./magnetic-demo";
import { MotionGridDemo, motionGridDemoSource } from "./motion-grid-demo";
import {
  PageTransitionDemo,
  pageTransitionDemoSource,
} from "./page-transition-demo";
import { ParticlesDemo, particlesDemoSource } from "./particles-demo";
import { PinnedListDemo, pinnedListDemoSource } from "./pinned-list-demo";
import { RevealDemo, revealDemoSource } from "./reveal-demo";
import { RippleButtonDemo, rippleButtonDemoSource } from "./ripple-button-demo";
import { RollingTextDemo, rollingTextDemoSource } from "./rolling-text-demo";
import { RotatingTextDemo, rotatingTextDemoSource } from "./rotating-text-demo";
import { ScrollFadeDemo, scrollFadeDemoSource } from "./scroll-fade-demo";
import {
  ScrollProgressDemo,
  scrollProgressDemoSource,
} from "./scroll-progress-demo";
import { ShineButtonDemo, shineButtonDemoSource } from "./shine-button-demo";
import {
  SlidingNumberDemo,
  slidingNumberDemoSource,
} from "./sliding-number-demo";
import { SlidingTextDemo, slidingTextDemoSource } from "./sliding-text-demo";
import {
  SplittingTextDemo,
  splittingTextDemoSource,
} from "./splitting-text-demo";
import { StarsDemo, starsDemoSource } from "./stars-demo";
import { ThemeTogglerDemo, themeTogglerDemoSource } from "./theme-toggler-demo";
import { TopographyDemo, topographyDemoSource } from "./topography-demo";
import { TypingTextDemo, typingTextDemoSource } from "./typing-text-demo";

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
  /** A composition of parts rather than one component; the note says so. */
  readonly composition?: boolean;
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

const PLAN_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["Seats", "12 of 20"],
  ["Storage", "184 GB"],
  ["Invoices", "Enabled"],
];

/**
 * One card, drawn with the recipe's fixed metrics.
 *
 * The colours are the preview surface's roles; the geometry is the recipe's,
 * because the components compile `CARD_*` against the default registry
 * (shadcn's fixed metrics) rather than the primitives' density scale.
 */
const PlanCard = ({
  variant,
}: {
  readonly variant: "outline" | "elevated" | "plain";
}) => (
  <div className={`gx-card gx-card-${variant}`}>
    <div className="gx-card-header">
      <p className="gx-card-title">Pro plan</p>
      <p className="gx-card-desc">
        Everything in Starter, plus seats and invoicing.
      </p>
    </div>
    <div className="gx-card-content">
      {PLAN_ROWS.map(([label, value]) => (
        <div className="gx-card-row" key={label}>
          <span>{label}</span>
          <span className="gx-card-value">{value}</span>
        </div>
      ))}
    </div>
    <div className="gx-card-footer">
      <span>Manage billing</span>
      <span>Cancel plan</span>
    </div>
  </div>
);

const CardVariants = () => (
  <div className="gx-card-grid">
    {(["outline", "elevated", "plain"] as const).map((variant) => (
      <div className="gx-card-column" key={variant}>
        <p className="gx-demo-label">{variant}</p>
        <PlanCard variant={variant} />
      </div>
    ))}
  </div>
);

const CardComposition = () => (
  <div className="gx-card gx-card-outline gx-card-wide">
    <div className="gx-card-header">
      <p className="gx-card-title">Notifications</p>
      <p className="gx-card-desc">
        Choose what this workspace emails you about.
      </p>
    </div>
    <div className="gx-card-content">
      <div className="gx-card-row">
        <span>Build failures</span>
        <span className="gx-card-value">Immediately</span>
      </div>
      <div className="gx-card-row">
        <span>Weekly digest</span>
        <span className="gx-card-value">Mondays</span>
      </div>
    </div>
    <div className="gx-card-footer gx-card-footer-padded">
      <button className="gx-btn gx-btn-secondary" type="button">
        Cancel
      </button>
      <button className="gx-btn gx-btn-primary" type="button">
        Save changes
      </button>
    </div>
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

/**
 * The layout lane's frame: a fixed sidebar, a header row, and a scrolling body
 * that takes the remaining height. It is a composition of `Box`, `Stack` and
 * `ScrollArea`, so the preview says so rather than presenting it as a component.
 */
const LayoutShell = () => (
  <div className="gx-shell">
    <div className="gx-shell-sidebar">
      <span className="gx-shell-brand">
        <span aria-hidden="true" className="gx-shell-mark" />
        Atlas
      </span>
      {["Overview", "Runs", "Datasets", "Settings"].map((item) => (
        <span
          aria-current={item === "Overview" ? "page" : undefined}
          className="gx-shell-nav"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
    <div className="gx-shell-main">
      <div className="gx-shell-header">
        <span>Overview</span>
        <span className="gx-shell-meta">3 open runs</span>
      </div>
      <div className="gx-shell-body">
        <div className="gx-shell-cards">
          <div className="gx-shell-card">
            <p className="gx-shell-card-title">Build #481</p>
            <p className="gx-shell-card-desc">Passed in 2m 14s</p>
          </div>
          <div className="gx-shell-card">
            <p className="gx-shell-card-title">Nightly export</p>
            <p className="gx-shell-card-desc">62% of 4.2 GB</p>
          </div>
        </div>
        <div className="gx-shell-card">
          <p className="gx-shell-card-title">Ingest queue</p>
          <p className="gx-shell-card-desc">
            The body scrolls; the header stays.
          </p>
          <div className="gx-shell-bar">
            <div className="gx-shell-fill" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

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

const DropdownMenuDemo = () => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<MenuEntry["id"] | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [lastAction, setLastAction] = useState("nothing yet");
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<MenuEntry["id"], HTMLButtonElement>());
  /** What to focus once the open render commits: a row, or the surface. */
  const initialFocus = useRef<MenuEntry["id"] | "surface" | null>(null);

  /** Opening by pointer leaves the surface focused with no row highlighted,
   * which is the desktop convention the native component follows. Opening by
   * keyboard lands on a row, so the next Enter runs it. */
  const openWith = (target: MenuEntry["id"] | "surface") => {
    initialFocus.current = target;
    setOpen(true);
  };

  const focusRow = (id: MenuEntry["id"]) => {
    rows.current.get(id)?.focus();
  };

  const activate = (entry: MenuEntry) => {
    if (entry.id === "hidden") {
      setShowHidden(!showHidden);
      return; // a checkbox row does not close the menu
    }
    setLastAction(entry.label);
    setOpen(false);
    setHighlight(null);
    trigger.current?.focus();
  };

  const move = (delta: 1 | -1) => {
    const next = highlightAfter(highlight, delta);
    if (next !== null) focusRow(next);
  };

  const dismiss = () => {
    setOpen(false);
    setHighlight(null);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const target = initialFocus.current;
    initialFocus.current = null;
    if (target === "surface") surface.current?.focus();
    else if (target !== null) focusRow(target);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      setHighlight(null);
      trigger.current?.focus();
    };
    const onPress = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchor.current?.contains(target) === true) return;
      setOpen(false);
      setHighlight(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPress);
    };
  }, [open]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      move(key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      const target = key === "Home" ? enabledEntries[0] : enabledEntries.at(-1);
      if (target !== undefined) focusRow(target.id);
      return;
    }
    if (key === "Enter" || key === " ") {
      const entry = menuEntries.find((candidate) => candidate.id === highlight);
      if (entry === undefined) return;
      event.preventDefault();
      activate(entry);
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }
    if (key === "Tab") {
      // A menu is not modal: Tab closes it and lets the focus move on.
      setOpen(false);
      setHighlight(null);
    }
  };

  const row = (entry: MenuEntry) => (
    <button
      aria-selected={entry.id === "hidden" ? showHidden : undefined}
      className="gx-menu-row"
      data-highlighted={highlight === entry.id}
      data-tone={entry.tone}
      disabled={entry.disabled}
      key={entry.id}
      onClick={() => activate(entry)}
      onFocus={() => setHighlight(entry.id)}
      ref={(element) => {
        if (element === null) rows.current.delete(entry.id);
        else rows.current.set(entry.id, element);
      }}
      role={entry.id === "hidden" ? "menuitemcheckbox" : "menuitem"}
      tabIndex={-1}
      type="button"
    >
      <span>{entry.label}</span>
      {entry.id === "hidden" ? (
        <span aria-hidden="true" className="gx-menu-check">
          {showHidden ? "✓" : ""}
        </span>
      ) : null}
    </button>
  );

  const destructive = menuEntries.find((entry) => entry.tone === "destructive");

  return (
    <div className="gx-demo-menu">
      <div className="gx-menu-file">
        <div>
          <p className="gx-menu-file-title">ata-schema.json</p>
          <p className="gx-menu-file-meta">Edited 2 min ago</p>
        </div>
        <div className="gx-menu-anchor" ref={anchor}>
          <button
            aria-expanded={open}
            className="gx-btn gx-btn-secondary gx-btn-sm"
            onClick={() => {
              if (open) {
                setOpen(false);
                setHighlight(null);
                return;
              }
              openWith("surface");
            }}
            onKeyDown={(event) => {
              if (
                event.key === "ArrowDown" ||
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                if (open) dismiss();
                else openWith(enabledEntries[0]?.id ?? "surface");
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                openWith(enabledEntries.at(-1)?.id ?? "surface");
                return;
              }
              if (event.key === "Escape" && open) {
                event.preventDefault();
                dismiss();
              }
            }}
            ref={trigger}
            type="button"
          >
            Actions
          </button>
          {open ? (
            <div
              aria-label="File actions"
              className="gx-menu"
              onKeyDown={onMenuKeyDown}
              ref={surface}
              role="menu"
              tabIndex={-1}
            >
              <p aria-hidden="true" className="gx-menu-label">
                File actions
              </p>
              {menuEntries.filter((entry) => entry !== destructive).map(row)}
              <div className="gx-menu-separator" role="separator" />
              {destructive === undefined ? null : row(destructive)}
            </div>
          ) : null}
        </div>
      </div>
      <p className="gx-menu-readout">
        Last action: <b>{lastAction}</b> · Hidden files:{" "}
        <b>{showHidden ? "shown" : "hidden"}</b>
      </p>
    </div>
  );
};

const CommandMenuDemo = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const rows = commandMatches(query);

  const close = () => {
    setOpen(false);
    setHighlight(null);
    trigger.current?.focus();
  };

  const openPalette = () => {
    setQuery("");
    setHighlight(firstEnabled(commandMatches("")) ?? null);
    setOpen(true);
  };

  const run = (action: CommandAction) => {
    if (action.disabled === true) return;
    setLastAction(action.label);
    close();
  };

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onInput = (value: string) => {
    setQuery(value);
    // Typing resets the highlight to the first runnable match, as the
    // component does — the query changes which row Enter would run.
    setHighlight(firstEnabled(commandMatches(value)) ?? null);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = nextEnabled(
        rows,
        highlight,
        event.key === "ArrowDown" ? 1 : -1,
      );
      if (next !== undefined) setHighlight(next);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const ordered = event.key === "Home" ? rows : [...rows].reverse();
      const next = firstEnabled(ordered);
      if (next !== undefined) setHighlight(next);
      return;
    }
    if (event.key !== "Enter") return;
    const action = rows.find((row) => row.id === highlight);
    if (action === undefined) return;
    event.preventDefault();
    run(action);
  };

  return (
    <div className="gx-demo-command">
      <div className="gx-command-file">
        <div>
          <p className="gx-menu-file-title">workspace.ts</p>
          <p className="gx-menu-file-meta">2 unsaved changes</p>
        </div>
        <button
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={openPalette}
          ref={trigger}
          type="button"
        >
          Commands <kbd className="gx-command-key">⌘K</kbd>
        </button>
      </div>
      <p className="gx-menu-readout">
        Last action: <b>{lastAction ?? "none yet"}</b>
      </p>
      {open ? (
        <div className="gx-dialog-backdrop" role="presentation">
          <div
            aria-label="Command menu"
            aria-modal="true"
            className="gx-palette"
            role="dialog"
          >
            <input
              aria-label="Search commands"
              className="gx-palette-input"
              onChange={(event) => onInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Type a command…"
              ref={input}
              value={query}
            />
            <div className="gx-palette-list" role="listbox">
              {rows.length === 0 ? (
                <p className="gx-palette-empty">No matching commands</p>
              ) : null}
              {rows.map((action, index) => (
                <Fragment key={action.id}>
                  {index === 0 || rows[index - 1]?.group !== action.group ? (
                    <p aria-hidden="true" className="gx-menu-label">
                      {action.group}
                    </p>
                  ) : null}
                  <button
                    aria-selected={highlight === action.id}
                    className="gx-menu-row"
                    data-highlighted={highlight === action.id}
                    disabled={action.disabled}
                    onClick={() => run(action)}
                    role="option"
                    type="button"
                  >
                    <span>{action.label}</span>
                    {action.shortcut === undefined ? null : (
                      <kbd className="gx-command-key">{action.shortcut}</kbd>
                    )}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : null}
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

const cardVariantsSource = `import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";

const rows = [
  ["Seats", "12 of 20"],
  ["Storage", "184 GB"],
  ["Invoices", "Enabled"],
];

export const PlanCards = () => (
  <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
    {(["outline", "elevated", "plain"] as const).map((variant) => (
      <Card key={variant} variant={variant} style={{ width: 260 }}>
        <CardHeader>
          <CardTitle>Pro plan</CardTitle>
          <CardDescription>
            Everything in Starter, plus seats and invoicing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}
            >
              <text>{label}</text>
              <text>{value}</text>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <text>Manage billing</text>
          <text>Cancel plan</text>
        </CardFooter>
      </Card>
    ))}
  </div>
);`;

const cardCompositionSource = `import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";
import { Button } from "@gpuixui/primitives";

export const NotificationCard = ({ save }: { save: () => void }) => (
  <Card style={{ maxWidth: 420 }}>
    <CardHeader>
      <CardTitle>Notifications</CardTitle>
      <CardDescription>
        Choose what this workspace emails you about.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <text>Build failures — immediately</text>
      <text>Weekly digest — Mondays</text>
    </CardContent>
    <CardFooter style={{ paddingBottom: 12 }}>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary" onActivate={save}>
        Save changes
      </Button>
    </CardFooter>
  </Card>
);`;

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

const shellSource = `import { Box, ScrollArea, Separator, Stack, Text, useTheme } from "@gpuixui/primitives";

export function AppFrame() {
  const theme = useTheme();
  return (
    <Box tone="background" style={{ display: "flex", height: 460, overflow: "hidden" }}>
      <Box tone="card" style={{ width: 168, flexShrink: 0 }}>
        <Stack direction="column" gap="2xs" style={{ padding: theme.spacing.sm }}>
          <Text role="label">Atlas</Text>
          <Text role="body" tone="primary">Overview</Text>
          <Text role="body" tone="muted">Runs</Text>
          <Text role="body" tone="muted">Datasets</Text>
          <Text role="body" tone="muted">Settings</Text>
        </Stack>
      </Box>

      <Stack direction="column" grow style={{ minWidth: 0 }}>
        <Stack
          direction="row"
          align="center"
          justify="between"
          style={{ height: 36, paddingLeft: theme.spacing.md, paddingRight: theme.spacing.md }}
        >
          <Text role="h3">Overview</Text>
          <Text role="caption" tone="muted">3 open runs</Text>
        </Stack>
        <Separator orientation="horizontal" />
        <ScrollArea axis="vertical" style={{ flex: 1 }}>
          <Stack direction="column" gap="sm" style={{ padding: theme.spacing.md }}>
            <Box tone="card" border radius="md" padding="sm">
              <Text role="body">Build #481 — passed in 2m 14s</Text>
            </Box>
            <Box tone="card" border radius="md" padding="sm">
              <Text role="body">Nightly export — 62% of 4.2 GB</Text>
            </Box>
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );
}`;

const dropdownMenuSource = `import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import { useState } from "react";

export function FileActions({ name }: { name: string }) {
  const [showHidden, setShowHidden] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger variant="secondary" size="sm">
        Actions
      </DropdownMenuTrigger>
      <DropdownMenuContent label="File actions" align="end">
        <DropdownMenuItem onSelect={() => rename(name)}>Rename</DropdownMenuItem>
        <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
        <DropdownMenuCheckboxItem
          checked={showHidden}
          onCheckedChange={setShowHidden}
        >
          Show hidden files
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive" onSelect={() => remove(name)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}`;

const commandMenuSource = `import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
} from "@gpuixui/components/command-menu";
import { useState } from "react";

const actions = [
  { id: "new-file", label: "New file", group: "File", shortcut: "⌘N", perform: newFile },
  { id: "open-file", label: "Open file", group: "File", shortcut: "⌘O", perform: openFile },
  { id: "save", label: "Save", group: "File", shortcut: "⌘S", perform: save },
  { id: "sidebar", label: "Toggle sidebar", group: "View", shortcut: "⌘B", perform: toggleSidebar },
];

export function Palette() {
  const [open, setOpen] = useState(false);

  return (
    <CommandMenu open={open} onOpenChange={setOpen} actions={actions}>
      <CommandMenuInput placeholder="Type a command…" />
      <CommandMenuList />
      <CommandMenuEmpty>No matching commands</CommandMenuEmpty>
    </CommandMenu>
  );
}`;

/** One browser rendering of an alert, mirroring `ALERT_*`'s parts. */
const PreviewAlert = ({
  tone,
  title,
  description,
  icon,
  action,
  onDismiss,
}: {
  readonly tone: "info" | "success" | "warning" | "danger";
  readonly title: string;
  readonly description: string;
  readonly icon?: string;
  readonly action?: ReactNode;
  readonly onDismiss?: () => void;
}) => (
  <div className={`gx-alert gx-alert-${tone}`} role="alert">
    {icon === undefined ? null : (
      <div aria-hidden="true" className="gx-alert-icon">
        {icon}
      </div>
    )}
    <div className="gx-alert-content">
      <p className="gx-alert-title">{title}</p>
      <p className="gx-alert-desc">
        {description}
        {action}
      </p>
    </div>
    {onDismiss === undefined ? null : (
      <button
        aria-label="Dismiss"
        className="gx-btn gx-btn-ghost gx-alert-dismiss"
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
    )}
  </div>
);

const alertTones: ReadonlyArray<{
  readonly tone: "info" | "success" | "warning" | "danger";
  readonly title: string;
  readonly description: string;
}> = [
  {
    tone: "info",
    title: "Update available",
    description: "0.11.0 is ready. Installing restarts the app.",
  },
  {
    tone: "success",
    title: "Theme saved",
    description: "The workspace uses the new palette.",
  },
  {
    tone: "warning",
    title: "3 tokens are missing",
    description: "The platform themes fall back to the default palette.",
  },
  {
    tone: "danger",
    title: "Upload failed",
    description: "The connection closed before the file arrived.",
  },
];

const AlertTones = () => (
  <div className="gx-alert-stack">
    {alertTones.map((alert) => (
      <PreviewAlert key={alert.tone} {...alert} />
    ))}
  </div>
);

const AlertComposition = () => {
  const [shown, setShown] = useState(true);
  return (
    <div className="gx-alert-stack">
      {shown ? (
        <PreviewAlert
          tone="warning"
          icon="!"
          title="3 tokens are missing"
          description="The platform themes fall back to the default palette."
          onDismiss={() => setShown(false)}
        />
      ) : (
        <div className="gx-alert-actions">
          <button
            className="gx-btn gx-btn-ghost"
            onClick={() => setShown(true)}
            type="button"
          >
            Show the alert again
          </button>
        </div>
      )}
      <PreviewAlert
        tone="danger"
        title="Upload failed"
        description="Nothing left the machine."
        action={
          <button
            className="gx-btn gx-btn-secondary gx-btn-sm gx-alert-action"
            type="button"
          >
            Try again
          </button>
        }
      />
    </div>
  );
};

/**
 * The busy mark the confirm action paints while `loading`.
 *
 * The shipped mark is `@gpuixui/icons`' `loader` at `size="sm"`, in the action's
 * own label role and named "In progress". The preview draws the same spokes and
 * freezes them, because the runtime has no transform — a rotating mark would be
 * a behaviour the library cannot ship.
 */
const ConfirmBusyMark = () => (
  <svg
    aria-label="In progress"
    className="gx-confirm-busy"
    role="img"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

/** `ConfirmDialog`'s surface: the dialog's `sm`, without a close control. */
const PreviewConfirm = ({
  title,
  description,
  confirmLabel,
  tone,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly tone: "default" | "danger";
  readonly loading: boolean;
  readonly error?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) => {
  const cancel = useRef<HTMLButtonElement>(null);
  // The contract the component exists for: focus lands on Cancel, so Enter on an
  // untouched dialog cancels instead of destroying something.
  useEffect(() => {
    if (!loading) cancel.current?.focus();
  }, [loading]);

  return (
    <div
      className="gx-dialog-backdrop"
      onClick={loading ? undefined : onCancel}
      role="presentation"
    >
      <div
        aria-label={title}
        aria-modal="true"
        className="gx-dialog gx-confirm"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="gx-dialog-title">{title}</h2>
        <p className="gx-dialog-desc">{description}</p>
        {error === undefined ? null : (
          <div className="gx-confirm-error">
            <PreviewAlert
              description={error}
              title="Archive failed"
              tone="danger"
            />
          </div>
        )}
        <div className="gx-dialog-actions">
          <button
            className="gx-btn gx-btn-secondary"
            disabled={loading}
            onClick={onCancel}
            ref={cancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`gx-btn ${tone === "danger" ? "gx-btn-destructive" : "gx-btn-primary"}`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? <ConfirmBusyMark /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * The workflow the component encodes: Cancel first, a confirm that reports
 * instead of closing, and a failure the reader can see and retry.
 *
 * The first attempt always fails, so the preview shows the reason `onConfirm`
 * does not close the dialog: the error stays in the body until the caller
 * decides what happens next.
 */
const ConfirmDialogDemo = () => {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "failed" | "archived">(
    "idle",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (phase !== "saving") return;
    const timer = setTimeout(() => {
      if (attempt === 0) {
        setAttempt(1);
        setPhase("failed");
        return;
      }
      setPhase("archived");
      setOpen(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [phase, attempt]);

  useEffect(() => {
    if (!open || phase === "saving") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase]);

  return (
    <div className="gx-confirm-demo">
      <div className="gx-demo-row">
        <button
          className="gx-btn gx-btn-destructive"
          onClick={() => {
            setAttempt(0);
            setPhase("idle");
            setOpen(true);
          }}
          type="button"
        >
          Archive project
        </button>
        {phase === "archived" ? (
          <span className="gx-confirm-status">
            Archived — restore it from the archive within 30 days.
          </span>
        ) : null}
      </div>
      {open ? (
        <PreviewConfirm
          confirmLabel={phase === "failed" ? "Try again" : "Archive project"}
          description="The project leaves everyone's sidebar. Its 18 open tasks stay attached and no files are deleted."
          error={
            phase === "failed"
              ? "The workspace service timed out. Nothing was archived, so the project is still here."
              : undefined
          }
          loading={phase === "saving"}
          onCancel={() => {
            setOpen(false);
            setPhase("idle");
          }}
          onConfirm={() => setPhase("saving")}
          title="Archive this project?"
          tone="danger"
        />
      ) : null}
    </div>
  );
};

/** The two tones and the loading state, on one surface. */
const ConfirmDialogStates = () => {
  const [state, setState] = useState<"default" | "danger" | "loading">(
    "danger",
  );
  const [shown, setShown] = useState(true);
  const states = [
    { key: "default", label: "Default tone" },
    { key: "danger", label: "Danger tone" },
    { key: "loading", label: "Loading" },
  ] as const;

  return (
    <div className="gx-confirm-states">
      <div className="gx-confirm-stage">
        {shown ? (
          <PreviewConfirm
            confirmLabel="Archive project"
            description="The project leaves everyone's sidebar. Its 18 open tasks stay attached and no files are deleted."
            loading={state === "loading"}
            onCancel={() => setShown(false)}
            onConfirm={() => setState("loading")}
            title="Archive this project?"
            tone={state === "default" ? "default" : "danger"}
          />
        ) : (
          <button
            className="gx-btn gx-btn-secondary"
            onClick={() => {
              setState("danger");
              setShown(true);
            }}
            type="button"
          >
            Show the dialog again
          </button>
        )}
      </div>
      <div className="gx-demo-column">
        <p className="gx-demo-label">State</p>
        <div className="gx-demo-row">
          {states.map((state_) => (
            <button
              className={`gx-btn gx-btn-sm ${state === state_.key ? "gx-btn-secondary" : "gx-btn-outline"}`}
              key={state_.key}
              onClick={() => {
                setState(state_.key);
                setShown(true);
              }}
              type="button"
            >
              {state_.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const alertTonesSource = `import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@gpuixui/components/alert";

const messages = [
  { tone: "info", title: "Update available", body: "0.11.0 is ready. Installing restarts the app." },
  { tone: "success", title: "Theme saved", body: "The workspace uses the new palette." },
  { tone: "warning", title: "3 tokens are missing", body: "The platform themes fall back to the default palette." },
  { tone: "danger", title: "Upload failed", body: "The connection closed before the file arrived." },
] as const;

export const Alerts = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {messages.map((message) => (
      <Alert key={message.tone} tone={message.tone}>
        <AlertContent>
          <AlertTitle>{message.title}</AlertTitle>
          <AlertDescription>{message.body}</AlertDescription>
        </AlertContent>
      </Alert>
    ))}
  </div>
);`;

const alertCompositionSource = `import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertDismiss,
  AlertIcon,
  AlertTitle,
} from "@gpuixui/components/alert";
import { Button } from "@gpuixui/primitives";
import { useState } from "react";

export const UploadAlerts = () => {
  const [shown, setShown] = useState(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {shown ? (
        <Alert tone="warning">
          <AlertIcon>!</AlertIcon>
          <AlertContent>
            <AlertTitle>3 tokens are missing</AlertTitle>
            <AlertDescription>
              The platform themes fall back to the default palette.
            </AlertDescription>
          </AlertContent>
          <AlertDismiss onDismiss={() => setShown(false)} />
        </Alert>
      ) : null}
      <Alert tone="danger">
        <AlertContent>
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>
            <Button onClick={retry} size="sm" variant="secondary">
              Try again
            </Button>
          </AlertDescription>
        </AlertContent>
      </Alert>
    </div>
  );
};`;

const confirmDialogSource = `import { useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@gpuixui/components/alert";
import { ConfirmDialog } from "@gpuixui/components/confirm-dialog";
import { Button } from "@gpuixui/primitives";

export const ArchiveProject = () => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);

  const archive = async () => {
    setSaving(true);
    setError(null);
    try {
      await archiveProject();
      setOpen(false);
      setArchived(true);
    } catch {
      // The dialog stays open: the caller owns the close, so a failed save is
      // never hidden by a surface that vanished mid-flight.
      setError("The workspace service timed out. Nothing was archived.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Archive project
      </Button>
      {archived ? (
        <Alert tone="info">
          <AlertContent>
            <AlertTitle>Project archived</AlertTitle>
            <AlertDescription>
              Restore it from the archive within 30 days.
            </AlertDescription>
          </AlertContent>
        </Alert>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive this project?"
        description="The project leaves everyone's sidebar. Its 18 open tasks stay attached and no files are deleted."
        confirmLabel={error === null ? "Archive project" : "Try again"}
        tone="danger"
        loading={saving}
        onConfirm={() => void archive()}
      >
        {error === null ? null : (
          <Alert tone="danger">
            <AlertContent>
              <AlertTitle>Archive failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </AlertContent>
          </Alert>
        )}
      </ConfirmDialog>
    </>
  );
};`;

const confirmStatesSource = `import { useState } from "react";
import { ConfirmDialog } from "@gpuixui/components/confirm-dialog";

export const ConfirmStates = () => {
  const [state, setState] = useState<"default" | "danger" | "loading">(
    "default",
  );

  return (
    <ConfirmDialog
      open
      onOpenChange={() => setState("default")}
      title="Archive this project?"
      description="The project leaves everyone's sidebar. Its 18 open tasks stay attached and no files are deleted."
      confirmLabel="Archive project"
      tone={state === "default" ? "default" : "danger"}
      loading={state === "loading"}
      onConfirm={() => setState("loading")}
    />
  );
};`;

const accordionSections = [
  {
    value: "surface",
    label: "What is a GPUix surface?",
    body: "A GPUix component is not a DOM node with a stylesheet: it is a tree of hosted elements the renderer lays out and paints, and the style is data the app computes.",
  },
  {
    value: "keys",
    label: "Does Tab reach every section?",
    body: "Only the header rows are tab stops. Tab reaches the open section's content through its own controls, and a closed section's body is not mounted at all.",
  },
  {
    value: "motion",
    label: "Why does the panel animate its height?",
    body: "The body reports its painted height through onLayout, so the collapse is a real measurement rather than a guessed maximum. The runtime has no transform, so the box resizes instead of scaling.",
  },
] as const;

/** The native keyboard contract, reproduced so the preview is explorable. */
const AccordionDemo = () => {
  const [open, setOpen] = useState<string | null>("surface");
  const rows = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();

  const focusRow = (index: number) => {
    const wrapped =
      (index + accordionSections.length) % accordionSections.length;
    rows.current[wrapped]?.focus();
  };

  const move = (event: ReactKeyboardEvent, index: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(index + 1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRow(index - 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusRow(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      focusRow(accordionSections.length - 1);
    }
  };

  return (
    <div className="gx-acc">
      {accordionSections.map((section, index) => {
        const expanded = open === section.value;
        return (
          <div className="gx-acc-item" key={section.value}>
            <button
              aria-expanded={expanded}
              className="gx-acc-trigger"
              onClick={() => setOpen(expanded ? null : section.value)}
              onKeyDown={(event) => move(event, index)}
              ref={(element) => {
                rows.current[index] = element;
              }}
              type="button"
            >
              <span>{section.label}</span>
              <svg
                aria-hidden="true"
                className="gx-acc-icon"
                viewBox="0 0 24 24"
              >
                <path d={expanded ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
              </svg>
            </button>
            {expanded ? (
              <p className="gx-acc-body" id={`${id}-${section.value}`}>
                {section.body}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const accordionSettings = [
  {
    value: "appearance",
    label: "Appearance",
    rows: [
      ["Theme", "Follow the platform"],
      ["Density", "Comfortable"],
      ["Accent", "Iris"],
    ],
  },
  {
    value: "notifications",
    label: "Notifications",
    rows: [
      ["Build failures", "Immediately"],
      ["Weekly digest", "Mondays"],
    ],
  },
] as const;

/** A settings panel: one section open, a disabled one below it. */
const AccordionComposition = () => {
  const [open, setOpen] = useState<string | null>("appearance");
  const id = useId();

  return (
    <div className="gx-acc gx-acc-panel">
      {accordionSettings.map((section) => {
        const expanded = open === section.value;
        return (
          <div className="gx-acc-item" key={section.value}>
            <button
              aria-expanded={expanded}
              className="gx-acc-trigger"
              onClick={() => setOpen(expanded ? null : section.value)}
              type="button"
            >
              <span>{section.label}</span>
              <svg
                aria-hidden="true"
                className="gx-acc-icon"
                viewBox="0 0 24 24"
              >
                <path d={expanded ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
              </svg>
            </button>
            {expanded ? (
              <div className="gx-acc-body" id={`${id}-${section.value}`}>
                {section.rows.map(([label, value]) => (
                  <div className="gx-acc-row" key={label}>
                    <span>{label}</span>
                    <span className="gx-acc-value">{value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="gx-acc-item">
        <button
          aria-disabled="true"
          className="gx-acc-trigger gx-acc-disabled"
          disabled
          type="button"
        >
          <span>Advanced (managed by your administrator)</span>
          <svg aria-hidden="true" className="gx-acc-icon" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const accordionDemoSource = `import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gpuixui/components/accordion";

const sections = [
  ["surface", "What is a GPUix surface?", "A GPUix component is not a DOM node…"],
  ["keys", "Does Tab reach every section?", "Only the header rows are tab stops…"],
  ["motion", "Why does the panel animate its height?", "The body reports its painted height…"],
] as const;

export const Questions = () => {
  const [open, setOpen] = useState<string | null>("surface");

  return (
    <Accordion
      type="single"
      collapsible
      value={open}
      onValueChange={setOpen}
    >
      {sections.map(([value, title, body]) => (
        <AccordionItem key={value} value={value}>
          <AccordionTrigger>{title}</AccordionTrigger>
          <AccordionContent>{body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};`;

const accordionCompositionSource = `import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gpuixui/components/accordion";

export const SettingsSections = () => {
  const [open, setOpen] = useState<string | null>("appearance");

  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
      <AccordionItem value="appearance">
        <AccordionTrigger>Appearance</AccordionTrigger>
        <AccordionContent>{appearanceRows}</AccordionContent>
      </AccordionItem>
      <AccordionItem value="notifications">
        <AccordionTrigger>Notifications</AccordionTrigger>
        <AccordionContent>{notificationRows}</AccordionContent>
      </AccordionItem>
      <AccordionItem disabled value="advanced">
        <AccordionTrigger>Advanced (managed by your administrator)</AccordionTrigger>
      </AccordionItem>
    </Accordion>
  );
};`;

const workspaceSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The caller owns the value and the moment validation runs, so this preview
 * keeps the message until the next submit: typing does not clear it.
 */
const FieldValidation = () => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [created, setCreated] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    if (value.trim() === "") {
      setError("A workspace URL is required");
      setCreated(false);
      input.current?.focus();
      return;
    }
    if (!workspaceSlugPattern.test(value)) {
      setError("Use lowercase letters, numbers and single hyphens");
      setCreated(false);
      input.current?.focus();
      return;
    }
    setError(undefined);
    setCreated(true);
  };

  return (
    <form
      className="gx-field-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div
        className={
          error === undefined
            ? "gx-field-block"
            : "gx-field-block gx-field-block-invalid"
        }
      >
        <label className="gx-field-label" htmlFor="gx-field-demo-slug">
          Workspace URL <span className="gx-field-required">*</span>
        </label>
        <input
          className="gx-field"
          id="gx-field-demo-slug"
          onChange={(event) => {
            setValue(event.target.value);
            setCreated(false);
          }}
          ref={input}
          value={value}
        />
        {error === undefined ? (
          <p className="gx-field-desc">
            {created
              ? "Available — this URL is free."
              : "Lowercase words joined by hyphens. Try hunter-license."}
          </p>
        ) : (
          <p className="gx-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button className="gx-btn gx-btn-primary" type="submit">
        Create workspace
      </button>
      <p className="gx-field-note">
        Enter submits too: the form owns the submit, the field only paints.
      </p>
    </form>
  );
};

/** The four resting states of a field, including a disabled group. */
const FieldStates = () => (
  <div className="gx-field-states">
    <div className="gx-field-block">
      <label className="gx-field-label" htmlFor="gx-field-demo-email">
        Email
      </label>
      <input
        className="gx-field"
        defaultValue="hunter@example.com"
        id="gx-field-demo-email"
      />
      <p className="gx-field-desc">We never share it.</p>
    </div>
    <div className="gx-field-block">
      <label className="gx-field-label" htmlFor="gx-field-demo-required">
        Workspace URL <span className="gx-field-required">*</span>
      </label>
      <input
        className="gx-field"
        id="gx-field-demo-required"
        placeholder="hunter-license"
      />
      <p className="gx-field-desc">Lowercase words joined by hyphens.</p>
    </div>
    <div className="gx-field-block gx-field-block-invalid">
      <label className="gx-field-label" htmlFor="gx-field-demo-invalid">
        Workspace URL
      </label>
      <input
        className="gx-field"
        defaultValue="Hunter License"
        id="gx-field-demo-invalid"
      />
      <p className="gx-field-error" role="alert">
        Use lowercase letters, numbers and single hyphens
      </p>
    </div>
    <fieldset className="gx-field-set" disabled>
      <legend className="gx-field-legend">Team plan</legend>
      <div className="gx-field-block">
        <label className="gx-field-label" htmlFor="gx-field-demo-seats">
          Seats
        </label>
        <input
          className="gx-field"
          defaultValue="12"
          id="gx-field-demo-seats"
        />
        <p className="gx-field-desc">Managed by your administrator.</p>
      </div>
    </fieldset>
  </div>
);

const fieldValidationSource = `import { Effect, Option, Schema } from "effect";
import { useState } from "react";
import { Field, FieldInput } from "@gpuixui/components/field";
import { validate } from "@gpuixui/components/validation/logic";

const WorkspaceSlug = Schema.NonEmptyString.check(
  Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    identifier: "WorkspaceSlugPattern",
    title: "Workspace URL",
    message: "Use lowercase letters, numbers and single hyphens",
  }),
);

export const WorkspaceForm = () => {
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string>();

  const submit = () => {
    // The caller decides when: this runs on submit, never on a keystroke.
    const message = Effect.runSync(validate(WorkspaceSlug)(slug));
    setError(Option.getOrUndefined(message));
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <Field
        label="Workspace URL"
        description="Lowercase words joined by hyphens."
        error={error}
        required
      >
        <FieldInput
          value={slug}
          onChange={(event) => setSlug(event.value ?? "")}
        />
      </Field>
      <Button type="submit">Create workspace</Button>
    </form>
  );
};`;

const fieldStatesSource = `import { Field, FieldInput } from "@gpuixui/components/field";
import { Fieldset } from "@gpuixui/components/fieldset";

export const AccountFields = () => (
  <>
    <Field label="Email" description="We never share it">
      <FieldInput />
    </Field>

    <Field
      label="Workspace URL"
      description="Lowercase words joined by hyphens."
      required
    >
      <FieldInput />
    </Field>

    <Field
      label="Workspace URL"
      error="Use lowercase letters, numbers and single hyphens"
    >
      <FieldInput defaultValue="Hunter License" />
    </Field>

    <Fieldset legend="Team plan" disabled>
      <Field label="Seats" description="Managed by your administrator">
        <FieldInput defaultValue="12" />
      </Field>
    </Fieldset>
  </>
);`;

interface PreviewToast {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly tone: "info" | "success" | "warning" | "danger";
  readonly actionLabel?: string;
  /** Milliseconds until it dismisses itself; zero keeps it. */
  readonly duration?: number;
}

const toastGlyph = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  danger: "✕",
} as const;

/** One card, with the preview's own auto-dismiss clock. */
const ToastCardPreview = ({
  toast,
  onDismiss,
  onAction,
}: {
  readonly toast: PreviewToast;
  readonly onDismiss: () => void;
  readonly onAction?: () => void;
}) => {
  const dismiss = useRef(onDismiss);

  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (toast.duration === 0) return undefined;
    const handle = setTimeout(() => dismiss.current(), toast.duration ?? 5_000);
    return () => clearTimeout(handle);
  }, [toast.duration, toast.id]);

  return (
    <div className={`gx-toast-card gx-toast-${toast.tone}`}>
      <span aria-hidden="true" className="gx-toast-bar" />
      <div className="gx-toast-body">
        <span aria-hidden="true" className="gx-toast-glyph">
          {toastGlyph[toast.tone]}
        </span>
        <div className="gx-toast-copy">
          <p className="gx-toast-title">{toast.title}</p>
          {toast.description === undefined ? null : (
            <p className="gx-toast-desc">{toast.description}</p>
          )}
        </div>
        {toast.actionLabel === undefined ? null : (
          <button className="gx-toast-action" onClick={onAction} type="button">
            {toast.actionLabel}
          </button>
        )}
        <button
          aria-label="Dismiss"
          className="gx-toast-dismiss"
          onClick={onDismiss}
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/** A publish/undo workflow, capped at three cards like the store. */
const ToastWorkflow = () => {
  const [toasts, setToasts] = useState<ReadonlyArray<PreviewToast>>([]);
  const nextId = useRef(0);

  const push = (draft: Omit<PreviewToast, "id">) => {
    nextId.current += 1;
    const toast = { ...draft, id: String(nextId.current) };
    setToasts((current) => [...current, toast].slice(-3));
  };

  const dismiss = (id: string) =>
    setToasts((current) => current.filter((toast) => toast.id !== id));

  return (
    <div className="gx-toast-demo">
      <div className="gx-toast-stage">
        <p className="gx-demo-label">Workspace</p>
        <p className="gx-toast-lede">
          Publish the page, then undo it from the toast.
        </p>
        <div className="gx-toast-actions">
          <button
            className="gx-btn gx-btn-primary"
            onClick={() =>
              push({
                title: "Changes published",
                description: "The site rebuilds in about a minute.",
                tone: "success",
                actionLabel: "Undo",
                duration: 8_000,
              })
            }
            type="button"
          >
            Publish changes
          </button>
          <button
            className="gx-btn gx-btn-secondary"
            onClick={() =>
              push({
                title: "Disk almost full",
                description: "1.2 GB left on this volume.",
                tone: "warning",
              })
            }
            type="button"
          >
            Fill the disk
          </button>
        </div>
        <p className="gx-toast-hint">
          A fourth toast drops the oldest. An action runs once and dismisses.
        </p>
      </div>
      <div
        aria-label="Notifications"
        className="gx-toast-viewport"
        role="status"
      >
        {toasts.map((toast) => (
          <ToastCardPreview
            key={toast.id}
            onAction={
              toast.actionLabel === undefined
                ? undefined
                : () => {
                    dismiss(toast.id);
                    push({
                      title: "Changes restored",
                      description: "The previous version is live again.",
                      tone: "info",
                    });
                  }
            }
            onDismiss={() => dismiss(toast.id)}
            toast={toast}
          />
        ))}
      </div>
    </div>
  );
};

const toastToneSamples: ReadonlyArray<PreviewToast> = [
  {
    id: "info",
    title: "Update available",
    description: "Version 2.4 is ready to install.",
    tone: "info",
    duration: 0,
  },
  {
    id: "success",
    title: "Changes published",
    description: "The site rebuilds in about a minute.",
    tone: "success",
    actionLabel: "Undo",
    duration: 0,
  },
  {
    id: "warning",
    title: "Disk almost full",
    description: "1.2 GB left on this volume.",
    tone: "warning",
    duration: 0,
  },
  {
    id: "danger",
    title: "Upload failed",
    description: "The connection closed before the file finished.",
    tone: "danger",
    duration: 0,
  },
];

/** The four tones, held open so their colour and glyph can be compared. */
const ToastTones = () => {
  const [dismissed, setDismissed] = useState<ReadonlyArray<string>>([]);
  const dismiss = (id: string) => setDismissed((current) => [...current, id]);

  return (
    <div className="gx-toast-demo gx-toast-tones">
      <div
        aria-label="Notifications"
        className="gx-toast-viewport"
        role="status"
      >
        {toastToneSamples
          .filter((toast) => !dismissed.includes(toast.id))
          .map((toast) => (
            <ToastCardPreview
              key={toast.id}
              onAction={
                toast.actionLabel === undefined
                  ? undefined
                  : () => dismiss(toast.id)
              }
              onDismiss={() => dismiss(toast.id)}
              toast={toast}
            />
          ))}
      </div>
    </div>
  );
};

const toastWorkflowSource = `import { Duration } from "effect";
import { Button } from "@gpuixui/primitives";
import {
  ToastProvider,
  ToastViewport,
  useToast,
} from "@gpuixui/components/toast";

const PublishBar = () => {
  const toast = useToast();

  const restore = () => {
    // Undo is the app's work; the toast only reports the press.
  };

  return (
    <Button
      onActivate={() =>
        toast.push(
          {
            title: "Changes published",
            description: "The site rebuilds in about a minute.",
            tone: "success",
            action: { label: "Undo" },
            duration: Duration.seconds(8),
          },
          { onAction: restore },
        )
      }
    >
      Publish changes
    </Button>
  );
};

export const App = () => (
  <ToastProvider>
    <PublishBar />
    {/* The viewport is last: the runtime paints in order. */}
    <ToastViewport />
  </ToastProvider>
);`;

const toastTonesSource = `import { Duration } from "effect";
import { Button } from "@gpuixui/primitives";
import {
  ToastProvider,
  ToastViewport,
  useToast,
  type ToastApi,
} from "@gpuixui/components/toast";

const notify = (toast: ToastApi) => {
  // duration: 0 keeps a card that the reader must dismiss.
  toast.push({ title: "Update available", tone: "info", duration: 0 });
  toast.push({ title: "Saved", tone: "success", duration: 0 });
  toast.push({
    title: "Disk almost full",
    description: "1.2 GB left on this volume.",
    tone: "warning",
    duration: 0,
  });
  toast.push({
    title: "Upload failed",
    description: "The connection closed before the file finished.",
    tone: "danger",
    duration: Duration.seconds(0),
  });
};

const ToneSamples = () => {
  const toast = useToast();
  return <Button onActivate={() => notify(toast)}>Show the four tones</Button>;
};

export const App = () => (
  <ToastProvider>
    <ToneSamples />
    <ToastViewport />
  </ToastProvider>
);`;

export const demos: Readonly<Record<string, Demo>> = {
  "accordion-demo": { render: AccordionDemo, source: accordionDemoSource },
  "accordion-composition": {
    render: AccordionComposition,
    source: accordionCompositionSource,
    composition: true,
  },

  "alert-tones": { render: AlertTones, source: alertTonesSource },
  "alert-composition": {
    render: AlertComposition,
    source: alertCompositionSource,
    composition: true,
  },
  "avatar-states": { render: AvatarStates, source: avatarStatesSource },
  "avatar-workflow": {
    render: AvatarWorkflow,
    source: avatarWorkflowSource,
  },
  "badge-states": { render: BadgeStates, source: badgeStatesSource },
  "badge-workflow": { render: BadgeWorkflow, source: badgeWorkflowSource },
  "breadcrumb-states": {
    render: BreadcrumbStates,
    source: breadcrumbStatesSource,
  },
  "breadcrumb-workflow": {
    render: BreadcrumbWorkflow,
    source: breadcrumbWorkflowSource,
  },
  "button-variants": { render: ButtonRow, source: buttonSource },
  "button-sizes": { render: ButtonSizes, source: sizeSource },
  "button-states": { render: ButtonStates, source: stateSource },
  "card-variants": { render: CardVariants, source: cardVariantsSource },
  "checkbox-states": { render: CheckboxStates, source: checkboxStatesSource },
  "checkbox-workflow": {
    render: CheckboxWorkflow,
    source: checkboxWorkflowSource,
  },
  "collapsible-states": {
    render: CollapsibleStates,
    source: collapsibleStatesSource,
  },
  "collapsible-workflow": {
    render: CollapsibleWorkflow,
    source: collapsibleWorkflowSource,
  },
  "color-picker-states": {
    render: ColorPickerStates,
    source: colorPickerStatesSource,
  },
  "color-picker-workflow": {
    render: ColorPickerWorkflow,
    source: colorPickerWorkflowSource,
  },
  "stepper-states": { render: StepperStates, source: stepperStatesSource },
  "stepper-workflow": {
    render: StepperWorkflow,
    source: stepperWorkflowSource,
  },
  "switch-states": { render: SwitchStates, source: switchStatesSource },
  "switch-workflow": {
    render: SwitchWorkflow,
    source: switchWorkflowSource,
  },
  "table-states": { render: TableStates, source: tableStatesSource },
  "table-workflow": { render: TableWorkflow, source: tableWorkflowSource },
  "timeline-states": { render: TimelineStates, source: timelineStatesSource },
  "timeline-workflow": {
    render: TimelineWorkflow,
    source: timelineWorkflowSource,
  },
  "tag-input-states": {
    render: TagInputStates,
    source: tagInputStatesSource,
  },
  "tag-input-workflow": {
    render: TagInputWorkflow,
    source: tagInputWorkflowSource,
  },
  "card-composition": {
    render: CardComposition,
    source: cardCompositionSource,
    composition: true,
  },
  "carousel-states": {
    render: CarouselStates,
    source: carouselStatesSource,
  },
  "carousel-workflow": {
    render: CarouselWorkflow,
    source: carouselWorkflowSource,
  },
  "command-menu-demo": {
    render: CommandMenuDemo,
    source: commandMenuSource,
  },
  "combobox-multiple": {
    render: ComboboxMultiple,
    source: comboboxMultipleSource,
  },
  "combobox-workflow": {
    render: ComboboxDemo,
    source: comboboxDemoSource,
  },
  "confirm-dialog-demo": {
    render: ConfirmDialogDemo,
    source: confirmDialogSource,
  },
  "confirm-dialog-states": {
    render: ConfirmDialogStates,
    source: confirmStatesSource,
  },
  "context-menu-states": {
    render: ContextMenuStates,
    source: contextMenuStatesSource,
  },
  "context-menu-workflow": {
    render: ContextMenuWorkflow,
    source: contextMenuWorkflowSource,
  },
  "dialog-demo": { render: DialogDemo, source: dialogSource },
  "date-picker-workflow": {
    render: DatePickerWorkflow,
    source: datePickerWorkflowSource,
  },
  "date-picker-states": {
    render: DatePickerStates,
    source: datePickerStatesSource,
  },
  "drawer-sides": { render: DrawerSides, source: drawerSidesSource },
  "drawer-workflow": { render: DrawerWorkflow, source: drawerWorkflowSource },
  "dropdown-menu-demo": {
    render: DropdownMenuDemo,
    source: dropdownMenuSource,
  },
  "field-validation": {
    render: FieldValidation,
    source: fieldValidationSource,
  },
  "form-states": { render: FormStates, source: formStatesSource },
  "form-workflow": { render: FormWorkflow, source: formWorkflowSource },
  "inline-edit-states": {
    render: InlineEditStates,
    source: inlineEditStatesSource,
  },
  "inline-edit-workflow": {
    render: InlineEditWorkflow,
    source: inlineEditWorkflowSource,
  },
  "field-states": { render: FieldStates, source: fieldStatesSource },
  "layout-shell": {
    render: LayoutShell,
    source: shellSource,
    composition: true,
  },
  "panel-preview": {
    render: DockPreview,
    source: dockPreviewSource,
    composition: true,
  },
  "list-demo": { render: ListDemo, source: listDemoSource },
  "list-multiple": { render: ListMultiple, source: listMultipleSource },
  "pagination-states": {
    render: PaginationStates,
    source: paginationStatesSource,
  },
  "pagination-workflow": {
    render: PaginationWorkflow,
    source: paginationWorkflowSource,
  },
  "popover-demo": { render: PopoverDemo, source: popoverSource },
  "select-states": { render: SelectStates, source: selectStatesSource },
  "select-workflow": { render: SelectDemo, source: selectDemoSource },
  "search-input-states": {
    render: SearchStates,
    source: searchStatesSource,
  },
  "search-input-workflow": {
    render: SearchWorkflow,
    source: searchWorkflowSource,
  },
  "tabs-demo": { render: TabsDemo, source: tabsSource },
  "toast-tones": { render: ToastTones, source: toastTonesSource },
  "toast-workflow": { render: ToastWorkflow, source: toastWorkflowSource },
  "tooltip-demo": { render: TooltipDemo, source: tooltipSource },
  "tooltip-states": { render: TooltipStates, source: tipStatesSource },
  "time-picker-states": {
    render: TimePickerStates,
    source: timePickerStatesSource,
  },
  "time-picker-workflow": {
    render: TimePickerWorkflow,
    source: timePickerWorkflowSource,
  },
  "chat-demo": { render: ChatDemo, source: chatDemoSource },
  "empty-state-demo": { render: EmptyStateDemo, source: emptyStateDemoSource },
  "fieldset-demo": { render: FieldsetDemo, source: fieldsetDemoSource },
  "hotkey-recorder-demo": {
    render: HotkeyRecorderDemo,
    source: hotkeyRecorderDemoSource,
  },
  "keyboard-shortcuts-demo": {
    render: KeyboardShortcutsDemo,
    source: keyboardShortcutsDemoSource,
  },
  "mention-input-demo": {
    render: MentionInputDemo,
    source: mentionInputDemoSource,
  },
  "message-demo": { render: MessageDemo, source: messageDemoSource },
  "message-scroller-demo": {
    render: MessageScrollerDemo,
    source: messageScrollerDemoSource,
  },
  "navigation-menu-demo": {
    render: NavigationMenuDemo,
    source: navigationMenuDemoSource,
  },
  "preview-card-demo": {
    render: PreviewCardDemo,
    source: previewCardDemoSource,
  },
  "box-demo": { render: BoxDemo, source: boxDemoSource },
  "button-group-demo": {
    render: ButtonGroupDemo,
    source: buttonGroupDemoSource,
  },
  "checkbox-group-demo": {
    render: CheckboxGroupDemo,
    source: checkboxGroupDemoSource,
  },
  "grid-demo": { render: GridDemo, source: gridDemoSource },
  "icon-button-demo": {
    render: IconButtonDemo,
    source: iconButtonDemoSource,
  },
  "input-demo": { render: InputDemo, source: inputDemoSource },
  "label-demo": { render: LabelDemo, source: labelDemoSource },
  "meter-demo": { render: MeterDemo, source: meterDemoSource },
  "number-field-demo": {
    render: NumberFieldDemo,
    source: numberFieldDemoSource,
  },
  "otp-field-demo": { render: OTPFieldDemo, source: otpFieldDemoSource },
  "progress-demo": { render: ProgressDemo, source: progressDemoSource },
  "radio-group-demo": {
    render: RadioGroupDemo,
    source: radioGroupDemoSource,
  },
  "range-slider-demo": {
    render: RangeSliderDemo,
    source: rangeSliderDemoSource,
  },
  "rating-demo": { render: RatingDemo, source: ratingDemoSource },
  "scroll-area-demo": {
    render: ScrollAreaDemo,
    source: scrollAreaDemoSource,
  },
  "separator-demo": { render: SeparatorDemo, source: separatorDemoSource },
  "skeleton-demo": { render: SkeletonDemo, source: skeletonDemoSource },
  "slider-demo": { render: SliderDemo, source: sliderDemoSource },
  "spacer-demo": { render: SpacerDemo, source: spacerDemoSource },
  "spinner-demo": { render: SpinnerDemo, source: spinnerDemoSource },
  "stack-demo": { render: StackDemo, source: stackDemoSource },
  "text-demo": { render: TextDemo, source: textDemoSource },
  "textarea-demo": { render: TextAreaDemo, source: textareaDemoSource },
  "theme-provider-demo": {
    render: ThemeProviderDemo,
    source: themeProviderDemoSource,
  },
  "toggle-demo": { render: ToggleDemo, source: toggleDemoSource },
  "toggle-group-demo": {
    render: ToggleGroupDemo,
    source: toggleGroupDemoSource,
  },
  "auto-height-demo": {
    render: AutoHeightDemo,
    source: autoHeightDemoSource,
  },
  "avatar-group-demo": {
    render: AvatarGroupDemo,
    source: avatarGroupDemoSource,
  },
  "bubbles-demo": { render: BubblesDemo, source: bubblesDemoSource },
  "code-block-demo": { render: CodeBlockDemo, source: codeBlockDemoSource },
  "copy-button-demo": {
    render: CopyButtonDemo,
    source: copyButtonDemoSource,
  },
  "countdown-demo": { render: CountdownDemo, source: countdownDemoSource },
  "fireworks-demo": { render: FireworksDemo, source: fireworksDemoSource },
  "glyph-demo": { render: GlyphDemo, source: glyphDemoSource },
  "gradient-demo": { render: GradientDemo, source: gradientDemoSource },
  "gradient-text-demo": {
    render: GradientTextDemo,
    source: gradientTextDemoSource,
  },
  "gravity-stars-demo": {
    render: GravityStarsDemo,
    source: gravityStarsDemoSource,
  },
  "hexagon-demo": { render: HexagonDemo, source: hexagonDemoSource },
  "highlight-text-demo": {
    render: HighlightTextDemo,
    source: highlightTextDemoSource,
  },
  "image-zoom-demo": { render: ImageZoomDemo, source: imageZoomDemoSource },
  "liquid-button-demo": {
    render: LiquidButtonDemo,
    source: liquidButtonDemoSource,
  },
  "magnetic-demo": { render: MagneticDemo, source: magneticDemoSource },
  "motion-grid-demo": {
    render: MotionGridDemo,
    source: motionGridDemoSource,
  },
  "page-transition-demo": {
    render: PageTransitionDemo,
    source: pageTransitionDemoSource,
  },
  "particles-demo": { render: ParticlesDemo, source: particlesDemoSource },
  "pinned-list-demo": {
    render: PinnedListDemo,
    source: pinnedListDemoSource,
  },
  "reveal-demo": { render: RevealDemo, source: revealDemoSource },
  "ripple-button-demo": {
    render: RippleButtonDemo,
    source: rippleButtonDemoSource,
  },
  "rolling-text-demo": {
    render: RollingTextDemo,
    source: rollingTextDemoSource,
  },
  "rotating-text-demo": {
    render: RotatingTextDemo,
    source: rotatingTextDemoSource,
  },
  "scroll-fade-demo": {
    render: ScrollFadeDemo,
    source: scrollFadeDemoSource,
  },
  "scroll-progress-demo": {
    render: ScrollProgressDemo,
    source: scrollProgressDemoSource,
  },
  "shine-button-demo": {
    render: ShineButtonDemo,
    source: shineButtonDemoSource,
  },
  "sliding-number-demo": {
    render: SlidingNumberDemo,
    source: slidingNumberDemoSource,
  },
  "sliding-text-demo": {
    render: SlidingTextDemo,
    source: slidingTextDemoSource,
  },
  "splitting-text-demo": {
    render: SplittingTextDemo,
    source: splittingTextDemoSource,
  },
  "stars-demo": { render: StarsDemo, source: starsDemoSource },
  "theme-toggler-demo": {
    render: ThemeTogglerDemo,
    source: themeTogglerDemoSource,
  },
  "topography-demo": { render: TopographyDemo, source: topographyDemoSource },
  "typing-text-demo": { render: TypingTextDemo, source: typingTextDemoSource },
};
