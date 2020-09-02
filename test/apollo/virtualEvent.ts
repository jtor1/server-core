import { gql } from 'apollo-server-core';

import {
  VirtualEventProvider,
  virtualEventGraphQL,
} from '../../src/utils/virtualEvent';
const { typeDefs, resolvers } = virtualEventGraphQL;

import { testSetupApollo } from '../helpers/apollo';


describe('the GraphQL Color TypeDefs', () => {
  let client: { query: Function };


  beforeEach(async () => {
    const setup = await testSetupApollo({
      typeDefs: [
        gql`
          type Query {
            _whichGetsExtended: Boolean
          }
        `,
        typeDefs,
      ],
      resolvers,
    });
    client = setup.client;
  });


  describe('parseVirtualEventLink', () => {
    it('parses a VirtualEvent link', async () => {
      const TEXT = 'https://us04web.zoom.us/j/4155551212?pwd=P4s5w0r6 (Password: PASSWORD!)';

      const { query } = client;
      const res = await query({
        query: gql`
          query {
            parseVirtualEventLink(text: "${ TEXT }") {
              provider
              linkText
              isLinkValid
              urlLinkText
              urlApp
              urlBrowser
              streamId
              isPasswordDetected
              passwordUrlEmbed
              passwordText

              # FIXME:  @deprecated
              passwordDetected
            }
          }
        `
      });

      const { data } = res;
      expect(data).toEqual({
        parseVirtualEventLink: {
          provider: VirtualEventProvider.zoom,
          linkText: TEXT,
          isLinkValid: true,
          urlLinkText: 'https://us04web.zoom.us/j/4155551212?pwd=P4s5w0r6',
          urlApp: 'https://zoom.us/j/4155551212?pwd=P4s5w0r6',
          urlBrowser: 'https://zoom.us/wc/join/4155551212?pwd=P4s5w0r6',
          streamId: '4155551212',
          isPasswordDetected: true,
          passwordUrlEmbed: 'P4s5w0r6',
          passwordText: 'PASSWORD!',
          passwordDetected: true,
        },
      });
    });

    it('parses an un-parseable VirtualEvent link', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            parseVirtualEventLink(text: "UNPARSEABLE") {
              provider
              linkText
              isLinkValid
              urlLinkText
              urlApp
              urlBrowser
              streamId
              isPasswordDetected
              passwordUrlEmbed
              passwordText

              # FIXME:  @deprecated
              passwordDetected
            }
          }
        `
      });

      const { data } = res;
      expect(data).toEqual({
        parseVirtualEventLink: {
          provider: VirtualEventProvider.unknown,
          linkText: 'UNPARSEABLE',
          isLinkValid: false,
          urlLinkText: null,
          urlApp: null,
          urlBrowser: null,
          streamId: null,
          isPasswordDetected: false,
          passwordUrlEmbed: null,
          passwordText: null,
          passwordDetected: false,
        },
      });
    });

    it('cannot parse the lack of a link', async () => {
      const { query } = client;
      const res = await query({
        query: gql`
          query {
            parseVirtualEventLink(text: "") {
              provider
            }
          }
        `
      });

      const { data } = res;
      expect(data).toEqual({
        parseVirtualEventLink: null,
      });
    });
  });
});
