import {
  Context,
  createContext,
} from '../server/apollo.context';
import {
  TimezoneFormat,
  DateFormat,
  TimeFormat,

  resolveCoreTypeDate,
  parseCoreTypeInputDate,
  formatCoreTypeDateTimestamp,
  parseCoreTypeInputDateAndTimezone,
  parseCoreTypeInputTimezone,

  coreResolvers,
} from './core.types';

const EPOCH = 1478677500;
const MILLIS = EPOCH * 1000;
const DATE = new Date(MILLIS);
const DATE_ISO = '2016-11-09T07:45:00.000Z';  // without offset
const TZ_QUEBECOIS = 'America/Montreal'; // IANA code
const LOCALE_QUEBECOIS = 'fr-CA'; // IETF code
const TIMEZONE = 'America/Montreal'
const FULL_TIMESTAMP = "2016-11-09T00:00:00.000-05:00"
const TRUNC_TIMESTAMP = '2016-11-09'


describe('graphql/core.types', () => {
  describe('resolveCoreTypeDate', () => {
    it('returns a coreTypeDef reference', () => {
      expect(resolveCoreTypeDate(DATE, TZ_QUEBECOIS)).toEqual([ DATE_ISO, TZ_QUEBECOIS ]);
    });

    it('returns a coreTypeDef reference without a timezone', () => {
      expect(resolveCoreTypeDate(DATE)).toEqual(DATE_ISO);
    });

    it('returns no coreTypeDef reference without any useful information', () => {
      expect(resolveCoreTypeDate(undefined, undefined)).toBeNull();
      expect(resolveCoreTypeDate(undefined, TZ_QUEBECOIS)).toBeNull();
    });
  });


  describe('parseCoreTypeDateInput', () => {
    it('tolerates lack-of-input', () => {
      expect(parseCoreTypeInputDate(undefined)).toBeUndefined();
      expect(parseCoreTypeInputDate(null)).toBeUndefined();
      expect(parseCoreTypeInputDate('')).toBeUndefined();
    });

    it('parses an ISO-8601 Date string', () => {
      expect(parseCoreTypeInputDate(DATE_ISO)!.valueOf()).toBe(MILLIS);
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
    it ('cannot format a truncated timestamp without a timezone', () => {
      expect(() => {
        return parseCoreTypeInputDate(TRUNC_TIMESTAMP);
      }).toThrow(TypeError);
    });
  });

  describe('parseCoreTypeInputTimezone', () => {
    it ('returns the timezone if valid', () => {
        expect(parseCoreTypeInputTimezone('America/Montreal')).toBe('America/Montreal');
    });
    it ('does not tolerate invalid timezones', () => {
        expect(() => {
            return parseCoreTypeInputTimezone('INVALID_TIMEZONE');
        }).toThrow(TypeError);
    })
  });


  describe('formatCoreTypeDateTimestamp', () => {
    it('outputs the same format as `Date.timestamp`', () => {
      expect(formatCoreTypeDateTimestamp(MILLIS, 'Etc/UTC')).toBe('2016-11-09T07:45:00.000+00:00');

      expect(formatCoreTypeDateTimestamp(DATE, TZ_QUEBECOIS)).toBe('2016-11-09T02:45:00.000-05:00');
      expect(formatCoreTypeDateTimestamp(DATE_ISO, TZ_QUEBECOIS)).toBe('2016-11-09T02:45:00.000-05:00');
    });

    it('does not tolerate invalid dates', () => {
      expect(() => formatCoreTypeDateTimestamp('INVALID', TZ_QUEBECOIS)).toThrow(TypeError);
      expect(() => formatCoreTypeDateTimestamp(Number.MIN_SAFE_INTEGER, TZ_QUEBECOIS)).toThrow(TypeError);
    });

    it('does not tolerate invalid timezones', () => {
      expect(() => formatCoreTypeDateTimestamp(MILLIS, 'INVALID')).toThrow(TypeError);
    });
  });

  describe('parseCoreTypeInputDateAndTimezone', () => {
    it ('is able to format truncated timestamps', () => {

        expect(parseCoreTypeInputDateAndTimezone(TRUNC_TIMESTAMP, TIMEZONE))
        .toStrictEqual(new Date("2016-11-09T00:00:00.000-05:00"))

        // it('fails on truncated date variants')
        const VARIANT_TIMESTAMP = '2016-2-9'
        expect(() => {
            parseCoreTypeInputDateAndTimezone(VARIANT_TIMESTAMP, TIMEZONE)
        })
        .toThrow(TypeError)
    });
    it ('works for fully formatted timestamps', () => {

        expect(parseCoreTypeInputDateAndTimezone(FULL_TIMESTAMP, TIMEZONE))
        .toStrictEqual(new Date(FULL_TIMESTAMP));

    });
    it ('fails if there is a timezone but no date', () => {
      expect(() => {
        parseCoreTypeInputDateAndTimezone(undefined, TIMEZONE)
      })
      .toThrow(TypeError);
    })
    it ('fails if date is invalid CoreTypeTimestamp format', () => {
        const INVALID_DATE = '2016/11/09T00:00:00.000-05:00'
        expect(() => {
            parseCoreTypeInputDateAndTimezone(INVALID_DATE, TIMEZONE)
        })
        .toThrow(TypeError);

    });
    it ('fails if a date is out of bounds for month', () => {
        const INVALID_DATE = '2020-13-01'
        expect(() => {
            parseCoreTypeInputDateAndTimezone(INVALID_DATE, TIMEZONE)
        })
        .toThrow(TypeError);
    });

    it ('fails if a date is out of bounds for day', () => {
      const INVALID_DATE = '2020-12-32'
      expect(() => {
          parseCoreTypeInputDateAndTimezone(INVALID_DATE, TIMEZONE)
      })
      .toThrow(TypeError);
  });

});


  describe('coreResolvers', () => {
    describe('Date', () => {
      const DATE_AND_TZ = [ DATE_ISO, TZ_QUEBECOIS ];
      const TZ_UTC = 'Etc/UTC';
      const TZ_SAME_AS_GMT = 'Atlantic/Reykjavik';
      const TZ_EARILER_THAN_GMT_NON_HOUR = 'Asia/Calcutta';
      const INVALID_DATE = 'BAD';
      const INVALID_DATE_AND_TZ = [ 'BAD', 'WORSE' ];
      const INVALID_TZ = [ DATE_ISO, 'WORSE' ];
      const resolver = coreResolvers.Date as any;

      describe('#timestamp', () => {
        it('resolves a CoreTypeDate as an ISO-8601 string', () => {
          const asGMT = resolver.timestamp(DATE_ISO);
          expect(asGMT).toBe('2016-11-09T07:45:00.000+00:00');
          // it('resolves a parseable ISO-8601 string / can eat its own dogfood')
          expect(parseCoreTypeInputDate(asGMT)!.valueOf()).toBe(MILLIS);

          const withOffset = resolver.timestamp(DATE_AND_TZ);
          expect(withOffset).toBe('2016-11-09T02:45:00.000-05:00');
          expect(parseCoreTypeInputDate(withOffset)!.valueOf()).toBe(MILLIS);
        });

        it('resolves millisecond precision', () => {
          const halfSecondLater = MILLIS + 500;
          const withMilliPrecision = new Date(halfSecondLater).toISOString();
          const timestamp = resolver.timestamp(withMilliPrecision);
          expect(timestamp).toBe('2016-11-09T07:45:00.500+00:00');

          // it('resolves a parseable ISO-8601 string / can eat its own dogfood')
          const dogfood = new Date(timestamp).valueOf();
          expect(dogfood).toBe(halfSecondLater);
        });

        it('resolves its timezone offset as a parseable representation', () => {
          expect(resolver.timestamp(DATE_ISO).endsWith('+00:00')).toBe(true);
          expect(resolver.timestamp(DATE_AND_TZ).endsWith('-05:00')).toBe(true);

          // it('resolves the offset for a GMT+00:00 timezone which is *not* Etc/UTC')
          expect(resolver.timestamp([ DATE_ISO, TZ_SAME_AS_GMT ]).endsWith('+00:00')).toBe(true);

          // it('resolves the offset for a timezone earlier than GMT and not aligned to the hour')
          expect(resolver.timestamp([ DATE_ISO, TZ_EARILER_THAN_GMT_NON_HOUR ]).endsWith('+05:30')).toBe(true);
        });

        it('falls back to the Epoch for an unparseable Date', () => {
          // ... which may or may not be appropriate
          expect(resolver.timestamp(INVALID_DATE)).toBe('1970-01-01T00:00:00.000+00:00');
          expect(resolver.timestamp(INVALID_DATE_AND_TZ)).toBe('1970-01-01T00:00:00.000+00:00');
        });

        it('falls back to GMT for an invalid timezone', () => {
          // ... which may or may not be appropriate
          expect(resolver.timestamp(INVALID_TZ)).toBe('2016-11-09T07:45:00.000+00:00');
        });
      });

      describe('#timezone', () => {
        const ARGS_LONG = { format: TimezoneFormat.long };
        const ARGS_SHORT = { format: TimezoneFormat.short };

        it('resolves the timezone provided', () => {
          expect(resolver.timezone(DATE_AND_TZ, ARGS_LONG)).toBe(TZ_QUEBECOIS);
          expect(resolver.timezone(DATE_AND_TZ, ARGS_SHORT)).toBe('EST');

          expect(resolver.timezone([ DATE_ISO, TZ_UTC ], ARGS_LONG)).toBe(TZ_UTC);
          expect(resolver.timezone([ DATE_ISO, TZ_UTC ], ARGS_SHORT)).toBe('UTC');

          expect(resolver.timezone([ DATE_ISO, TZ_SAME_AS_GMT ], ARGS_LONG)).toBe(TZ_SAME_AS_GMT);
          expect(resolver.timezone([ DATE_ISO, TZ_SAME_AS_GMT ], ARGS_SHORT)).toBe('GMT');

          expect(resolver.timezone([ DATE_ISO, TZ_EARILER_THAN_GMT_NON_HOUR ], ARGS_LONG)).toBe(TZ_EARILER_THAN_GMT_NON_HOUR);
          expect(resolver.timezone([ DATE_ISO, TZ_EARILER_THAN_GMT_NON_HOUR ], ARGS_SHORT)).toBe('IST');
        });

        it('falls back to UTC in the absence of a timezone', () => {
          expect(resolver.timezone(DATE_ISO, ARGS_LONG)).toBe(TZ_UTC);
          expect(resolver.timezone(DATE_ISO, ARGS_SHORT)).toBe('UTC');
        });

        it('falls back to the Epoch for an unparseable Date', () => {
          // ... which may or may not be appropriate
          expect(resolver.timezone(INVALID_DATE, ARGS_LONG)).toBe(TZ_UTC);
          expect(resolver.timezone(INVALID_DATE_AND_TZ, ARGS_LONG)).toBe(TZ_UTC);
        });

        it('falls back to GMT for an invalid timezone', () => {
          // ... which may or may not be appropriate
          expect(resolver.timezone(INVALID_TZ, ARGS_LONG)).toBe(TZ_UTC);
        });
      });

/*
      // TODO
      //   @see ENG-746 is it safe for us to change "core" Enums

      describe('#utcOffset', () => {
        it('resolves the offset for the timezone provided', () => {
          expect(resolver.utcOffset(DATE_AND_TZ)).toBe(-300);
          expect(resolver.utcOffset([ DATE_ISO, TZ_UTC ])).toBe(0);
          expect(resolver.utcOffset([ DATE_ISO, TZ_SAME_AS_GMT ])).toBe(0);
          expect(resolver.utcOffset([ DATE_ISO, TZ_EARILER_THAN_GMT_NON_HOUR ])).toBe(+330);
        });

        it('falls back to UTC in the absence of a timezone', () => {
          expect(resolver.utcOffset(DATE_ISO)).toBe(0);
        });

        it('falls back to the Epoch for an unparseable Date', () => {
          // ... which may or may not be appropriate
          expect(resolver.utcOffset(INVALID_DATE)).toBe(0);
          expect(resolver.utcOffset(INVALID_DATE_AND_TZ)).toBe(0);
        });

        it('falls back to GMT for an invalid timezone', () => {
          // ... which may or may not be appropriate
          expect(resolver.utcOffset(INVALID_TZ)).toBe(0);
        });
      });
*/

      describe('#unixTimestamp', () => {
        it('resolves the Unix epoch / number of seconds elapsed since 1970-01-01', () => {
          expect(resolver.unixTimestamp(DATE_ISO)).toBe(EPOCH);
          expect(resolver.unixTimestamp(DATE_AND_TZ)).toBe(EPOCH);
        });

        it('falls back to the Epoch for an unparseable Date', () => {
          // ... which may or may not be appropriate
          expect(resolver.unixTimestamp(INVALID_DATE)).toBe(0);
          expect(resolver.unixTimestamp(INVALID_DATE_AND_TZ)).toBe(0);
        });

        it('falls back to GMT for an invalid timezone', () => {
          // ... which may or may not be appropriate
          expect(resolver.unixTimestamp(INVALID_TZ)).toBe(EPOCH);
        });
      });

      describe('#milliseconds', () => {
        it('resolves the number of milliseconds elapsed since 1970-01-01', () => {
          expect(resolver.milliseconds(DATE_ISO)).toBe(MILLIS);
          expect(resolver.milliseconds(DATE_AND_TZ)).toBe(MILLIS);
        });

        it('falls back to the Epoch for an unparseable Date', () => {
          // ... which may or may not be appropriate
          expect(resolver.milliseconds(INVALID_DATE)).toBe(0);
          expect(resolver.milliseconds(INVALID_DATE_AND_TZ)).toBe(0);
        });

        it('falls back to GMT for an invalid timezone', () => {
          // ... which may or may not be appropriate
          expect(resolver.milliseconds(INVALID_TZ)).toBe(MILLIS);
        });
      });

      describe('#dateString', () => {
        const CONTEXT = createContext() as Context;
        expect(CONTEXT.locale).toBe('en_US');

        const ARGS_FALLBACK = {};
        const ARGS_DATE_SHORT = { dateFormat: DateFormat.short };
        const ARGS_TIME_SECONDS = { timeFormat: TimeFormat.timeWithSeconds };
        const ARGS_DATE_SHORT_TIME_SECONDS = { ...ARGS_DATE_SHORT, ...ARGS_TIME_SECONDS };

        it('falls back to the the full format', () => {
          expect(resolver.dateString(DATE_ISO, ARGS_FALLBACK, CONTEXT)).toBe('Wednesday, November 9, 2016 7:45 AM');
          expect(resolver.dateString(DATE_AND_TZ, ARGS_FALLBACK, CONTEXT)).toBe('Wednesday, November 9, 2016 2:45 AM');
        });

        it('resolves a specified Date format', () => {
          expect(resolver.dateString(DATE_ISO, ARGS_DATE_SHORT, CONTEXT)).toBe('Nov 9, 2016');
          expect(resolver.dateString(DATE_AND_TZ, ARGS_DATE_SHORT, CONTEXT)).toBe('Nov 9, 2016');
        });

        it('resolves a specified Time format', () => {
          expect(resolver.dateString(DATE_ISO, ARGS_TIME_SECONDS, CONTEXT)).toBe('7:45:00 AM');
          expect(resolver.dateString(DATE_AND_TZ, ARGS_TIME_SECONDS, CONTEXT)).toBe('2:45:00 AM');
        });

        it('resolves a specified Date + Time format', () => {
          expect(resolver.dateString(DATE_ISO, ARGS_DATE_SHORT_TIME_SECONDS, CONTEXT)).toBe('Nov 9, 2016 7:45:00 AM');
          expect(resolver.dateString(DATE_AND_TZ, ARGS_DATE_SHORT_TIME_SECONDS, CONTEXT)).toBe('Nov 9, 2016 2:45:00 AM');
        });

        it('leverages the Context locale', () => {
          const QUEBECOIS = createContext({ locale: LOCALE_QUEBECOIS });

          expect(resolver.dateString(DATE_AND_TZ, ARGS_FALLBACK, QUEBECOIS)).toBe('mercredi 9 novembre 2016 02:45');
          expect(resolver.dateString(DATE_AND_TZ, ARGS_DATE_SHORT, QUEBECOIS)).toBe('9 nov. 2016');
          expect(resolver.dateString(DATE_AND_TZ, ARGS_TIME_SECONDS, QUEBECOIS)).toBe('02:45:00');
          expect(resolver.dateString(DATE_AND_TZ, ARGS_DATE_SHORT_TIME_SECONDS, QUEBECOIS)).toBe('9 nov. 2016 02:45:00');
        });

        it('falls back to the Epoch for an unparseable Date', () => {
          // ... which may or may not be appropriate
          expect(resolver.dateString(INVALID_DATE, ARGS_FALLBACK, CONTEXT)).toBe('Thursday, January 1, 1970 12:00 AM');
          expect(resolver.dateString(INVALID_DATE_AND_TZ, ARGS_FALLBACK, CONTEXT)).toBe('Thursday, January 1, 1970 12:00 AM');
        });

        it('falls back to GMT for an invalid timezone', () => {
          // ... which may or may not be appropriate
          expect(resolver.dateString(INVALID_TZ, ARGS_FALLBACK, CONTEXT)).toBe('Wednesday, November 9, 2016 7:45 AM');
        });
      });
    });


    describe('Color', () => {
      // PANTONE 17-1937 TCX Hot Pink
      const COLOR_HEX = '#e55982';
      const COLOR_NUMERIC = 0xE55982;
      const COLOR_RGBA = [ 229, 89, 130, 1 ];
      const resolver = coreResolvers.Color as any;

      describe('#hex', () => {
        it('resolves the hex value of a Color', () => {
          expect(resolver.hex(COLOR_HEX)).toBe(COLOR_HEX);
          expect(resolver.hex(COLOR_NUMERIC)).toBe(COLOR_HEX);
        });

        it('falls back to black for an invalid Color', () => {
          expect(resolver.hex('INVALID')).toBe('#000000');
        });
      });

      describe('#rgba', () => {
        it('resolves the RGBA values of a Color', () => {
          expect(resolver.rgba(COLOR_HEX)).toEqual(COLOR_RGBA);
          expect(resolver.rgba(COLOR_NUMERIC)).toEqual(COLOR_RGBA);
        });

        it('falls back to black for an invalid Color', () => {
          expect(resolver.rgba('INVALID')).toEqual([ 0, 0, 0, 1 ]);
        });
      });

      describe('#isLight', () => {
        it('resolves true for a light Color', () => {
          expect(resolver.isLight(COLOR_HEX)).toBe(false);

          expect(resolver.isLight('#000')).toBe(false);
          expect(resolver.isLight('#fff')).toBe(true);
        });

        it('falls back to black for an invalid Color', () => {
          expect(resolver.isLight('INVALID')).toBe(false);
        });
      });
    });
  });
});
