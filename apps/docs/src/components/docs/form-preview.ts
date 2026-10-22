/**
 * The form preview's arithmetic: the draft, the messages a failed submit turns
 * on, and the moment a submit is allowed.
 *
 * The shipped `Form` owns no values and runs no validation of its own: the
 * caller passes the draft, the schema decides, and the messages are derived from
 * the **live** draft once a submit has failed. This module states that contract
 * so the preview can be read and tested without a renderer:
 *
 * - nothing is reported before the first submit (`attempted`);
 * - a message belongs to its own field, so fixing one clears only that one;
 * - a still-bad field keeps its message without a second submit;
 * - a pending form refuses a submit, so one press is one attempt;
 * - the success line carries the decoded draft, not the one on screen.
 *
 * The docs app has no dependency on `effect` (it is a browser app), so a field's
 * verdict is an explicit two-case value rather than an absence.
 */

/** One field's verdict: accepted, or the message the schema would report. */
export type Check =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly message: string };

/** The form's draft: what the caller owns and hands to `Form`. */
export interface FormDraft {
  readonly email: string;
  readonly name: string;
}

/** What a submit accepts: the draft, already checked. */
export interface AcceptedAccount {
  readonly email: string;
  readonly name: string;
}

/** The message an annotated schema check reports for a bad address. */
export const ADDRESS_MESSAGE = "Enter an address with an @";

/** The message the preview's name check carries. */
export const NAME_MESSAGE = "Enter a name";

/** The draft the preview opens on. */
export const EMPTY_DRAFT: FormDraft = { email: "", name: "" };

const accepted: Check = { accepted: true };

/** One field's verdict: the address must contain an `@`. */
export const checkAddress = (value: string): Check =>
  value.includes("@")
    ? accepted
    : { accepted: false, message: ADDRESS_MESSAGE };

/** The same for the name: whitespace is not a name. */
export const checkName = (value: string): Check =>
  value.trim() === "" ? { accepted: false, message: NAME_MESSAGE } : accepted;

/** Every field's verdict, in the order the schema declares them. */
export const checkDraft = (draft: FormDraft): ReadonlyArray<Check> => [
  checkAddress(draft.email),
  checkName(draft.name),
];

/**
 * Every message the schema would report, in declaration order and once each —
 * the shipped `validateAll` dedupes, so two fields failing one check do not
 * print the sentence twice.
 */
export const formMessages = (draft: FormDraft): ReadonlyArray<string> => [
  ...new Set(
    checkDraft(draft).flatMap((check) =>
      check.accepted ? [] : [check.message],
    ),
  ),
];

/**
 * The messages on screen: none until a submit has failed, then the live ones.
 * An edit after a failed submit therefore clears or replaces its own message.
 */
export const visibleMessages = (
  draft: FormDraft,
  attempted: boolean,
): ReadonlyArray<string> => (attempted ? formMessages(draft) : []);

/** Whether a submit would be accepted: the draft decodes and the form is idle. */
export const canSubmit = (draft: FormDraft, pending: boolean): boolean =>
  !pending && formMessages(draft).length === 0;

/** The decoded account a successful submit reports. */
export const accept = (draft: FormDraft): AcceptedAccount => ({
  email: draft.email,
  name: draft.name.trim(),
});

/** The line the preview prints once an account exists. */
export const createdLabel = (account: AcceptedAccount): string =>
  `Created ${account.name} (${account.email})`;
