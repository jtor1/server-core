import { ApolloServer, IResolvers } from 'apollo-server-express';
import { GraphQLSchema, DocumentNode } from 'graphql';

interface ApolloServerArgs {
  schema?: GraphQLSchema;
  typeDefs?: DocumentNode | DocumentNode[];
  resolvers?: IResolvers<any, any>;
  mocks: boolean;
  contextFunc?: (ctx: any) => any;
}

export const createApolloServer = (args: ApolloServerArgs) => {
  const server = new ApolloServer({
    schema: args.schema,
    typeDefs: args.typeDefs,
    resolvers: args.resolvers,
    mocks: args.mocks || false,
    playground: true,
    tracing: true,
    context: (ctx: any) => {
      if (args.contextFunc) {
        return args.contextFunc(ctx);
      } else {
        return ctx;
      }
    }
  });
  return server;
}