/**
 * The `notification-centre-lifecycle` probe: the shipped toast system composed
 * as a notification centre, read back out of a window.
 *
 * Tier 5's **Notification centre** row was `?` — "composition over toasts +
 * panels" — and the composition had never been painted. The shipped toast
 * store is the transient half, and the question a centre asks of it is whether
 * it can also be the history: it keeps `DEFAULT_MAX` cards, so a fourth
 * notification expires the oldest. The probe measures both halves in one
 * window: the viewport stacks what is live (equal widths and right edges, push
 * order, the recipe's gap), and the app-owned panel keeps every title, the
 * expired one included. It also measures the overlay half a centre relies on —
 * a card's action reports once and dismisses its card, the survivors reflow,
 * and the auto-dismiss clock runs in the window rather than under a test clock.
 *
 * The view and the steps live here so the measurement is one module; the
 * registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ToastProvider,
  ToastViewport,
  useToast,
} from "@gpuixui/components";
import { Button } from "@gpuixui/primitives/button";
import { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_GAP,
  NOTIFICATION_IDS,
  NOTIFICATION_MAX,
  NOTIFICATION_TITLES,
  NOTIFICATION_TONES,
  NOTIFICATION_TRANSIENT,
  NOTIFICATION_TRANSIENT_MS,
  notificationActions,
  notificationCardId,
  notificationIds,
  notificationNextId,
  notificationReadout,
  stackGeometry,
  stackedInOrder,
} from "./notification-centre.js";

/** The card's enter tween (220 ms) plus a margin, before a box is read. */
const ENTER = Duration.millis(320);

/** The card's exit window (180 ms) plus a margin, before a card is gone. */
const EXIT = Duration.millis(420);

/** One title by index, so a step never retypes a string. */
const titleAt = (index: number): string => NOTIFICATION_TITLES[index] ?? "";

/** One tone by index, defaulted rather than asserted. */
const toneAt = (index: number): (typeof NOTIFICATION_TONES)[number] =>
  NOTIFICATION_TONES[index] ?? "info";

/** The page inside the provider: the app-owned centre and the push controls. */
const NotificationCentrePage = (): ReactNode => {
  const theme = useTheme();
  const toast = useToast();
  const [notices, setNotices] = useState<ReadonlyArray<string>>([]);
  const [actions, setActions] = useState(0);

  /** Pushes one draft and records it in the app's own history. */
  const notify = (
    title: string,
    tone: (typeof NOTIFICATION_TONES)[number],
    action: boolean,
    duration?: Duration.Duration,
  ): void => {
    setNotices((current) => Arr.append(current, title));
    toast.push(
      {
        title,
        tone,
        ...(action ? { action: { label: NOTIFICATION_ACTION } } : {}),
        ...(duration === undefined ? {} : { duration }),
      },
      { onAction: () => setActions((count) => count + 1) },
    );
  };

  const live = Arr.map(toast.toasts, (item) => item.id);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.xl,
        padding: theme.spacing.xl,
        width: "100%",
        height: "100%",
      }}
    >
      <Card
        testId={NOTIFICATION_IDS.panel}
        style={{ width: 360, flexShrink: 0 }}
      >
        <CardHeader>
          <CardTitle>Notification centre</CardTitle>
          <CardDescription>
            {`The app's own history; the toast store keeps ${NOTIFICATION_MAX}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing["2xs"],
            }}
          >
            {Arr.match(notices, {
              onEmpty: () => (
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.mutedForeground,
                  }}
                >
                  No notices yet
                </text>
              ),
              onNonEmpty: (kept) =>
                Arr.map(kept, (title, index) => (
                  <text
                    key={`${index}:${title}`}
                    style={{
                      ...textStyle(theme, "body"),
                      color: theme.colors.foreground,
                    }}
                  >
                    {title}
                  </text>
                )),
            })}
          </div>
        </CardContent>
      </Card>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: theme.spacing.sm,
        }}
      >
        {Arr.map(NOTIFICATION_TITLES, (title, index) => (
          <Button
            key={title}
            testId={NOTIFICATION_IDS.push(index)}
            onClick={() => notify(title, toneAt(index), index === 1)}
          >
            {title}
          </Button>
        ))}
        <Button
          testId={NOTIFICATION_IDS.transient}
          onClick={() =>
            notify(
              NOTIFICATION_TRANSIENT,
              "info",
              false,
              Duration.millis(NOTIFICATION_TRANSIENT_MS),
            )
          }
        >
          {`Auto clears in ${NOTIFICATION_TRANSIENT_MS} ms`}
        </Button>
        <Button
          testId={NOTIFICATION_IDS.clear}
          variant="secondary"
          onClick={() => toast.dismissAll()}
        >
          Clear the queue
        </Button>
        <Readout testId={NOTIFICATION_IDS.readout}>
          {notificationReadout(live)}
        </Readout>
        <Readout testId={NOTIFICATION_IDS.actions}>
          {notificationActions(actions)}
        </Readout>
      </div>
    </div>
  );
};

/** The probe's window: one wrapper, the provider inside it, viewport last. */
export const NotificationCentreProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  return (
    <div
      testId={NOTIFICATION_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <ToastProvider defaultDuration={Duration.minutes(5)}>
        <NotificationCentrePage />
        <ToastViewport />
      </ToastProvider>
    </div>
  );
};

/** One painted box, with a failure that names the locator. */
const boxOf = (ctx: Smoke.AsyncSmokeContext, testId: string) =>
  Effect.flatMap(ctx.host.bounds(testId), (bounds) =>
    ctx.expectSome(`the card ${testId} paints`, Option.fromNullishOr(bounds)),
  );

/** Whether `testId` paints at all. */
const isPainted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.bounds(testId), (bounds) => bounds !== null);

/**
 * Waits out a card's exit: a dismissed card keeps painting through its exit
 * window, so the frame that removed it is the one that stops painting it.
 */
const gone = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
  attempts = 20,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    if (!(yield* isPainted(ctx, testId))) return true;
    if (attempts <= 0) return false;
    yield* Effect.sleep(Duration.millis(50));
    return yield* gone(ctx, testId, attempts - 1);
  });

export const notificationCentreSteps: Smoke.AsyncSmokeScenario["steps"] = (
  ctx,
) =>
  Effect.gen(function* () {
    const readout = NOTIFICATION_IDS.readout;
    yield* ctx.host.waitFor(NOTIFICATION_IDS.readout);
    yield* ctx.host.waitFor(NOTIFICATION_IDS.panel);

    yield* ctx.expectEqual(
      "the queue starts empty",
      yield* ctx.host.text(readout),
      notificationReadout([]),
    );
    yield* ctx.expectContains(
      "the centre starts with no notice",
      yield* ctx.host.text(NOTIFICATION_IDS.panel),
      "No notices yet",
    );
    yield* ctx.expectEqual(
      "no card paints before a notification arrives",
      yield* isPainted(ctx, notificationCardId("1")),
      false,
    );

    yield* ctx.host.click(NOTIFICATION_IDS.push(0));
    yield* Effect.sleep(ENTER);
    yield* ctx.expectEqual(
      "a press queues the first notification",
      yield* ctx.host.text(readout),
      notificationReadout(notificationIds(1)),
    );
    yield* ctx.expectContains(
      "the viewport paints it",
      yield* ctx.host.text("toast-viewport"),
      titleAt(0),
    );
    yield* ctx.expectContains(
      "the centre keeps it",
      yield* ctx.host.text(NOTIFICATION_IDS.panel),
      titleAt(0),
    );

    yield* ctx.host.click(NOTIFICATION_IDS.push(1));
    yield* Effect.sleep(ENTER);
    yield* ctx.host.click(NOTIFICATION_IDS.push(2));
    yield* Effect.sleep(ENTER);
    yield* ctx.expectEqual(
      "three presses fill the store's bound",
      yield* ctx.host.text(readout),
      notificationReadout(notificationIds(3)),
    );
    const viewport = yield* ctx.host.text("toast-viewport");
    yield* ctx.expectContains(
      "the viewport paints the second card",
      viewport,
      titleAt(1),
    );
    yield* ctx.expectContains(
      "the viewport paints the third card",
      viewport,
      titleAt(2),
    );

    const boxes = yield* Effect.forEach(
      notificationIds(3),
      (id) => boxOf(ctx, notificationCardId(id)),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "the cards stack as one column in push order",
      stackedInOrder(boxes),
      true,
    );
    yield* Effect.forEach(
      stackGeometry(boxes).gaps,
      (gap, index) =>
        ctx.expectNear(
          `card ${index + 1} clears the one below it by the recipe's gap`,
          gap,
          NOTIFICATION_GAP,
          1,
        ),
      { concurrency: 1, discard: true },
    );
    yield* ctx.host.capture("notification-stack");

    yield* ctx.host.click(NOTIFICATION_IDS.push(3));
    yield* Effect.sleep(ENTER);
    yield* ctx.expectEqual(
      "a fourth press expires the oldest card",
      yield* ctx.host.text(readout),
      notificationReadout(notificationIds(4)),
    );
    yield* ctx.expectEqual(
      "the expired card unpaints",
      yield* isPainted(ctx, notificationCardId("1")),
      false,
    );
    const afterExpiry = yield* ctx.host.text("toast-viewport");
    yield* ctx.expectContains(
      "the viewport paints the newest card",
      afterExpiry,
      titleAt(3),
    );
    yield* ctx.expectEqual(
      "the expired card's title leaves the viewport",
      afterExpiry.includes(titleAt(0)),
      false,
    );
    yield* ctx.expectContains(
      "the centre still lists the expired notice",
      yield* ctx.host.text(NOTIFICATION_IDS.panel),
      titleAt(0),
    );
    yield* ctx.host.capture("notification-expired");

    yield* ctx.host.click("toast-action");
    yield* Effect.sleep(EXIT);
    yield* ctx.expectEqual(
      "a card's action dismisses its card",
      yield* ctx.host.text(readout),
      notificationReadout(Arr.drop(notificationIds(4), 1)),
    );
    yield* ctx.expectEqual(
      "the action reports exactly once",
      yield* ctx.host.text(NOTIFICATION_IDS.actions),
      notificationActions(1),
    );
    const survivors = yield* Effect.forEach(
      Arr.drop(notificationIds(4), 1),
      (id) => boxOf(ctx, notificationCardId(id)),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "the surviving cards reflow into one column",
      stackedInOrder(survivors),
      true,
    );

    yield* ctx.host.click(NOTIFICATION_IDS.clear);
    yield* Effect.sleep(EXIT);
    yield* ctx.expectEqual(
      "the app's own clear empties the store",
      yield* ctx.host.text(readout),
      notificationReadout([]),
    );
    yield* ctx.expectEqual(
      "the viewport paints no card once the queue is empty",
      yield* gone(
        ctx,
        notificationCardId(
          Option.getOrElse(Arr.last(notificationIds(4)), () => ""),
        ),
      ),
      true,
    );

    const transientId = notificationNextId(notificationIds(4));
    yield* ctx.host.click(NOTIFICATION_IDS.transient);
    yield* Effect.sleep(ENTER);
    yield* ctx.expectEqual(
      "a transient notification queues like any other",
      yield* ctx.host.text(readout),
      notificationReadout([transientId]),
    );
    yield* ctx.expectContains(
      "the transient notification paints",
      yield* ctx.host.text("toast-viewport"),
      NOTIFICATION_TRANSIENT,
    );
    yield* Effect.sleep(Duration.millis(NOTIFICATION_TRANSIENT_MS + 700));
    yield* ctx.expectEqual(
      "the auto-dismiss clock runs in the window",
      yield* ctx.host.text(readout),
      notificationReadout([]),
    );
    yield* ctx.host.capture("notification-transient");
  });
