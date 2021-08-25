import uuidV4 from 'uuid/v4';

import {
  NULL_STRING,
  isUUID,
  executeOperationsInParallel,
} from './miscellaneous';


describe('utils/miscellaneous', () => {
  describe('isUUID', () => {
    it('detects a UUID', () => {
      const UUID = uuidV4();

      expect(isUUID(UUID)).toBe(true);
    });

    it('does not recognize a non-UUID', () => {
      expect(isUUID('')).toBe(false);
      expect(isUUID(NULL_STRING)).toBe(false);
      expect(isUUID(<unknown>undefined as string)).toBe(false);
    });
  });


  describe('executeOperationsInParallel', () => {
    // a bunch of arbitrary items
    const ITEM_COUNT = 20;
    const ITEMS = (new Array<number>( ITEM_COUNT )).fill(0).map((_, index) => index);

    it('executes Model in parallel', async () => {
      const visitedItems: number[] = [];

      const models = await executeOperationsInParallel(ITEMS, async (item) => {
        visitedItems.push(item);
        return item;
      });

      // it('resolves them all, in order')
      expect(models).toEqual(ITEMS);

      // it('visited them all, in order')
      expect(visitedItems).toEqual(ITEMS);
    });

    it('allows a parallelization batch size to be specified', async () => {
      const INTERVAL = 100; // ms; enough to be "precise"
      const nowAtStart = Date.now();
      const stamps: number[] = [];
      const iteratorIndexes: number[] = [];
      let iteratorItems: Array<number> = [];

      await executeOperationsInParallel(ITEMS, async (item, index, items) => {
        stamps.push(Date.now() - nowAtStart);
        iteratorIndexes.push(index);
        iteratorItems = items;

        // a time lag, to differentiate the batches;
        //   batch N Promises will all resolve "at the same time"
        //   batch (N + 1) won't start until batch N has fully resolved
        return new Promise((resolve) => setTimeout(resolve, INTERVAL));
      }, { batchSize: 6 });

      // it('imposed the specified batch size')
      expect(
        stamps.map((t) => Math.floor(t / INTERVAL))
      ).toEqual([
        0, 0, 0, 0, 0, 0,
        1, 1, 1, 1, 1, 1,
        2, 2, 2, 2, 2, 2,
        3, 3,
      ]);

      // it('provides iterator arguments')
      expect(iteratorIndexes).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
      ]);
      expect(iteratorItems).toBe(ITEMS);
    });

    it('Executes efficiently', async () => {
      const timeoutPromise = (sideEffect: (ms: number) => void) => (ms: number) =>
        new Promise((res) => setTimeout(res, ms, ms))
          .then(((ms: number) => sideEffect(ms)) as any)
      const evidence: number[] = [];
      const times = [1, 1000, 2, 3];
      await executeOperationsInParallel(
        times,
        timeoutPromise((ms) => evidence.push(ms)),
        { batchSize: 2 }
      );
      // it("counts to 1000")
      expect(evidence).toMatchObject([1,2,3,1000]);
    });

    it('Safely skips and returns null for errors', async () => {
      const results = await executeOperationsInParallel(ITEMS, async (item) => {
        if(item === 4 || item === 13) {
          throw Error("Unlucky number detected!");
        }
        return item;
      })
      expect(results[4]).toBe(null);
      expect(results[13]).toBe(null);
    });
  });
});
