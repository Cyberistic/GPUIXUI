# .agents/skills

Project skills for the workflows this repo needs. A skill is a directory with a
`SKILL.md` describing when to load it and what it instructs.

The machine also loads skills from `~/.config/opencode/skills/`. A skill belongs
here when it encodes something specific to *this* repo — the GPUix workflow, the
native smoke test, the component-completion checklist — rather than a general
technique that is useful everywhere.

None yet. Phase A adds at least:

- a GPUix native smoke-test skill (how to run the playground and read its
  output);
- a component-completion skill (the bar a component must clear before its
  inventory row may say `done`).
