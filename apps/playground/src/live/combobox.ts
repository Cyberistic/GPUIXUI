import type { ComboboxOption } from "@gpuixui/components";

export const REVIEWERS: ReadonlyArray<ComboboxOption> = [
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
];
