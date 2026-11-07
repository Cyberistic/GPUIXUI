export interface MessageScrollerState {
  readonly pinned: boolean;

  readonly unread: number;
}

export const initialMessageScrollerState: MessageScrollerState = {
  pinned: true,
  unread: 0,
};

export interface ScrollObservation {
  readonly distanceFromEnd: number;

  readonly threshold: number;
}

export const observeScroll = (
  state: MessageScrollerState,
  { distanceFromEnd, threshold }: ScrollObservation,
): MessageScrollerState => {
  if (Number.isNaN(distanceFromEnd) || Number.isNaN(threshold)) return state;
  const pinned = distanceFromEnd <= Math.max(0, threshold);
  const unread = pinned ? 0 : state.unread;
  return pinned === state.pinned && unread === state.unread
    ? state
    : { pinned, unread };
};

export const addItems = (
  state: MessageScrollerState,
  count: number,
): MessageScrollerState =>
  state.pinned || Number.isNaN(count) || count <= 0
    ? state
    : { pinned: false, unread: state.unread + count };

export const requestLatest = (
  state: MessageScrollerState,
): MessageScrollerState =>
  state.pinned && state.unread === 0 ? state : { pinned: true, unread: 0 };
