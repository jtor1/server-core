import { ApolloServer } from 'apollo-server-express';
import { Config } from 'apollo-server';
import { ErrorRequestHandler } from 'express';
import { ApolloErrorPipeline } from './apollo.errorPipeline';

export interface IApolloServerArgs extends Config {
  contextFunc?: (ctx: any) => any;
  errorRequestHandlers?: ErrorRequestHandler[];
}

export const createApolloServer = (args: IApolloServerArgs) => {
  const plugins = args.plugins || [];
  const errorPipeline = new ApolloErrorPipeline(args);

  const server = new ApolloServer({
    ...args,

    plugins: [
      ...plugins,

      errorPipeline.plugin,
    ],

    context: (ctx: any) => {
      if (args.contextFunc) {
        return args.contextFunc(ctx);
      } else {
        return ctx;
      }
    },

    // NOTE: not useful
    //   `formatError(error: GraphQLError): GraphQLFormattedError`
    //   provides no access to Context#telemetry
    // TODO: potentially useful
    //   `rewriteError(err: GraphQLError): GraphQLError | null { ... }`
    //   if we want to hide some Errors from `stitch_service`
    //   @see https://www.apollographql.com/docs/apollo-server/data/errors/#for-apollo-graph-manager-reporting
  });

  return server;
}
