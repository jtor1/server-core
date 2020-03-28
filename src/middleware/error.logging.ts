import {
  identity,
  isEmpty,
  isError,
  get as getProperty,
  pick,
  pickBy,
} from 'lodash';
import {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express'
import { ApolloServerPlugin, GraphQLRequestListener } from 'apollo-server-plugin-base';
import {
  Telemetry,
  telemetry as telemetrySingleton,
  deriveTelemetryContextFromError,
} from '@withjoy/telemetry';

function _deriveTelemetryContextFromError(err: Error) {
  return (deriveTelemetryContextFromError(err).error || {}); // Error context = { error: { ... } }
}

function _loggedNonEmpty(loggable: any): any | undefined {
  return (isEmpty(loggable) ? undefined : JSON.stringify(loggable));
}


export const errorLoggingExpress: ErrorRequestHandler = function errorLoggingExpress(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (! err) {
    // this is someone else's job
    next();
    return;
  }

  // what was requested
  //   sparsely
  //   in a way that won't be JSON-parsed by our upstream log provider
  const requested = pickBy({
    path: req.path,
    params: _loggedNonEmpty(req.params),
    query: _loggedNonEmpty(req.query),
    body: _loggedNonEmpty(req.body),
  }, identity); // eg. `compact`

  const { statusCode } = (err as any); // "Property 'FOO' does not exist on type 'Error'."
  let responded: Record<string, any>;
  let logged: Record<string, any>;

  if (isError(err)) {
    // what we log
    logged = {
      ..._deriveTelemetryContextFromError(err),
      statusCode,
    };

    // how we respond
    responded = pick(logged, 'message', 'name', 'code', 'statusCode');
  }
  else {
    responded = {
      message: String(err),
    };
    logged = responded;
  }

  telemetrySingleton.error('errorLoggingExpress', {
    source: 'express',
    action: 'error',
    error: logged,
    request: requested,
  });

  // we handle the response
  res.status(statusCode || 500).json({
    error: responded,
  });
}


/**
 * "enrichedError" is from private `enrichError` in `apollo-server-errors`
 *   @see https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-errors/src/index.ts#L39-L101
 *   "follows similar structure to https://github.com/graphql/graphql-js/blob/master/src/error/GraphQLError.js#L145-L193"
 *
 * @see https://www.apollographql.com/docs/apollo-server/features/errors
 */
export function logApolloEnrichedError(enrichedError: any, telemetry: Telemetry): any {
  if (! enrichedError) {
    // why are we even here?
    return enrichedError;
  }

  const code = getProperty(enrichedError, 'extensions.code')
  const stacktrace = getProperty(enrichedError, 'extensions.exception.stacktrace');
  const stack = (Array.isArray(stacktrace) ? stacktrace.join('\n') : stacktrace);

  const derived = _deriveTelemetryContextFromError(enrichedError);
  telemetry.error('logApolloEnrichedError', {
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

// Plugins bridge the gap for us
//   we need both Context#telemetry + the Errors
//   https://www.apollographql.com/docs/apollo-server/integrations/plugins/#creating-a-plugin
//   https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-plugin-base/src/index.ts

export const errorLoggingApolloListener: GraphQLRequestListener = {
  didEncounterErrors({ context, errors }) {
    if (! Array.isArray(errors)) {
      return;
    }

    // we have the Context *and* its Errors
    //   which are not both available to `ApolloServer#formatError`
    //   so here's where we do our logging
    const telemetry: Telemetry = getProperty(context, 'telemetry') || telemetrySingleton;
    errors.forEach((err) => {
      logApolloEnrichedError(err, telemetry);
    });
  },
};

export const errorLoggingApolloPlugin: ApolloServerPlugin = {
  requestDidStart(ctx: any) {
    return errorLoggingApolloListener; // yeah; this is how it works
  },
};
