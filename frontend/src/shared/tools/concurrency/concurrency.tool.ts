// ConcurrencyTool — run an async task over a list with at most `limit` in flight, in list order.
// Promise.all over a long list starts every task at once; for network-bound work that saturates the
// server (a dozen heavy series digests at once each take far longer than one after the other) and
// the first result is the slowest to arrive. Here the earliest items start first and finish first.
export const ConcurrencyTool = {
  /**
   * Calls `task(item, index)` for every item, never more than `limit` at a time. A task that throws
   * does not stop the others: the error is handed to `onError` (default: ignored) and the pool goes
   * on. Resolves once every task has settled.
   */
  async each<T>({
    items,
    limit,
    task,
    onError,
  }: {
    items: readonly T[];
    limit: number;
    task: (item: T, index: number) => Promise<void>;
    onError?: (error: unknown, item: T, index: number) => void;
  }): Promise<void> {
    const width = Math.max(1, Math.floor(limit));
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < items.length) {
        const index = next++;
        try {
          await task(items[index], index);
        } catch (error) {
          onError?.(error, items[index], index);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(width, items.length) }, worker));
  },
};
