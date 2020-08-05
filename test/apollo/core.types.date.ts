import { gql } from 'apollo-server-core';

import { coreTypeDefs, coreResolvers } from '../../src/graphql/core.types';
import { testSetupApollo } from '../helpers/apollo';


// features
//   EST vs. UTC
//   has millisecond precision
const DATE_ISO = '2016-11-09T02:30:00.5-05:00';
const TZ_IANA = 'America/New_York';


describe('the GraphQL Date and Time TypeDefs', () => {
  let client: { query: Function };


  describe('with an ISO-8601 Date string', () => {
    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: [
          coreTypeDefs,
          gql`
            type Query {
              date: Date!
            }
          `,
        ],
        resolvers: {
          ...coreResolvers,

          Query: {
            // just the Date string; no timezone specified
            date: () => DATE_ISO,
          },
        },
      });
      client = setup.client;
    });


    it('resolves an ISO-8601 timestamp', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { timestamp }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          timestamp: '2016-11-09T07:30:00.500Z',
        },
      });
    });

    it('resolves a millisecond timestamp', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { milliseconds }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          milliseconds: 1478676600500,
        },
      });
    });

    it('resolves a Unix timestamp without millisecond precision', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { unixTimestamp }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          unixTimestamp: 1478676600,
        },
      });
    });

    it('resolves the associated timezone as UTC', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { timezone }
            long: date { timezone(format: long) }
            short: date { timezone(format: short) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          timezone: 'Etc/UTC',
        },
        long: {
          timezone: 'Etc/UTC',
        },
        short: {
          timezone: 'UTC',
        },
      });
    });

    it('formats a Date string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { dateString }
            numerical: date { dateString(dateFormat: numerical) }
            short: date { dateString(dateFormat: short) }
            long: date { dateString(dateFormat: long) }
            full: date { dateString(dateFormat: full) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          dateString: 'Wednesday, November 9, 2016 7:30 AM',
        },
        numerical: {
          dateString: '11/9/2016',
        },
        short: {
          dateString: 'Nov 9, 2016',
        },
        long: {
          dateString: 'November 9, 2016',
        },
        full: {
          dateString: 'Wednesday, November 9, 2016 7:30 AM',
        },
      });
    });

    it('formats a Time string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { dateString }
            time: date { dateString(timeFormat: time) }
            timeWithSeconds: date { dateString(timeFormat: timeWithSeconds) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          dateString: 'Wednesday, November 9, 2016 7:30 AM',
        },
        time: {
          dateString: '7:30 AM',
        },
        timeWithSeconds: {
          dateString: '7:30:00 AM',
        },
      });
    });

    it('formats a Date-and-Time string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            shortTime: date { dateString(dateFormat: short, timeFormat: time) }
            longTimeWithSeconds: date { dateString(dateFormat: long, timeFormat: timeWithSeconds) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        shortTime: {
          dateString: 'Nov 9, 2016 7:30 AM',
        },
        longTimeWithSeconds: {
          dateString: 'November 9, 2016 7:30:00 AM',
        },
      });
    });
  });


  describe('with an ISO-8601 Date string + IANA time zone', () => {
    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: [
          coreTypeDefs,
          gql`
            type Query {
              date: Date!
            }
          `,
        ],
        resolvers: {
          ...coreResolvers,

          Query: {
            // include a timezone
            date: () => [ DATE_ISO, TZ_IANA ],
          },
        },
      });
      client = setup.client;
    });


    it('resolves an ISO-8601 timestamp which does not reflect the specified timezone offset', async () => {
      // ... which seems odd; why not provide the offset that the caller requested?

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { timestamp }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          timestamp: '2016-11-09T07:30:00.500Z',
        },
      });
    });

    it('resolves a millisecond timestamp', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { milliseconds }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          milliseconds: 1478676600500,
        },
      });
    });

    it('resolves a Unix timestamp without millisecond precision', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { unixTimestamp }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          unixTimestamp: 1478676600,
        },
      });
    });

    it('resolves the associated timezone', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { timezone }
            long: date { timezone(format: long) }
            short: date { timezone(format: short) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          timezone: 'America/New_York',
        },
        long: {
          timezone: 'America/New_York',
        },
        short: {
          timezone: 'EST',
        },
      });
    });

    it('formats a Date string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { dateString }
            numerical: date { dateString(dateFormat: numerical) }
            short: date { dateString(dateFormat: short) }
            long: date { dateString(dateFormat: long) }
            full: date { dateString(dateFormat: full) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          dateString: 'Wednesday, November 9, 2016 2:30 AM',
        },
        numerical: {
          dateString: '11/9/2016',
        },
        short: {
          dateString: 'Nov 9, 2016',
        },
        long: {
          dateString: 'November 9, 2016',
        },
        full: {
          dateString: 'Wednesday, November 9, 2016 2:30 AM',
        },
      });
    });

    it('formats a Time string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { dateString }
            time: date { dateString(timeFormat: time) }
            timeWithSeconds: date { dateString(timeFormat: timeWithSeconds) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          dateString: 'Wednesday, November 9, 2016 2:30 AM',
        },
        time: {
          dateString: '2:30 AM',
        },
        timeWithSeconds: {
          dateString: '2:30:00 AM',
        },
      });
    });

    it('formats a Date-and-Time string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            shortTime: date { dateString(dateFormat: short, timeFormat: time) }
            longTimeWithSeconds: date { dateString(dateFormat: long, timeFormat: timeWithSeconds) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        shortTime: {
          dateString: 'Nov 9, 2016 2:30 AM',
        },
        longTimeWithSeconds: {
          dateString: 'November 9, 2016 2:30:00 AM',
        },
      });
    });
  });


  describe('with an ISO-8601 Date string + a missing time zone', () => {
    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: [
          coreTypeDefs,
          gql`
            type Query {
              date: Date!
            }
          `,
        ],
        resolvers: {
          ...coreResolvers,

          Query: {
            // include a timezone,
            //   which the caller probably doesn't know is blank
            date: () => [ DATE_ISO, '' ],
          },
        },
      });
      client = setup.client;
    });


    it('resolves an ISO-8601 timestamp which does not reflect the specified timezone offset', async () => {
      // ... which seems odd; why not provide the offset that the caller requested?

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { timestamp }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          timestamp: '2016-11-09T07:30:00.500Z',
        },
      });
    });

    it('resolves a millisecond timestamp', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { milliseconds }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          milliseconds: 1478676600500,
        },
      });
    });

    it('resolves a Unix timestamp without millisecond precision', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            date { unixTimestamp }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        date: {
          unixTimestamp: 1478676600,
        },
      });
    });

    it('resolves the associated timezone as UTC', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { timezone }
            long: date { timezone(format: long) }
            short: date { timezone(format: short) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          timezone: 'Etc/UTC',
        },
        long: {
          timezone: 'Etc/UTC',
        },
        short: {
          timezone: 'UTC',
        },
      });
    });

    it('formats a Date string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { dateString }
            numerical: date { dateString(dateFormat: numerical) }
            short: date { dateString(dateFormat: short) }
            long: date { dateString(dateFormat: long) }
            full: date { dateString(dateFormat: full) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          dateString: 'Wednesday, November 9, 2016 7:30 AM',
        },
        numerical: {
          dateString: '11/9/2016',
        },
        short: {
          dateString: 'Nov 9, 2016',
        },
        long: {
          dateString: 'November 9, 2016',
        },
        full: {
          dateString: 'Wednesday, November 9, 2016 7:30 AM',
        },
      });
    });

    it('formats a Time string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            defaultFormat: date { dateString }
            time: date { dateString(timeFormat: time) }
            timeWithSeconds: date { dateString(timeFormat: timeWithSeconds) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        defaultFormat: {
          dateString: 'Wednesday, November 9, 2016 7:30 AM',
        },
        time: {
          dateString: '7:30 AM',
        },
        timeWithSeconds: {
          dateString: '7:30:00 AM',
        },
      });
    });

    it('formats a Date-and-Time string for the current locale', async () => {
      // ... which happens to be 'en'
      //   @see testSetupApollo

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            shortTime: date { dateString(dateFormat: short, timeFormat: time) }
            longTimeWithSeconds: date { dateString(dateFormat: long, timeFormat: timeWithSeconds) }
          }
        `
      });

      const { data } = res;
      expect(data).toMatchObject({
        shortTime: {
          dateString: 'Nov 9, 2016 7:30 AM',
        },
        longTimeWithSeconds: {
          dateString: 'November 9, 2016 7:30:00 AM',
        },
      });
    });
  });
});
