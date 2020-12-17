import { gql } from 'apollo-server-core';

import { coreTypeDefs, coreResolvers } from '../../src/graphql/core.types';
import { testSetupApollo } from '../helpers/apollo';


// PANTONE 130 U @ 100%
//   https://www.reddit.com/r/sanfrancisco/comments/ipmrpu/til_the_apocalypse_is_pantone_130_u_oak_gough_noon/
//   https://www.pantone.com/color-finder/130-U
const COLOR_HEX = '#F79B2FFF';


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
        hex: '#f79b2f',
        rgba: [ 247, 155, 47, 1 ],
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
