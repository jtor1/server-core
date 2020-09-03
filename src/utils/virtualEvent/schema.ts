import { IFieldResolver, IResolvers } from 'apollo-server';
import gql from 'graphql-tag';
import {
  DocumentNode,
  GraphQLEnumType,
  GraphQLObjectType,
  buildASTSchema,
  typeFromAST,
} from 'graphql';

import { Context } from '../../server/apollo.context';
import { VirtualEventLinkParseResult } from './types';
import { parseLink } from './aggregator';


export const markup = (options: {
  queryTypeName: string,
  noExtend?: boolean,
}): string => (`

  enum VirtualEventProvider {
    unknown
    zoom
    youtube
    googleMeet
    eventlive
  }

  type VirtualEventLinkParseResult {
    provider: VirtualEventProvider!
    "The raw text of the Virtual Event link provided to us"
    linkText: String!
    "We detected a valid Virtual Event URL in the link text"
    isLinkValid: Boolean!
    "The Virtual Event URL derived from the link text"
    urlLinkText: String
    "An optional URL which launches the Provider's App (via browser) to stream the Virtual Event"
    urlApp: String
    "An optional URL which streams the Virtual Event in a browser window"
    urlBrowser: String
    "Unique ID of the Provider's Virtual Event stream"
    streamId: String
    "A clear-text or embedded password has been detected in the text"
    isPasswordDetected: Boolean!
    "The password parameter value embedded in 'urlLinkText', if detected"
    passwordUrlEmbed: String
    "The clear-text password called out in the link text, if detected"
    passwordText: String
  }

  ${ options.noExtend ? '' : 'extend' } type ${ options.queryTypeName } {
    parseVirtualEventLink(text: String!): VirtualEventLinkParseResult
  }

`);

// as a DocumentNode
export const typeDefs: DocumentNode = gql( markup({
  queryTypeName: 'Query',
}) );



// as Resolvers
const parseVirtualEventLink: IFieldResolver<null, Context, { text: string }> = (_, args, _context): VirtualEventLinkParseResult | null => {
  return parseLink(args.text);
}

export const resolvers: IResolvers = {
  Query: {
    parseVirtualEventLink,
  },
};


// as individual GraphQL Types
const astSchema = buildASTSchema( gql( markup({
  queryTypeName: 'Query',
  noExtend: true,
}) ) );

const VirtualEventProvider = typeFromAST(astSchema, {
  kind: 'NamedType',
  name: { kind: 'Name', value: 'VirtualEventProvider' },
})! as GraphQLEnumType;
const VirtualEventLinkParseResult = typeFromAST(astSchema, {
  kind: 'NamedType',
  name: { kind: 'Name', value: 'VirtualEventLinkParseResult' },
})! as GraphQLObjectType;


export const types = {
  VirtualEventProvider,
  VirtualEventLinkParseResult,
};
