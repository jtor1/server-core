import {
  resolveCoreTypeDate,
  parseCoreTypeInputDate,
} from './core.types';

const DATE = new Date(1478676600500);
const DATE_ISO = '2016-11-09T07:30:00.500Z';
const TZ_IANA = 'America/Montreal'; // IANA code, aligns with locale = 'fr-CA'

describe('graphql/core.types', () => {
  describe('resolveCoreTypeDate', () => {
    it('returns a coreTypeDef reference', () => {
      expect(resolveCoreTypeDate(DATE, TZ_IANA)).toEqual([ DATE_ISO, TZ_IANA ]);
    });

    it('returns a coreTypeDef reference without a timezone', () => {
      expect(resolveCoreTypeDate(DATE)).toEqual(DATE_ISO);
    });

    it('returns no coreTypeDef reference without any useful information', () => {
      expect(resolveCoreTypeDate(undefined, undefined)).toBeNull();
      expect(resolveCoreTypeDate(undefined, TZ_IANA)).toBeNull();
    });
  });

  describe('parseCoreTypeDateInput', () => {
    it('tolerates lack-of-input', () => {
      expect(parseCoreTypeInputDate(undefined)).toBeUndefined();
      expect(parseCoreTypeInputDate(null)).toBeUndefined();
      expect(parseCoreTypeInputDate('')).toBeUndefined();
    });

    it('parses an ISO-8601 Date string', () => {
      expect(parseCoreTypeInputDate(DATE_ISO)!.valueOf()).toBe(DATE.valueOf());
    });

    it('fails to parse a non-ISO-8601 string', () => {
      expect(() => {
        return parseCoreTypeInputDate('INVALID');
      }).toThrow(TypeError);

      expect(() => {
        return parseCoreTypeInputDate(' ');
      }).toThrow(TypeError);

      expect(() => {
        return parseCoreTypeInputDate(DATE.toString());
      }).toThrow(TypeError);

      expect(() => {
        return parseCoreTypeInputDate(DATE.toLocaleString());
      }).toThrow(TypeError);
    });
  });
});
