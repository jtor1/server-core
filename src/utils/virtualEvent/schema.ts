import gql from 'graphql-tag';
import {
  DocumentNode,
  GraphQLEnumType,
  GraphQLObjectType,
  buildASTSchema,
  typeFromAST,
} from 'graphql';


export const markup = (options: {
  queryTypeName: string,
  noExtend?: boolean,
}): string => (`

  enum VirtualEventProvider {
    zoom
    youtube
    googleMeet
    eventlive
  }

  type VirtualEventLinkParseResult {
    provider: VirtualEventProvider!
    linkText: String!
    urlLinkText: String!
    urlApp: String
    urlBrowser: String
    streamId: String!
    passwordDetected: Boolean!
    passwordUrlEmbed: String
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
