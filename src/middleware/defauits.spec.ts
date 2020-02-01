import 'jest';

import {
  getDefaultMiddleware,
} from './defaults';


describe('middleware/defaults', () => {
  describe('getDefaultMiddleware', () => {
    it('returns "prelude" middleware', () => {
      const { preludesMap, preludes } = getDefaultMiddleware();

      const NAMES = [
        'corsMiddleware',
        'logger',
      ];
      expect(Array.from(preludesMap.keys())).toEqual(NAMES);

      // it('preserves the order of the mapping')
      expect( preludes.map((handler) => handler.name) ).toEqual(NAMES);
    });

    it('returns `body-parser` middleware', () => {
      const { bodyParsersMap, bodyParsers } = getDefaultMiddleware();

      const NAMES = [
        'jsonParser',
        'urlencodedParser',
      ];
      expect(Array.from(bodyParsersMap.keys())).toEqual(NAMES);

      // it('preserves the order of the mapping')
      expect( bodyParsers.map((handler) => handler.name) ).toEqual(NAMES);
    });

    it('returns Apollo-specific middleware', () => {
      const { apolloMap, apollo } = getDefaultMiddleware();

      const NAMES = [
        'bodyParserGraphql',
      ];
      expect(Array.from(apolloMap.keys())).toEqual(NAMES);

      // it('preserves the order of the mapping')
      expect( apollo.map((handler) => handler.name) ).toEqual(NAMES);
    });
  });
});
