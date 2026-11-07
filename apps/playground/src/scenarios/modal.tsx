import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import { useGpuix, useWindowSize } from "@gpuix/react";
import type { KeyEvent, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const MODAL_IDS: ReadonlyArray<string> = [
  "modal-content",
  "modal-a",
  "modal-b",
  "modal-open-popover",
  "modal-close",
];

const focusWithinModal = (testId: string): boolean =>
  Arr.contains(MODAL_IDS, testId);

const ModalProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [popover, setPopover] = useState(false);
  const [last, setLast] = useState("none");
  const [contentId, setContentId] = useState<Option.Option<number>>(
    Option.none(),
  );
  const [popoverId, setPopoverId] = useState<Option.Option<number>>(
    Option.none(),
  );
  const previousFocus = useRef<Option.Option<number>>(Option.none());
  const popoverFocus = useRef<Option.Option<number>>(Option.none());
  const contentRef = useCallback((instance: PublicInstance | null) => {
    setContentId(Option.map(Option.fromNullishOr(instance), (i) => i.id));
  }, []);
  const popoverRef = useCallback((instance: PublicInstance | null) => {
    setPopoverId(Option.map(Option.fromNullishOr(instance), (i) => i.id));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    return Option.match(contentId, {
      onNone: () => undefined,
      onSome: (id) => {
        previousFocus.current = Option.fromNullishOr(
          renderer?.getFocusedElementId?.(),
        );
        renderer?.focusElement?.(id);
        return () => {
          Option.match(previousFocus.current, {
            onNone: () => {},
            onSome: (previous) => {
              if (renderer?.getElementBounds?.(previous) === null) return;
              renderer?.focusElement?.(previous);
            },
          });
        };
      },
    });
  }, [open, contentId, renderer]);

  useLayoutEffect(() => {
    if (!popover) return;
    return Option.match(popoverId, {
      onNone: () => undefined,
      onSome: (id) => {
        popoverFocus.current = Option.fromNullishOr(
          renderer?.getFocusedElementId?.(),
        );
        renderer?.focusElement?.(id);
        return () => {
          Option.match(popoverFocus.current, {
            onNone: () => {},
            onSome: (previous) => {
              if (renderer?.getElementBounds?.(previous) === null) return;
              renderer?.focusElement?.(previous);
            },
          });
        };
      },
    });
  }, [popover, popoverId, renderer]);

  const close = (reason: string) => {
    setOpen(false);
    setPopover(false);
    setLast(reason);
  };

  const handleContentKey = (event: KeyEvent) => {
    if (event.key === "tab") {
      event.preventDefault();
      const id = Option.getOrElse(contentId, () => -1);
      if (event.modifiers?.shift === true) {
        renderer?.focusPreviousWithin?.(id);
      } else {
        renderer?.focusNextWithin?.(id);
      }
    }
    if (event.key === "escape") close("escape");
  };

  return (
    <div
      style={{
        width: 480,
        height: 320,
        backgroundColor: theme.colors.background,
      }}
    >
      <Pressable testId="modal-trigger" onClick={() => setOpen(true)}>
        <Body>open modal</Body>
      </Pressable>
      <div style={{ marginTop: 8 }}>
        <Readout testId="modal-readout">{`open=${open} popover=${popover} last=${last}`}</Readout>
      </div>
      {open ? (
        <anchored
          deferred
          position={{ x: 0, y: 0 }}
          priority={1}
          occlude
          style={{ position: "absolute" }}
        >
          <div
            testId="modal-veil"
            style={{
              width: window.width,
              height: window.height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.overlay,
            }}
          >
            <div
              testId="modal-content"
              ref={contentRef}
              tabIndex={0}
              role="dialog"
              aria-label="modal"
              onKeyDown={handleContentKey}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: 280,
                padding: 16,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 8,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>modal open</text>
              <Pressable testId="modal-a">
                <Body>first</Body>
              </Pressable>
              <Pressable testId="modal-b">
                <Body>second</Body>
              </Pressable>
              <Pressable
                testId="modal-open-popover"
                onClick={() => setPopover(true)}
              >
                <Body>open popover</Body>
              </Pressable>
              <Pressable testId="modal-close" onClick={() => close("button")}>
                <Body>close</Body>
              </Pressable>
            </div>
          </div>
        </anchored>
      ) : null}
      {popover ? (
        <anchored deferred position={{ x: 200, y: 160 }} priority={2} occlude>
          <div
            testId="nested-content"
            ref={popoverRef}
            tabIndex={0}
            role="dialog"
            aria-label="nested"
            onKeyDown={(event) => {
              if (event.key !== "escape") return;
              setPopover(false);
              setLast("popover-escape");
            }}
            style={{
              padding: 12,
              backgroundColor: theme.colors.popover,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 6,
            }}
          >
            <text style={{ color: theme.colors.foreground }}>nested open</text>
          </div>
        </anchored>
      ) : null}
    </div>
  );
};

const focused = (host: Smoke.SmokeHost): string =>
  Option.getOrElse(Option.fromNullishOr(host.focused()), () => "none");

const walk = (
  ctx: Smoke.SmokeContext,
  key: string,
  times: number,
  label: string,
) =>
  Effect.gen(function* () {
    const seen = yield* Ref.make<ReadonlyArray<string>>([]);
    yield* Effect.forEach(
      Arr.range(1, times),
      () =>
        Effect.sync(() => {
          ctx.host.key(key);
          return focused(ctx.host);
        }).pipe(
          Effect.tap((id) =>
            Ref.update(seen, (visited) => Arr.append(visited, id)),
          ),
        ),
      { discard: true, concurrency: 1 },
    );
    const visited = yield* Ref.get(seen);
    const sequence = Arr.join(visited, ",");
    yield* ctx.expectEqual(
      `${label} moved focus [${sequence}]`,
      Arr.length(Arr.dedupe(visited)) > 1,
      true,
    );
    yield* ctx.expectEqual(
      `${label} stayed inside the modal [${sequence}]`,
      Arr.every(visited, focusWithinModal),
      true,
    );
  });

export const modalScenario: ScenarioBody = {
  view: () => <ModalProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("modal-trigger");
      const opened = yield* ctx.expectSome(
        "modal readout after open",
        Option.fromNullishOr(ctx.host.text("modal-readout")),
      );
      yield* ctx.expectContains(
        "trigger opened the modal",
        opened,
        "open=true",
      );
      yield* ctx.expectContains(
        "the modal paints",
        ctx.host.paintedText().join("\n"),
        "modal open",
      );
      yield* ctx.expectEqual(
        "focus entered the modal",
        focused(ctx.host),
        "modal-content",
      );

      yield* walk(ctx, "tab", 4, "Tab");
      ctx.host.key("tab");
      yield* ctx.expectEqual(
        "Tab wrapped back to the content",
        focused(ctx.host),
        "modal-content",
      );
      yield* walk(ctx, "shift-tab", 4, "Shift-Tab");
      ctx.host.key("shift-tab");
      yield* ctx.expectEqual(
        "Shift-Tab wrapped back to the content",
        focused(ctx.host),
        "modal-content",
      );

      ctx.host.key("escape");
      const escaped = yield* ctx.expectSome(
        "modal readout after Escape",
        Option.fromNullishOr(ctx.host.text("modal-readout")),
      );
      yield* ctx.expectContains(
        "Escape closed the modal",
        escaped,
        "open=false popover=false last=escape",
      );
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        focused(ctx.host),
        "modal-trigger",
      );

      ctx.host.click("modal-trigger");
      ctx.host.click("modal-open-popover");
      yield* ctx.expectEqual(
        "focus entered the nested popover",
        focused(ctx.host),
        "nested-content",
      );
      ctx.host.key("escape");
      const nested = yield* ctx.expectSome(
        "modal readout after nested Escape",
        Option.fromNullishOr(ctx.host.text("modal-readout")),
      );
      yield* ctx.expectContains(
        "Escape closed only the popover",
        nested,
        "open=true popover=false last=popover-escape",
      );
      yield* ctx.expectEqual(
        "focus returned from the popover",
        focused(ctx.host),
        "modal-open-popover",
      );
      ctx.host.key("escape");
      const closed = yield* ctx.expectSome(
        "modal readout after second Escape",
        Option.fromNullishOr(ctx.host.text("modal-readout")),
      );
      yield* ctx.expectContains(
        "the second Escape closed the modal",
        closed,
        "open=false",
      );
    }),
};
