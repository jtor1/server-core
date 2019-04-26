import { ApolloServer } from 'apollo-server-express';
import { Config } from 'apollo-server';

export interface IApolloServerArgs extends Config {
  contextFunc?: (ctx: any) => any;
}

export const createApolloServer = (args: IApolloServerArgs) => {
  const server = new ApolloServer({
    ...args,
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
