# `stageshow` — the launch film's stage shots

- Repository: <https://github.com/benjitaylor/skills> (`stageshow/`)
- Commit read: `8020574` (2026-11-01), cloned to `~/GPUIXUI/references/benjitaylor-skills`
- Licence: MIT — `Copyright (c) 2026 Benji Taylor`
- What we read: `SKILL.md`, `references/{bento,motion,framing,craft}.md`, the gold
  examples `bento` and `subscriptions`

## What we use

The skill's workflow and its React kit (`Stage`, `Fly`, `Count`, `Connector`,
the virtual clock), run from a copy in the gitignored `media/launch/.media/`.
Our scenes (`media/launch/stage/scenes/`) are our own, written against the kit;
the gold bento's metrics are scaled for a 1920 × 1080 frame.

## What we do not use

No kit part stands in for a GPUIxUI component: every product picture in a stage
is a real GPUix take. The skill's app icons (`assets/app-icons.ts`, not MIT) are
not used. Nothing from the skill ships in a package.
