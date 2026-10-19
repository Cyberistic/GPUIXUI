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
 */
export const componentAliases: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ["text-input", ["textbox", "text box", "text field"]],
  ["checkbox", ["check box", "tick box"]],
  ["radio-group", ["radio button", "radio buttons"]],
  ["combobox", ["combo box"]],
  [
    "otp-field",
    [
      "one time password",
      "one-time password",
      "one time code",
      "one-time code",
    ],
  ],
  ["dialog", ["modal", "modal window"]],
  ["navigation-menu", ["navbar", "nav bar"]],
  ["search-input", ["searchbox", "search box", "search bar", "search field"]],
  ["number-field", ["number input", "numeric input"]],
  ["tag-input", ["chips", "chips input", "tags input"]],
  ["hotkey-input", ["shortcut recorder"]],
  ["drawer", ["side sheet"]],
  ["fieldset", ["field group"]],
  ["toast", ["snackbar"]],
  ["keycap", ["kbd"]],
  ["color-picker", ["colour picker", "colourpicker"]],
]);

/** The aliases for a record, or an empty list when it has none. */
export const aliasesFor = (slug: string): readonly string[] =>
  componentAliases.get(slug) ?? [];
