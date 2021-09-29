import { gql } from 'apollo-server-core';
import { isEqual } from 'lodash';

import { coreTypeDefs, coreResolvers } from '../../src/graphql/core.types';
import { testSetupApollo } from '../helpers/apollo';


const OBJECT = { json: true };
const STRING = 'STRING';
const QUERY_TYPEDEFS = gql`
  type Query {
    jsonQuery: JSONObject  # because we test null
  }
`;


describe('the GraphQL JSONObject TypeDefs', () => {
  describe('for a Query', () => {
    const QUERY = gql`
      query {
        jsonQuery
      }
    `;
    let client: { query: Function };
    let resolved: any;

    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: [
          coreTypeDefs,
          QUERY_TYPEDEFS,
        ],
        resolvers: {
          ...coreResolvers,
          Query: {
            jsonQuery: () => resolved,
          },
        },
      });
      client = setup.client;
    });

    it('resolves an Object payload', async () => {
      const { query } = client;
      resolved = OBJECT;

      const res = await query({
        query: QUERY,
      });

      const { data } = res;
      expect(data).toMatchObject({
        jsonQuery: resolved,
      });
    });

    it('cannot serialize a non-Object payload', async () => {
      const { query } = client;
      resolved = STRING;

      const res = await query({
        query: QUERY,
      });

      expect(res).toMatchObject({
        errors: [
          {
            message: /cannot represent non-object value/,
          }
        ],
        data: {
          jsonQuery: null,
        },
      });
    });

    it('resolves a null payload', async () => {
      const { query } = client;
      resolved = null;

      const res = await query({
        query: QUERY,
      });

      const { data } = res;
      expect(data).toMatchObject({
        jsonQuery: resolved,
      });
    });

    it('resolves an undefined payload as null', async () => {
      // which is probably standard GraphQL behavior
      const { query } = client;
      resolved = undefined;

      const res = await query({
        query: QUERY,
      });

      const { data } = res;
      expect(data).toMatchObject({
        jsonQuery: null,
      });
    });
  });


  describe('for a Mutation', () => {
    let client: { mutate: Function };
    let expected: any;

    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: [
          coreTypeDefs,
          QUERY_TYPEDEFS,
          gql`
            type Mutation {
              jsonMutation(actual: JSONObject): Boolean
            }
          `,
        ],
        resolvers: {
          ...coreResolvers,
          Mutation: {
            jsonMutation: (_self: any, args: { actual: any }, _context: any) => {
              return isEqual(args.actual, expected);
            },
          },
        },
      });
      client = setup.client;
    });

    it('takes an Object payload', async () => {
      const { mutate } = client;
      expected = OBJECT;

      const res = await mutate({
        query: `
          mutation {
            jsonMutation(actual: { json: true })  # can't just JSON.stringify :(
          }
        `,
      });

      const { data } = res;
      expect(data).toMatchObject({
        jsonMutation: true,
      });
    });

    it('cannot parse a non-Object payload', async () => {
      const { mutate } = client;
      expected = STRING;

      const res = await mutate({
        query: `
          mutation {
            jsonMutation(actual: "${ STRING }")
          }
        `,
      });

      expect(res).toMatchObject({
        errors: [
          {
            message: /cannot represent non-object value/,
          }
        ],
        data: undefined,
      });
    });

    it('takes a null payload', async () => {
      const { mutate } = client;
      expected = null;

      const res = await mutate({
        query: `
          mutation {
            jsonMutation(actual: null)
          }
        `,
      });

      const { data } = res;
      expect(data).toMatchObject({
        jsonMutation: true,
      });
    });
  });
});
