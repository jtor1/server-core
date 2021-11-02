import uuidV4 from 'uuid/v4';

import {
  NULL_STRING,
  isUUID,
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
});
