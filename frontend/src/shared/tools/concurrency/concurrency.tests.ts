import { ConcurrencyTool } from './concurrency.tool';

// A task that stays open until the test lets it finish, so the number in flight can be observed.
function gate() {
  let open: () => void = () => {};
  const promise = new Promise<void>(resolve => (open = resolve));
  return { promise, open };
}

describe('ConcurrencyTool.each', () => {
  it('runs every item, in list order within the limit', async () => {
    const started: number[] = [];
    await ConcurrencyTool.each({
      items: ['a', 'b', 'c', 'd'],
      limit: 2,
      task: async (_item, index) => {
        started.push(index);
      },
    });
    expect(started).toEqual([0, 1, 2, 3]);
  });

  it('never has more than `limit` in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const gates = [gate(), gate(), gate(), gate(), gate()];
    const run = ConcurrencyTool.each({
      items: gates,
      limit: 2,
      task: async g => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await g.promise;
        inFlight--;
      },
    });
    for (const g of gates) {
      await Promise.resolve();
      g.open();
    }
    await run;
    expect(peak).toBe(2);
  });

  it('starts the next item as soon as one finishes, not when the whole group does', async () => {
    const started: number[] = [];
    const first = gate();
    const second = gate();
    const gates = [first, second, gate()];
    const run = ConcurrencyTool.each({
      items: gates,
      limit: 2,
      task: async (g, index) => {
        started.push(index);
        await g.promise;
      },
    });
    await Promise.resolve();
    expect(started).toEqual([0, 1]);

    first.open();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(started).toEqual([0, 1, 2]);

    second.open();
    gates[2].open();
    await run;
  });

  it('keeps going when a task throws and reports it', async () => {
    const done: number[] = [];
    const errors: Array<[string, number]> = [];
    await ConcurrencyTool.each({
      items: ['a', 'b', 'c'],
      limit: 1,
      task: async (_item, index) => {
        if (index === 1) {throw new Error('boom');}
        done.push(index);
      },
      onError: (error, item, index) => errors.push([`${item}:${(error as Error).message}`, index]),
    });
    expect(done).toEqual([0, 2]);
    expect(errors).toEqual([['b:boom', 1]]);
  });

  it('swallows a failure when no handler is given', async () => {
    await expect(
      ConcurrencyTool.each({ items: [1], limit: 1, task: async () => { throw new Error('x'); } }),
    ).resolves.toBeUndefined();
  });

  it('does nothing for an empty list and treats a limit below 1 as 1', async () => {
    const task = jest.fn(async () => {});
    await ConcurrencyTool.each({ items: [], limit: 3, task });
    expect(task).not.toHaveBeenCalled();

    await ConcurrencyTool.each({ items: ['a', 'b'], limit: 0, task });
    expect(task).toHaveBeenCalledTimes(2);
  });
});
