import { FlatListProps, ListRenderItem } from 'react-native';

// Reusable stable list settings for smooth 120 Hz-capable scrolling.
export const highRefreshListProps = {
  removeClippedSubviews: true,
  windowSize: 7,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 16,
  initialNumToRender: 12,
} as const;

export function applyHighRefreshListProps<T>(props: FlatListProps<T>): FlatListProps<T> {
  return { ...highRefreshListProps, ...props };
}

export const memoizedItemKey = (item: { id: string }) => item.id;

export type StableRenderItem<T> = ListRenderItem<T>;
