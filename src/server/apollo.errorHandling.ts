import {
  get as getProperty,
} from 'lodash';
import { ApolloServerPlugin, GraphQLRequestListener } from 'apollo-server-plugin-base';
import {
  Telemetry,
  telemetry as telemetrySingleton,
  deriveTelemetryContextFromError,
} from '@withjoy/telemetry';

function _deriveTelemetryContextFromError(err: Error) {
  return (deriveTelemetryContextFromError(err).error || {}); // Error context = { error: { ... } }
}


/**
 * "enrichedError" is from private `enrichError` in `apollo-server-errors`
 *   @see https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-errors/src/index.ts#L39-L101
 *   "follows similar structure to https://github.com/graphql/graphql-js/blob/master/src/error/GraphQLError.js#L145-L193"
 *
 * @see https://www.apollographql.com/docs/apollo-server/features/errors
 */
export function _logApolloEnrichedError(enrichedError: any, telemetry: Telemetry): any {
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

export const _errorLoggingApolloListener: GraphQLRequestListener = {
  didEncounterErrors({ context, errors }) {
    if (! Array.isArray(errors)) {
      return;
    }

    // we have the Context *and* its Errors
    //   which are not both available to `ApolloServer#formatError`
    //   so here's where we do our logging
    const telemetry: Telemetry = getProperty(context, 'telemetry') || telemetrySingleton;
    errors.forEach((err) => {
      _logApolloEnrichedError(err, telemetry);
    });
  },
};

export const _errorLoggingApolloPlugin: ApolloServerPlugin = {
  requestDidStart(ctx: any) {
    return _errorLoggingApolloListener; // yeah; this is how it works
  },
};
