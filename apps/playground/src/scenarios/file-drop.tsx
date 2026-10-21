/**
 * `file-drop` — the runtime's Finder-style file drop.
 *
 * A file picker inside a desktop app needs the OS drop path, not a web
 * `DataTransfer`: the renderer dispatches `FileDrop::Entered` then `Submit`, and
 * `onFileDrop` receives absolute paths. The probe proves the payload arrives in
 * order, and that a drop outside the zone reaches no handler — so a drop target
 * is a real region rather than the whole window.
 *
 * The renderer's own `nativeSimulateFileDrop` drives it, which is the same path
 * a Finder drag takes, so this is a measurement rather than a claim.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Body, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const FileDropProbe = () => {
  const theme = useTheme();
  const [drops, setDrops] = useState(0);
  const [paths, setPaths] = useState<ReadonlyArray<string>>([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        testId="drop-zone"
        onFileDrop={(event) => {
          setDrops((count) => count + 1);
          setPaths(event.paths ?? []);
        }}
        style={{
          width: 320,
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          backgroundColor: theme.colors.muted,
        }}
      >
        <Body>Drop files here</Body>
      </div>
      <div
        testId="drop-outside"
        style={{ width: 320, height: 40, backgroundColor: theme.colors.card }}
      />
      <Readout testId="drop-readout">{`drops=${drops} paths=${Arr.join(
        paths,
        ",",
      )}`}</Readout>
    </div>
  );
};

export const fileDropScenario: ScenarioBody = {
  view: () => <FileDropProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectEqual(
        "the drop zone starts empty",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("drop-readout")),
          () => "",
        ),
        "drops=0 paths=",
      );
      yield* ctx.expectSome(
        "the outside target paints",
        Option.fromNullishOr(ctx.host.bounds("drop-outside")),
      );

      // A text field focused by an earlier scenario keeps the platform's text
      // input session alive; a press elsewhere ends it, so the drop reaches the
      // zone rather than the unmounted field's session.
      ctx.host.click("drop-outside");
      ctx.host.fileDrop("drop-zone", ["/tmp/alpha.txt", "/tmp/beta.txt"]);
      yield* ctx.expectEqual(
        "the zone receives the dropped paths in order",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("drop-readout")),
          () => "",
        ),
        "drops=1 paths=/tmp/alpha.txt,/tmp/beta.txt",
      );

      ctx.host.fileDrop("drop-outside", ["/tmp/gamma.txt"]);
      yield* ctx.expectEqual(
        "a drop outside the zone reaches no handler",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("drop-readout")),
          () => "",
        ),
        "drops=1 paths=/tmp/alpha.txt,/tmp/beta.txt",
      );
    }),
};
