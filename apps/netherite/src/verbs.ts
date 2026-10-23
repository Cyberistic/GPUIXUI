/**
 * The Netherite verbs, copied from `csrc/cli/netherite.c`'s table.
 *
 * Each verb is a make-target dispatcher: the binary prints the command it runs
 * and forwards its output. The TUI only needs the name, the argument hint and
 * the one-line purpose; `needs` marks the verbs that expect a built tree.
 */
export interface Verb {
  readonly name: string;
  readonly args: string;
  readonly what: string;
  readonly needs: "binary" | "assets";
}

export const VERBS: ReadonlyArray<Verb> = [
  {
    name: "gate",
    args: "[--quick]",
    what: "check the tree: the oracle's gates and the engine against Java",
    needs: "binary",
  },
  {
    name: "bench",
    args: "[PIPE_BENCH ARGS...]",
    what: "measure env-steps per second with observations (CUDA)",
    needs: "binary",
  },
  {
    name: "play",
    args: "[--seed N]",
    what: "play the C engine's client; quitting checks the session against Java",
    needs: "assets",
  },
  {
    name: "check",
    args: "TAPE",
    what: "check a played session's tape against the Java client",
    needs: "binary",
  },
  {
    name: "train",
    args: "RUN.yaml",
    what: "run the trainer a run file names",
    needs: "assets",
  },
  {
    name: "demo",
    args: "[RUN.yaml]",
    what: "run a run file's demo (default configs/speedrun-grpo.yaml)",
    needs: "assets",
  },
  {
    name: "setup",
    args: "[--mc DIR] [--jdk DIR]",
    what: "find your Minecraft 1.7.10, rebuild the oracle and assets, build",
    needs: "binary",
  },
  {
    name: "help",
    args: "[VERB]",
    what: "the verb list, or one verb's help",
    needs: "binary",
  },
];

/** The verb at an index, clamped to the table. */
export const verbAt = (index: number): Verb =>
  VERBS[Math.max(0, Math.min(index, VERBS.length - 1))] as Verb;

/** The next index after a key, wrapping at both ends. */
export const step = (index: number, delta: number): number => {
  const n = VERBS.length;
  return (((index + delta) % n) + n) % n;
};

/** The argv the binary is spawned with: the verb, and nothing the hint brackets. */
export const argvOf = (verb: Verb): ReadonlyArray<string> => [verb.name];
