import { first, last, times, noop } from 'lodash';

import { SortKeyProvider } from './provider';


const ITERATIONS = 100; // good enough
const MISSING: string = (<unknown>undefined as string);
const INITIAL_KEY = 'Fa'; // from experience


describe('SortKeyProvider', () => {
  // a singleton is appropriate for 90% of the Test Suite
  // we are intentionally walking the line on case-sensitive ordering
  //   @see #sortKeyComparator
  const provider = new SortKeyProvider({ chars: 'DEFabc' });
  const {
    SORT_KEY_LOWEST,
    SORT_KEY_HIGHEST,
    sortKeyBetween,
    sortKeyInitialItem,
    sortKeyAtFirstBefore,
    sortKeyAtLastAfter,
    sortKeyComparator,
    sortKeyPopulateMissing,
  } = provider;

  const VERY_LOW_BUT_NOT_LOWEST = 'DDDDDDDDDDE';

  function _assertSortKeyOrder(expected: string[]): void {
    const actual = expected.slice().reverse().sort(sortKeyComparator);
    expect(actual).toEqual(expected);
    expect(new Set(actual).size).toBe(actual.length);
  }


  describe('constructor', () => {
    it('requires { chars } to be in standard lexicographical order', () => {
      const valid = new SortKeyProvider({ chars: '012' });

      expect(() => {
        return new SortKeyProvider({ chars: '210' });
      }).toThrow(/standard lexicographical order/);
    });

    it('computes and exposes its boundaries', () => {
      expect(SORT_KEY_LOWEST).toBe('D');
      expect(SORT_KEY_HIGHEST).toBe('c');
    });
  });


  describe('sortKeyBetween', () => {
    it('produces a sortKey ordered between two other sortKeys', () => {
      const afterInitial = sortKeyAtLastAfter(INITIAL_KEY);
      const beforeAfter = sortKeyBetween(INITIAL_KEY, afterInitial);
      expect(beforeAfter).toBe('aDba');
      _assertSortKeyOrder([ INITIAL_KEY, beforeAfter, afterInitial ]);

      const beforeInitial = sortKeyAtFirstBefore(INITIAL_KEY);
      const afterBefore = sortKeyBetween(beforeInitial, INITIAL_KEY);
      expect(afterBefore).toBe('EcEa');
      _assertSortKeyOrder([ beforeInitial, afterBefore, INITIAL_KEY ]);
    });

    it('requires the parameters to be provided in proper sortKey order', () => {
      const afterInitial = sortKeyAtLastAfter(INITIAL_KEY);

      expect(() => {
        return sortKeyBetween(INITIAL_KEY, afterInitial);
      }).not.toThrow();

      expect(() => {
        return sortKeyBetween(afterInitial, INITIAL_KEY);
      }).toThrow(/are not in sorted order/);

      expect(() => {
        return sortKeyBetween(INITIAL_KEY, INITIAL_KEY);
      }).toThrow(/are identical/);
    });

    it('supports the case where either one or both sortKeys are missing', () => {
      expect( sortKeyBetween(MISSING, MISSING) ).toBe( INITIAL_KEY );

      const missingAfter = sortKeyBetween(INITIAL_KEY, MISSING);
      expect(missingAfter).toBe('aba');

      const missingBefore = sortKeyBetween(MISSING, INITIAL_KEY);
      expect(missingBefore).toBe('EFba');
    });

    it('has a strict lower bound', () => {
      // which we will approach, but never bump up against,
      //   assuming the library is used as intended

      // it('can get really close to the lower bound')
      expect(sortKeyBetween(SORT_KEY_LOWEST, VERY_LOW_BUT_NOT_LOWEST)).toBe('DDDDDDDDDDDa');

      // it('fails in some really obtuse ways')
      expect(() => {
        return sortKeyBetween('', SORT_KEY_LOWEST);
      }).toThrow(/are not in sorted order/);

      expect(() => {
        return sortKeyBetween(' ' /* ASCII 32 */, SORT_KEY_LOWEST);
      }).toThrow(/Invalid character/);

      expect(() => {
        return sortKeyBetween(SORT_KEY_LOWEST, SORT_KEY_LOWEST);
      }).toThrow(/are identical/);

      // it('cannot escape the lower bound by adding precision')
      expect(() => {
        return sortKeyBetween(SORT_KEY_LOWEST /* 'D' */, 'DD');
      }).toThrow(/is not between/);
    });

    it('does not have a strict upper bound', () => {
      const between = sortKeyBetween(SORT_KEY_HIGHEST, '');
      expect(between).toBe('cFa');

      const dogfood = [ between ];
      times(ITERATIONS).forEach(() => {
        dogfood.push( sortKeyBetween(last(dogfood) as string, '') );
      });
      _assertSortKeyOrder(dogfood);
    });
  });

  describe('sortKeyInitialItem', () => {
    it('produces a sortKey in the middle of the full range', () => {
      const initial = sortKeyInitialItem();
      expect(initial).toBe(INITIAL_KEY);

      _assertSortKeyOrder([ SORT_KEY_LOWEST, initial, SORT_KEY_HIGHEST ]);
    });
  });

  describe('sortKeyAtFirstBefore', () => {
    it('produces a sortKey ordered before a specified sortKey', () => {
      // it('produces a sortKey ordered before the "initial" sortKey')
      const beforeInitial = sortKeyAtFirstBefore(INITIAL_KEY);
      expect(beforeInitial).toBe('EEa');
      _assertSortKeyOrder([ beforeInitial, INITIAL_KEY ]);
    });

    it('supports the case where the sortKey is missing', () => {
      expect( sortKeyAtFirstBefore(MISSING) ).toBe(INITIAL_KEY);
    });

    it('has a strict lower bound', () => {
      // which we will approach, but never bump up against,
      //   assuming the library is used as intended

      // it('can get really close to the lower bound')
      expect(sortKeyAtFirstBefore(VERY_LOW_BUT_NOT_LOWEST)).toBe('DDDDDDDDDDDa');

      // it('fails in some really obtuse ways')
      expect(() => {
        return sortKeyAtFirstBefore(SORT_KEY_LOWEST);
      }).toThrow(new RegExp(`are identical`));
    });

    it('does not have a strict upper bound', () => {
      const before = sortKeyAtFirstBefore(SORT_KEY_HIGHEST);
      _assertSortKeyOrder([ before, SORT_KEY_HIGHEST ]);

      const dogfood = [ before ];
      times(ITERATIONS).forEach((i) => {
        dogfood.unshift( sortKeyAtFirstBefore(first(dogfood) as string) );
      });
      _assertSortKeyOrder(dogfood);
    });
  });

  describe('sortKeyAtLastAfter', () => {
    it('produces a sortKey ordered after a specified sortKey', () => {
      // it('produces a sortKey ordered after the "initial" sortKey')
      const afterInitial = sortKeyAtLastAfter(INITIAL_KEY);
      expect(afterInitial).toBe('aba');
      _assertSortKeyOrder([ INITIAL_KEY, afterInitial ]);
    });

    it('supports the case where the sortKey is missing', () => {
      expect( sortKeyAtLastAfter(MISSING) ).toBe('Fca');
    });

    it('does not have a strict lower bound', () => {
      const after = sortKeyAtLastAfter(SORT_KEY_LOWEST);
      _assertSortKeyOrder([ SORT_KEY_LOWEST, after ]);
    });

    it('does not have a strict upper bound', () => {
      const after = sortKeyAtLastAfter(SORT_KEY_HIGHEST);
      _assertSortKeyOrder([ SORT_KEY_HIGHEST, after ]);

      const dogfood = [ after ];
      times(ITERATIONS).forEach(() => {
        dogfood.push( sortKeyAtLastAfter(last(dogfood) as string) );
      });
      _assertSortKeyOrder(dogfood);
    });
  });

  describe('sortKeyComparator', () => {
    it('compares two sortKeys', () => {
      expect(Math.sign( sortKeyComparator(INITIAL_KEY, INITIAL_KEY) )).toBe(0);
      expect(Math.sign( sortKeyComparator(INITIAL_KEY, sortKeyAtFirstBefore(INITIAL_KEY)) )).toBe(1);
      expect(Math.sign( sortKeyComparator(INITIAL_KEY, sortKeyAtLastAfter(INITIAL_KEY)) )).toBe(-1);
    });

    it('supports the case where either one or both sortKeys are missing', () => {
      // it('always considers a missing sortKey to be the "least"')
      expect(Math.sign( sortKeyComparator(MISSING, MISSING) )).toBe(0);
      expect(Math.sign( sortKeyComparator(INITIAL_KEY, MISSING) )).toBe(1);
      expect(Math.sign( sortKeyComparator(MISSING, INITIAL_KEY) )).toBe(-1);
    });

    it('is not just a simple String#localeCompare', () => {
      // it('did not take much testing to find this pair of gems')
      const afterInitial = sortKeyAtLastAfter(INITIAL_KEY);
      expect(afterInitial).toBe('aba');

      expect([ INITIAL_KEY, afterInitial ].sort(sortKeyComparator)).toEqual([ INITIAL_KEY, afterInitial ]);

      // typical String comparison behavior, for illustration
      expect([ INITIAL_KEY, afterInitial ].sort(/* default comparator */)).toEqual([ INITIAL_KEY, afterInitial ]);
      expect([ INITIAL_KEY, afterInitial ].sort((s1, s2) => s1.localeCompare(s2))).toEqual([ afterInitial, INITIAL_KEY ]);
    });
  });

  describe('sortKeyPopulateMissing', () => {
    it('does nothing with an empty Array', () => {
      expect(sortKeyPopulateMissing([])).toEqual([]);
    });

    it('populates a lone missing key', () => {
      expect(sortKeyPopulateMissing([ MISSING ])).toEqual([ INITIAL_KEY ]);

      // it('cares not what kind of false-y value a key might be')
      expect(sortKeyPopulateMissing([ '' ])).toEqual([ INITIAL_KEY ]);
      expect(sortKeyPopulateMissing([ (<unknown>null as string) ])).toEqual([ INITIAL_KEY ]);
    });

    it('populates a leading missing key', () => {
      // don't blow up the (approachable yet un-reachable) strict lower bound
      const populated = sortKeyPopulateMissing([ MISSING, VERY_LOW_BUT_NOT_LOWEST ]);
      expect(populated).toEqual([ 'DDDDDDDDDDDa', VERY_LOW_BUT_NOT_LOWEST ]);
      _assertSortKeyOrder(populated);
    });

    it('populates multiple leading missing keys', () => {
      const populated = sortKeyPopulateMissing([ MISSING, MISSING, VERY_LOW_BUT_NOT_LOWEST ]);
      expect(populated).toEqual([ 'DDDDDDDDDDDEa', 'DDDDDDDDDDDa', VERY_LOW_BUT_NOT_LOWEST ]);
      _assertSortKeyOrder(populated);
    });

    it('populates a trailing missing key', () => {
      const populated = sortKeyPopulateMissing([ SORT_KEY_HIGHEST, MISSING ]);
      expect(populated).toEqual([ SORT_KEY_HIGHEST, 'cFa' ]);
      _assertSortKeyOrder(populated);
    });

    it('populates multiple trailing missing keys', () => {
      const populated = sortKeyPopulateMissing([ SORT_KEY_HIGHEST, MISSING, MISSING ]);
      expect(populated).toEqual([ SORT_KEY_HIGHEST, 'cFa', 'caba' ]);
      _assertSortKeyOrder(populated);
    });

    it('populates a bounded missing key', () => {
      const populated = sortKeyPopulateMissing([ 'DEF', MISSING, 'abc' ]);
      expect(populated).toEqual([ 'DEF', 'FDDa', 'abc' ]);
      _assertSortKeyOrder(populated);
    });

    it('populates a hot mess of missing keys', () => {
      const populated = sortKeyPopulateMissing([
        MISSING, MISSING, 'F', MISSING, MISSING, 'a', MISSING, MISSING,
      ]);
      expect(populated).toEqual([
        // it('retains the order of the Array')
        'Da', 'E', 'F', 'FEa', 'Fa', 'a', 'b', 'ba',
      ]);
      _assertSortKeyOrder(populated);
    });

    it('has no tolerance for mis-ordered input', () => {
      expect(() => {
        sortKeyPopulateMissing([ SORT_KEY_HIGHEST, MISSING, SORT_KEY_LOWEST ])
      }).toThrow(/not in sorted order/);
    });

    it('does not mutate the input', () => {
      const INPUT = [ SORT_KEY_LOWEST, MISSING, SORT_KEY_HIGHEST ];
      const populated = sortKeyPopulateMissing(INPUT);

      expect(populated).not.toEqual(INPUT);
      expect(INPUT).toEqual([ SORT_KEY_LOWEST, MISSING, SORT_KEY_HIGHEST ]);
    });
  });
});
