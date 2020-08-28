/*
  a Provider Class for String-based sortKeys
    @see joy.git:modules/app-server-api/handlers/gqlResolvers/event/rsvpQuestions/_sortKeyUtils.js

  it performs "Fractional Indexing" implementation using Strings
*/
interface ISortKeyProviderOptions {
  chars: string;
};

export const NO_KEY: string = '';

export class SortKeyProvider {
  private _CHARS: string;
  private _RADIX: number;
  private _DIGIT_TO_CHAR_ARRAY: string[];
  private _CHAR_TO_DIGIT_MAP: Map<string, number>;
  public SORT_KEY_LOWEST: string;
  public SORT_KEY_HIGHEST: string;

  constructor(options: ISortKeyProviderOptions) {
    const { chars } = options;
    const charsArray = Array.from(chars);

    // you cannot use String#localeCompare on sortKeys
    //   because #localeCompare may be case-insensitive (vs. lexicographical);
    //   @see #sortKeyComparator
    //   also ... DO NOT TRUST a database sort order either!
    if (charsArray.sort().join('') !== chars) {
      throw new Error('SortKeyProvider: { chars } must be in standard lexicographical order');
    };

    // private
    this._CHARS = chars;
    this._RADIX = chars.length;
    this._DIGIT_TO_CHAR_ARRAY = charsArray.map(c => c.charCodeAt(0)).map(c => String.fromCharCode(c));

    const charToDigitTuples: Array<[string, number]> = this._DIGIT_TO_CHAR_ARRAY.map((c: string, i: number): [ string, number ] => [c, i]);
    this._CHAR_TO_DIGIT_MAP = new Map<string, number>(charToDigitTuples);

    this._charToDigit = this._charToDigit.bind(this);
    this._digitToChar = this._digitToChar.bind(this);

    // public
    const { _digitToChar } = this;
    this.SORT_KEY_LOWEST = _digitToChar(0);
    this.SORT_KEY_HIGHEST = _digitToChar(this._RADIX - 1); // technically, a "high-water mark"; but you *can* go higher

    // public + pre-bound
    //   to support an 'export' singleton + 'import' deconstruction pattern
    //   (which is also why the method names are so long)
    this.sortKeyBetween = this.sortKeyBetween.bind(this);
    this.sortKeyInitialItem = this.sortKeyInitialItem.bind(this);
    this.sortKeyAtFirstBefore = this.sortKeyAtFirstBefore.bind(this);
    this.sortKeyAtLastAfter = this.sortKeyAtLastAfter.bind(this);
    this.sortKeyComparator = this.sortKeyComparator.bind(this);
    this.sortKeyPopulateMissing = this.sortKeyPopulateMissing.bind(this);
  }


  private _charToDigit(c: string): number {
    const i = this._CHAR_TO_DIGIT_MAP.get(c);
    if (i === undefined) {
      throw new Error(`SortKeyProvider#this._charToDigit: Invalid character: ${ c }`);
    }
    return i;
  }

  private _digitToChar(i: number): string {
    const c = this._DIGIT_TO_CHAR_ARRAY[i];
    if (c === undefined) {
      throw new Error(`SortKeyProvider#_digitToChar: Invalid digit: ${ i }`);
    }
    return c;
  }

  private _stringToDigitArray(str: string): number[] {
    return Array.from(str).map(this._charToDigit);
  }

  // to support a non-strict upper bound
  // examples, given 'a'-'z' as `_CHARS`:
  //   '' => 'z'
  //   'z' => 'zz'
  //   'zzab' => 'zzzzz' // may seem excessive, but it's needed
  public _upperBoundSortKeyAfter(key: string): string {
    const { SORT_KEY_HIGHEST } = this;
    const keySafe = (key || NO_KEY);
    let precision = 0;
    while (keySafe.charAt(precision) === SORT_KEY_HIGHEST) {
      precision += 1;
    }
    return (new Array(precision + 1)).fill(SORT_KEY_HIGHEST).join('');
  }

  private _sortKeyBetween(s1: string, s2: string): string {
    const { _RADIX, _digitToChar } = this;
    const arr1 = this._stringToDigitArray(s1);
    const arr2 = this._stringToDigitArray(s2);

    const arrSum = [];
    let decimalPointAdjust = 0;
    let sumCarry = 0;
    for (let i = Math.max(s1.length, s2.length) - 1; i >= 0; i--) {
      let d1 = (i < arr1.length) ? arr1[i] : 0;
      let d2 = (i < arr2.length) ? arr2[i] : 0;
      let tempSum = d1 + d2 + sumCarry;
      arrSum.unshift(tempSum % _RADIX);
      sumCarry = Math.floor(tempSum / _RADIX);
    }

    while(sumCarry !== 0) {
      arrSum.unshift(sumCarry % _RADIX);
      sumCarry = Math.floor(sumCarry / _RADIX);
      decimalPointAdjust++;
    }

    const arrMid = [];
    let remainder = 0;
    for (let i = 0; i < (arrSum.length + ((remainder === 0) ? 0 : 1)); i++) {
      var numberToDivide = remainder * _RADIX + (i < arrSum.length ? arrSum[i] : 0);
      remainder = numberToDivide % 2;
      const ans = Math.floor(numberToDivide/2);
      arrMid.push(ans);
    }

    while(arrMid[arrMid.length - 1] === 0) {
      arrMid.pop();
    }

    while(decimalPointAdjust > 0) {
      decimalPointAdjust--;
      let discard = arrMid.shift();
    }

    const sMid = arrMid.map(_digitToChar).join('');
    return sMid;
  }


  /**
   * Gets you the hypothetical sortKey which consistently sort
   * above `keyLess` and below `keyMore`.
   */
  public sortKeyBetween(keyLess: string, keyMore: string): string {
    const { SORT_KEY_LOWEST, SORT_KEY_HIGHEST } = this;
    if(!keyLess) {
      keyLess = SORT_KEY_LOWEST + (keyMore ? keyMore : NO_KEY);
    }
    if (!keyMore) {
      keyMore = this._upperBoundSortKeyAfter(keyLess);
    }

    switch (this.sortKeyComparator(keyLess, keyMore)) {
      case 1:
        throw new Error(`SortKeyProvider#sortKeyBetween: "${ keyLess }" and "${ keyMore }" are not in sorted order`);
      case 0:
        throw new Error(`SortKeyProvider#sortKeyBetween: "${ keyLess }" and "${ keyMore }" are identical`);
    }

    // algorithmic safety net
    const keyBetween = this._sortKeyBetween(keyLess, keyMore);
    const expected = [ keyLess, keyMore, keyBetween ].sort()[1];
    if (expected !== keyBetween) {
      throw new Error(`SortKeyProvider#sortKeyBetween: generated "${ keyBetween }" is not between "${ keyLess }" and "${ keyMore }"`);
    }

    return keyBetween;
  }

  /**
   * Returns a sortKey suitable for the first and only item in a new list.
   */
  public sortKeyInitialItem(): string {
    return this.sortKeyBetween(this.SORT_KEY_LOWEST, this.SORT_KEY_HIGHEST);
  }

  /**
   * Returns a sortKey suitable for the an item which will be the first in a list
   * which already has at least one other item.
   */
  public sortKeyAtFirstBefore(keyMore: string): string {
    return this.sortKeyBetween(this.SORT_KEY_LOWEST, keyMore);
  }

  /**
   * Returns a sortKey suitable for the an item which will be the first in a list
   * which already has at least one other item.
   */
  public sortKeyAtLastAfter(keyLess: string): string {
    // logic to support no upper bound constraints;
    //   any leading SORT_KEY_HIGHEST indicates a "high-water mark"; 'z', 'zz', 'z-zzz', etc.
    //   generating a sortKey between that and SORT_KEY_HIGHEST would cause a strict upper bound failure
    const { SORT_KEY_HIGHEST } = this;
    const keyMore = this._upperBoundSortKeyAfter(keyLess);
    return this.sortKeyBetween(keyLess, keyMore);
  }

  /**
   * A comparator used to provide consistent ordering by sortKeys.
   */
  public sortKeyComparator(s1: string, s2: string): number {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Comparison_Operators
    //   "Strings are compared based on standard lexicographical ordering, using Unicode values."
    const safe1 = (s1 || NO_KEY);
    const safe2 = (s2 || NO_KEY);
    if (safe1 === safe2) {
      return 0;
    }
    return (safe1 > safe2) ? 1 : -1;
  }

  /**
   * Takes an Array of `sortKeys` --
   * which are **pre-sorted**, and may have gaps (eg. false-y values) --
   * and returns an Array which fills in any of those missing `sortKey`s.
   */
  public sortKeyPopulateMissing(preorderedSortKeys: string[]): string[] {
    // let's get this out of the way
    const length = preorderedSortKeys.length;
    if (length === 0) {
      return preorderedSortKeys;
    }

    const mutableSortKeys = preorderedSortKeys.slice();
    let goesAfter: string = NO_KEY;
    let lastMissing: number = -1;

    // incrementally fill right-to-left up to each known boundary
    for (let index = 0; index < length; index += 1) {
      const sortKey = mutableSortKeys[index];
      if (! sortKey) {
        if (lastMissing === -1) {
          lastMissing = index; // the backfill starts here
        }
        continue;
      }

      if (lastMissing !== -1) {
        let goesBefore = sortKey;
        for (let fill = index - 1; fill >= lastMissing; fill -= 1) {
          const generated = (goesAfter
            ? this.sortKeyBetween(goesAfter, goesBefore)
            : this.sortKeyAtFirstBefore(goesBefore) // we haven't found a lower boundary yet
          )
          mutableSortKeys[fill] = generated;
          goesBefore = generated;
        }

        lastMissing = -1; // we're all full up to this point
      }

      goesAfter = sortKey; // a lower boundary
    }

    if (lastMissing === -1)  {
      // we've filled it
      return mutableSortKeys;
    }

    if (! goesAfter) {
      // it's completely empty, so we gotta start *somewhere*
      goesAfter = this.sortKeyInitialItem();
      mutableSortKeys[lastMissing] = goesAfter;
      lastMissing += 1;
    }

    // populate any trailing misses
    for (let fill = lastMissing; fill < length; fill += 1) {
      const generated = this.sortKeyAtLastAfter(goesAfter);
      mutableSortKeys[fill] = generated;
      goesAfter = generated;
    }

    return mutableSortKeys;
  }
}
