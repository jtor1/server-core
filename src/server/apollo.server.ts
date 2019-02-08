import { ApolloServer, IResolvers } from 'apollo-server-express';
import { GraphQLSchema, DocumentNode } from 'graphql';
import { Context } from './apollo.context';

interface ApolloServerArgs {
  schema?: GraphQLSchema;
  typeDefs?: DocumentNode | DocumentNode[];
  resolvers?: IResolvers<any, any>;
  mocks: boolean;
  contextFunc?: (ctx: unknown) => Context;
}

export const createApolloServer = (args: ApolloServerArgs) => {
  const server = new ApolloServer({
    schema: args.schema,
    typeDefs: args.typeDefs,
    resolvers: args.resolvers,
    mocks: args.mocks || false,
    playground: true,
    tracing: true,
    context: (ctx: unknown) => {
      if (args.contextFunc) {
        return args.contextFunc(ctx);
      } else {
        return ctx;
      }
    }
  });
  return server;
}