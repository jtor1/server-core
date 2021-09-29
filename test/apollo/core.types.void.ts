import { gql } from 'apollo-server-core';

import { coreTypeDefs, coreResolvers } from '../../src/graphql/core.types';
import { testSetupApollo } from '../helpers/apollo';


describe('the GraphQL Void TypeDef', () => {
  describe('for a Query', () => {
    const QUERY = gql`
      query {
        voidQuery
      }
    `;
    let client: { query: Function };
    let resolved: any;

    beforeEach(async () => {
      const setup = await testSetupApollo({
        typeDefs: [
          coreTypeDefs,
          gql`
            type Query {
              voidQuery: Void
            }
          `,
        ],
        resolvers: {
          ...coreResolvers,
          Query: {
            voidQuery: (_: any, args: any) => {
              return resolved;
            },
          },
        },
      });
      client = setup.client;
    });

    it('resolves null', async () => {
      const { query } = client;
      resolved = null;

      const res = await query({
        query: QUERY,
      });

      const { data } = res;
      expect(data).toMatchObject({
        voidQuery: null,
      });
    });

    it('resolves null regardless of what the Resolver returns', async () => {
      const { query } = client;
      resolved = 'SOMETHING NOT NULL';

      const res = await query({
        query: QUERY,
      });

      const { data } = res;
      expect(data).toMatchObject({
        voidQuery: null,
      });
    });
  });
});
