import 'jest';
import { first, last, times } from 'lodash';

import {
  SORT_KEY_LOWEST,
  SORT_KEY_HIGHEST,

  sortKeyBetween,
  sortKeyInitialItem,
  sortKeyAtFirstBefore,
  sortKeyAtLastAfter,
  sortKeyComparator,
} from './base64';

const ITERATIONS = 100; // good enough


describe('sortKey/base64', () => {
  describe('sortKeyBetween', () => {
    it('produces a sortKey ordered between two other sortKeys', () => {
      const initial = sortKeyInitialItem();

      const afterInitial = sortKeyAtLastAfter(initial);
      const beforeAfter = sortKeyBetween(initial, afterInitial);
      expect(beforeAfter).toBe('bN');

      const beforeInitial = sortKeyAtFirstBefore(initial);
      const afterBefore = sortKeyBetween(beforeInitial, initial);
      expect(afterBefore).toBe('Mc');
    });
  });

  describe('sortKeyInitialItem', () => {
    it('produces a sortKey in the middle of the full range', () => {
      expect(SORT_KEY_LOWEST).toBe('-');
      expect(SORT_KEY_HIGHEST).toBe('z');

      const initial = sortKeyInitialItem();
      expect(initial).toBe('UV');
    });
  });

  describe('sortKeyAtFirstBefore', () => {
    it('produces a sortKey ordered before a specified sortKey', () => {
      // it('produces a sortKey ordered before the "initial" sortKey')
      const initial = sortKeyInitialItem();
      const beforeInitial = sortKeyAtFirstBefore(initial);
      expect(beforeInitial).toBe('Ek');
    });

    it(`exhibits Zeno's Paradox towards the lower bound`, () => {
      const befores = times(ITERATIONS).reduce((array) => {
        const before = first(array) as string;
        return [ sortKeyAtFirstBefore(before) ].concat(array);
      }, [ '-0' ]); // avoid the strict lower bound

      // sortable and unique
      expect(befores.slice().reverse().sort(sortKeyComparator)).toEqual(befores);
      expect((new Set(befores)).size).toBe(befores.length);
    });
  });

  describe('sortKeyAtLastAfter', () => {
    it('produces a sortKey ordered after a specified sortKey', () => {
      // it('produces a sortKey ordered after the "initial" sortKey')
      const initial = sortKeyInitialItem();
      const afterInitial = sortKeyAtLastAfter(initial);
      expect(afterInitial).toBe('jF');
    });

    it(`exhibits Zeno's Paradox towards the upper bound`, () => {
      const afters = times(ITERATIONS).reduce((array) => {
        const after = last(array) as string;
        return array.concat(sortKeyAtLastAfter(after));
      }, [ SORT_KEY_HIGHEST ]); // there is no strict upper bound

      // sortable and unique
      expect(afters.slice().reverse().sort(sortKeyComparator)).toEqual(afters);
      expect((new Set(afters)).size).toBe(afters.length);
    });
  });

  describe('sortKeyComparator', () => {
    it('compares two sortKeys', () => {
      const initial = sortKeyInitialItem();
      const beforeInitial = sortKeyAtFirstBefore(initial);
      const afterInitial = sortKeyAtLastAfter(initial);

      const sorted = [ SORT_KEY_LOWEST, beforeInitial, initial, afterInitial, SORT_KEY_HIGHEST ];
      expect( sorted.slice().reverse().sort() ).toEqual(sorted);
    });
  });
});
