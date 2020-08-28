import { gql } from 'apollo-server-core';

import { coreTypeDefs, coreResolvers } from '../../src/graphql/core.types';
import { testSetupApollo } from '../helpers/apollo';


// PANTONE 17-1937 TCX Hot Pink @ 100%
const COLOR_HEX = '#E55982FF';


describe('the GraphQL Color TypeDefs', () => {
  let client: { query: Function };


  it('resolves a payload', async () => {
    const setup = await testSetupApollo({
      typeDefs: [
        coreTypeDefs,
        gql`
          type Query {
            color: Color!
          }
        `,
      ],
      resolvers: {
        ...coreResolvers,

        Query: {
          color: () => COLOR_HEX,
        },
      },
    });
    client = setup.client;

    const { query } = client;
    const res = await query({
      query: gql`
        query {
          color {
            hex
            rgba
            isLight
          }
        }
      `
    });

    const { data } = res;
    expect(data).toMatchObject({
      color: {
        hex: '#e55982',
        rgba: [ 229, 89, 130, 1 ],
        isLight: false,
      },
    });
  });


  it('resolves a payload for crappy data', async () => {
    const setup = await testSetupApollo({
      typeDefs: [
        coreTypeDefs,
        gql`
          type Query {
            color: Color!
          }
        `,
      ],
      resolvers: {
        ...coreResolvers,

        Query: {
          color: () => 'CRAPPY',
        },
      },
    });
    client = setup.client;

    const { query } = client;
    const res = await query({
      query: gql`
        query {
          color {
            hex
            rgba
            isLight
          }
        }
      `
    });

    const { data } = res;
    expect(data).toMatchObject({
      color: {
        hex: '#000000',
        rgba: [ 0, 0, 0, 1 ],
        isLight: false,
      },
    });
  });
});
