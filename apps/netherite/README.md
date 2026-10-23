# netherite-tui

A terminal client for [netherite](https://github.com/Infatoshi/netherite), built
with GPUix and GPUixUI. The C engine's verbs are selectable; their output streams
into a tail viewport. It paints through GPUix's terminal platform
(`render(<App />, { terminal: true })`), so it runs inside kitty or Ghostty.

```sh
nub run --filter netherite-tui terminal
```

`NETHERITE_DIR` points at the checkout; otherwise the app walks up from its
working directory looking for `AGENTS.md` + `csrc/Makefile`. The verbs are read
from `csrc/cli/netherite.c`; `setup` needs your Minecraft 1.7.10 install, and
`bench`/`train` need CUDA on Linux.

Keys: `↑`/`↓` choose a verb, `Enter` runs it, `Esc` cancels and quits.
