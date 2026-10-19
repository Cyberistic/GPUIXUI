/**
 * The words readers use for a component when its record cannot match them
 * (plan 566). `Text inputs` is never spelled `textbox`, and `OTP Field` does
 * not contain "one time password", so the registry document built from the
 * title, summary, parts and props types returned nothing for both.
 *
 * This is editorial search vocabulary, not a component fact: it stays out of
 * the record schema and is read by the registry index, the ranker and the
 * component index's filter. `component-aliases.test.ts` proves every key is a
 * record, no term is shared, and no term shadows another record's title or
 * exported symbol — an alias that names a different component misroutes the
 * query instead of answering it.
 *
 * Plan 579 measured the next set (`typeahead`, `passcode`, `wizard`,
 * `segmented control`, `hover card`, …): a term is added only when the record's
 * own fields cannot match it and a whole-query match is unambiguous. Plan 583
 * adds the third measured set (`cmdk`, `autosuggest`, `gauge`, `pill`,
 * `callout`, `busy`, `sheet`) under the same rule.
 */
export const componentAliases: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ["text-input", ["textbox", "text box", "text field"]],
  ["checkbox", ["check box", "tick box"]],
  ["radio-group", ["radio button", "radio buttons"]],
  [
    "combobox",
    [
      "combo box",
      "typeahead",
      "autocomplete",
      "auto complete",
      "auto-complete",
      "autosuggest",
      "auto suggest",
      "suggestions",
    ],
  ],
  [
    "otp-field",
    [
      "one time password",
      "one-time password",
      "one time code",
      "one-time code",
      "pin code",
      "passcode",
      "verification code",
    ],
  ],
  ["dialog", ["modal", "modal window"]],
  ["confirm-dialog", ["alert dialog", "alertdialog"]],
  ["command-menu", ["cmdk"]],
  [
    "navigation-menu",
    ["navbar", "nav bar", "menubar", "menu bar", "hamburger", "hamburger menu"],
  ],
  ["search-input", ["searchbox", "search box", "search bar", "search field"]],
  ["number-field", ["number input", "numeric input"]],
  ["meter", ["gauge", "gauges"]],
  ["tag-input", ["chips", "chips input", "tags input"]],
  ["hotkey-input", ["shortcut recorder"]],
  ["drawer", ["side sheet", "side panel", "sidepanel", "sheet"]],
  ["fieldset", ["field group"]],
  ["toast", ["snackbar"]],
  ["spinner", ["busy"]],
  [
    "keycap",
    ["kbd", "keybinding", "keybindings", "key binding", "key bindings"],
  ],
  ["color-picker", ["colour picker", "colourpicker", "swatch", "swatches"]],
  ["icon", ["svg", "glyph", "glyphs"]],
  ["preview-card", ["hover card", "hovercard"]],
  ["collapsible", ["collapse", "collapsed section"]],
  [
    "stack",
    [
      "vstack",
      "hstack",
      "v stack",
      "h stack",
      "vertical stack",
      "horizontal stack",
      "flex",
      "flexbox",
    ],
  ],
  [
    "button",
    ["icon button", "icon-only button", "fab", "floating action button"],
  ],
  [
    "button-group",
    ["segmented control", "segmented", "toggle group", "toggle-group"],
  ],
  ["stepper", ["wizard", "multi step", "multi-step", "multi step form"]],
  ["badge", ["pill"]],
  ["alert", ["banner", "callout", "callouts"]],
  [
    "scroll-area",
    [
      "scrollview",
      "scroll view",
      "scroll pane",
      "scrollbar",
      "scrollbars",
      "overflow",
    ],
  ],
  ["popover", ["popup"]],
  ["select", ["select box", "dropdown list", "multi select", "multi-select"]],
  ["inline-validation", ["helper text", "error message"]],
  ["time-picker", ["time"]],
]);

/** The aliases for a record, or an empty list when it has none. */
export const aliasesFor = (slug: string): readonly string[] =>
  componentAliases.get(slug) ?? [];
