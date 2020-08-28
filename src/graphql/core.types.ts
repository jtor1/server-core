import { gql, IResolvers } from 'apollo-server';
import moment, { Moment } from 'moment-timezone';
import chroma, { Color } from 'chroma-js';
import { Context } from 'src/server/apollo.context';

const UTC_LONG = 'Etc/UTC';
const UTC_SHORT = 'UTC';
const FORMAT_TIMESTAMP = 'YYYY-MM-DD[T]HH:mm:ssZ'; // ISO-8601, with '+00:00' (vs. 'Z') for GMT

export const coreTypeDefs = gql`

  type Color {
    hex: String!
    rgba: [Int!]!
    isLight: Boolean!
  }

  input LocationInput {
    placeId: String
    latitude: Float
    longitude: Float
    name: String
    address1: String
    address2: String
    city: String
    state: String
    country: String
    postalCode: String
  }

  type Location {
    placeId: String
    latitude: Float
    longitude: Float
    name: String
    address1: String
    address2: String
    city: String
    state: String
    country: String
    postalCode: String
  }

  enum TimezoneFormat {
    short
    long
  }

  enum DateFormat {
    numerical
    short
    long
    full
  }

  enum TimeFormat {
    time
    timeWithSeconds
  }

  "An ISO-8601 timestamp, with one-second precision, expressing its timezone offset"
  scalar Timestamp

  type Date {
    dateString(dateFormat: DateFormat, timeFormat: TimeFormat): String!
    "The timezone name"
    timezone(format: TimezoneFormat): String!
    # # TODO:  expose 'utcOffset'
    # #   @see ENG-746 is it safe for us to change "core" Enums
    # "The timezone offset from UTC, in minutes"
    # utcOffset: Int!
    "An ISO-8601 timestamp"
    timestamp: Timestamp!
    "A Unix timestamp / epoch"
    unixTimestamp: Int!
    "A timestamp in milliseconds; Float is used here to avoid 32-bit precision limits on Int"
    milliseconds: Float!
  }

`;


type _CoreTypeDateTuple = [ string, string ] | string;

const _FALLBACK_DATE = moment(0).tz(UTC_LONG);
function _convertDateTupleToMoment(dateTuple: _CoreTypeDateTuple): Moment {
  let converted;

  if (Array.isArray(dateTuple)) { // has a timezone
    const date = dateTuple[0];
    let timezone = dateTuple[1] || UTC_LONG; // empty-String protection

    if (! moment.tz.zone(timezone)) {
      // // resolve UTC (vs. throw) when parsing an invalid timezone
      // //   unlike ISO-8601 strings, they're "volatile"; could change, be deprecated, etc.
      // //   or worst of all, may already be invalid in pre-existing Customer data.
      // throw new TypeError(`Invalid timezone: ${ JSON.stringify(coreTypeDate) }`);
      timezone = UTC_LONG;
    }

    converted = moment.tz(date, timezone);
  }
  else { // Date-only => fall back to UTC
    converted = moment.tz(dateTuple, UTC_LONG);
  }

  if (! converted.isValid()) {
    // // resolve the Epoch / "Day 0" (vs. throw) when parsing an invalid Date
    // //   minimum impact on the overall Graph result,
    // //   since the Date may already be invalid in pre-existing Customer data.
    // throw new TypeError(`Invalid date: ${ JSON.stringify(dateTuple) }`);
    return _FALLBACK_DATE;
  }
  return converted;
}

const _FALLBACK_COLOR = chroma(0);
function _convertColorToChroma(color: string | number): Color {
  try {
    return chroma(color);
  }
  catch (error) {
    return _FALLBACK_COLOR;
  }
}

function _convertEnumToMomentFormat(format?: DateFormat | TimeFormat) {
  switch (format) {
    case TimeFormat.time: return 'LT';
    case TimeFormat.timeWithSeconds: return 'LTS';
    case DateFormat.numerical: return 'l';
    case DateFormat.short: return 'll';
    case DateFormat.long: return 'LL';
    case DateFormat.full: return 'LLLL';
    default: return undefined;
  }
}


export type CoreTypeDate = _CoreTypeDateTuple | null;

export enum TimezoneFormat {
  long = 'long',
  short = 'short',
}

export enum DateFormat {
  numerical = 'numerical',
  short = 'short',
  long = 'long',
  full = 'full',
}

export enum TimeFormat {
  time = 'time',
  timeWithSeconds = 'timeWithSeconds',
}

export function resolveCoreTypeDate(date: Date | undefined, timezone?: string): CoreTypeDate {
  if (date) {
    if (timezone) {
      return [ date.toISOString(), timezone ];
    }
    return date.toISOString(); // no timezone
  }
  return null; // no date
}

export function parseCoreTypeInputDate(input: string | null | undefined): Date | undefined {
  if (! input) {
    return undefined;
  }
  const parsed = moment(input, moment.ISO_8601);
  if (! parsed.isValid()) {
    throw new TypeError(`parseCoreTypeDateInput: invalid ISO-8601 Date: ${ JSON.stringify(input) }`)
  }
  return parsed.toDate();
}


export const coreResolvers: IResolvers = {
  Date: {
    timestamp: (date: _CoreTypeDateTuple): string => {
      const convertedDate = _convertDateTupleToMoment(date);
      return convertedDate.format(FORMAT_TIMESTAMP); // @see `scalar Timestamp`
    },
    timezone: (date: _CoreTypeDateTuple, args: { format: TimezoneFormat }): string => {
      const { format } = args;
      const convertedDate = _convertDateTupleToMoment(date);
      if (format === TimezoneFormat.short) {
        return convertedDate.zoneAbbr() || UTC_SHORT;
      } else {
        return convertedDate.tz() || UTC_LONG;
      }
    },
    // // TODO:  expose 'utcOffset'
    // //   @see ENG-746 is it safe for us to change "core" Enums
    // utcOffset: (date: _CoreTypeDateTuple): number => {
    //   const convertedDate = _convertDateTupleToMoment(date);
    //   return convertedDate.utcOffset();
    // },
    unixTimestamp: (date: _CoreTypeDateTuple): number => {
      const convertedDate = _convertDateTupleToMoment(date);
      return convertedDate.unix();
    },
    milliseconds: (date: _CoreTypeDateTuple): number => {
      const convertedDate = _convertDateTupleToMoment(date);
      return convertedDate.valueOf();
    },
    dateString: (date: _CoreTypeDateTuple, args: { dateFormat?: DateFormat, timeFormat?: TimeFormat }, context: Context): string => {
      const convertedDate = _convertDateTupleToMoment(date);
      const dateFormat = _convertEnumToMomentFormat(args.dateFormat)
      const timeFormat = _convertEnumToMomentFormat(args.timeFormat)
      if (dateFormat && timeFormat) {
        return convertedDate.locale(context.locale).format(dateFormat) + ' ' + convertedDate.locale(context.locale).format(timeFormat);
      } else if (dateFormat) {
        return convertedDate.locale(context.locale).format(dateFormat);
      } else if (timeFormat) {
        return convertedDate.locale(context.locale).format(timeFormat);
      } else {
        const full = _convertEnumToMomentFormat(DateFormat.full);
        return convertedDate.locale(context.locale).format(full);
      }
    },
  },
  Color: {
    hex: (color: string | number): string => {
      return _convertColorToChroma(color).hex();
    },
    rgba: (color: string | number): Array<number> => {
      return _convertColorToChroma(color).rgba();
    },
    isLight: (color: string | number): boolean => {
      const converted = _convertColorToChroma(color);
      return (chroma.distance('#fff', converted) < 50);
    }
  }
}
