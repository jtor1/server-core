import { gql, IResolvers } from 'apollo-server';
import moment, { Moment } from 'moment-timezone';
import chroma from 'chroma-js';
import { Context } from 'src/server/apollo.context';

const UTC_LONG = 'Etc/UTC';
const UTC_SHORT = 'UTC';

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

  "An ISO-8601 timestamp"
  scalar Timestamp

  type Date {
    dateString(dateFormat: DateFormat, timeFormat: TimeFormat): String!
    timezone(format: TimezoneFormat): String!
    timestamp: Timestamp!
    "A Unix timestamp / epoch"
    unixTimestamp: Int!
    "A timestamp in milliseconds; Float is used here to avoid 32-bit precision limits on Int"
    milliseconds: Float!
  }

`;

const convertDate = (date: string | [string, string]): Moment => {
  if (Array.isArray(date)) {
    return moment.tz(date[0], date[1]);
  } else {
    return moment.tz(date, UTC_LONG);
  }
}

enum TimezoneFormat {
  long = 'long',
  short = 'short',
}

enum DateFormat {
  numerical = 'numerical',
  short = 'short',
  long = 'long',
  full = 'full',
}

enum TimeFormat {
  time = 'time',
  timeWithSeconds = 'timeWithSeconds',
}

const convertEnumToMomentFormat = (format?: DateFormat | TimeFormat) => {
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

export type CoreTypeDate = [ string, string ] | string | null;

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
    timestamp: (date: string | [string, string]) => {
      const convertedDate = convertDate(date);
      return convertedDate.toISOString();
    },
    timezone:(date: string | [string, string], args: { format: TimezoneFormat }) => {
      const { format } = args;
      const convertedDate = convertDate(date);
      if (format === TimezoneFormat.short) {
        return convertedDate.zoneAbbr() || UTC_SHORT;
      } else {
        return convertedDate.tz() || UTC_LONG;
      }
    },
    unixTimestamp: (date: string | [string, string]) => {
      const convertedDate = convertDate(date);
      return convertedDate.unix();
    },
    milliseconds: (date: string | [string, string]) => {
      const convertedDate = convertDate(date);
      return convertedDate.valueOf();
    },
    dateString: (date: string | [string, string], args: { dateFormat?: DateFormat, timeFormat?: TimeFormat }, context: Context) => {
      const convertedDate = convertDate(date);
      const dateFormat = convertEnumToMomentFormat(args.dateFormat)
      const timeFormat = convertEnumToMomentFormat(args.timeFormat)
      if (dateFormat && timeFormat) {
        return convertedDate.locale(context.locale).format(dateFormat) + ' ' + convertedDate.locale(context.locale).format(timeFormat);
      } else if (dateFormat) {
        return convertedDate.locale(context.locale).format(dateFormat);
      } else if (timeFormat) {
        return convertedDate.locale(context.locale).format(timeFormat);
      } else {
        const full = convertEnumToMomentFormat(DateFormat.full);
        return convertedDate.locale(context.locale).format(full);
      }
    },
  },
  Color: {
    hex: (color) => {
      return chroma(color).hex();;
    },
    rgba: (color) => {
      return chroma(color).rgba();
    },
    isLight: (color) => {
      return (chroma.distance('#fff', color) < 50);
    }
  }
}
