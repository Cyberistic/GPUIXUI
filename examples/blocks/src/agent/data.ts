/** The agent block's sample sessions and transcript. */

export interface Turn {
  readonly id: string;
  readonly from: "you" | "agent";
  readonly text: string;
}

export const sessions = [
  { id: "s1", label: "Retry failed payments" },
  { id: "s2", label: "Offline drafts" },
  { id: "s3", label: "Exam timetable export" },
] as const;

export const transcript: ReadonlyArray<Turn> = [
  {
    id: "t1",
    from: "you",
    text: "Leorio's payout retries double-charge on a timeout. Can you look?",
  },
  {
    id: "t2",
    from: "agent",
    text: "The retry reuses no idempotency key, so a slow first attempt and its retry both settle. I added the key to the charge request and a test that times out the first call.",
  },
];

/** The files the session touched, for the inspector. */
export const touched = [
  { path: "payments/charge.ts", change: "+18 −4" },
  { path: "payments/charge.test.ts", change: "+41" },
  { path: "payments/retry.ts", change: "+3 −1" },
] as const;
