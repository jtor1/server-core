import {
  get as getProperty,
} from 'lodash';
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from 'apollo-server-plugin-base';
import { ErrorRequestHandler, NextFunction } from 'express';
import {
  deriveTelemetryContextFromError,
} from '@withjoy/telemetry';

import { Context } from './apollo.context';

function _deriveTelemetryContextFromError(err: Error) {
  return (deriveTelemetryContextFromError(err).error || {}); // Error context = { error: { ... } }
}


// Plugins bridge the gap for us
//   we need both Context#telemetry + the Errors
//   https://www.apollographql.com/docs/apollo-server/integrations/plugins/#creating-a-plugin
//   https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-plugin-base/src/index.ts

interface ApolloErrorPipelineOptions {
  errorRequestHandlers?: ErrorRequestHandler[];
};

export class ApolloErrorPipeline {
  public readonly options: ApolloErrorPipelineOptions;
  constructor(options: ApolloErrorPipelineOptions) {
    this.options = options;
  }

  get plugin(): ApolloServerPlugin {
    return {
      requestDidStart: (requestContext: GraphQLRequestContext): GraphQLRequestListener => {
        return this.listener; // yeah; this is how it works
      },
    };
  }

  get listener(): GraphQLRequestListener {
    return {
      didEncounterErrors: async (requestContext: GraphQLRequestContext): Promise<void> => {
        const errors = requestContext.errors;
        if (! Array.isArray(errors)) {
          return;
        }

        // we have the Context *and* its Errors
        //   which are not both available to `ApolloServer#formatError`
        //   so here's where we do our logging
        const context = (requestContext.context as Context);
        for (let error of errors) {
          await this.process(error, context);
        }
      },
    };
  }

  async process(enrichedError: any, context: Context): Promise<any | null> {
    const { errorRequestHandlers } = this.options;
    let chainedError = enrichedError;

    if (errorRequestHandlers) {
      // derive Context => Request => Response
      const req = context.req;
      const res = req?.res;

      // "why are we using an express ErrorRequestHandler here?"
      //   because; it's a well-established pattern,
      //   it has a method signature that accepts all the useful information,
      //   and anything built for REST-focused express Apps will work here as well
      //   ... assuming it follows the caveats below
      // your middleware *must* call its NextFunction
      //   otherwise, the loop below will never complete
      // your middleware should *not* try to send a Response,
      //   modify its headers, or its status code, etc.;
      //   doing so will conflict with Apollo's own Reponse handling

      for (let handler of errorRequestHandlers) {
        // await the invocation of each NextFunction before proceeding;
        //   its resolved value is the next Error in the chain to be processed
        let resolve: NextFunction;
        const promise = new Promise((_resolve) => {
          resolve = _resolve;
        });
        handler(chainedError, req!, res!, resolve!);
        chainedError = await promise;
      }
    }

    // always log the original
    this.logEnrichedError(enrichedError, context);

    return chainedError || null; // for easy Test Suite assertion
  }

  /**
  * "enrichedError" is from private `enrichError` in `apollo-server-errors`
  *   @see https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-errors/src/index.ts#L39-L101
  *   "follows similar structure to https://github.com/graphql/graphql-js/blob/master/src/error/GraphQLError.js#L145-L193"
  *
  * @see https://www.apollographql.com/docs/apollo-server/features/errors
  */
  logEnrichedError(enrichedError: any, context: Context): any {
    if (! enrichedError) {
      // why are we even here?
      return enrichedError;
    }

    const { telemetry } = context;
    const code = getProperty(enrichedError, 'extensions.code')
    const stacktrace = getProperty(enrichedError, 'extensions.exception.stacktrace');
    const stack = (Array.isArray(stacktrace) ? stacktrace.join('\n') : stacktrace);

    const derived = _deriveTelemetryContextFromError(enrichedError);
    telemetry.error('logApolloEnrichedError', { // <= its name in a prior life
      source: 'apollo',
      action: 'error',
      error: {
        ...derived,
        code: code || derived.code,
        stack: stack || derived.stack,
      },
    });

    // pass-thru, no re-formatting
    return enrichedError;
  }
}
