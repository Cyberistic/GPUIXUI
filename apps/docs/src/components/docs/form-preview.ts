export type Check =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly message: string };

export interface FormDraft {
  readonly email: string;
  readonly name: string;
}

export interface AcceptedAccount {
  readonly email: string;
  readonly name: string;
}

export const ADDRESS_MESSAGE = "Enter an address with an @";

export const NAME_MESSAGE = "Enter a name";

export const EMPTY_DRAFT: FormDraft = { email: "", name: "" };

const accepted: Check = { accepted: true };

export const checkAddress = (value: string): Check =>
  value.includes("@")
    ? accepted
    : { accepted: false, message: ADDRESS_MESSAGE };

export const checkName = (value: string): Check =>
  value.trim() === "" ? { accepted: false, message: NAME_MESSAGE } : accepted;

export const checkDraft = (draft: FormDraft): ReadonlyArray<Check> => [
  checkAddress(draft.email),
  checkName(draft.name),
];

export const formMessages = (draft: FormDraft): ReadonlyArray<string> => [
  ...new Set(
    checkDraft(draft).flatMap((check) =>
      check.accepted ? [] : [check.message],
    ),
  ),
];

export const visibleMessages = (
  draft: FormDraft,
  attempted: boolean,
): ReadonlyArray<string> => (attempted ? formMessages(draft) : []);

export const canSubmit = (draft: FormDraft, pending: boolean): boolean =>
  !pending && formMessages(draft).length === 0;

export const accept = (draft: FormDraft): AcceptedAccount => ({
  email: draft.email,
  name: draft.name.trim(),
});

export const createdLabel = (account: AcceptedAccount): string =>
  `Created ${account.name} (${account.email})`;
