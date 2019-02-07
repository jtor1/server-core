import { ApolloServer } from 'apollo-server-express';
import { GraphQLSchema } from 'graphql';
import { Context } from './apollo.context';

export const createApolloServer = (schema: GraphQLSchema, contextFunc: (ctx: unknown) => Context) => {
  const server = new ApolloServer({
    schema,
    playground: true,
    tracing: true,
    context: (ctx: unknown) => {
      return contextFunc(ctx);
    }
  });
  return server;
}