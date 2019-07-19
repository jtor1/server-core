/*
  numeric keys, left-padded with spaces
    @see joy.git:modules/app-server-api/handlers/gqlResolvers/event/rsvpQuestions/_sortKeyUtils.js

  do NOT try to `parseInt(sortKey)`
    because spaces could appear anywhere
    so, yeah ... "left-padded" is kind of a lie,
    but simple values such as '  0'..'999' would sort as expected
*/
import { SortKeyProvider } from './provider';

const singleton = new SortKeyProvider({
  chars: ' 0123456789',
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
