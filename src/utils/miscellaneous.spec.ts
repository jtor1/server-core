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
    const ITEMS = (new Array( 20 )).fill(0).map((_, index) => index);

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

      await executeOperationsInParallel(ITEMS, async (model) => {
        stamps.push(Date.now() - nowAtStart);

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
    });
  });
});
