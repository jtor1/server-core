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

  enum LivestreamUrlProvider {
    zoom
    youtube
    googleMeet
    eventlive
  }

  type LivestreamUrlParseResult {
    provider: LivestreamUrlProvider!
    text: String!
    urlOriginal: String!
    urlApp: String
    urlBrowser: String
    streamId: String!
    passwordDetected: Boolean!
    passwordUrlEmbed: String
    passwordText: String
  }

  ${ options.noExtend ? '' : 'extend' } type ${ options.queryTypeName } {
    parseLivestreamUrl(text: String!): LivestreamUrlParseResult
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

const LivestreamUrlProvider = typeFromAST(astSchema, {
  kind: 'NamedType',
  name: { kind: 'Name', value: 'LivestreamUrlProvider' },
})! as GraphQLEnumType;
const LivestreamUrlParseResult = typeFromAST(astSchema, {
  kind: 'NamedType',
  name: { kind: 'Name', value: 'LivestreamUrlParseResult' },
})! as GraphQLObjectType;


export const types = {
  LivestreamUrlProvider,
  LivestreamUrlParseResult,
};
