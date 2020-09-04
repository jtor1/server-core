import { gql } from 'apollo-server';

import { Context } from '../../src/server/apollo.context';
import {
  coreTypeDefs,
  coreResolvers,
  formatCoreTypeDateTimestamp,
} from '../../src/graphql/core.types';
import { testSetupApollo } from '../helpers/apollo';


const TYPEDEFS = [
  coreTypeDefs,
  gql`
    # implement the Resolver in the Test Suite
    type Query {
      date: Date!
    }
  `,
];

const EPOCH = 1478677500;
const MILLIS = EPOCH * 1000;
const DATE_ISO = '2016-11-09T07:45:00.000Z';  // without offset
const TZ_QUEBECOIS = 'America/Montreal'; // IANA code
const LOCALE_QUEBECOIS = 'fr-CA'; // IETF code


describe('the GraphQL Date and Time TypeDefs', () => {
  let context: Context;
  let client: { query: Function };


  describe('with an ISO-8601 Date string', () => {
    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: TYPEDEFS,
        resolvers: {
          ...coreResolvers,

          Query: {
            // just the Date string; no timezone specified
            date: () => DATE_ISO,
          },
        },
      });

      client = setup.client;
      context = setup.context;

      expect(context.locale).toBe('en_US');
    });


    it('resolves its default payload', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date {
              dateString
              timezone
              timestamp
              unixTimestamp
              milliseconds
            }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          dateString: 'Wednesday, November 9, 2016 7:45 AM',
          timezone: 'Etc/UTC',
          timestamp: formatCoreTypeDateTimestamp(DATE_ISO, 'Etc/UTC'),
          unixTimestamp: EPOCH,
          milliseconds: MILLIS,
        },
      });
    });

    it('resolves its parameterized payload', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date {
              dateStringShort: dateString(dateFormat: short)
              dateStringWithSeconds: dateString(timeFormat: timeWithSeconds)
              dateStringShortWithSeconds: dateString(dateFormat: short, timeFormat: timeWithSeconds)
              timezoneShort: timezone(format: short)
            }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          dateStringShort: 'Nov 9, 2016',
          dateStringWithSeconds: '7:45:00 AM',
          dateStringShortWithSeconds: 'Nov 9, 2016 7:45:00 AM',
          timezoneShort: 'UTC',
        },
      });
    });
  });


  describe('with an ISO-8601 Date string, timezone, and locale', () => {
    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: TYPEDEFS,
        resolvers: {
          ...coreResolvers,

          Query: {
            // include a timezone
            date: () => [ DATE_ISO, TZ_QUEBECOIS ],
          },
        },
      });

      client = setup.client;
      context = setup.context;

      // force the locale
      Reflect.set(context, 'locale', LOCALE_QUEBECOIS);
    });


    it('resolves its default payload', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date {
              dateString
              timezone
              timestamp
              unixTimestamp
              milliseconds
            }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          dateString: 'mercredi 9 novembre 2016 02:45',
          timezone: TZ_QUEBECOIS,
          timestamp: formatCoreTypeDateTimestamp(DATE_ISO, TZ_QUEBECOIS),
          unixTimestamp: EPOCH,
          milliseconds: MILLIS,
        },
      });
    });

    it('resolves its parameterized payload', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date {
              dateStringShort: dateString(dateFormat: short)
              dateStringWithSeconds: dateString(timeFormat: timeWithSeconds)
              dateStringShortWithSeconds: dateString(dateFormat: short, timeFormat: timeWithSeconds)
              timezoneShort: timezone(format: short)
            }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          dateStringShort: '9 nov. 2016',
          dateStringWithSeconds: '02:45:00',
          dateStringShortWithSeconds: '9 nov. 2016 02:45:00',
          timezoneShort: 'EST',
        },
      });
    });
  });


  it('resolves a payload for a crappy Date', async () => {
    const EPOCH_ISO = new Date(0).toISOString();

    const setup = await testSetupApollo({
      typeDefs: TYPEDEFS,
      resolvers: {
        ...coreResolvers,

        Query: {
          // just the Date string; no timezone specified
          date: () => 'CRAPPY',
        },
      },
    });

    client = setup.client;
    context = setup.context;

    const { query } = client;
    const res = await query({
      query: gql`
        query {
          date {
            dateString
            timezone
            timestamp
            unixTimestamp
            milliseconds
          }
        }
      `
    });

    const { data } = res;
    expect(data).toMatchObject({
      date: {
        dateString: 'Thursday, January 1, 1970 12:00 AM',
        timezone: 'Etc/UTC',
        timestamp: formatCoreTypeDateTimestamp(EPOCH_ISO, 'Etc/UTC'),
        unixTimestamp: 0,
        milliseconds: 0,
      },
    });
  });


  it('resolves a payload for a crappy timezone', async () => {
    const setup = await testSetupApollo({
      typeDefs: TYPEDEFS,
      resolvers: {
        ...coreResolvers,

        Query: {
          date: () => [ DATE_ISO, 'CRAPPY' ],
        },
      },
    });

    client = setup.client;
    context = setup.context;

    const { query } = client;
    const res = await query({
      query: gql`
        query {
          date {
            dateString
            timezone
            timestamp
            unixTimestamp
            milliseconds
          }
        }
      `
    });

    const { data } = res;
    expect(data).toMatchObject({
      date: {
        dateString: 'Wednesday, November 9, 2016 7:45 AM',
        timezone: 'Etc/UTC',
        timestamp: formatCoreTypeDateTimestamp(DATE_ISO, 'Etc/UTC'),
        unixTimestamp: EPOCH,
        milliseconds: MILLIS,
      },
    });
  });
});
