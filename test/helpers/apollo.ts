import { get as getProperty } from 'lodash';
import { GraphQLSchema, DocumentNode } from 'graphql';
import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from 'apollo-server';
import { createTestClient } from 'apollo-server-testing';

import { Context } from '../../src/server/apollo.context';
import { IApolloServerArgs, createApolloServer } from '../../src/server/apollo.server';


interface ITestSetupApollo {
  typeDefs?: DocumentNode[];
  resolvers?: Record<any, any>;
};


export async function testSetupApollo(options?: ITestSetupApollo) {
  const context: Context = new Context({
    // "convertedDate.locale(...).format is not a function"
    locale: 'en_US',
  });

  const schema: GraphQLSchema = await makeExecutableSchema({
    typeDefs: getProperty(options, 'typeDefs') || [],
    resolvers: getProperty(options, 'resolvers') || [],
    resolverValidationOptions: {
      requireResolversForResolveType: false,
    },
  });
  const args: IApolloServerArgs = {
    schema,
    mocks: false, // good for Development, not so much for even a Test Suite
    introspection: true,

    // pass thru the mocked Context
    contextFunc: (ctx: any) => context,
  } as IApolloServerArgs;
  const apollo: ApolloServer = await createApolloServer(args);

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
