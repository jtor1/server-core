import { gql, IResolvers } from 'apollo-server';
import moment from 'moment-timezone';
import chroma from 'chroma-js';
import { Context } from 'src/server/apollo.context';

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
    Short
    Long
  }

  enum DateFormat {
    Numerical
    Short
    Long
    Full
  }

  enum TimeFormat {
    Time
    TimeWithSeconds
  }

  scalar Timestamp

  type Date {
    dateString(dateFormat: DateFormat, timeFormat: TimeFormat): String!
    timezone(format: TimezoneFormat): String!
    timestamp: Timestamp!
    unixTimestamp: Float!
  }

`;

const convertDate = (date: string | [string, string]) => {
  if (Array.isArray(date)) {
    return moment.tz(date[0], date[1]);
  } else {
    return moment.tz(date, 'Etc/GMT');
  }
}

enum TimezoneFormat {
  Long = 'Long',
  Short = 'Short'
}

enum DateFormat {
  Numerical = 'Numerical',
  Short = 'Short',
  Long = 'Long',
  Full = 'Full',
}

enum TimeFormat {
  Time = 'Time',
  TimeWithSeconds = 'TimeWithSeconds'
}

const convertEnumToMomentFormat = (format?: DateFormat | TimeFormat) => {
  switch (format) {
    case TimeFormat.Time: return 'LT';
    case TimeFormat.TimeWithSeconds: return 'LTS';
    case DateFormat.Numerical: return 'l';
    case DateFormat.Short: return 'll';
    case DateFormat.Long: return 'LL';
    case DateFormat.Full: return 'LLLL';
    default: return undefined;
  }
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
      if (format === TimezoneFormat.Short) {
        return convertedDate.zoneAbbr() || moment.utc();
      } else {
        return convertedDate.tz() || moment.utc();
      }
    },
    unixTimestamp: (date: string | [string, string]) => {
      const convertedDate = convertDate(date);
      return convertedDate.unix();
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
        const full = convertEnumToMomentFormat(DateFormat.Full);
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
