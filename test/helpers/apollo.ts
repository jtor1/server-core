import { get as getProperty } from 'lodash';
import { GraphQLSchema, DocumentNode } from 'graphql';
import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from 'apollo-server';
import { createRequest, createResponse } from 'node-mocks-http';
import { createTestClient } from 'apollo-server-testing';

import { Context } from '../../src/server/apollo.context';
import { IApolloServerArgs, createApolloServer } from '../../src/server/apollo.server';


interface ITestSetupApollo {
  typeDefs?: DocumentNode[];
  resolvers?: Record<any, any>;
  options?: IApolloServerArgs,
};


export async function testSetupApollo(setupOptions?: ITestSetupApollo) {
  // the caller will use the Apollo Test Client;  no HTTP lifecycle is involved
  const res = createResponse();
  const req = createRequest({ res });
  const context: Context = new Context({
    req,

    // "convertedDate.locale(...).format is not a function"
    locale: 'en_US',
  });

  const schema: GraphQLSchema = makeExecutableSchema({
    typeDefs: getProperty(setupOptions, 'typeDefs') || [],
    resolvers: getProperty(setupOptions, 'resolvers') || [],
    resolverValidationOptions: {
      requireResolversForResolveType: false,
    },
  });

  const argsOptions = setupOptions?.options;
  const args: IApolloServerArgs = {
    schema,
    mocks: false, // good for Development, not so much for even a Test Suite
    introspection: true,

    // assume that we should pass thru the mocked Context
    contextFunc: (ctx: any) => context,

    ...argsOptions,
  };
  const apollo: ApolloServer = createApolloServer(args);

  // `import { ApolloServerBase } from 'apollo-server-core';`
  // "error TS2345: Argument of type 'import("/Users/dfoley/src/withjoy/server-core/node_modules/apollo-server-core/dist/ApolloServer").ApolloServerBase' is not assignable to parameter of type 'import("/Users/dfoley/src/withjoy/server-core/node_modules/apollo-server-testing/node_modules/apollo-server-core/dist/ApolloServer").ApolloServerBase'."
  //   Types have separate declarations of a private property 'context'.
  //   ಠ_ಠ => <any>
  const client = createTestClient(<any>apollo); // => { query, mutation }

  return {
    context,
    apollo,
    client,
  };
}
