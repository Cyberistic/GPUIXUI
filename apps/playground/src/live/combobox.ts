/**
 * The option set the `combobox-lifecycle` probe paints.
 *
 * Kept native-free like the other probe fixtures so the premise is testable on
 * a host with no binding: the arrow path counts **enabled** rows, so the
 * disabled row's position is what makes "three arrows land on linus" a
 * measurement, and the "ala" step needs a query only that disabled row matches.
 * `combobox.test.ts` guards both.
 */
import type { ComboboxOption } from "@gpuixui/components";

/** The reviewers, in arrow order; `alan` is the disabled row. */
export const REVIEWERS = [
  { value: "ada", label: "Ada Lovelace", description: "Engineering" },
  { value: "grace", label: "Grace Hopper", description: "Compilers" },
  {
    value: "alan",
    label: "Alan Turing",
    description: "Foundations",
    disabled: true,
  },
  { value: "linus", label: "Linus Torvalds", description: "Kernel" },
  {
    value: "margaret",
    label: "Margaret Hamilton",
    description: "Flight software",
  },
] as const satisfies ReadonlyArray<ComboboxOption>;
