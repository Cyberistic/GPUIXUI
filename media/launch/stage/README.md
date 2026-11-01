# Stage shots

The film's bento (8.4–12.4 s) and assemble (12.4–16.4 s) shots are built with the
[stageshow](https://github.com/benjitaylor/skills) skill (MIT), following its
workflow: the tile list and story in plan 066, the closest gold examples
(`bento`, `subscriptions`) filmed first, then `scripts/film.mjs` rehearsal.
Every product picture inside a stage is real GPUix footage (`scenes/footage.tsx`
plays a take's frames on the stage clock); the stage draws the page, tiles,
copy, lines and motion.

```sh
sh media/launch/stage/setup.sh            # copy the skill into .media/, npm ci, link stage/kit
node media/launch/.media/stageshow/node_modules/vite/bin/vite.js \
  --config media/launch/stage/record/vite.config.mjs --configLoader native --port 5198 &
node media/launch/stage/record.mjs bento 135 media/launch/takes/stage-bento
node media/launch/stage/record.mjs assemble 126 media/launch/takes/stage-assemble
```

`record.mjs` installs the skill's virtual clock and steps it one 30 fps frame at
a time, so a recording is the same on every run. `npm ci` is the skill's own
documented install, from its own lockfile, inside the gitignored `.media/`; the
page pins the skill's React 18 so the repo's React 19 never reaches it.
