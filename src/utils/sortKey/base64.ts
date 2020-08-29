/*
  sortKeys Provider for base 64 charset
    @see joy.git:modules/app-server-api/handlers/gqlResolvers/event/rsvpQuestions/_sortKeyUtils.js

  the "lowest" boundary of '=' is NOT related to Firebase sub-Document key ordering
    eg. values like '-LjN2mn_q3s2m-MK-cXk'
    @Kaiwalya suggested that it might be, but it doesn't make sense
    because behavior close to the lower bound -- eg. '-01', '-yz' -- would be unpredictable
*/
import {
  NO_KEY,
  SortKeyProvider,
} from './provider';


const singleton = new SortKeyProvider({
  chars: '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
});

export const {
  SORT_KEY_LOWEST,
  SORT_KEY_HIGHEST,

  sortKeyBetween,
  sortKeyInitialItem,
  sortKeyAtFirstBefore,
  sortKeyAtLastAfter,
  sortKeyComparator,
  sortKeyPopulateMissing,
} = singleton;


export function sortKeyFromPaddedNumeric(key: string): string {
  return (key
    ? key.replace(/ /g, '-') // member of our charset (radix)
    : NO_KEY
  );
}
